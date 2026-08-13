"""
Alpha-Guard — Risk Engine
=========================
Financial risk analysis engine implementing:
  1. Altman Z-Score (full calculation with zone classification)
  2. Monte Carlo Simulation (placeholder for stochastic revenue modeling)
"""

import numpy as np
from fastapi import APIRouter, HTTPException

from models import FinancialData, ZScoreResult, ZScoreComponents, MonteCarloInput, MonteCarloResult

router = APIRouter(prefix="/api/risk", tags=["Risk Analysis"])

# ──────────────────────────────────────────────
#  Altman Z-Score
# ──────────────────────────────────────────────

# Weighted coefficients for the original Altman Z-Score model
# Designed for publicly traded manufacturing companies
ALTMAN_WEIGHTS = {
    "x1": 1.2,   # Working Capital / Total Assets
    "x2": 1.4,   # Retained Earnings / Total Assets
    "x3": 3.3,   # EBIT / Total Assets
    "x4": 0.6,   # Market Value of Equity / Total Liabilities
    "x5": 1.0,   # Sales / Total Assets
}

# Risk zone thresholds
SAFE_THRESHOLD = 2.99
DISTRESS_THRESHOLD = 1.81


def classify_zone(score: float) -> tuple[str, str]:
    """Classify Z-Score into risk zones with human-readable interpretation.

    Returns:
        Tuple of (zone_name, interpretation_string)
    """
    if score > SAFE_THRESHOLD:
        return (
            "Safe",
            f"Z-Score of {score:.2f} indicates strong financial health. "
            "The company is in the Safe Zone with low bankruptcy probability."
        )
    elif score > DISTRESS_THRESHOLD:
        return (
            "Gray",
            f"Z-Score of {score:.2f} places the company in the Gray Zone. "
            "Financial health is uncertain — further analysis is recommended."
        )
    else:
        return (
            "Distress",
            f"Z-Score of {score:.2f} signals significant financial distress. "
            "The company is in the Distress Zone with elevated bankruptcy risk within 2 years."
        )


def calculate_altman_z_score(data: FinancialData) -> ZScoreResult:
    """Calculate the Altman Z-Score for a publicly traded company.

    Formula:
        Z = 1.2·X1 + 1.4·X2 + 3.3·X3 + 0.6·X4 + 1.0·X5

    Where:
        X1 = (Current Assets − Current Liabilities) / Total Assets
        X2 = Retained Earnings / Total Assets
        X3 = EBIT / Total Assets
        X4 = Market Value of Equity / Total Liabilities
        X5 = Revenue / Total Assets

    Raises:
        ValueError: If total_assets or total_liabilities are zero/negative.
    """
    if data.total_assets <= 0:
        raise ValueError("Total assets must be positive for Z-Score calculation.")
    if data.total_liabilities <= 0:
        raise ValueError("Total liabilities must be positive for Z-Score calculation.")

    # Compute the 5 component ratios
    working_capital = data.current_assets - data.current_liabilities
    x1 = working_capital / data.total_assets
    x2 = data.retained_earnings / data.total_assets
    x3 = data.ebit / data.total_assets
    x4 = data.market_cap / data.total_liabilities
    x5 = data.revenue / data.total_assets

    # Weighted sum
    score = (
        ALTMAN_WEIGHTS["x1"] * x1
        + ALTMAN_WEIGHTS["x2"] * x2
        + ALTMAN_WEIGHTS["x3"] * x3
        + ALTMAN_WEIGHTS["x4"] * x4
        + ALTMAN_WEIGHTS["x5"] * x5
    )

    zone, interpretation = classify_zone(score)

    return ZScoreResult(
        ticker=data.ticker,
        score=round(score, 4),
        zone=zone,
        components=ZScoreComponents(
            x1_working_capital_to_total_assets=round(x1, 6),
            x2_retained_earnings_to_total_assets=round(x2, 6),
            x3_ebit_to_total_assets=round(x3, 6),
            x4_market_cap_to_total_liabilities=round(x4, 6),
            x5_revenue_to_total_assets=round(x5, 6),
        ),
        interpretation=interpretation,
    )


