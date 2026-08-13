"use client";

import React from "react";
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    ReferenceLine,
} from "recharts";

interface MonteCarloData {
    ticker: string;
    num_simulations: number;
    time_horizon_years: number;
    mean_final_revenue: number | null;
    median_final_revenue: number | null;
    percentile_5: number | null;
    percentile_95: number | null;
    probability_of_decline: number | null;
    initial_revenue: number | null;
    histogram: { range: string; count: number; pct: number; midpoint: number }[];
    sample_paths: { year: number; p5: number; p25: number; median: number; p75: number; p95: number; mean: number }[];
}

interface MonteCarloChartProps {
    data: MonteCarloData;
}

const formatRevenue = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-ag-card/95 backdrop-blur-xl border border-ag-border rounded-lg px-3 py-2 shadow-xl">
            <p className="text-[10px] font-mono text-ag-muted mb-1">Year {label}</p>
            {payload.map((entry: { name: string; value: number; color: string }, i: number) => (
                <p key={i} className="text-[11px] font-mono flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                    <span className="text-ag-text2">{entry.name}:</span>
                    <span className="text-ag-text font-semibold">{formatRevenue(entry.value)}</span>
                </p>
            ))}
        </div>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HistogramTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
        <div className="bg-ag-card/95 backdrop-blur-xl border border-ag-border rounded-lg px-3 py-2 shadow-xl">
            <p className="text-[10px] font-mono text-ag-muted mb-1">{d.range}</p>
            <p className="text-[11px] font-mono text-ag-text">
                <span className="text-ag-cyan font-semibold">{d.count}</span> simulations ({d.pct}%)
            </p>
        </div>
    );
};

export default function MonteCarloChart({ data }: MonteCarloChartProps) {
    const declinePercent = data.probability_of_decline
        ? (data.probability_of_decline * 100).toFixed(1)
        : "—";

    return (
        <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-ag-surface/40 border border-ag-border text-center">
                    <p className="text-[9px] font-mono text-ag-muted uppercase tracking-wider">Simulations</p>
                    <p className="text-lg font-bold font-mono text-ag-text">{data.num_simulations.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-lg bg-ag-surface/40 border border-ag-border text-center">
                    <p className="text-[9px] font-mono text-ag-muted uppercase tracking-wider">Mean Revenue</p>
                    <p className="text-lg font-bold font-mono text-ag-green">
                        {data.mean_final_revenue ? formatRevenue(data.mean_final_revenue) : "—"}
                    </p>
                </div>
                <div className="p-3 rounded-lg bg-ag-surface/40 border border-ag-border text-center">
                    <p className="text-[9px] font-mono text-ag-muted uppercase tracking-wider">5th Percentile</p>
                    <p className="text-lg font-bold font-mono text-ag-red">
                        {data.percentile_5 ? formatRevenue(data.percentile_5) : "—"}
                    </p>
                </div>
                <div className="p-3 rounded-lg bg-ag-surface/40 border border-ag-border text-center">
                    <p className="text-[9px] font-mono text-ag-muted uppercase tracking-wider">P(Decline &gt;20%)</p>
                    <p className={`text-lg font-bold font-mono ${Number(declinePercent) > 30 ? "text-ag-red" : Number(declinePercent) > 15 ? "text-ag-amber" : "text-ag-green"}`}>
                        {declinePercent}%
                    </p>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Revenue Path Fan Chart */}
                {data.sample_paths.length > 0 && (
                    <div className="p-4 rounded-xl bg-ag-surface/30 border border-ag-border">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-mono font-semibold text-ag-text uppercase tracking-wider">
                                Revenue Forecast — Percentile Bands
                            </h4>
                            <span className="text-[9px] font-mono text-ag-muted">{data.time_horizon_years}Y horizon</span>
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={data.sample_paths} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="bandOuter" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.1} />
                                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.02} />
                                    </linearGradient>
                                    <linearGradient id="bandInner" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#00e67a" stopOpacity={0.2} />
                                        <stop offset="100%" stopColor="#00e67a" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                <XAxis
                                    dataKey="year"
                                    tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                                    tickFormatter={(v) => `Y${v}`}
                                    axisLine={{ stroke: "#1e293b" }}
                                />
                                <YAxis
                                    tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                                    tickFormatter={formatRevenue}
                                    axisLine={{ stroke: "#1e293b" }}
                                    width={60}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                {/* P5-P95 band */}
                                <Area type="monotone" dataKey="p95" stroke="none" fill="url(#bandOuter)" name="P95" />
                                <Area type="monotone" dataKey="p5" stroke="none" fill="#06080f" name="P5" />
                                {/* P25-P75 band */}
                                <Area type="monotone" dataKey="p75" stroke="none" fill="url(#bandInner)" name="P75" />
                                <Area type="monotone" dataKey="p25" stroke="none" fill="#06080f" name="P25" />
                                {/* Median line */}
                                <Area
                                    type="monotone"
                                    dataKey="median"
                                    stroke="#00e67a"
                                    strokeWidth={2}
                                    fill="none"
                                    name="Median"
                                    dot={{ fill: "#00e67a", r: 3 }}
                                />
                                {/* Mean line */}
                                <Area
                                    type="monotone"
                                    dataKey="mean"
                                    stroke="#22d3ee"
                                    strokeWidth={1.5}
                                    strokeDasharray="4 4"
                                    fill="none"
                                    name="Mean"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Distribution Histogram */}
                {data.histogram.length > 0 && (
                    <div className="p-4 rounded-xl bg-ag-surface/30 border border-ag-border">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-mono font-semibold text-ag-text uppercase tracking-wider">
                                Final Revenue Distribution
                            </h4>
                            <span className="text-[9px] font-mono text-ag-muted">{data.num_simulations.toLocaleString()} paths</span>
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={data.histogram} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis
                                    dataKey="range"
                                    tick={{ fill: "#64748b", fontSize: 8, fontFamily: "monospace" }}
                                    axisLine={{ stroke: "#1e293b" }}
                                    interval="preserveStartEnd"
                                    angle={-35}
                                    textAnchor="end"
                                    height={50}
                                />
                                <YAxis
                                    tick={{ fill: "#64748b", fontSize: 10, fontFamily: "monospace" }}
                                    axisLine={{ stroke: "#1e293b" }}
                                    width={40}
                                />
                                <Tooltip content={<HistogramTooltip />} />
                                {data.initial_revenue && (
                                    <ReferenceLine
                                        x={data.histogram.findIndex(
                                            (h) => h.midpoint >= (data.initial_revenue || 0)
                                        )}
                                        stroke="#f59e0b"
                                        strokeDasharray="3 3"
                                        label={{ value: "Current", fill: "#f59e0b", fontSize: 9, fontFamily: "monospace" }}
                                    />
                                )}
                                <Bar
                                    dataKey="count"
                                    fill="#22d3ee"
                                    fillOpacity={0.6}
                                    radius={[3, 3, 0, 0]}
                                    name="Simulations"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}
