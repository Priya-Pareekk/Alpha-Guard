"""
Alpha-Guard — Forensic AI Analyzer
====================================
Intelligence layer using Google Gemini API to analyze 10-K filing text.

Capabilities:
  1. Hedging & Evasion Detection — keyword frequency analysis
  2. Sentiment Analysis via Gemini — MD&A tone classification
  3. Sentiment Gap Detection — divergence between narrative and Z-Score
  4. Truth Score — composite credibility metric (0-100)
"""

import os
import re
import json
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException

from models import (
    ForensicRequest,
    ForensicResult,
    ForensicAuditResponse,
    LinguisticAnalysis,
    RedFlag,
    ZScoreResult,
)

router = APIRouter(prefix="/api/risk", tags=["Forensic AI Analysis"])

# ──────────────────────────────────────────────
#  Hedging & Evasion Lexicon
# ──────────────────────────────────────────────

HEDGING_WORDS = [
    "uncertain", "uncertainty", "might", "potentially", "could",
    "may", "approximately", "subject to", "possible", "possibly",
    "expected", "anticipate", "believe", "estimate", "intend",
    "likely", "unlikely", "probable", "contingent", "assume",
    "assumed", "risk", "risks", "cannot assure", "no assurance",
    "there can be no", "forward-looking", "cautionary",
]

EVASION_PHRASES = [
    "we believe", "management believes", "in our opinion",
    "to our knowledge", "as far as we know", "we expect",
    "we anticipate", "we are not aware", "we cannot predict",
    "results may vary", "past performance", "no guarantee",
    "subject to change", "among other things", "from time to time",
]


def compute_hedging_score(text: str) -> tuple[float, list[str]]:
    """Analyze text for hedging language density.

    Returns:
        Tuple of (hedging_score 0-100, list of hedging words found)
    """
    text_lower = text.lower()
    words = text_lower.split()
    total_words = len(words) if words else 1

    found_words = []
    hedge_count = 0

    for hedge in HEDGING_WORDS:
        occurrences = text_lower.count(hedge)
        if occurrences > 0:
            hedge_count += occurrences
            found_words.append(f"{hedge} ({occurrences}x)")

    # Hedging density: normalize by total words, scale to 0-100
    # Typical 10-K has ~1-3% hedging density; >5% is extreme
    density = (hedge_count / total_words) * 100
    score = min(100, density * 20)  # Scale so 5% density = 100

    return round(score, 1), found_words


def compute_evasion_score(text: str) -> float:
    """Analyze text for evasive language patterns.

    Returns:
        Evasion score 0-100
    """
    text_lower = text.lower()
    words = text_lower.split()
    total_words = len(words) if words else 1

    evasion_count = sum(text_lower.count(phrase) for phrase in EVASION_PHRASES)

    density = (evasion_count / total_words) * 100
    score = min(100, density * 30)

    return round(score, 1)


# ──────────────────────────────────────────────
#  Gemini API Integration
# ──────────────────────────────────────────────

GEMINI_ANALYSIS_PROMPT = """You are a forensic financial analyst AI. Analyze the following Management Discussion & Analysis (MD&A) text from a 10-K SEC filing.

Your task:
1. Determine the overall SENTIMENT of management's narrative: "bullish", "neutral", or "bearish"
2. Rate your confidence in this sentiment classification (0.0 to 1.0)
3. Identify the TOP 5 most suspicious or misleading sentences — those that:
   - Use excessive hedging or vague language to obscure bad news
   - Make optimistic claims not supported by typical financial fundamentals
   - Contradict common financial knowledge or seem evasive
   - Use complex language to hide simple negative facts

For each suspicious sentence, provide:
- The exact sentence (quoted from the text)
- A category: "hedging", "evasion", "sentiment_gap", or "inconsistency"
- A severity rating (1-10, where 10 is most severe)
- A brief explanation of why it's suspicious

Respond ONLY with valid JSON in this exact format:
{
  "sentiment": "bullish" | "neutral" | "bearish",
  "confidence": 0.0-1.0,
  "suspicious_sentences": [
    {
      "sentence": "exact quote",
      "category": "hedging|evasion|sentiment_gap|inconsistency",
      "severity": 1-10,
      "explanation": "why this is suspicious"
    }
  ]
}

MD&A TEXT:
"""


