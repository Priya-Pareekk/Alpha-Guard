"use client";

import { useState, useCallback, useEffect } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import TickerSearch from "@/components/TickerSearch";
import TruthScoreGauge from "@/components/TruthScoreGauge";
import RiskRadar from "@/components/RiskRadar";
import RedFlagTerminal from "@/components/RedFlagTerminal";
import ApiKeyBanner from "@/components/ApiKeyBanner";
import { AnimatedSection, FadeTransition } from "@/components/AnimatedSection";
import { runForensicAudit, checkConfigStatus, type ForensicAuditResponse, type RedFlag } from "@/lib/api";

export default function ForensicPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [auditResult, setAuditResult] = useState<ForensicAuditResponse | null>(null);
    const [ticker, setTicker] = useState("");
    const [geminiMissing, setGeminiMissing] = useState(false);

    useEffect(() => {
        checkConfigStatus()
            .then((status) => setGeminiMissing(!status.gemini_configured))
            .catch(() => {});
    }, []);

    // Dispatch flag count to StatusIndicator
    useEffect(() => {
        if (auditResult) {
            window.dispatchEvent(
                new CustomEvent("alpha-guard:flags", {
                    detail: { flagCount: auditResult.forensic.red_flags.length },
                })
            );
        }
    }, [auditResult]);

    const handleSearch = useCallback(async (searchTicker: string) => {
        setIsLoading(true);
        setError(null);
        setTicker(searchTicker);
        setAuditResult(null);

        try {
            const result = await runForensicAudit(searchTicker);
            setAuditResult(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Forensic audit failed.");
            setAuditResult(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const f = auditResult?.forensic;
    const la = f?.linguistic_analysis;

    const zc = f?.z_score_result?.components;

    // Map forensic result to RiskRadar data
    const radarData = f && zc
        ? [
            { label: "Liquidity (X1)", financial: Math.max(0, Math.min(100, (zc.x1_working_capital_to_total_assets + 0.5) * 100)), narrative: 100 - (la?.hedging_score ?? 50) },
            { label: "Profitability (X2)", financial: Math.max(0, Math.min(100, (zc.x2_retained_earnings_to_total_assets + 0.5) * 100)), narrative: 100 - (la?.evasion_score ?? 50) },
            { label: "Efficiency (X3)", financial: Math.max(0, Math.min(100, zc.x3_ebit_to_total_assets * 100)), narrative: la?.sentiment === "bullish" ? 90 : la?.sentiment === "neutral" ? 50 : 20 },
            { label: "Leverage (X4)", financial: Math.max(0, Math.min(100, zc.x4_market_cap_to_total_liabilities * 20)), narrative: f.truth_score ?? 50 },
        ]
        : undefined;

    const redFlags: RedFlag[] = f?.red_flags ?? [];

    // Metrics display
    const metrics = [
        {
            label: "Hedging Density",
            value: la ? `${la.hedging_score.toFixed(1)}%` : "—",
            color: la && la.hedging_score > 50 ? "text-ag-red" : la && la.hedging_score > 25 ? "text-ag-amber" : "text-ag-green",
        },
        {
            label: "Evasion Score",
            value: la ? la.evasion_score.toFixed(1) : "—",
            color: la && la.evasion_score > 50 ? "text-ag-red" : la && la.evasion_score > 25 ? "text-ag-amber" : "text-ag-green",
        },
        {
            label: "Sentiment",
            value: la ? la.sentiment.toUpperCase() : "—",
            color: la?.sentiment === "bullish" ? "text-ag-green" : la?.sentiment === "bearish" ? "text-ag-red" : "text-ag-amber",
        },
        {
            label: "Z-Score Zone",
            value: f?.z_score_result?.zone.toUpperCase() ?? "—",
            color: f?.z_score_result?.zone === "Safe" ? "text-ag-green" : f?.z_score_result?.zone === "Distress" ? "text-ag-red" : "text-ag-amber",
        },
    ];

    return (
        <div className="min-h-screen bg-ag-bg flex flex-col">
            <DashboardHeader />
            <ApiKeyBanner show={geminiMissing} />

            <main className="flex-1 w-full max-w-[1480px] mx-auto px-4 sm:px-6 py-8">
                {/* Hero / Search */}
                <AnimatedSection className="text-center mb-10">
                    <h2 className="text-3xl sm:text-4xl font-bold text-ag-text tracking-tight mb-2">
                        Linguistic{" "}
                        <span className="text-gradient-green">Stress Analysis</span>
                    </h2>
                    <p className="text-sm text-ag-text2 max-w-xl mx-auto mb-8">
                        Gemini-powered forensic intelligence that reads between the lines of
                        10-K filings — detecting hedging, evasion, and narrative deception.
                    </p>
                    <TickerSearch onSearch={handleSearch} isLoading={isLoading} />
                </AnimatedSection>

                {error && (
                    <AnimatedSection className="mb-6">
                        <div className="card-glass p-4" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-ag-red" />
                                <div>
                                    <p className="text-xs font-mono font-semibold text-ag-red uppercase tracking-wider">Analysis Error</p>
                                    <p className="text-sm text-ag-text2 mt-0.5">{error}</p>
                                </div>
                            </div>
                        </div>
                    </AnimatedSection>
                )}

                {/* AI Offline Alert */}
                {auditResult && !auditResult.gemini_active && !isLoading && (
                    <AnimatedSection className="mb-6">
                        <div className="card-glass p-4" style={{ borderColor: "rgba(245,158,11,0.3)" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-ag-amber" />
                                <div>
                                    <p className="text-xs font-mono font-semibold text-ag-amber uppercase tracking-wider">AI Analyst Offline</p>
                                    <p className="text-sm text-ag-text2 mt-0.5">Reverting to Heuristic Math Models.</p>
                                </div>
                            </div>
                        </div>
                    </AnimatedSection>
                )}


                {/* Loading State */}
                {isLoading && (
                    <AnimatedSection className="mb-10">
                        <div className="card-glass p-8 text-center">
                            <div className="w-8 h-8 border-2 border-ag-green/30 border-t-ag-green rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-sm font-mono text-ag-text2">Running forensic analysis on {ticker}...</p>
                            <p className="text-[11px] font-mono text-ag-muted mt-1">Fetching 10-K filing · Computing Z-Score · Analyzing narrative</p>
                        </div>
                    </AnimatedSection>
                )}

                {/* Results — only show when we have data */}
                {f && !isLoading && (
                    <FadeTransition transitionKey={`forensic-${ticker}`}>
                        <div>
                            {/* Company header */}
                            {auditResult?.company_name && (
                                <AnimatedSection className="mb-6">
                                    <div className="flex items-center gap-3">
                                        <span className="text-lg font-mono font-bold text-ag-text">{auditResult.ticker}</span>
                                        <span className="text-sm text-ag-text2">{auditResult.company_name}</span>
                                        <span className="text-[10px] font-mono text-ag-muted ml-auto">{new Date(auditResult.timestamp).toLocaleString()}</span>
                                    </div>
                                </AnimatedSection>
                            )}

                            {/* Top Row: Truth Score + Risk Radar */}
                            <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                                <AnimatedSection delay={0.05} className="lg:col-span-1">
                                    <TruthScoreGauge
                                        score={f.truth_score}
                                        zone={f.truth_zone}
                                        deceptionAlert={f.deception_alert}
                                        deceptionReason={f.deception_reason ?? undefined}
                                        aiConfidenceScore={f.ai_confidence_score}
                                    />
                                </AnimatedSection>

                                <AnimatedSection delay={0.1} className="lg:col-span-2">
                                    <RiskRadar data={radarData} />
                                </AnimatedSection>
                            </section>

                            {/* Forensic Metrics Row */}
                            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                                {metrics.map((metric, i) => (
                                    <AnimatedSection key={metric.label} delay={0.05 * (i + 1)}>
                                        <div className="card-glass p-4 text-center">
                                            <p className="text-[10px] font-mono text-ag-muted uppercase tracking-wider mb-1">{metric.label}</p>
                                            <p className={`text-lg font-bold font-mono ${metric.color}`}>{metric.value}</p>
                                        </div>
                                    </AnimatedSection>
                                ))}
                            </section>

                            {/* Red Flag Terminal */}
                            <AnimatedSection delay={0.3} className="mb-8">
                                <RedFlagTerminal flags={redFlags.length > 0 ? redFlags : undefined} />
                            </AnimatedSection>

                            {/* Data Sources */}
                            {auditResult?.data_sources && auditResult.data_sources.length > 0 && (
                                <AnimatedSection delay={0.4} className="mb-8">
                                    <div className="card-glass p-4">
                                        <p className="text-[10px] font-mono text-ag-muted uppercase tracking-wider mb-2">Data Sources</p>
                                        <div className="flex flex-wrap gap-2">
                                            {auditResult.data_sources.map((src, i) => (
                                                <span key={i} className="px-2 py-1 rounded text-[10px] font-mono text-ag-text2 bg-ag-surface border border-ag-border">
                                                    {src}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </AnimatedSection>
                            )}
                        </div>
                    </FadeTransition>
                )}

                {/* Methodology — always visible */}
                {!isLoading && (
                    <AnimatedSection delay={0.1} className="mb-8">
                        <section className="card-glass p-6">
                            <h3 className="text-sm font-semibold text-ag-text mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4 text-ag-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 16v-4" />
                                    <path d="M12 8h.01" />
                                </svg>
                                Analysis Methodology
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[
                                    { title: "Hedging Detection", desc: "Scans Item 1A for hedging words like 'uncertain,' 'might,' 'potentially.' Computes density score normalized against filing length." },
                                    { title: "Sentiment Gap Analysis", desc: "Compares Gemini AI's sentiment classification of MD&A narrative against the quantitative Z-Score zone. Divergence triggers Deception Alert." },
                                    { title: "Truth Score Formula", desc: "100 - hedging_penalty(25%) - evasion_penalty(15%) - sentiment_gap(40%) - red_flag_penalty(20%). Score ≥70 = Credible, <40 = Deceptive." },
                                ].map((method) => (
                                    <div key={method.title} className="p-3 rounded-lg bg-ag-surface/40 border border-ag-border">
                                        <p className="text-xs font-semibold text-ag-text mb-1">{method.title}</p>
                                        <p className="text-[11px] text-ag-text2 leading-relaxed">{method.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </AnimatedSection>
                )}
            </main>

            <footer className="border-t border-ag-border py-4 px-6">
                <div className="max-w-[1480px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-[10px] font-mono text-ag-muted">ALPHA-GUARD v0.3.0 · Forensic AI Intelligence Layer</p>
                    <p className="text-[10px] font-mono text-ag-muted">Powered by Google Gemini · FastAPI · SEC EDGAR · Yahoo Finance</p>
                </div>
            </footer>
        </div>
    );
}
