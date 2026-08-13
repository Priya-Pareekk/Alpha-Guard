"use client";

import { useState, useCallback, useEffect } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import TickerSearch from "@/components/TickerSearch";
import RiskOverview, { type RiskOverviewData } from "@/components/RiskOverview";
import MetricCard from "@/components/MetricCard";
import MonteCarloChart from "@/components/MonteCarloChart";
import ApiKeyBanner from "@/components/ApiKeyBanner";
import { AnimatedSection, AnimatedList, FadeTransition } from "@/components/AnimatedSection";
import {
  fetchFinancials,
  calculateZScore,
  fetchCompanyInfo,
  runMonteCarlo,
  checkConfigStatus,
  type ZScoreResult,
  type MonteCarloResult,
} from "@/lib/api";

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zScore, setZScore] = useState<ZScoreResult | null>(null);
  const [riskData, setRiskData] = useState<RiskOverviewData | null>(null);
  const [searchedTicker, setSearchedTicker] = useState("");
  const [monteCarloData, setMonteCarloData] = useState<MonteCarloResult | null>(null);
  const [mcLoading, setMcLoading] = useState(false);
  const [lastRevenue, setLastRevenue] = useState<number | null>(null);
  const [geminiMissing, setGeminiMissing] = useState(false);

  useEffect(() => {
    checkConfigStatus()
      .then((status) => setGeminiMissing(!status.gemini_configured))
      .catch(() => {});
  }, []);

  const handleSearch = useCallback(async (ticker: string) => {
    setIsLoading(true);
    setError(null);
    setSearchedTicker(ticker);
    setMonteCarloData(null);

    try {
      // Fetch financials from SEC EDGAR
      const financials = await fetchFinancials(ticker);
      setLastRevenue(financials.revenue);

      // Calculate Z-Score
      const result = await calculateZScore(financials);
      setZScore(result);

      // Fetch company name
      let companyName = ticker;
      try {
        const info = await fetchCompanyInfo(ticker);
        companyName = info.name || ticker;
      } catch {
        // Company name is optional
      }

      // Map to RiskOverview format
      setRiskData({
        ticker: result.ticker,
        companyName,
        score: result.score,
        zone: result.zone,
        components: [
          { label: "X1 — Working Capital / Total Assets", value: result.components.x1_working_capital_to_total_assets, weight: 1.2 },
          { label: "X2 — Retained Earnings / Total Assets", value: result.components.x2_retained_earnings_to_total_assets, weight: 1.4 },
          { label: "X3 — EBIT / Total Assets", value: result.components.x3_ebit_to_total_assets, weight: 3.3 },
          { label: "X4 — Market Cap / Total Liabilities", value: result.components.x4_market_cap_to_total_liabilities, weight: 0.6 },
          { label: "X5 — Revenue / Total Assets", value: result.components.x5_revenue_to_total_assets, weight: 1.0 },
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setZScore(null);
      setRiskData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleStressTest = useCallback(async () => {
    if (!searchedTicker) return;
    setMcLoading(true);
    try {
      const result = await runMonteCarlo({
        ticker: searchedTicker,
        num_simulations: 1000,
        time_horizon_years: 5,
        initial_revenue: lastRevenue || undefined,
      });
      setMonteCarloData(result);
    } catch {
      // Monte Carlo is non-critical
    } finally {
      setMcLoading(false);
    }
  }, [searchedTicker, lastRevenue]);

  const trendFor = (val: number): "up" | "down" | "neutral" => {
    if (val > 0.1) return "up";
    if (val < -0.05) return "down";
    return "neutral";
  };

  const colorFor = (val: number): "green" | "amber" | "red" | "cyan" => {
    if (val > 0.3) return "green";
    if (val > 0.1) return "cyan";
    if (val > 0) return "amber";
    return "red";
  };

  return (
    <div className="min-h-screen bg-ag-bg flex flex-col">
      <DashboardHeader />
      <ApiKeyBanner show={geminiMissing} />

      <main className="flex-1 w-full max-w-[1480px] mx-auto px-4 sm:px-6 py-8">
        {/* Hero / Search Section */}
        <AnimatedSection className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-ag-text tracking-tight mb-2">
            Credit Risk{" "}
            <span className="text-gradient-green">Intelligence</span>
          </h2>
          <p className="text-sm text-ag-text2 max-w-lg mx-auto mb-8">
            Institutional-grade financial forensics powered by Altman Z-Score
            analysis, Monte Carlo simulation, and global market data.
          </p>
          <TickerSearch onSearch={handleSearch} isLoading={isLoading} />
        </AnimatedSection>

        {/* Error Display */}
        {error && (
          <AnimatedSection className="mb-6">
            <div className="card-glass p-4" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-ag-red" />
                <p className="text-sm text-ag-text2">{error}</p>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* Z-Score Metric Cards */}
        <FadeTransition transitionKey={`metrics-${searchedTicker}`}>
          <AnimatedList className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <MetricCard
              label="Working Capital"
              value={zScore ? zScore.components.x1_working_capital_to_total_assets.toFixed(4) : "—.——"}
              subtitle="X1 · Current Assets − Liabilities"
              trend={zScore ? trendFor(zScore.components.x1_working_capital_to_total_assets) : "neutral"}
              accentColor={zScore ? colorFor(zScore.components.x1_working_capital_to_total_assets) : "green"}
            />
            <MetricCard
              label="Profitability"
              value={zScore ? zScore.components.x2_retained_earnings_to_total_assets.toFixed(4) : "—.——"}
              subtitle="X2 · Retained Earnings / Assets"
              trend={zScore ? trendFor(zScore.components.x2_retained_earnings_to_total_assets) : "neutral"}
              accentColor={zScore ? colorFor(zScore.components.x2_retained_earnings_to_total_assets) : "cyan"}
            />
            <MetricCard
              label="Operating Efficiency"
              value={zScore ? zScore.components.x3_ebit_to_total_assets.toFixed(4) : "—.——"}
              subtitle="X3 · EBIT / Total Assets"
              trend={zScore ? trendFor(zScore.components.x3_ebit_to_total_assets) : "neutral"}
              accentColor={zScore ? colorFor(zScore.components.x3_ebit_to_total_assets) : "amber"}
            />
            <MetricCard
              label="Market Leverage"
              value={zScore ? zScore.components.x4_market_cap_to_total_liabilities.toFixed(4) : "—.——"}
              subtitle="X4 · Market Cap / Liabilities"
              trend={zScore ? trendFor(zScore.components.x4_market_cap_to_total_liabilities) : "neutral"}
              accentColor={zScore ? colorFor(zScore.components.x4_market_cap_to_total_liabilities) : "green"}
            />
          </AnimatedList>
        </FadeTransition>

        {/* Risk Overview Card */}
        <AnimatedSection delay={0.2} className="mb-8">
          <FadeTransition transitionKey={`risk-${searchedTicker}`}>
            <RiskOverview data={riskData} />
          </FadeTransition>
        </AnimatedSection>

        {/* Monte Carlo Section */}
        <AnimatedSection delay={0.3} className="mb-8">
          <div className="card-glass p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-ag-surface flex items-center justify-center">
                  <svg className="w-4 h-4 text-ag-cyan" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20V10" />
                    <path d="M18 20V4" />
                    <path d="M6 20v-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ag-text">Monte Carlo Simulation</h3>
                  <p className="text-[10px] font-mono text-ag-muted uppercase tracking-wider">
                    Revenue Stress Testing · 1,000 Paths
                  </p>
                </div>
              </div>
              {searchedTicker && (
                <button
                  onClick={handleStressTest}
                  disabled={mcLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ag-cyan/10 text-ag-cyan border border-ag-cyan/20 hover:bg-ag-cyan/20 hover:border-ag-cyan/40 transition-all duration-200 text-xs font-mono font-semibold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {mcLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-ag-cyan/30 border-t-ag-cyan rounded-full animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                      Run Stress Test
                    </>
                  )}
                </button>
              )}
            </div>

            {monteCarloData ? (
              <MonteCarloChart data={monteCarloData} />
            ) : (
              <div className="h-32 rounded-lg bg-ag-surface/50 border border-ag-border border-dashed flex items-center justify-center">
                <div className="text-center">
                  <p className="text-xs text-ag-muted font-mono">
                    {searchedTicker ? `Ticker ${searchedTicker} ready — click "Run Stress Test" above` : "Simulation Engine Ready"}
                  </p>
                  <p className="text-[10px] text-ag-muted/60 mt-1">
                    {searchedTicker ? "1,000 GBM revenue paths will be generated" : "Search a ticker first to enable stress testing"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </AnimatedSection>

        {/* Data Sources Panel */}
        <AnimatedSection delay={0.4} className="mb-8">
          <div className="card-glass p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-ag-surface flex items-center justify-center">
                <svg className="w-4 h-4 text-ag-amber" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ag-text">Data Sources</h3>
                <p className="text-[10px] font-mono text-ag-muted uppercase tracking-wider">Ingestion Pipeline</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { name: "SEC EDGAR", status: "Connected", detail: "10-K XBRL · www.sec.gov", active: true },
                { name: "Yahoo Finance", status: "Connected", detail: "yfinance · Global Markets (BSE/NSE/LSE)", active: true },
                { name: "Gemini AI", status: geminiMissing ? "Not Configured" : (searchedTicker ? "Active" : "Idle"), detail: "Forensic Linguistic Analysis", active: !geminiMissing && !!searchedTicker },
                { name: "Monte Carlo", status: monteCarloData ? "Active" : "Idle", detail: "GBM Revenue Simulation · 1K Paths", active: !!monteCarloData },
              ].map((source) => (
                <div key={source.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-ag-surface/40 border border-ag-border">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${source.active ? "bg-ag-green animate-pulse-soft" : "bg-ag-amber/50"}`} />
                    <div>
                      <p className="text-xs font-semibold text-ag-text">{source.name}</p>
                      <p className="text-[10px] font-mono text-ag-muted">{source.detail}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono font-semibold uppercase ${source.active ? "text-ag-green" : "text-ag-amber"}`}>
                    {source.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </main>

      {/* Footer */}
      <footer className="border-t border-ag-border py-4 px-6">
        <div className="max-w-[1480px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[10px] font-mono text-ag-muted">
            ALPHA-GUARD v0.3.0 · Forensic Credit Risk Platform
          </p>
          <p className="text-[10px] font-mono text-ag-muted">
            Powered by FastAPI · Next.js · SEC EDGAR · Yahoo Finance · Google Gemini
          </p>
        </div>
      </footer>
    </div>
  );
}
