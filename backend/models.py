"""
Alpha-Guard — Pydantic Models for Financial Data & Risk Analysis
"""

from pydantic import BaseModel, Field
from typing import Optional


class CompanyInfo(BaseModel):
    """Basic company identification."""
    ticker: str = Field(..., description="Stock ticker symbol", examples=["AAPL"])
    name: Optional[str] = Field(None, description="Company name")
    cik: Optional[str] = Field(None, description="SEC Central Index Key")
    sector: Optional[str] = Field(None, description="Industry sector")


class FinancialData(BaseModel):
    """Core financial metrics required for Z-Score and risk calculations.

    All monetary values should be in the same currency (typically USD).
    Values are expected from the most recent annual filing (10-K).
    """
    ticker: str = Field(..., description="Stock ticker symbol")
    total_assets: float = Field(..., gt=0, description="Total Assets")
    current_assets: float = Field(..., ge=0, description="Total Current Assets")
    current_liabilities: float = Field(..., ge=0, description="Total Current Liabilities")
    retained_earnings: float = Field(..., description="Retained Earnings (can be negative)")
    ebit: float = Field(..., description="Earnings Before Interest and Taxes")
    market_cap: float = Field(..., gt=0, description="Market Value of Equity")
    total_liabilities: float = Field(..., gt=0, description="Total Liabilities")
    revenue: float = Field(..., ge=0, description="Total Revenue / Net Sales")


class ZScoreComponents(BaseModel):
    """Individual Z-Score component ratios."""
    x1_working_capital_to_total_assets: float = Field(..., description="Working Capital / Total Assets")
    x2_retained_earnings_to_total_assets: float = Field(..., description="Retained Earnings / Total Assets")
    x3_ebit_to_total_assets: float = Field(..., description="EBIT / Total Assets")
    x4_market_cap_to_total_liabilities: float = Field(..., description="Market Cap / Total Liabilities")
    x5_revenue_to_total_assets: float = Field(..., description="Revenue / Total Assets")


class ZScoreResult(BaseModel):
    """Result of an Altman Z-Score calculation."""
    ticker: str
    score: float = Field(..., description="Computed Altman Z-Score")
    zone: str = Field(..., description="Risk zone: Safe, Gray, or Distress")
    components: ZScoreComponents
    interpretation: str = Field(..., description="Human-readable risk assessment")


class MonteCarloInput(BaseModel):
    """Input parameters for Monte Carlo simulation."""
    ticker: str = Field(..., description="Stock ticker symbol")
    num_simulations: int = Field(default=10_000, ge=100, le=100_000, description="Number of simulation paths")
    time_horizon_years: int = Field(default=3, ge=1, le=10, description="Forecast horizon in years")
    initial_revenue: Optional[float] = Field(None, description="Starting revenue (auto-fetched if omitted)")
    revenue_growth_mean: float = Field(default=0.05, description="Mean annual revenue growth rate")
    revenue_growth_std: float = Field(default=0.15, description="Std dev of annual revenue growth rate")


class MonteCarloResult(BaseModel):
    """Result of a Monte Carlo simulation with charting data."""
    ticker: str
    num_simulations: int
    time_horizon_years: int
    mean_final_revenue: Optional[float] = None
    median_final_revenue: Optional[float] = None
    percentile_5: Optional[float] = None
    percentile_95: Optional[float] = None
    probability_of_decline: Optional[float] = Field(None, description="P(revenue decline > 20%)")
    status: str = Field(default="active", description="Simulation status")
    # Charting data
    histogram: list[dict] = Field(default_factory=list, description="Revenue distribution bins [{range, count, pct}]")
    sample_paths: list[dict] = Field(default_factory=list, description="Sample revenue paths [{year, p5, p25, median, p75, p95, mean}]")
    initial_revenue: Optional[float] = None


# ──────────────────────────────────────────────
#  Forensic AI Analysis Models
# ──────────────────────────────────────────────

class ForensicRequest(BaseModel):
    """Input for the forensic audit pipeline."""
    ticker: str = Field(..., description="Stock ticker symbol", examples=["AAPL"])


class RedFlag(BaseModel):
    """An individual suspicious finding from linguistic analysis."""
    sentence: str = Field(..., description="The suspicious sentence or phrase")
    category: str = Field(..., description="Type: hedging, evasion, sentiment_gap, or inconsistency")
    severity: int = Field(..., ge=1, le=10, description="Severity rating 1-10")
    explanation: str = Field(..., description="AI-generated explanation of why this is suspicious")


class LinguisticAnalysis(BaseModel):
    """Linguistic metrics from the 10-K text analysis."""
    hedging_score: float = Field(..., ge=0, le=100, description="Hedging density score (0=none, 100=extreme)")
    evasion_score: float = Field(..., ge=0, le=100, description="Evasion language score")
    sentiment: str = Field(..., description="Overall MD&A sentiment: bullish, neutral, or bearish")
    sentiment_confidence: float = Field(..., ge=0, le=1, description="Confidence in sentiment classification")
    hedging_words_found: list[str] = Field(default_factory=list, description="List of hedging words detected")
    suspicious_sentences: list[RedFlag] = Field(default_factory=list, description="Flagged sentences with explanations")
    total_words_analyzed: int = Field(default=0, description="Total word count analyzed")


class ForensicResult(BaseModel):
    """Complete forensic analysis output merging AI insights with financial math."""
    truth_score: Optional[int] = Field(None, ge=0, le=100, description="Overall Truth Score (0=deceptive, 100=credible)")
    truth_zone: Optional[str] = Field(None, description="Zone: Credible, Suspicious, or Deceptive")
    linguistic_analysis: LinguisticAnalysis
    red_flags: list[RedFlag] = Field(default_factory=list, description="All detected red flags")
    deception_alert: bool = Field(default=False, description="True if sentiment diverges from financial reality")
    deception_reason: Optional[str] = Field(None, description="Explanation for deception alert")
    z_score_result: Optional[ZScoreResult] = Field(None, description="Merged Z-Score financial analysis")
    ai_confidence_score: Optional[float] = Field(None, ge=0, le=1, description="Gemini AI confidence score (0-1). None if AI not yet run.")


class ForensicAuditResponse(BaseModel):
    """Top-level response for the forensic audit endpoint."""
    ticker: str
    company_name: Optional[str] = None
    timestamp: str = Field(..., description="ISO 8601 timestamp of analysis")
    forensic: ForensicResult
    data_sources: list[str] = Field(default_factory=list, description="Data sources used")
    gemini_active: bool = Field(default=False, description="Whether Gemini AI was used for this analysis")
