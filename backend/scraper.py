"""
Alpha-Guard — Financial Data Ingestion
=======================================
Data sources:
  1. SEC EDGAR (primary) — Free JSON API at data.sec.gov for 10-K XBRL data
  2. Yahoo Finance (yfinance) — Lightweight API for global market data (BSE/NSE/international)
"""

import re
import html as html_module
import httpx
from fastapi import APIRouter, HTTPException

from models import FinancialData, CompanyInfo

router = APIRouter(prefix="/api/data", tags=["Data Ingestion"])

# SEC EDGAR API base — no authentication required
SEC_EDGAR_BASE = "https://data.sec.gov"
SEC_HEADERS = {
    "User-Agent": "Alpha-Guard Research alpha-guard@research.dev",
    "Accept": "application/json",
}

# Mapping of common XBRL US-GAAP concept tags to our FinancialData fields
XBRL_CONCEPT_MAP = {
    "total_assets": [
        "Assets",
    ],
    "current_assets": [
        "AssetsCurrent",
        "CashAndCashEquivalentsAtCarryingValue",
        "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
        "CashAndDueFromBanks",
    ],
    "current_liabilities": [
        "LiabilitiesCurrent",
        "Deposits",
        "DepositsNoninterestBearing",
        "DepositsInterestBearing",
        "ShortTermBorrowings",
    ],
    "retained_earnings": [
        "RetainedEarningsAccumulatedDeficit",
    ],
    "ebit": [
        "OperatingIncomeLoss",
        "IncomeLossFromContinuingOperationsBeforeIncomeTaxesExtraordinaryItemsNoncontrollingInterest",
        "NetIncomeLoss",
        "InterestAndDividendIncomeOperating",
        "NoninterestIncome",
    ],
    "total_liabilities": [
        "Liabilities",
    ],
    "revenue": [
        "Revenues",
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "SalesRevenueNet",
        "InterestAndDividendIncomeOperating",
        "NoninterestIncome",
        "InterestIncomeExpenseNet",
    ],
}

# ──────────────────────────────────────────────
#  Indian / International Ticker Detection
# ──────────────────────────────────────────────

# Well-known Indian company tickers (without suffix)
INDIAN_TICKERS = {
    "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "HINDUNILVR",
    "SBIN", "BHARTIARTL", "ITC", "KOTAKBANK", "AXISBANK",
    "BAJFINANCE", "MARUTI", "HCLTECH", "WIPRO", "ASIANPAINT",
    "SUNPHARMA", "TATAMOTORS", "TATASTEEL", "NTPC", "POWERGRID",
    "ULTRACEMCO", "NESTLEIND", "TITAN", "ADANIENT", "ADANIPORTS",
    "TECHM", "ONGC", "COALINDIA", "JSWSTEEL", "BAJAJFINSV",
    "DIVISLAB", "DRREDDY", "CIPLA", "BRITANNIA", "GRASIM",
    "HDFCLIFE", "SBILIFE", "INDUSINDBK", "HEROMOTOCO", "EICHERMOT",
    "APOLLOHOSP", "TATACONSUM", "BPCL", "HINDALCO",
}

# Known international exchange suffixes
EXCHANGE_SUFFIXES = {
    ".NS": "NSE (India)",
    ".BO": "BSE (India)",
    ".L": "LSE (London)",
    ".T": "TSE (Tokyo)",
    ".HK": "HKEX (Hong Kong)",
    ".DE": "XETRA (Germany)",
    ".PA": "Euronext Paris",
    ".AS": "Euronext Amsterdam",
    ".TO": "TSX (Toronto)",
    ".AX": "ASX (Australia)",
    ".SS": "SSE (Shanghai)",
    ".SZ": "SZSE (Shenzhen)",
    ".KS": "KRX (Korea)",
    ".SI": "SGX (Singapore)",
}


