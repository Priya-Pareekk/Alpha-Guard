"use client";

import { useState, useCallback, useRef } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import TickerSearch from "@/components/TickerSearch";
import { AnimatedSection, FadeTransition } from "@/components/AnimatedSection";
import {
    fetchFinancials,
    calculateZScore,
    fetchCompanyInfo,
    runForensicAudit,
    getApiBase,
    type ZScoreResult,
    type ForensicAuditResponse,
} from "@/lib/api";

interface ReportData {
    ticker: string;
    companyName: string;
    timestamp: string;
    zScore: ZScoreResult | null;
    forensic: ForensicAuditResponse | null;
}

export default function ReportsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<ReportData | null>(null);
    const reportRef = useRef<HTMLDivElement>(null);

    const handleSearch = useCallback(async (ticker: string) => {
        setIsLoading(true);
        setError(null);

        try {
            // Run both analyses in parallel
            const [financials, forensicResult] = await Promise.allSettled([
                fetchFinancials(ticker).then((fin) => calculateZScore(fin)),
                runForensicAudit(ticker),
            ]);

            let companyName = ticker;
            try {
                const info = await fetchCompanyInfo(ticker);
                companyName = info.name || ticker;
            } catch { /* optional */ }

            setReport({
                ticker: ticker.toUpperCase(),
                companyName,
                timestamp: new Date().toISOString(),
                zScore: financials.status === "fulfilled" ? financials.value : null,
                forensic: forensicResult.status === "fulfilled" ? forensicResult.value : null,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Report generation failed.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handlePrint = () => {
        window.print();
    };

    const z = report?.zScore;
    const f = report?.forensic?.forensic;

    return (
        <div className="min-h-screen bg-ag-bg flex flex-col">
            <DashboardHeader />

            <main className="flex-1 w-full max-w-[1480px] mx-auto px-4 sm:px-6 py-8">
                {/* Hero */}
                <AnimatedSection className="text-center mb-10 print:hidden">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ag-cyan/8 border border-ag-cyan/15 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-ag-cyan animate-pulse-soft" />
                        <span className="text-[11px] font-mono text-ag-cyan tracking-wider uppercase">
                            Report Generator
                        </span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-ag-text tracking-tight mb-2">
                        Executive{" "}
                        <span className="text-gradient-green">Report</span>
                    </h2>
                    <p className="text-sm text-ag-text2 max-w-xl mx-auto mb-8">
                        Generate a comprehensive risk assessment report combining Z-Score
                        analysis and forensic AI findings. Print-ready format.
                    </p>
                    <TickerSearch onSearch={handleSearch} isLoading={isLoading} />
                </AnimatedSection>

                {/* Error */}
                {error && (
                    <AnimatedSection className="mb-6 print:hidden">
                        <div className="card-glass p-4" style={{ borderColor: "rgba(239,68,68,0.3)" }}>
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-ag-red" />
                                <p className="text-sm text-ag-text2">{error}</p>
                            </div>
                        </div>
                    </AnimatedSection>
                )}

                {/* Loading */}
                {isLoading && (
                    <AnimatedSection className="mb-10 print:hidden">
                        <div className="card-glass p-8 text-center">
                            <div className="w-8 h-8 border-2 border-ag-green/30 border-t-ag-green rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-sm font-mono text-ag-text2">Generating executive report...</p>
                        </div>
                    </AnimatedSection>
                )}

                {/* Report */}
                {report && !isLoading && (
                    <FadeTransition transitionKey={`report-${report.ticker}`}>
                        <div>
                            {/* Action Buttons */}
                            <div className="flex justify-end gap-3 mb-4 print:hidden">
                                <button
                                    onClick={async () => {
                                        try {
                                            const apiBase = getApiBase();
                                            const res = await fetch(`${apiBase}/api/reports/generate-pdf`, {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ ticker: report.ticker }),
                                            });
                                            if (!res.ok) throw new Error("PDF generation failed");
                                            const blob = await res.blob();
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement("a");
                                            a.href = url;
                                            a.download = `AlphaGuard_${report.ticker}_Report.pdf`;
                                            a.click();
                                            URL.revokeObjectURL(url);
                                        } catch {
                                            alert("PDF generation failed. Is the backend running?");
                                        }
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ag-cyan/10 text-ag-cyan border border-ag-cyan/20 hover:bg-ag-cyan/20 transition-colors text-xs font-mono font-semibold uppercase tracking-wider"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    Download PDF
                                </button>
                                <button
                                    onClick={handlePrint}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-ag-green/10 text-ag-green border border-ag-green/20 hover:bg-ag-green/20 transition-colors text-xs font-mono font-semibold uppercase tracking-wider"
                                >
                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                        <polyline points="6 9 6 2 18 2 18 9" />
                                        <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                                        <rect x="6" y="14" width="12" height="8" />
                                    </svg>
                                    Print / Save PDF
                                </button>
                            </div>

                            {/* Report Card */}
                            <div ref={reportRef} className="card-glass overflow-hidden print:bg-white print:text-black print:border-gray-300">
                                {/* Report Header */}
                                <div className="px-8 py-6 border-b border-ag-border print:border-gray-300 bg-ag-bg2/40 print:bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h2 className="text-xl font-bold text-ag-text print:text-black font-mono">
                                                    {report.ticker}
                                                </h2>
                                                <span className="text-sm text-ag-text2 print:text-gray-600">
                                                    {report.companyName}
                                                </span>
                                            </div>
                                            <p className="text-[11px] font-mono text-ag-muted print:text-gray-500">
                                                ALPHA-GUARD EXECUTIVE RISK REPORT
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-mono text-ag-muted print:text-gray-500">
                                                Generated: {new Date(report.timestamp).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                                            </p>
                                            <p className="text-[10px] font-mono text-ag-muted print:text-gray-500">
                                                {new Date(report.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Z-Score Section */}
                                <div className="px-8 py-6 border-b border-ag-border print:border-gray-200">
                                    <h3 className="text-sm font-semibold text-ag-text print:text-black mb-4 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-ag-green" />
                                        1. ALTMAN Z-SCORE ANALYSIS
                                    </h3>
                                    {z ? (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Score */}
                                            <div className="text-center">
                                                <p className="text-[10px] font-mono text-ag-muted print:text-gray-500 uppercase mb-1">Z-Score</p>
                                                <p className={`text-4xl font-bold font-mono ${z.zone === "Safe" ? "text-ag-green" : z.zone === "Distress" ? "text-ag-red" : "text-ag-amber"} print:text-black`}>
                                                    {z.score.toFixed(2)}
                                                </p>
                                                <p className={`text-xs font-mono font-semibold mt-1 ${z.zone === "Safe" ? "text-ag-green" : z.zone === "Distress" ? "text-ag-red" : "text-ag-amber"} print:text-black`}>
                                                    {z.zone.toUpperCase()} ZONE
                                                </p>
                                            </div>

                                            {/* Components */}
                                            <div className="col-span-2">
                                                <table className="w-full text-xs font-mono">
                                                    <thead>
                                                        <tr className="text-ag-muted print:text-gray-500 text-left">
                                                            <th className="pb-2">Component</th>
                                                            <th className="pb-2 text-right">Ratio</th>
                                                            <th className="pb-2 text-right">Weight</th>
                                                            <th className="pb-2 text-right">Weighted</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="text-ag-text2 print:text-gray-700">
                                                        {[
                                                            { label: "X1 — Working Capital / Assets", val: z.components.x1_working_capital_to_total_assets, w: 1.2 },
                                                            { label: "X2 — Retained Earnings / Assets", val: z.components.x2_retained_earnings_to_total_assets, w: 1.4 },
                                                            { label: "X3 — EBIT / Assets", val: z.components.x3_ebit_to_total_assets, w: 3.3 },
                                                            { label: "X4 — Market Cap / Liabilities", val: z.components.x4_market_cap_to_total_liabilities, w: 0.6 },
                                                            { label: "X5 — Revenue / Assets", val: z.components.x5_revenue_to_total_assets, w: 1.0 },
                                                        ].map((c) => (
                                                            <tr key={c.label} className="border-t border-ag-border/50 print:border-gray-200">
                                                                <td className="py-1.5">{c.label}</td>
                                                                <td className="py-1.5 text-right">{c.val.toFixed(4)}</td>
                                                                <td className="py-1.5 text-right text-ag-muted">×{c.w}</td>
                                                                <td className="py-1.5 text-right font-semibold text-ag-text print:text-black">{(c.val * c.w).toFixed(4)}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-ag-muted font-mono">Z-Score data unavailable for this ticker.</p>
                                    )}
                                    {z && (
                                        <p className="text-xs text-ag-text2 print:text-gray-600 mt-4 leading-relaxed italic">{z.interpretation}</p>
                                    )}
                                </div>

                                {/* Forensic Section */}
                                <div className="px-8 py-6 border-b border-ag-border print:border-gray-200">
                                    <h3 className="text-sm font-semibold text-ag-text print:text-black mb-4 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-ag-red" />
                                        2. FORENSIC AI ANALYSIS
                                    </h3>
                                    {f ? (
                                        <div>
                                            {/* Key Metrics Row */}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                                <div className="p-3 rounded-lg bg-ag-surface/40 border border-ag-border text-center print:bg-gray-50 print:border-gray-200">
                                                    <p className="text-[10px] font-mono text-ag-muted uppercase">Truth Score</p>
                                                    <p className={`text-2xl font-bold font-mono ${f.truth_score >= 70 ? "text-ag-green" : f.truth_score >= 40 ? "text-ag-amber" : "text-ag-red"} print:text-black`}>
                                                        {f.truth_score}
                                                    </p>
                                                    <p className="text-[10px] font-mono text-ag-muted">{f.truth_zone}</p>
                                                </div>
                                                <div className="p-3 rounded-lg bg-ag-surface/40 border border-ag-border text-center print:bg-gray-50 print:border-gray-200">
                                                    <p className="text-[10px] font-mono text-ag-muted uppercase">Hedging</p>
                                                    <p className="text-2xl font-bold font-mono text-ag-text print:text-black">{f.linguistic_analysis.hedging_score.toFixed(1)}</p>
                                                </div>
                                                <div className="p-3 rounded-lg bg-ag-surface/40 border border-ag-border text-center print:bg-gray-50 print:border-gray-200">
                                                    <p className="text-[10px] font-mono text-ag-muted uppercase">Evasion</p>
                                                    <p className="text-2xl font-bold font-mono text-ag-text print:text-black">{f.linguistic_analysis.evasion_score.toFixed(1)}</p>
                                                </div>
                                                <div className="p-3 rounded-lg bg-ag-surface/40 border border-ag-border text-center print:bg-gray-50 print:border-gray-200">
                                                    <p className="text-[10px] font-mono text-ag-muted uppercase">Sentiment</p>
                                                    <p className="text-2xl font-bold font-mono text-ag-text print:text-black">{f.linguistic_analysis.sentiment.toUpperCase()}</p>
                                                </div>
                                            </div>

                                            {/* Deception Alert */}
                                            {f.deception_alert && f.deception_reason && (
                                                <div className="p-4 rounded-lg bg-ag-red/8 border border-ag-red/20 mb-4 print:bg-red-50 print:border-red-200">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <div className="w-2 h-2 rounded-full bg-ag-red" />
                                                        <span className="text-xs font-mono font-semibold text-ag-red uppercase print:text-red-700">Deception Alert</span>
                                                    </div>
                                                    <p className="text-xs text-ag-text2 print:text-gray-700">{f.deception_reason}</p>
                                                </div>
                                            )}

                                            {/* Red Flags Table */}
                                            {f.red_flags.length > 0 && (
                                                <div>
                                                    <p className="text-xs font-mono text-ag-muted uppercase mb-2">Red Flags ({f.red_flags.length})</p>
                                                    <div className="space-y-2">
                                                        {f.red_flags.map((flag, i) => (
                                                            <div key={i} className="p-3 rounded-lg bg-ag-surface/30 border border-ag-border print:bg-gray-50 print:border-gray-200">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase ${flag.severity >= 8 ? "bg-ag-red/10 text-ag-red print:text-red-700" : flag.severity >= 5 ? "bg-ag-amber/10 text-ag-amber print:text-orange-700" : "bg-ag-cyan/10 text-ag-cyan print:text-blue-700"}`}>
                                                                        SEV {flag.severity}
                                                                    </span>
                                                                    <span className="text-[10px] font-mono text-ag-muted uppercase">{flag.category}</span>
                                                                </div>
                                                                <p className="text-xs text-ag-text print:text-black italic mb-1">&quot;{flag.sentence}&quot;</p>
                                                                <p className="text-[11px] text-ag-text2 print:text-gray-600">{flag.explanation}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-ag-muted font-mono">Forensic analysis unavailable for this ticker.</p>
                                    )}
                                </div>

                                {/* Report Footer */}
                                <div className="px-8 py-4 bg-ag-bg2/30 print:bg-gray-50">
                                    <div className="flex items-center justify-between text-[10px] font-mono text-ag-muted print:text-gray-500">
                                        <span>ALPHA-GUARD v0.2.0 · Confidential</span>
                                        <span>Generated by Alpha-Guard Forensic Credit Risk Platform</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </FadeTransition>
                )}
            </main>

            <footer className="border-t border-ag-border py-4 px-6 print:hidden">
                <div className="max-w-[1480px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-[10px] font-mono text-ag-muted">ALPHA-GUARD v0.2.0 · Executive Reports</p>
                    <p className="text-[10px] font-mono text-ag-muted">Powered by FastAPI · Next.js · SEC EDGAR · Google Gemini</p>
                </div>
            </footer>
        </div>
    );
}
