"use client";

import React from "react";

interface RedFlagEntry {
    sentence: string;
    category: string;
    severity: number; // 1-10
    explanation: string;
}

interface RedFlagTerminalProps {
    flags?: RedFlagEntry[];
}

const TypewriterText = ({ text, delay = 0 }: { text: string; delay?: number }) => {
    const [displayed, setDisplayed] = React.useState("");

    React.useEffect(() => {
        let i = 0;
        let timer: NodeJS.Timeout;
        const start = setTimeout(() => {
            timer = setInterval(() => {
                setDisplayed(text.substring(0, i));
                i++;
                if (i > text.length) clearInterval(timer);
            }, 10);
        }, delay);
        return () => {
            clearTimeout(start);
            clearInterval(timer);
        };
    }, [text, delay]);

    return <span>{displayed}</span>;
};

const MOCK_FLAGS: RedFlagEntry[] = [
    {
        sentence:
            "We believe our current liquidity position is adequate to meet foreseeable obligations.",
        category: "hedging",
        severity: 7,
        explanation:
            "Uses 'believe' and 'foreseeable' — classic hedging language that avoids commitment. Financially distressed companies frequently use this phrasing to downplay liquidity concerns.",
    },
    {
        sentence:
            "The impact of current market conditions on our operations cannot be fully determined at this time.",
        category: "evasion",
        severity: 8,
        explanation:
            "Deliberately vague — 'cannot be fully determined' evades disclosure of known material impacts. SEC guidance requires more specific risk quantification.",
    },
    {
        sentence:
            "Management remains optimistic about long-term growth prospects despite near-term headwinds.",
        category: "sentiment_gap",
        severity: 9,
        explanation:
            "Narrative diverges from financial reality: Z-Score indicates Distress Zone while management projects bullish outlook. Possible misrepresentation.",
    },
    {
        sentence:
            "Certain forward-looking statements are subject to risks and uncertainties that could cause actual results to differ materially.",
        category: "hedging",
        severity: 5,
        explanation:
            "Standard safe-harbor language, but the density of such disclaimers in this filing exceeds industry norms by 2.3x, suggesting intentional obfuscation.",
    },
    {
        sentence:
            "We may need to seek additional financing, although there can be no assurance such financing will be available on favorable terms.",
        category: "evasion",
        severity: 8,
        explanation:
            "Buried admission of potential financing difficulties. 'No assurance' combined with 'may need' downplays what could be a critical going-concern risk.",
    },
];

const severityConfig = (severity: number) => {
    if (severity >= 8) return { label: "CRITICAL", color: "text-ag-red", bg: "bg-ag-red/10", border: "border-ag-red/30", dot: "bg-ag-red" };
    if (severity >= 5) return { label: "WARNING", color: "text-ag-amber", bg: "bg-ag-amber/10", border: "border-ag-amber/30", dot: "bg-ag-amber" };
    return { label: "NOTICE", color: "text-ag-cyan", bg: "bg-ag-cyan/10", border: "border-ag-cyan/30", dot: "bg-ag-cyan" };
};

const categoryLabels: Record<string, string> = {
    hedging: "HEDGING",
    evasion: "EVASION",
    sentiment_gap: "SENTIMENT GAP",
    inconsistency: "INCONSISTENCY",
};

export default function RedFlagTerminal({ flags = MOCK_FLAGS }: RedFlagTerminalProps) {
    return (
        <div className="card-glass overflow-hidden">
            {/* Terminal Header */}
            <div className="px-5 py-3 border-b border-ag-border bg-ag-bg2/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-ag-red/80" />
                        <div className="w-3 h-3 rounded-full bg-ag-amber/60" />
                        <div className="w-3 h-3 rounded-full bg-ag-green/60" />
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-ag-red" />
                        <span className="text-xs font-mono font-semibold text-ag-red uppercase tracking-widest">
                            Live Analysis
                        </span>
                    </div>
                </div>
                <span className="text-[10px] font-mono text-ag-muted">
                    {flags.length} flags detected
                </span>
            </div>

            {/* Terminal Body */}
            <div className="p-4 max-h-[500px] overflow-y-auto space-y-3 font-mono">
                {flags.map((flag, i) => {
                    const sev = severityConfig(flag.severity);
                    const timestamp = `${String(21 + Math.floor(i / 60)).padStart(2, "0")}:${String((i * 7 + 14) % 60).padStart(2, "0")}:${String((i * 13 + 42) % 60).padStart(2, "0")}`;

                    return (
                        <div
                            key={i}
                            className={`
                group rounded-lg border p-4 transition-all duration-300
                hover:bg-ag-card-hover
                ${sev.border} bg-ag-bg2/40
              `}
                            style={{ animationDelay: `${i * 0.1}s` }}
                        >
                            {/* Meta row */}
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-[10px] text-ag-muted">[{timestamp}]</span>
                                <span
                                    className={`
                    px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider
                    ${sev.bg} ${sev.color} border ${sev.border}
                  `}
                                >
                                    {sev.label}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-ag-surface text-ag-text2 border border-ag-border">
                                    {categoryLabels[flag.category] || flag.category.toUpperCase()}
                                </span>
                                <span className="text-[10px] text-ag-muted ml-auto">
                                    SEV {flag.severity}/10
                                </span>
                            </div>

                            {/* Suspicious sentence */}
                            <p className="text-xs text-ag-text leading-relaxed mb-2">
                                <span className="text-ag-muted">&quot;</span>
                                <span className="italic">{flag.sentence}</span>
                                <span className="text-ag-muted">&quot;</span>
                            </p>

                            {/* AI Explanation */}
                            <div className="flex gap-2">
                                <span className="text-ag-muted text-[10px] mt-0.5 shrink-0">▸</span>
                                <p className="text-[11px] text-ag-text2 leading-relaxed">
                                    <TypewriterText text={flag.explanation} delay={i * 200 + 300} />
                                </p>
                            </div>
                        </div>
                    );
                })}

                {/* Terminal cursor */}
                <div className="flex items-center gap-2 py-2">
                    <span className="text-ag-green text-xs">▶</span>
                    <span className="text-xs text-ag-muted">Analysis complete. Awaiting next query...</span>
                    <span className="w-2 h-4 bg-ag-green/60" />
                </div>
            </div>
        </div>
    );
}
