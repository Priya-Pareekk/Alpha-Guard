"use client";

import React from "react";

interface RadarDataPoint {
    label: string;
    financial: number; // 0-100, financial risk dimension
    narrative: number; // 0-100, narrative risk dimension
}

interface RiskRadarProps {
    data?: RadarDataPoint[];
}

const DEFAULT_DATA: RadarDataPoint[] = [
    { label: "Financial Health", financial: 85, narrative: 60 },
    { label: "Hedging Level", financial: 30, narrative: 72 },
    { label: "Evasion Level", financial: 20, narrative: 55 },
    { label: "Sentiment Align", financial: 90, narrative: 45 },
    { label: "Truth Score", financial: 80, narrative: 52 },
];

export default function RiskRadar({ data = DEFAULT_DATA }: RiskRadarProps) {
    const cx = 150;
    const cy = 150;
    const maxRadius = 110;
    const levels = 4;
    const numPoints = data.length;
    const angleStep = (2 * Math.PI) / numPoints;
    const startAngle = -Math.PI / 2; // Start from top

    // Convert data point to SVG coordinates
    const getPoint = (index: number, value: number): [number, number] => {
        const angle = startAngle + index * angleStep;
        const r = (value / 100) * maxRadius;
        return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    };

    // Generate polygon path from values
    const getPolygonPath = (values: number[]): string => {
        const points = values.map((v, i) => getPoint(i, v));
        return points.map((p) => `${p[0]},${p[1]}`).join(" ");
    };

    // Grid rings
    const gridRings = Array.from({ length: levels }, (_, i) => {
        const r = ((i + 1) / levels) * maxRadius;
        const points = Array.from({ length: numPoints }, (_, j) => {
            const angle = startAngle + j * angleStep;
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        });
        return points.join(" ");
    });

    // Axis lines
    const axisLines = Array.from({ length: numPoints }, (_, i) => {
        const angle = startAngle + i * angleStep;
        return {
            x2: cx + maxRadius * Math.cos(angle),
            y2: cy + maxRadius * Math.sin(angle),
        };
    });

    // Label positions (slightly outside the radar)
    const labelPositions = data.map((d, i) => {
        const angle = startAngle + i * angleStep;
        const labelR = maxRadius + 22;
        return {
            x: cx + labelR * Math.cos(angle),
            y: cy + labelR * Math.sin(angle),
            label: d.label,
        };
    });

    const financialValues = data.map((d) => d.financial);
    const narrativeValues = data.map((d) => d.narrative);

    return (
        <div className="card-glass p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-ag-surface flex items-center justify-center">
                    <svg
                        className="w-4 h-4 text-ag-cyan"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                    >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                        <path d="M2 12h20" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-ag-text">Risk Radar</h3>
                    <p className="text-[10px] font-mono text-ag-muted uppercase tracking-wider">
                        FINANCIAL VS NARRATIVE RISK
                    </p>
                </div>
            </div>

            {/* SVG Radar Chart */}
            <div className="flex justify-center">
                <svg viewBox="0 0 300 300" className="w-full max-w-[340px]">
                    {/* Grid rings */}
                    {gridRings.map((points, i) => (
                        <polygon
                            key={`ring-${i}`}
                            points={points}
                            fill="none"
                            stroke="var(--border-dim)"
                            strokeWidth="0.5"
                            opacity={0.6}
                        />
                    ))}

                    {/* Axis lines */}
                    {axisLines.map((line, i) => (
                        <line
                            key={`axis-${i}`}
                            x1={cx}
                            y1={cy}
                            x2={line.x2}
                            y2={line.y2}
                            stroke="var(--border-dim)"
                            strokeWidth="0.5"
                            opacity={0.4}
                        />
                    ))}

                    {/* Financial Risk polygon (green) */}
                    <polygon
                        points={getPolygonPath(financialValues)}
                        fill="rgba(0, 230, 122, 0.1)"
                        stroke="#00e67a"
                        strokeWidth="1.5"
                        className="transition-all duration-700"
                    />

                    {/* Narrative Risk polygon (amber) */}
                    <polygon
                        points={getPolygonPath(narrativeValues)}
                        fill="rgba(245, 158, 11, 0.1)"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeDasharray="4 2"
                        className="transition-all duration-700"
                    />

                    {/* Data points - Financial */}
                    {financialValues.map((v, i) => {
                        const [px, py] = getPoint(i, v);
                        return (
                            <circle
                                key={`fin-${i}`}
                                cx={px}
                                cy={py}
                                r="3"
                                fill="#00e67a"
                                stroke="var(--bg-primary)"
                                strokeWidth="1.5"
                            />
                        );
                    })}

                    {/* Data points - Narrative */}
                    {narrativeValues.map((v, i) => {
                        const [px, py] = getPoint(i, v);
                        return (
                            <circle
                                key={`nar-${i}`}
                                cx={px}
                                cy={py}
                                r="3"
                                fill="#f59e0b"
                                stroke="var(--bg-primary)"
                                strokeWidth="1.5"
                            />
                        );
                    })}

                    {/* Labels */}
                    {labelPositions.map((lp, i) => (
                        <text
                            key={`label-${i}`}
                            x={lp.x}
                            y={lp.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill="var(--text-secondary)"
                            fontSize="8"
                            className="font-mono"
                        >
                            {lp.label}
                        </text>
                    ))}
                </svg>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-ag-green rounded-full" />
                    <span className="text-[10px] font-mono text-ag-text2">Financial Risk</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-ag-amber rounded-full border-dashed" style={{ borderTop: "1px dashed #f59e0b", background: "transparent", height: "0" }} />
                    <span className="text-[10px] font-mono text-ag-text2">Narrative Risk</span>
                </div>
            </div>
        </div>
    );
}
