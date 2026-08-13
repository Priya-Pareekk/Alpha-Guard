"""
Alpha-Guard — Risk Engine Tests
================================
Validates the Altman Z-Score calculation against known financial profiles.
"""

import pytest
from models import FinancialData
from risk_engine import calculate_altman_z_score


class TestAltmanZScore:
    """Test suite for Altman Z-Score calculation."""

    def _make_financials(self, **overrides) -> FinancialData:
        """Create a FinancialData instance with sensible defaults."""
        defaults = {
            "ticker": "TEST",
            "total_assets": 1_000_000,
            "current_assets": 500_000,
            "current_liabilities": 200_000,
            "retained_earnings": 300_000,
            "ebit": 150_000,
            "market_cap": 2_000_000,
            "total_liabilities": 400_000,
            "revenue": 800_000,
        }
        defaults.update(overrides)
        return FinancialData(**defaults)

    def test_safe_zone_company(self):
        """A financially healthy company should score in the Safe Zone (> 2.99)."""
        data = self._make_financials(
            total_assets=1_000_000,
            current_assets=600_000,
            current_liabilities=200_000,
            retained_earnings=400_000,
            ebit=200_000,
            market_cap=3_000_000,
            total_liabilities=300_000,
            revenue=900_000,
        )
        result = calculate_altman_z_score(data)

        assert result.zone == "Safe", f"Expected Safe zone, got {result.zone} (score={result.score})"
        assert result.score > 2.99
        assert result.ticker == "TEST"
        assert result.interpretation is not None

    def test_distress_zone_company(self):
        """A financially distressed company should score in the Distress Zone (< 1.81)."""
        data = self._make_financials(
            total_assets=1_000_000,
            current_assets=100_000,
            current_liabilities=500_000,
            retained_earnings=-200_000,
            ebit=-50_000,
            market_cap=100_000,
            total_liabilities=800_000,
            revenue=300_000,
        )
        result = calculate_altman_z_score(data)

        assert result.zone == "Distress", f"Expected Distress zone, got {result.zone} (score={result.score})"
        assert result.score < 1.81

    def test_gray_zone_company(self):
        """A company with moderate metrics should fall in the Gray Zone (1.81 - 2.99)."""
        data = self._make_financials(
            total_assets=1_000_000,
            current_assets=350_000,
            current_liabilities=250_000,
            retained_earnings=150_000,
            ebit=80_000,
            market_cap=800_000,
            total_liabilities=500_000,
            revenue=600_000,
        )
        result = calculate_altman_z_score(data)

        assert result.zone == "Gray", f"Expected Gray zone, got {result.zone} (score={result.score})"
        assert 1.81 <= result.score <= 2.99

    def test_component_ratios_are_correct(self):
        """Verify that individual component ratios are calculated correctly."""
        data = self._make_financials(
            total_assets=1_000_000,
            current_assets=400_000,
            current_liabilities=200_000,
            retained_earnings=300_000,
            ebit=150_000,
            market_cap=2_000_000,
            total_liabilities=400_000,
            revenue=800_000,
        )
        result = calculate_altman_z_score(data)
        c = result.components

        # X1 = (400k - 200k) / 1M = 0.2
        assert abs(c.x1_working_capital_to_total_assets - 0.2) < 1e-6
        # X2 = 300k / 1M = 0.3
        assert abs(c.x2_retained_earnings_to_total_assets - 0.3) < 1e-6
        # X3 = 150k / 1M = 0.15
        assert abs(c.x3_ebit_to_total_assets - 0.15) < 1e-6
        # X4 = 2M / 400k = 5.0
        assert abs(c.x4_market_cap_to_total_liabilities - 5.0) < 1e-6
        # X5 = 800k / 1M = 0.8
        assert abs(c.x5_revenue_to_total_assets - 0.8) < 1e-6

    def test_manual_score_calculation(self):
        """Verify the weighted sum matches hand-calculated Z-Score."""
        data = self._make_financials(
            total_assets=1_000_000,
            current_assets=400_000,
            current_liabilities=200_000,
            retained_earnings=300_000,
            ebit=150_000,
            market_cap=2_000_000,
            total_liabilities=400_000,
            revenue=800_000,
        )
        result = calculate_altman_z_score(data)

        # Manual: 1.2*0.2 + 1.4*0.3 + 3.3*0.15 + 0.6*5.0 + 1.0*0.8
        #       = 0.24 + 0.42 + 0.495 + 3.0 + 0.8 = 4.955
        assert abs(result.score - 4.955) < 0.01, f"Expected ~4.955, got {result.score}"

    def test_zero_total_assets_raises_error(self):
        """Zero total assets should be rejected by Pydantic validation (gt=0)."""
        with pytest.raises(Exception):
            FinancialData(
                ticker="FAIL",
                total_assets=0,  # Pydantic gt=0 constraint rejects this
                current_assets=0,
                current_liabilities=0,
                retained_earnings=0,
                ebit=0,
                market_cap=1,
                total_liabilities=1,
                revenue=0,
            )

    def test_negative_retained_earnings(self):
        """Companies with negative retained earnings should still compute correctly."""
        data = self._make_financials(retained_earnings=-500_000)
        result = calculate_altman_z_score(data)

        assert result.components.x2_retained_earnings_to_total_assets < 0
        assert isinstance(result.score, float)