def is_international_ticker(ticker: str) -> bool:
    """Check if a ticker is for an international (non-US) market."""
    upper = ticker.upper()
    for suffix in EXCHANGE_SUFFIXES:
        if upper.endswith(suffix.upper()):
            return True
    if upper in INDIAN_TICKERS:
        return True
    return False


def normalize_ticker(ticker: str) -> str:
    """Auto-append exchange suffix for known markets.

    Rules:
        - Known Indian tickers without suffix -> append .NS (NSE is primary)
        - Already has a suffix -> keep as-is
        - Unknown -> keep as-is (assume US)
    """
    upper = ticker.upper()
    for suffix in EXCHANGE_SUFFIXES:
        if upper.endswith(suffix.upper()):
            return ticker
    if upper in INDIAN_TICKERS:
        return f"{upper}.NS"
    return ticker


# ──────────────────────────────────────────────
#  SEC EDGAR (US Companies)
# ──────────────────────────────────────────────

async def resolve_ticker_to_cik(ticker: str) -> tuple[str, str]:
    """Resolve a stock ticker to its SEC CIK number and company name."""
    url = "https://www.sec.gov/files/company_tickers.json"
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=SEC_HEADERS, timeout=20.0)
            resp.raise_for_status()
            data = resp.json()
    except httpx.ConnectTimeout:
        raise HTTPException(
            status_code=504,
            detail="SEC EDGAR connection timed out. Please try again.",
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=502,
            detail=f"SEC EDGAR returned error: {e.response.status_code}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Could not reach SEC EDGAR: {str(e)[:200]}",
        )

    ticker_upper = ticker.upper()
    for entry in data.values():
        if entry.get("ticker", "").upper() == ticker_upper:
            cik = str(entry["cik_str"]).zfill(10)
            name = entry.get("title", "")
            return cik, name

    raise HTTPException(
        status_code=404,
        detail=f"Ticker '{ticker}' not found in SEC EDGAR database.",
    )


async def get_company_facts(cik: str) -> dict:
    """Fetch all XBRL company facts from SEC EDGAR."""
    url = f"{SEC_EDGAR_BASE}/api/xbrl/companyfacts/CIK{cik}.json"
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=SEC_HEADERS, timeout=30.0)
        resp.raise_for_status()
        return resp.json()


def extract_latest_annual_value(facts: dict, concept_tags: list[str]) -> float | None:
    """Extract the most recent 10-K annual value for a given financial concept."""
    us_gaap = facts.get("facts", {}).get("us-gaap", {})

    for tag in concept_tags:
        concept = us_gaap.get(tag)
        if not concept:
            continue

        units = concept.get("units", {})
        values = units.get("USD", [])

        annual_values = [
            v for v in values
            if v.get("form") == "10-K" and v.get("val") is not None
        ]

        if not annual_values:
            continue

        annual_values.sort(key=lambda x: x.get("end", ""), reverse=True)
        return float(annual_values[0]["val"])

    return None


async def fetch_financial_data_from_edgar(ticker: str) -> FinancialData:
    """Fetch and assemble financial data from SEC EDGAR for Z-Score calculation."""
    cik, company_name = await resolve_ticker_to_cik(ticker)
    facts = await get_company_facts(cik)

    extracted = {}
    missing_fields = []

    for field, concepts in XBRL_CONCEPT_MAP.items():
        value = extract_latest_annual_value(facts, concepts)
        if value is not None:
            extracted[field] = value

    # Financial institution & unclassified balance sheet fallbacks
    if "total_assets" not in extracted:
        missing_fields.append("total_assets")
    if "total_liabilities" not in extracted:
        missing_fields.append("total_liabilities")
    if "revenue" not in extracted:
        missing_fields.append("revenue")

    if missing_fields:
        raise HTTPException(
            status_code=422,
            detail=f"Could not extract key metrics from {ticker}'s 10-K filing: "
                   f"{', '.join(missing_fields)}. Manual input may be required.",
        )

    if "current_assets" not in extracted:
        extracted["current_assets"] = extracted["total_assets"] * 0.25
    if "current_liabilities" not in extracted:
        extracted["current_liabilities"] = extracted["total_liabilities"] * 0.25
    if "retained_earnings" not in extracted:
        extracted["retained_earnings"] = 0.0
    if "ebit" not in extracted:
        extracted["ebit"] = 0.0
    if "market_cap" not in extracted:
        extracted["market_cap"] = extracted["total_assets"]

    return FinancialData(ticker=ticker.upper(), **extracted)


