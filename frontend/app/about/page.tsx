"use client";

import React, { useState } from "react";
import DashboardHeader from "@/components/DashboardHeader";
import { AnimatedSection, AnimatedList } from "@/components/AnimatedSection";

// ──────────────────────────────────────────────
//  Skill Matrix Data
// ──────────────────────────────────────────────

const SKILL_CATEGORIES = [
    {
        title: "Languages",
        icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
            </svg>
        ),
        skills: ["Java", "Python", "C", "SQL", "HTML/CSS", "JavaScript"],
    },
    {
        title: "Frameworks & Tools",
        icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
        ),
        skills: ["React.js", "Node.js", "Git", "GitHub", "Postman", "VS Code"],
    },
    {
        title: "Core CS / Backend",
        icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
            </svg>
        ),
        skills: ["Data Structures & Algorithms", "DBMS", "Operating Systems", "System Design", "OOP", "Network Security"],
    },
    {
        title: "Cloud & DevOps",
        icon: (
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
        ),
        skills: ["Docker", "AWS Cloud Architecting", "Microsoft Azure", "CI/CD Pipelines"],
    },
];

const CREDENTIALS = [
    {
        icon: "🤖",
        title: "AI Project Developer",
        desc: "Building production-grade AI systems including forensic financial analysis platforms.",
    },
    {
        icon: "⚡",
        title: "Backend & Systems Developer",
        desc: "Specializing in scalable backend APIs, database architecture, and microservices design.",
    },
    {
        icon: "💻",
        title: "Competitive Programmer",
        desc: "Active problem solver with strong foundation in Data Structures, Algorithms, and Core CS.",
    },
];

// ──────────────────────────────────────────────
//  About Page
// ──────────────────────────────────────────────

