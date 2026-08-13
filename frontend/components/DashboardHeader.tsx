"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
    { label: "Dashboard", href: "/" },
    { label: "Forensic", href: "/forensic" },
    { label: "Reports", href: "/reports" },
    { label: "Architect", href: "/about" },
];

export default function DashboardHeader() {
    const pathname = usePathname();

    return (
        <header className="w-full border-b border-ag-border bg-ag-bg2 sticky top-0 z-50">
            <div className="max-w-[1480px] mx-auto px-6 h-14 flex items-center justify-between">
                {/* Logo / Wordmark */}
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="relative w-8 h-8 flex items-center justify-center">
                        <div className="absolute inset-0 rounded-md bg-ag-green/10 border border-ag-green/20 group-hover:border-ag-green/40 transition-colors" />
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            className="w-4 h-4 text-ag-green relative z-10"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <path d="M9 12l2 2 4-4" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-sm font-semibold tracking-tight text-ag-text leading-none">
                            Alpha-Guard
                        </h1>
                        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-ag-muted mt-0.5">
                            Forensic Risk Platform
                        </p>
                    </div>
                </Link>

                {/* Nav / Status */}
                <div className="flex items-center gap-4">
                    <nav className="hidden md:flex items-center gap-0.5">
                        {NAV_ITEMS.map((item) => {
                            const isActive =
                                item.href === "/"
                                    ? pathname === "/"
                                    : pathname.startsWith(item.href) && item.href !== "#";

                            return (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    className={`
                    px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                    ${isActive
                                            ? "text-ag-green bg-ag-green/8"
                                            : "text-ag-text2 hover:text-ag-text hover:bg-ag-surface/50"
                                        }
                  `}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Live Status */}
                    <div className="flex items-center gap-2 pl-3 border-l border-ag-border">
                        <div className="w-1.5 h-1.5 rounded-full bg-ag-green" />
                        <span className="text-[10px] font-mono text-ag-muted hidden sm:inline">
                            LIVE
                        </span>
                    </div>
                </div>
            </div>
        </header>
    );
}