# ──────────────────────────────────────────────
#  10-K Full-Text Section Extraction
# ──────────────────────────────────────────────

def _strip_html_tags(html_text: str) -> str:
    """Remove HTML tags and decode entities from text."""
    clean = re.sub(r'<[^>]+>', ' ', html_text)
    clean = html_module.unescape(clean)
    clean = re.sub(r'\s+', ' ', clean).strip()
    return clean


def _extract_section(text: str, start_pattern: str, end_pattern: str) -> str:
    """Extract a section from 10-K text between two Item markers."""
    pattern = re.compile(
        rf'{start_pattern}(.*?){end_pattern}',
        re.IGNORECASE | re.DOTALL
    )
    match = pattern.search(text)
    if match:
        section_text = match.group(1).strip()
        return section_text[:15000] if len(section_text) > 15000 else section_text
    return ""


async def fetch_10k_text_sections(ticker: str) -> dict[str, str]:
    """Fetch and extract key text sections from the latest 10-K filing."""
    cik, _ = await resolve_ticker_to_cik(ticker)

    async with httpx.AsyncClient(follow_redirects=True) as client:
        sub_url = f"{SEC_EDGAR_BASE}/submissions/CIK{cik}.json"
        resp = await client.get(sub_url, headers=SEC_HEADERS, timeout=20.0)
        resp.raise_for_status()
        submissions = resp.json()

        recent = submissions.get("filings", {}).get("recent", {})
        forms = recent.get("form", [])
        accession_numbers = recent.get("accessionNumber", [])
        primary_docs = recent.get("primaryDocument", [])

        filing_url = None
        for i, form in enumerate(forms):
            if form == "10-K" and i < len(accession_numbers) and i < len(primary_docs):
                acc = accession_numbers[i].replace("-", "")
                doc = primary_docs[i]
                filing_url = f"{SEC_EDGAR_BASE}/Archives/edgar/data/{cik.lstrip('0')}/{acc}/{doc}"
                break

        if not filing_url:
            return {"risk_factors": "", "mda": "", "error": "No 10-K filing found"}

        doc_resp = await client.get(filing_url, headers=SEC_HEADERS, timeout=30.0)
        doc_resp.raise_for_status()
        raw_html = doc_resp.text

    plain_text = _strip_html_tags(raw_html)

    risk_factors = _extract_section(
        plain_text,
        r'item\s*1a[\.\:\s]*risk\s*factors',
        r'item\s*(?:1b|2)[\.\:\s]'
    )

    mda = _extract_section(
        plain_text,
        r'item\s*7[\.\:\s]*management[\'\u2019]?s?\s*discussion',
        r'item\s*(?:7a|8)[\.\:\s]'
    )

    return {
        "risk_factors": risk_factors,
        "mda": mda,
    }


# ──────────────────────────────────────────────
#  Yahoo Finance via yfinance (Global Markets)
# ──────────────────────────────────────────────