export default function AboutPage() {
    const [hoveredSkill, setHoveredSkill] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-ag-bg flex flex-col">
            <DashboardHeader />

            <main className="flex-1 w-full max-w-[1480px] mx-auto px-4 sm:px-6 py-8">
                {/* Hero Badge */}
                <AnimatedSection className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/8 border border-emerald-500/15 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
                        <span className="text-[11px] font-mono text-emerald-400 tracking-wider uppercase">
                            The Architect
                        </span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-bold text-ag-text tracking-tight mb-2">
                        Built by{" "}
                        <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            Priya Pareek
                        </span>
                    </h2>
                    <p className="text-sm text-ag-text2 max-w-lg mx-auto">
                        The mind behind Alpha-Guard — student, backend developer, problem solver.
                    </p>
                </AnimatedSection>

                {/* ── Profile Card ── */}
                <AnimatedSection delay={0.1} className="mb-10">
                    <div
                        className="relative overflow-hidden rounded-2xl border border-emerald-500/15"
                        style={{
                            background: "linear-gradient(135deg, rgba(17,24,39,0.85) 0%, rgba(6,8,15,0.95) 100%)",
                            backdropFilter: "blur(24px)",
                        }}
                    >
                        {/* Background glow */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-500/3 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 p-8 sm:p-12">
                            {/* Info */}
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-2xl sm:text-3xl font-bold text-ag-text tracking-tight mb-1">
                                    Priya Pareek
                                </h3>
                                <p className="text-sm font-mono text-emerald-400 mb-1">
                                    Student · VIT-AP University
                                </p>
                                <p className="text-xs font-mono text-ag-muted mb-6">
                                    Software Developer · SDE Aspirant · Backend Enthusiast
                                </p>

                                {/* Portfolio CTA — Neon Pulse */}
                                <a
                                    href="#"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group relative inline-flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm tracking-wide overflow-hidden transition-all duration-300 hover:scale-[1.02]"
                                    style={{
                                        background: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)",
                                        border: "1px solid rgba(16,185,129,0.35)",
                                        color: "#10b981",
                                    }}
                                >
                                    {/* Neon pulse background */}
                                    <span className="absolute inset-0 -z-10 rounded-xl bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <span
                                        className="absolute inset-0 -z-20 rounded-xl animate-pulse-soft"
                                        style={{
                                            boxShadow: "0 0 25px rgba(16,185,129,0.15), 0 0 60px rgba(16,185,129,0.05)",
                                        }}
                                    />

                                    <svg
                                        className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line x1="10" y1="14" x2="21" y2="3" />
                                    </svg>
                                    View Portfolio
                                    <svg
                                        className="w-3.5 h-3.5 opacity-50 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-1"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth={2.5}
                                    >
                                        <polyline points="9 18 15 12 9 6" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </AnimatedSection>

                {/* ── Credentials ── */}
                <AnimatedSection delay={0.2} className="mb-10">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-1 h-5 rounded-full bg-emerald-500" />
                        <h3 className="text-sm font-semibold text-ag-text uppercase tracking-wider">
                            Credentials & Achievements
                        </h3>
                    </div>
                    <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {CREDENTIALS.map((cred) => (
                            <div
                                key={cred.title}
                                className="card-glass p-5 group hover:border-emerald-500/25 transition-all duration-300"
                            >
                                <div className="flex items-start gap-3">
                                    {cred.icon && <span className="text-2xl flex-shrink-0 mt-0.5">{cred.icon}</span>}
                                    <div>
                                        <h4 className="text-sm font-semibold text-ag-text group-hover:text-emerald-400 transition-colors mb-1">
                                            {cred.title}
                                        </h4>
                                        <p className="text-xs text-ag-text2 leading-relaxed">{cred.desc}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </AnimatedList>
                </AnimatedSection>

                {/* ── Skill Matrix ── */}
                <AnimatedSection delay={0.3} className="mb-10">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-1 h-5 rounded-full bg-cyan-400" />
                        <h3 className="text-sm font-semibold text-ag-text uppercase tracking-wider">
                            Tech Stack · Skill Matrix
                        </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {SKILL_CATEGORIES.map((cat) => (
                            <div
                                key={cat.title}
                                className="card-glass p-5 hover:border-emerald-500/20 transition-all duration-300"
                            >
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                                        {cat.icon}
                                    </div>
                                    <h4 className="text-sm font-semibold text-ag-text font-mono uppercase tracking-wider">
                                        {cat.title}
                                    </h4>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {cat.skills.map((skill) => (
                                        <span
                                            key={skill}
                                            onMouseEnter={() => setHoveredSkill(skill)}
                                            onMouseLeave={() => setHoveredSkill(null)}
                                            className={`
                        px-3 py-1.5 rounded-lg text-xs font-mono cursor-default
                        transition-all duration-200
                        ${hoveredSkill === skill
                                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.1)]"
                                                    : "bg-ag-surface/60 text-ag-text2 border border-ag-border hover:border-emerald-500/20"
                                                }
                      `}
                                        >
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </AnimatedSection>

                {/* ── Attribution Footer ── */}
                <AnimatedSection delay={0.4} className="mb-8">
                    <div className="card-glass p-6 text-center">
                        <p className="text-xs text-ag-muted font-mono">
                            Alpha-Guard was conceptualized and architected by Priya Pareek as a demonstration
                            of full-stack engineering and backend systems design capabilities.
                        </p>
                        <div className="flex items-center justify-center gap-4 mt-4">
                            <a
                                href="#"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 text-xs font-mono hover:text-emerald-300 transition-colors"
                            >
                                Portfolio ↗
                            </a>
                            <span className="text-ag-border">|</span>
                            <span className="text-[10px] font-mono text-ag-muted">
                                VIT-AP University · 2023-2027
                            </span>
                        </div>
                    </div>
                </AnimatedSection>
            </main>

            {/* Footer */}
            <footer className="border-t border-ag-border py-4 px-6">
                <div className="max-w-[1480px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
                    <p className="text-[10px] font-mono text-ag-muted">
                        ALPHA-GUARD v0.2.0 · Designed by Priya Pareek
                    </p>
                    <p className="text-[10px] font-mono text-ag-muted">
                        Powered by FastAPI · Next.js · SEC EDGAR · Google Gemini
                    </p>
                </div>
            </footer>
        </div>
    );
}
