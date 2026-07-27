"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import tickers from "@/lib/tickers.json";

interface TickerSearchProps {
    onSearch?: (ticker: string) => void | Promise<void>;
    isLoading?: boolean;
}

interface TickerEntry {
    symbol: string;
    name: string;
    sector: string;
    exchange?: string;
}

export default function TickerSearch({ onSearch, isLoading: externalLoading }: TickerSearchProps) {
    const [query, setQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [internalLoading, setInternalLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [globalMode, setGlobalMode] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const isLoading = externalLoading ?? internalLoading;

    const allTickers = tickers as TickerEntry[];

    // Normalize a string for fuzzy matching: lowercase, strip all non-alphanumeric
    const normalize = useCallback((s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, ""), []);

    // Filter tickers based on query and global mode
    const suggestions = useMemo((): TickerEntry[] => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        const qNorm = normalize(query);
        return allTickers
            .filter((t) => {
                // Filter by exchange when not in global mode
                if (!globalMode && t.exchange && !["NYSE", "NASDAQ", "S&P500"].includes(t.exchange)) {
                    return false;
                }
                // Match by symbol (exact substring)
                if (t.symbol.toLowerCase().includes(q)) return true;
                // Match by name (exact substring)
                if (t.name.toLowerCase().includes(q)) return true;
                // Fuzzy match: normalized query against normalized name
                // e.g. "JP MORGAN" → "jpmorgan" matches "JPMorgan Chase & Co." → "jpmorganchase..."
                if (qNorm.length >= 2 && normalize(t.name).includes(qNorm)) return true;
                return false;
            })
            .slice(0, 8);
    }, [query, globalMode, allTickers, normalize]);

    // Try to resolve a raw text input to a known ticker symbol
    const resolveToTicker = useCallback((rawInput: string): string => {
        const upper = rawInput.trim().toUpperCase();
        // 1. Exact ticker match
        const exactTicker = allTickers.find(t => t.symbol.toUpperCase() === upper);
        if (exactTicker) return exactTicker.symbol;

        // 2. Fuzzy match against company names
        const inputNorm = normalize(rawInput);
        if (inputNorm.length >= 2) {
            const nameMatch = allTickers.find(t => normalize(t.name).includes(inputNorm));
            if (nameMatch) return nameMatch.symbol;
        }

        // 3. If suggestions are visible, pick the top one
        if (suggestions.length > 0) return suggestions[0].symbol;

        // 4. Fallback: return as-is (let the backend handle it)
        return upper;
    }, [allTickers, suggestions, normalize]);

    useEffect(() => {
        setShowDropdown(isFocused && suggestions.length > 0 && !isLoading);
        setSelectedIndex(-1);
    }, [suggestions, isFocused, isLoading]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const submitTicker = useCallback(
        async (ticker: string) => {
            if (!ticker || isLoading) return;
            setShowDropdown(false);
            setInternalLoading(true);
            try {
                await onSearch?.(ticker);
            } finally {
                setInternalLoading(false);
            }
        },
        [onSearch, isLoading]
    );

    const handleSelect = useCallback(
        (entry: TickerEntry) => {
            setQuery(entry.symbol);
            setShowDropdown(false);
            inputRef.current?.blur();
            submitTicker(entry.symbol);
        },
        [submitTicker]
    );

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();
            const raw = query.trim();
            if (!raw) return;

            if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
                handleSelect(suggestions[selectedIndex]);
                return;
            }

            // Resolve company names / fuzzy input to actual ticker symbols
            const resolved = resolveToTicker(raw);
            setQuery(resolved);
            submitTicker(resolved);
        },
        [query, selectedIndex, suggestions, handleSelect, submitTicker, resolveToTicker]
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!showDropdown) return;

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    setSelectedIndex((prev) => Math.max(prev - 1, -1));
                    break;
                case "Escape":
                    setShowDropdown(false);
                    break;
            }
        },
        [showDropdown, suggestions.length]
    );

    useEffect(() => {
        if (selectedIndex >= 0 && dropdownRef.current) {
            const items = dropdownRef.current.querySelectorAll("[data-ticker-item]");
            items[selectedIndex]?.scrollIntoView({ block: "nearest" });
        }
    }, [selectedIndex]);

    const sectorColor = (sector: string) => {
        const map: Record<string, string> = {
            Technology: "text-ag-cyan",
            "Financial Services": "text-ag-green",
            Healthcare: "text-ag-amber",
            Energy: "text-ag-red",
            Industrials: "text-ag-text2",
            "Consumer Cyclical": "text-ag-amber",
            "Consumer Defensive": "text-ag-green",
            "Communication Services": "text-ag-cyan",
            Utilities: "text-ag-muted",
            "Basic Materials": "text-ag-amber",
        };
        return map[sector] || "text-ag-muted";
    };

    const usCount = allTickers.filter(t => !t.exchange || ["NYSE", "NASDAQ", "S&P500"].includes(t.exchange)).length;
    const globalCount = allTickers.length;

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
            <div ref={containerRef} className="relative">
                <div
                    className={`
            relative flex items-center gap-3 px-4 py-3
            rounded-lg border transition-all duration-200
            ${isFocused
                            ? "border-ag-green/40 bg-ag-card"
                            : "border-ag-border bg-ag-bg2 hover:border-ag-border-hover"
                        }
            ${showDropdown ? "rounded-b-none border-b-ag-border/50" : ""}
          `}
                >
                    {/* Search Icon */}
                    <svg
                        className={`w-4 h-4 flex-shrink-0 transition-colors duration-200 ${isFocused ? "text-ag-green" : "text-ag-muted"}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>

                    {/* Input */}
                    <input
                        id="ticker-search"
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value.toUpperCase())}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => {
                            setTimeout(() => setIsFocused(false), 150);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={globalMode
                            ? "Search global markets... e.g. RELIANCE, TCS.NS, TSLA"
                            : "Search ticker or company... e.g. AAPL, Apple"
                        }
                        className="
              flex-1 bg-transparent outline-none text-ag-text text-sm
              font-mono placeholder:text-ag-muted tracking-wide
            "
                        autoComplete="off"
                        spellCheck={false}
                        disabled={isLoading}
                        role="combobox"
                        aria-expanded={showDropdown}
                        aria-autocomplete="list"
                        aria-controls="ticker-listbox"
                    />

                    {/* Global Toggle */}
                    <button
                        type="button"
                        onClick={() => setGlobalMode(!globalMode)}
                        className={`
              flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono font-semibold
              uppercase tracking-wider border transition-all duration-200
              ${globalMode
                                ? "text-ag-cyan bg-ag-cyan/10 border-ag-cyan/30"
                                : "text-ag-muted bg-ag-surface border-ag-border hover:text-ag-text2"
                            }
            `}
                    >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <circle cx="12" cy="12" r="10" />
                            <path d="M2 12h20" />
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                        Global
                    </button>

                    {/* Loading Spinner */}
                    {isLoading && (
                        <div className="w-4 h-4 border-2 border-ag-green/30 border-t-ag-green rounded-full animate-spin" />
                    )}

                    {/* Keyboard Shortcut Badge */}
                    {!isFocused && !query && (
                        <div className="hidden sm:flex items-center gap-0.5">
                            <kbd className="px-1.5 py-0.5 rounded bg-ag-surface text-[10px] font-mono text-ag-muted border border-ag-border">
                                Ctrl
                            </kbd>
                            <kbd className="px-1.5 py-0.5 rounded bg-ag-surface text-[10px] font-mono text-ag-muted border border-ag-border">
                                K
                            </kbd>
                        </div>
                    )}

                    {/* Submit Button */}
                    {query && (
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="
                px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider
                bg-ag-green/10 text-ag-green border border-ag-green/20
                hover:bg-ag-green/20 hover:border-ag-green/40
                transition-all duration-200
                disabled:opacity-40 disabled:cursor-not-allowed
              "
                        >
                            {isLoading ? "Analyzing..." : "Analyze"}
                        </button>
                    )}
                </div>

                {/* ── Dropdown ── */}
                {showDropdown && (
                    <div
                        ref={dropdownRef}
                        id="ticker-listbox"
                        role="listbox"
                        className="
              absolute z-50 w-full
              rounded-b-lg border border-t-0 border-ag-border
              bg-ag-card
              shadow-lg shadow-black/20
              overflow-hidden
            "
                    >
                        {suggestions.map((entry, i) => (
                            <div
                                key={entry.symbol}
                                data-ticker-item
                                role="option"
                                aria-selected={i === selectedIndex}
                                onMouseDown={() => handleSelect(entry)}
                                onMouseEnter={() => setSelectedIndex(i)}
                                className={`
                  flex items-center justify-between px-4 py-2.5 cursor-pointer
                  transition-colors duration-100
                  ${i === selectedIndex
                                        ? "bg-ag-green/8 border-l-2 border-l-ag-green"
                                        : "border-l-2 border-l-transparent hover:bg-ag-surface/40"
                                    }
                  ${i < suggestions.length - 1 ? "border-b border-b-ag-border/40" : ""}
                `}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className={`text-sm font-mono font-bold ${i === selectedIndex ? "text-ag-green" : "text-ag-text"} w-[80px] flex-shrink-0`}>
                                        {entry.symbol}
                                    </span>
                                    <span className="text-xs text-ag-text2 truncate">
                                        {entry.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                    {entry.exchange && (
                                        <span className="text-[8px] font-mono uppercase tracking-wider text-ag-muted bg-ag-surface px-1.5 py-0.5 rounded">
                                            {entry.exchange}
                                        </span>
                                    )}
                                    <span className={`text-[9px] font-mono uppercase tracking-wider ${sectorColor(entry.sector)}`}>
                                        {entry.sector}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Helper text */}
            <p className="text-center text-[10px] text-ag-muted mt-2 font-mono">
                {globalMode
                    ? `Global search · ${globalCount} companies across BSE/NSE, NYSE, LSE & more`
                    : `US market · ${usCount} companies indexed · Enable Global for international`
                }
            </p>
        </form>
    );
}
