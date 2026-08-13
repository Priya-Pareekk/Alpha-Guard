"use client";

import React from "react";

interface MetricCardProps {
    label: string;
    value: string;
    subtitle?: string;
    trend?: "up" | "down" | "neutral";
    accentColor?: "green" | "amber" | "red" | "cyan";
}

const colorMap = {
    green: {
        text: "text-ag-green",
        bg: "bg-ag-green/8",
        border: "border-ag-green/15",
        dot: "bg-ag-green",
    },
    amber: {
        text: "text-ag-amber",
        bg: "bg-ag-amber/8",
        border: "border-ag-amber/15",
        dot: "bg-ag-amber",
    },
    red: {
        text: "text-ag-red",
        bg: "bg-ag-red/8",
        border: "border-ag-red/15",
        dot: "bg-ag-red",
    },
    cyan: {
        text: "text-ag-cyan",
        bg: "bg-ag-cyan/8",
        border: "border-ag-cyan/15",
        dot: "bg-ag-cyan",
    },
};

export default function MetricCard({
    label,
    value,
    subtitle,
    trend = "neutral",
    accentColor = "green",
}: MetricCardProps) {
    const colors = colorMap[accentColor];

    return (
        <div
            className={`
        card-glass group p-5 flex flex-col gap-2
        hover:scale-[1.01] cursor-default
      `}
        >
            {/* Header row */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ag-muted uppercase tracking-wider">
                    {label}
                </span>
                {trend !== "neutral" && (
                    <div
                        className={`
              flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono
              ${trend === "up" ? `${colorMap.green.bg} ${colorMap.green.text}` : `${colorMap.red.bg} ${colorMap.red.text}`}
            `}
                    >
                        <svg
                            className={`w-3 h-3 ${trend === "down" ? "rotate-180" : ""}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                        >
                            <polyline points="18 15 12 9 6 15" />
                        </svg>
                        {trend === "up" ? "+" : "-"}
                    </div>
                )}
            </div>

            {/* Value */}
            <p className={`text-2xl font-semibold font-mono tracking-tight ${colors.text}`}>
                {value}
            </p>

            {/* Subtitle */}
            {subtitle && (
                <p className="text-[11px] text-ag-text2 font-mono">{subtitle}</p>
            )}

            {/* Bottom accent line */}
            <div className="mt-auto pt-3">
                <div className="h-[2px] w-full rounded-full bg-ag-border overflow-hidden">
                    <div
                        className={`h-full rounded-full ${colors.dot} opacity-60 group-hover:opacity-100 transition-opacity duration-500`}
                        style={{ width: "60%" }}
                    />
                </div>
            </div>
        </div>
    );
}