def _fetch_yahoo_httpx(ticker: str) -> FinancialData:
    """Pure httpx fallback for Yahoo Finance when yfinance library or pandas C-extensions are blocked."""
    normalized = normalize_ticker(ticker)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        with httpx.Client(headers=headers, follow_redirects=True, timeout=15.0) as client:
            client.get("https://fc.yahoo.com")
            crumb_resp = client.get("https://query1.finance.yahoo.com/v1/test/getcrumb")
            crumb = crumb_resp.text.strip()
            url = f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{normalized}?modules=financialData,balanceSheetHistory,incomeStatementHistory,summaryDetail,defaultKeyStatistics&crumb={crumb}"
            resp = client.get(url)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail=f"Yahoo Finance request failed for '{normalized}'.")

            data = resp.json().get("quoteSummary", {}).get("result", [{}])[0]
            bs_list = data.get("balanceSheetHistory", {}).get("balanceSheetStatements", [{}])
            fin_list = data.get("incomeStatementHistory", {}).get("incomeStatementHistory", [{}])
            stats = data.get("defaultKeyStatistics", {})
            fin_data = data.get("financialData", {})
            summary = data.get("summaryDetail", {})

            bs = bs_list[0] if bs_list else {}
            fin = fin_list[0] if fin_list else {}

            def val(d, key):
                item = d.get(key)
                if isinstance(item, dict): return item.get("raw")
                return item

            total_assets = val(bs, "totalAssets")
            current_assets = val(bs, "totalCurrentAssets") or val(fin_data, "totalCash")
            current_liabilities = val(bs, "totalCurrentLiabilities") or val(fin_data, "totalDebt")
            retained_earnings = val(bs, "retainedEarnings") or 0.0
            total_liabilities = val(bs, "totalLiab") or val(fin_data, "totalDebt")
            ebit = val(fin, "ebit") or val(fin, "operatingIncome") or 0.0
            revenue = val(fin, "totalRevenue") or val(fin_data, "totalRevenue")
            market_cap = val(stats, "marketCap") or val(summary, "marketCap") or val(fin_data, "marketCap")

            if total_assets is None and total_liabilities is not None:
                total_assets = total_liabilities * 1.15
            if current_assets is None and total_assets is not None:
                current_assets = total_assets * 0.25
            if current_liabilities is None and total_liabilities is not None:
                current_liabilities = total_liabilities * 0.25
            if market_cap is None:
                market_cap = total_assets or 1_000_000

            if total_assets is None or total_liabilities is None or revenue is None:
                raise HTTPException(status_code=422, detail=f"Could not extract key metrics for '{normalized}' from Yahoo Finance.")

            return FinancialData(
                ticker=normalized.upper(),
                total_assets=float(total_assets),
                current_assets=float(current_assets),
                current_liabilities=float(current_liabilities),
                retained_earnings=float(retained_earnings),
                ebit=float(ebit),
                market_cap=float(market_cap),
                total_liabilities=float(total_liabilities),
                revenue=float(revenue),
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Yahoo Finance fetch failed for '{normalized}': {str(e)[:300]}")


def fetch_financial_data_yahoo(ticker: str) -> FinancialData:
    """Fetch financial data from Yahoo Finance using yfinance or pure httpx fallback."""
    normalized = normalize_ticker(ticker)

    try:
        import yfinance as yf
        stock = yf.Ticker(normalized)
        info = stock.info
        bs = stock.balance_sheet
        financials = stock.financials

        if bs is None or bs.empty:
            return _fetch_yahoo_httpx(ticker)

        latest_bs = bs.iloc[:, 0] if not bs.empty else {}
        latest_fin = financials.iloc[:, 0] if financials is not None and not financials.empty else {}

        def safe_get(series, keys, default=None):
            if hasattr(series, 'get'):
                for key in keys:
                    val = series.get(key)
                    if val is not None and str(val) != 'nan':
                        return float(val)
            return default

        total_assets = safe_get(latest_bs, ["Total Assets", "TotalAssets"])
        current_assets = safe_get(latest_bs, ["Current Assets", "CurrentAssets"])
        current_liabilities = safe_get(latest_bs, ["Current Liabilities", "CurrentLiabilities"])
        retained_earnings = safe_get(latest_bs, ["Retained Earnings", "RetainedEarnings"])
        total_liabilities = safe_get(latest_bs, ["Total Liabilities Net Minority Interest", "Total Liab", "TotalLiabilitiesNetMinorityInterest"])
        ebit = safe_get(latest_fin, ["EBIT", "Operating Income", "OperatingIncome"])
        revenue = safe_get(latest_fin, ["Total Revenue", "TotalRevenue", "Revenue"])
        market_cap = info.get("marketCap")

        missing = []
        if total_assets is None: missing.append("total_assets")
        if current_assets is None: missing.append("current_assets")
        if current_liabilities is None: missing.append("current_liabilities")
        if total_liabilities is None: missing.append("total_liabilities")
        if revenue is None: missing.append("revenue")

        if missing:
            return _fetch_yahoo_httpx(ticker)

        if retained_earnings is None:
            retained_earnings = 0.0
        if ebit is None:
            ebit = 0.0
        if market_cap is None:
            market_cap = total_assets

        return FinancialData(
            ticker=normalized.upper(),
            total_assets=total_assets,
            current_assets=current_assets,
            current_liabilities=current_liabilities,
            retained_earnings=retained_earnings,
            ebit=ebit,
            market_cap=float(market_cap),
            total_liabilities=total_liabilities,
            revenue=revenue,
        )

    except HTTPException:
        raise
    except Exception:
        # Fallback to direct pure-httpx Yahoo fetch
        return _fetch_yahoo_httpx(ticker)


async def fetch_financial_data_auto(ticker: str) -> tuple[FinancialData, str]:
    """Smart routing: fetch from SEC EDGAR (US) or Yahoo Finance (international)."""
    if is_international_ticker(ticker):
        data = fetch_financial_data_yahoo(ticker)
        return data, "Yahoo Finance"
    else:
        try:
            data = await fetch_financial_data_from_edgar(ticker)
            return data, "SEC EDGAR"
        except HTTPException:
            try:
                data = fetch_financial_data_yahoo(ticker)
                return data, "Yahoo Finance (fallback)"
            except HTTPException:
                raise


# ──────────────────────────────────────────────
#  API Endpoints
# ──────────────────────────────────────────────

@router.get(
    "/company/{ticker}",
    response_model=CompanyInfo,
    summary="Get Company Info",
    description="Resolve a stock ticker to company information.",
)
async def api_company_info(ticker: str) -> CompanyInfo:
    if is_international_ticker(ticker):
        try:
            import yfinance as yf
            normalized = normalize_ticker(ticker)
            stock = yf.Ticker(normalized)
            info = stock.info
            name = info.get("longName") or info.get("shortName") or normalized
            return CompanyInfo(
                ticker=normalized.upper(),
                name=name,
                cik=None,
                sector=info.get("sector"),
            )
        except Exception:
            return CompanyInfo(ticker=ticker.upper(), name=ticker.upper())
    else:
        cik, name = await resolve_ticker_to_cik(ticker)
        return CompanyInfo(ticker=ticker.upper(), name=name, cik=cik)


@router.get(
    "/financials/{ticker}",
    response_model=FinancialData,
    summary="Fetch Financial Data (Auto-Routed)",
    description="Fetch the latest financial data for a company. "
                "Automatically routes US tickers to SEC EDGAR and international tickers "
                "(BSE/NSE/LSE etc.) to Yahoo Finance.",
)
async def api_financials(ticker: str) -> FinancialData:
    data, _ = await fetch_financial_data_auto(ticker)
    return data


@router.get(
    "/financials-global/{ticker}",
    response_model=FinancialData,
    summary="Fetch Global Financial Data (Yahoo Finance)",
    description="Fetch financial data from Yahoo Finance. "
                "Supports all major world exchanges including BSE (.BO) and NSE (.NS).",
)
async def api_financials_global(ticker: str) -> FinancialData:
    return fetch_financial_data_yahoo(ticker)
