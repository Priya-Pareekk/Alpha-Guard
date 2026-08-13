"use client";

import React, { useState, useEffect } from "react";
import { healthCheck } from "@/lib/api";

export default function StatusIndicator() {
    const [backendStatus, setBackendStatus] = useState<"checking" | "connected" | "disconnected">("checking");
    const [flagCount, setFlagCount] = useState(0);
    const [version, setVersion] = useState("");

    useEffect(() => {
        let mounted = true;

        const checkHealth = async () => {
            try {
                const health = await healthCheck();
                if (mounted) {
                    setBackendStatus("connected");
                    setVersion(health.version);
                }
            } catch {
                if (mounted) setBackendStatus("disconnected");
            }
        };

        checkHealth();
        const interval = setInterval(checkHealth, 30000); // every 30s

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    // Listen for custom event from analysis pages
    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (typeof detail?.flagCount === "number") {
                setFlagCount(detail.flagCount);
            }
        };
        window.addEventListener("alpha-guard:flags", handler);
        return () => window.removeEventListener("alpha-guard:flags", handler);
    }, []);

    const statusColor = {
        checking: "bg-ag-amber",
        connected: "bg-ag-green",
        disconnected: "bg-ag-red",
    }[backendStatus];

    const statusText = {
        checking: "CONNECTING...",
        connected: `ONLINE${version ? ` · v${version}` : ""}`,
        disconnected: "OFFLINE",
    }[backendStatus];

    return (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3">
            {/* Backend status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ag-bg2/90 backdrop-blur-sm border border-ag-border text-[10px] font-mono">
                <div className="relative w-2 h-2">
                    <div className={`absolute inset-0 rounded-full ${statusColor}`} />
                    <div className={`w-2 h-2 rounded-full ${statusColor} relative`} />
                </div>
                <span className="text-ag-muted">{statusText}</span>
            </div>

            {/* Flag count (only shown when > 0) */}
            {flagCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-ag-red/8 border border-ag-red/20 text-[10px] font-mono">
                    <div className="w-2 h-2 rounded-full bg-ag-red" />
                    <span className="text-ag-red font-semibold">{flagCount} FLAG{flagCount !== 1 ? "S" : ""}</span>
                </div>
            )}
        </div>
    );
}
