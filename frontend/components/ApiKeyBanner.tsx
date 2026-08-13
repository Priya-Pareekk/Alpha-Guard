"use client";

import React, { useState } from "react";

interface ApiKeyBannerProps {
    show: boolean;
}

export default function ApiKeyBanner({ show }: ApiKeyBannerProps) {
    const [dismissed, setDismissed] = useState(false);

    if (!show || dismissed) return null;

    return (
        <div className="w-full max-w-[1480px] mx-auto px-4 sm:px-6 mb-4">
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-ag-amber/8 border border-ag-amber/20">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-ag-amber flex-shrink-0" />
                    <div className="min-w-0">
                        <p className="text-xs font-mono font-semibold text-ag-amber uppercase tracking-wider">
                            AI Analysis Unavailable
                        </p>
                        <p className="text-[11px] text-ag-text2 mt-0.5">
                            GEMINI_API_KEY not configured — forensic analysis will use heuristic mode only.{" "}
                            <a
                                href="/settings"
                                className="text-ag-amber underline underline-offset-2 hover:text-ag-text transition-colors"
                            >
                                Get an API key →
                            </a>
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className="flex-shrink-0 p-1 rounded hover:bg-ag-surface transition-colors"
                    aria-label="Dismiss"
                >
                    <svg className="w-4 h-4 text-ag-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