# ──────────────────────────────────────────────
#  Monte Carlo Simulation (Placeholder)
# ──────────────────────────────────────────────

def run_monte_carlo_simulation(params: MonteCarloInput) -> MonteCarloResult:
    """Run a Monte Carlo simulation for revenue forecasting.

    Uses geometric Brownian motion to simulate N revenue paths over T years.
    Returns summary stats, histogram distribution, and percentile bands.
    """
    np.random.seed(None)  # Use random seed for real simulations

    initial_revenue = params.initial_revenue or 1_000_000.0
    n = params.num_simulations
    t = params.time_horizon_years
    mu = params.revenue_growth_mean
    sigma = params.revenue_growth_std

    # Geometric Brownian Motion: S(t+1) = S(t) * exp((mu - 0.5*sigma^2) + sigma*Z)
    drift = mu - 0.5 * sigma ** 2
    random_shocks = np.random.normal(0, 1, size=(n, t))
    log_returns = drift + sigma * random_shocks
    cumulative_returns = np.cumsum(log_returns, axis=1)

    # Revenue matrix: each row is a simulation, each col is a year
    revenue_matrix = initial_revenue * np.exp(
        np.hstack([np.zeros((n, 1)), cumulative_returns])
    )  # shape: (n, t+1) — includes year 0

    # Final revenues
    final_revenues = revenue_matrix[:, -1]

    # Summary stats
    decline_threshold = initial_revenue * 0.80
    prob_decline = float(np.mean(final_revenues < decline_threshold))

    # Build histogram (20 bins)
    hist_counts, bin_edges = np.histogram(final_revenues, bins=20)
    histogram = []
    for i in range(len(hist_counts)):
        low = bin_edges[i]
        high = bin_edges[i + 1]
        histogram.append({
            "range": f"${low / 1e6:.0f}M-${high / 1e6:.0f}M" if initial_revenue > 1e6 else f"${low:,.0f}-${high:,.0f}",
            "count": int(hist_counts[i]),
            "pct": round(float(hist_counts[i]) / n * 100, 1),
            "midpoint": round(float((low + high) / 2), 2),
        })

    # Build percentile paths (year 0 through year T)
    sample_paths = []
    for year_idx in range(t + 1):
        col = revenue_matrix[:, year_idx]
        sample_paths.append({
            "year": year_idx,
            "p5": round(float(np.percentile(col, 5)), 2),
            "p25": round(float(np.percentile(col, 25)), 2),
            "median": round(float(np.percentile(col, 50)), 2),
            "p75": round(float(np.percentile(col, 75)), 2),
            "p95": round(float(np.percentile(col, 95)), 2),
            "mean": round(float(np.mean(col)), 2),
        })

    return MonteCarloResult(
        ticker=params.ticker,
        num_simulations=n,
        time_horizon_years=t,
        mean_final_revenue=round(float(np.mean(final_revenues)), 2),
        median_final_revenue=round(float(np.median(final_revenues)), 2),
        percentile_5=round(float(np.percentile(final_revenues, 5)), 2),
        percentile_95=round(float(np.percentile(final_revenues, 95)), 2),
        probability_of_decline=round(prob_decline, 4),
        status="active",
        histogram=histogram,
        sample_paths=sample_paths,
        initial_revenue=initial_revenue,
    )


# ──────────────────────────────────────────────
#  API Endpoints
# ──────────────────────────────────────────────

@router.post(
    "/z-score",
    response_model=ZScoreResult,
    summary="Calculate Altman Z-Score",
    description="Compute the Altman Z-Score for a company given its financial metrics. "
                "Returns the score, risk zone classification, component ratios, and interpretation.",
)
async def api_z_score(financials: FinancialData) -> ZScoreResult:
    try:
        return calculate_altman_z_score(financials)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))


@router.post(
    "/monte-carlo",
    response_model=MonteCarloResult,
    summary="Run Monte Carlo Simulation",
    description="Run a Monte Carlo revenue forecast simulation. "
                "Currently returns placeholder results using geometric Brownian motion.",
)
async def api_monte_carlo(params: MonteCarloInput) -> MonteCarloResult:
    return run_monte_carlo_simulation(params)
