"use client";

import React from "react";

// ── Types ──

export interface RiskOverviewData {
    ticker: string;
    companyName: string;
    score: number;
    zone: "Safe" | "Gray" | "Distress";
    components: {
        label: string;
        value: number;
        weight: number;
    }[];
}

interface RiskOverviewProps {
    data?: RiskOverviewData | null;
}

const PLACEHOLDER: RiskOverviewData = {
    ticker: "—",
    companyName: "Search a ticker to begin",
    score: 0,
    zone: "Gray",
    components: [
        { label: "X1 — Working Capital / Total Assets", value: 0, weight: 1.2 },
        { label: "X2 — Retained Earnings / Total Assets", value: 0, weight: 1.4 },
        { label: "X3 — EBIT / Total Assets", value: 0, weight: 3.3 },
        { label: "X4 — Market Cap / Total Liabilities", value: 0, weight: 0.6 },
        { label: "X5 — Revenue / Total Assets", value: 0, weight: 1.0 },
    ],
};

const zoneConfig = {
    Safe: {
        color: "text-ag-green",
        bg: "bg-ag-green/10",
        border: "border-ag-green/30",
        barColor: "bg-ag-green",
        label: "SAFE ZONE",
        description: "Low bankruptcy probability. Strong financial health.",
        cardBorder: "border-ag-green/20",
    },
    Gray: {
        color: "text-ag-amber",
        bg: "bg-ag-amber/10",
        border: "border-ag-amber/30",
        barColor: "bg-ag-amber",
        label: "GRAY ZONE",
        description: "Moderate risk. Further analysis recommended.",
        cardBorder: "border-ag-border",
    },
    Distress: {
        color: "text-ag-red",
        bg: "bg-ag-red/10",
        border: "border-ag-red/30",
        barColor: "bg-ag-red",
        label: "DISTRESS ZONE",
        description: "Elevated bankruptcy risk within 2 years.",
        cardBorder: "border-ag-red/20",
    },
};

export default function RiskOverview({ data }: RiskOverviewProps) {
    const d = data || PLACEHOLDER;
    const zone = zoneConfig[d.zone];
    const hasData = d.ticker !== "—";

    // Normalize score for the gauge (0 = -2, 100 = 6)
    const gaugePercent = Math.min(100, Math.max(0, ((d.score + 2) / 8) * 100));

    return (
        <div className={`card-glass overflow-hidden transition-all duration-500 ${hasData ? zone.cardBorder : ""}`}
            style={hasData && d.zone !== "Gray" ? { borderColor: d.zone === "Safe" ? "rgba(0,230,122,0.2)" : "rgba(239,68,68,0.2)" } : {}}
        >
            {/* Header */}
            <div className="px-6 py-4 border-b border-ag-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-ag-surface flex items-center justify-center">
                        <svg
                            className="w-4 h-4 text-ag-text2"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-ag-text">Risk Overview</h2>
                        <p className="text-[11px] text-ag-muted font-mono">
                            ALTMAN Z-SCORE ANALYSIS
                        </p>
                    </div>
                </div>

                {/* Zone Badge */}
                {hasData && (
                    <span
                        className={`
              px-3 py-1 rounded-full text-[10px] font-mono font-semibold 
              uppercase tracking-widest border
              ${zone.bg} ${zone.color} ${zone.border}
            `}
                    >
                        {zone.label}
                    </span>
                )}
            </div>

            {/* Score Display */}
            <div className="px-6 py-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Large Score */}
                    <div className="flex flex-col items-center gap-3 md:pr-8 md:border-r md:border-ag-border">
                        <p className="text-[11px] font-mono uppercase tracking-widest text-ag-muted">
                            Z-Score
                        </p>
                        <p className={`text-6xl font-bold font-mono tracking-tighter transition-colors duration-500 ${hasData ? zone.color : "text-ag-muted/30"}`}>
                            {hasData ? d.score.toFixed(2) : "—.——"}
                        </p>
                        <p className="text-xs text-ag-text2 text-center max-w-[220px]">
                            {hasData ? zone.description : "Enter a ticker symbol to calculate the Altman Z-Score."}
                        </p>

                        {/* Company label */}
                        <div className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ag-surface/60 border border-ag-border">
                            <span className="text-xs font-mono font-semibold text-ag-text">
                                {d.ticker}
                            </span>
                            <span className="text-[10px] text-ag-muted">
                                {d.companyName}
                            </span>
                        </div>
                    </div>

                    {/* Score Gauge Bar + Component Breakdown */}
                    <div className="flex-1 w-full">
                        {/* Visual gauge */}
                        <div className="mb-6">
                            <div className="flex justify-between text-[10px] font-mono text-ag-muted mb-2">
                                <span>DISTRESS</span>
                                <span>GRAY</span>
                                <span>SAFE</span>
                            </div>
                            <div className="relative h-3 w-full rounded-full bg-ag-surface overflow-hidden">
                                {/* Zone boundaries */}
                                <div className="absolute top-0 h-full w-[23.8%] bg-ag-red/15 rounded-l-full" />
                                <div className="absolute top-0 left-[23.8%] h-full w-[14.9%] bg-ag-amber/15" />
                                <div className="absolute top-0 right-0 h-full w-[61.3%] bg-ag-green/10 rounded-r-full" />

                                {/* Score indicator */}
                                {hasData && (
                                    <div
                                        className={`
                      absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full 
                      border-2 border-ag-bg ${zone.barColor} shadow-lg
                      transition-all duration-1000 ease-out
                    `}
                                        style={{ left: `calc(${gaugePercent}% - 7px)` }}
                                    />
                                )}

                                {/* Threshold markers */}
                                <div className="absolute top-0 left-[23.8%] h-full w-px bg-ag-border" />
                                <div className="absolute top-0 left-[38.6%] h-full w-px bg-ag-border" />
                            </div>
                            <div className="flex justify-between text-[10px] font-mono text-ag-muted mt-1.5">
                                <span>0.00</span>
                                <span>1.81</span>
                                <span>2.99</span>
                                <span>6.00+</span>
                            </div>
                        </div>

                        {/* Component Breakdown */}
                        <div className="space-y-2.5">
                            <p className="text-[11px] font-mono uppercase tracking-widest text-ag-muted mb-3">
                                Component Breakdown
                            </p>
                            {d.components.map((comp, i) => {
                                const weighted = comp.value * comp.weight;
                                const barWidth = Math.min(100, Math.abs(weighted) * 20);
                                return (
                                    <div key={i} className="group">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[11px] text-ag-text2 font-mono">
                                                {comp.label}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] text-ag-muted font-mono">
                                                    {comp.value.toFixed(4)} × {comp.weight}
                                                </span>
                                                <span className="text-xs font-semibold font-mono text-ag-text min-w-[50px] text-right">
                                                    {weighted.toFixed(4)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-1 w-full rounded-full bg-ag-surface overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${zone.barColor} opacity-50 group-hover:opacity-80 transition-all duration-500`}
                                                style={{ width: hasData ? `${barWidth}%` : "0%" }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-ag-border bg-ag-bg2/30 flex items-center justify-between">
                <span className="text-[10px] font-mono text-ag-muted">
                    Source: SEC EDGAR 10-K · Annual Filing
                </span>
                <span className="text-[10px] font-mono text-ag-muted">
                    Model: Altman (1968) · Public Mfg.
                </span>
            </div>
        </div>
    );
}