async def call_gemini_analysis(mda_text: str) -> dict:
    """Call Gemini API to analyze MD&A text for forensic insights.

    Uses google-genai package with gemini-2.0-flash model.

    Returns:
        Parsed JSON dict with sentiment, confidence, and suspicious_sentences.
    """
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        # Return a structured fallback when no API key is configured
        return {
            "sentiment": "neutral",
            "confidence": 0.5,
            "suspicious_sentences": [
                {
                    "sentence": "GEMINI_API_KEY not configured — using heuristic analysis only.",
                    "category": "evasion",
                    "severity": 1,
                    "explanation": "Set GEMINI_API_KEY environment variable to enable AI-powered analysis."
                }
            ],
            "_fallback": True,
        }

    try:
        from google import genai

        client = genai.Client(api_key=api_key)

        # Truncate text to stay within token limits (~30k chars ≈ ~8k tokens)
        truncated_text = mda_text[:30000]
        prompt = GEMINI_ANALYSIS_PROMPT + truncated_text

        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )

        # Parse the JSON response
        response_text = response.text.strip()

        # Strip markdown code fences if present
        if response_text.startswith("```"):
            response_text = re.sub(r"^```(?:json)?\s*", "", response_text)
            response_text = re.sub(r"\s*```$", "", response_text)

        return json.loads(response_text)

    except ImportError:
        return {
            "sentiment": "neutral",
            "confidence": 0.3,
            "suspicious_sentences": [],
            "_fallback": True,
            "_error": "google-genai package not installed. Run: pip install google-genai",
        }
    except Exception as e:
        return {
            "sentiment": "neutral",
            "confidence": 0.3,
            "suspicious_sentences": [],
            "_fallback": True,
            "_error": f"Gemini API error: {str(e)}",
        }


# ──────────────────────────────────────────────
#  Sentiment Gap & Deception Detection
# ──────────────────────────────────────────────

def detect_sentiment_gap(
    narrative_sentiment: str,
    z_score_zone: str,
) -> tuple[bool, str | None, float]:
    """Compare narrative sentiment against Z-Score financial reality.

    Returns:
        Tuple of (deception_alert, reason, gap_penalty)
    """
    # Sentiment-to-numeric mapping
    sentiment_map = {"bullish": 1, "neutral": 0, "bearish": -1}
    zone_sentiment_map = {"Safe": 1, "Gray": 0, "Distress": -1}

    narrative_val = sentiment_map.get(narrative_sentiment, 0)
    financial_val = zone_sentiment_map.get(z_score_zone, 0)

    gap = narrative_val - financial_val  # Positive = narrative more optimistic than reality

    if gap >= 2:
        # Management is bullish but company is in Distress
        return (
            True,
            f"CRITICAL: Management narrative is '{narrative_sentiment}' but financial analysis "
            f"shows the company is in the '{z_score_zone}' zone. This divergence suggests "
            f"potential misrepresentation of financial health in public filings.",
            40.0,
        )
    elif gap == 1:
        return (
            False,
            f"CAUTION: Mild optimism bias detected — management tone is '{narrative_sentiment}' "
            f"while financial zone is '{z_score_zone}'.",
            15.0,
        )
    else:
        return False, None, 0.0


# ──────────────────────────────────────────────
#  Truth Score Computation
# ──────────────────────────────────────────────

# The function compute_truth_score is now deprecated as we map directly to ai_confidence_score


# ──────────────────────────────────────────────
#  Main Analysis Pipeline
# ──────────────────────────────────────────────

async def analyze_filing_text(
    mda_text: str,
    risk_factors_text: str,
    z_score_result: ZScoreResult | None = None,
) -> ForensicResult:
    """Full forensic analysis pipeline.

    Steps:
        1. Compute hedging & evasion scores from Risk Factors text
        2. Call Gemini API for MD&A sentiment analysis
        3. Detect sentiment gap vs Z-Score zone
        4. Compute composite Truth Score
        5. Merge all findings into ForensicResult
    """
    # 1. Hedging & Evasion on Risk Factors section
    combined_text = risk_factors_text + " " + mda_text
    hedging_score, hedging_words = compute_hedging_score(combined_text)
    evasion_score = compute_evasion_score(combined_text)
    total_words = len(combined_text.split())

    # 2. Gemini AI analysis on MD&A
    gemini_result = await call_gemini_analysis(mda_text)
    sentiment = gemini_result.get("sentiment", "neutral")
    confidence = gemini_result.get("confidence", 0.5)

    # Parse suspicious sentences from Gemini
    red_flags: list[RedFlag] = []
    for item in gemini_result.get("suspicious_sentences", []):
        try:
            red_flags.append(RedFlag(
                sentence=item.get("sentence", ""),
                category=item.get("category", "inconsistency"),
                severity=max(1, min(10, item.get("severity", 5))),
                explanation=item.get("explanation", ""),
            ))
        except Exception:
            continue

    # 3. Sentiment gap detection
    z_zone = z_score_result.zone if z_score_result else "Gray"
    deception_alert, deception_reason, gap_penalty = detect_sentiment_gap(sentiment, z_zone)

    # If deception alert triggered, add it as a critical red flag
    if deception_alert and deception_reason:
        red_flags.insert(0, RedFlag(
            sentence=deception_reason,
            category="sentiment_gap",
            severity=10,
            explanation="Management narrative significantly diverges from quantitative financial reality.",
        ))

    # 4. Compute Truth Score
    # Map directly to Gemini's ai_confidence_score per User Mission
    if gemini_result.get("_fallback"):
        truth_score = None
        truth_zone = None
    else:
        truth_score = int(confidence * 100)
        if truth_score >= 70:
            truth_zone = "Credible"
        elif truth_score >= 40:
            truth_zone = "Suspicious"
        else:
            truth_zone = "Deceptive"

    # 5. Assemble result
    linguistic = LinguisticAnalysis(
        hedging_score=hedging_score,
        evasion_score=evasion_score,
        sentiment=sentiment,
        sentiment_confidence=confidence,
        hedging_words_found=hedging_words,
        suspicious_sentences=red_flags,
        total_words_analyzed=total_words,
    )

    return ForensicResult(
        truth_score=truth_score,
        truth_zone=truth_zone,
        linguistic_analysis=linguistic,
        red_flags=red_flags,
        deception_alert=deception_alert,
        deception_reason=deception_reason,
        z_score_result=z_score_result,
        ai_confidence_score=confidence if not gemini_result.get("_fallback") else None,
    )


# ──────────────────────────────────────────────
#  API Endpoint
# ──────────────────────────────────────────────

@router.post(
    "/forensic-audit",
    response_model=ForensicAuditResponse,
    summary="Run Forensic AI Audit",
    description=(
        "Full forensic audit pipeline: fetches 10-K filing text, runs Altman Z-Score, "
        "and performs AI-powered linguistic analysis to compute a Truth Score and detect deception. "
        "Merges quantitative financial analysis with qualitative narrative forensics."
    ),
)
async def api_forensic_audit(request: ForensicRequest) -> ForensicAuditResponse:
    """Orchestrate the complete forensic audit pipeline."""
    from scraper import resolve_ticker_to_cik, fetch_financial_data_auto, fetch_10k_text_sections, is_international_ticker
    from risk_engine import calculate_altman_z_score

    ticker = request.ticker.upper()
    data_sources = []
    international = is_international_ticker(ticker)

    # Step 1: Resolve company info
    company_name = ticker
    if not international:
        try:
            cik, company_name = await resolve_ticker_to_cik(ticker)
        except Exception:
            company_name = ticker
    else:
        try:
            import yfinance as yf
            from scraper import normalize_ticker
            normalized = normalize_ticker(ticker)
            stock = yf.Ticker(normalized)
            info = stock.info
            company_name = info.get("longName") or info.get("shortName") or ticker
        except Exception:
            company_name = ticker

    # Step 2: Fetch financial data and compute Z-Score
    z_score_result = None
    try:
        financial_data, source = await fetch_financial_data_auto(ticker)
        z_score_result = calculate_altman_z_score(financial_data)
        data_sources.append(f"{source} — Financial Data")
    except Exception as e:
        data_sources.append(f"Financial data unavailable: {str(e)[:100]}")

    # Step 3: Fetch 10-K text sections (US only — no SEC filings for international)
    mda_text = ""
    risk_factors_text = ""
    if not international:
        try:
            sections = await fetch_10k_text_sections(ticker)
            mda_text = sections.get("mda", "")
            risk_factors_text = sections.get("risk_factors", "")
            if mda_text or risk_factors_text:
                data_sources.append("SEC EDGAR — 10-K Filing Text")
        except Exception as e:
            data_sources.append(f"SEC EDGAR — Filing text unavailable: {str(e)[:100]}")
    else:
        data_sources.append("International ticker — 10-K text not available (SEC filings are US-only)")

    # If no text is available, provide a meaningful fallback
    if not mda_text and not risk_factors_text:
        mda_text = (
            "Filing text could not be retrieved. The forensic analysis will proceed "
            "with limited data. Consider manually providing filing text for comprehensive analysis."
        )
        risk_factors_text = ""

    # Step 4: Run forensic analysis
    forensic_result = await analyze_filing_text(mda_text, risk_factors_text, z_score_result)

    # Step 5: Check for Gemini API
    gemini_active = bool(os.getenv("GEMINI_API_KEY"))
    if gemini_active:
        data_sources.append("Google Gemini 2.0 Flash — AI Analysis")
    else:
        data_sources.append("Heuristic Analysis (set GEMINI_API_KEY for AI-powered insights)")

    return ForensicAuditResponse(
        ticker=ticker,
        company_name=company_name,
        timestamp=datetime.now(timezone.utc).isoformat(),
        forensic=forensic_result,
        data_sources=data_sources,
        gemini_active=gemini_active,
    )
