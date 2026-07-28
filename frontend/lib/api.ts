/**
 * Alpha-Guard — API Client
 * =========================
 * Centralized fetch wrapper for all backend API calls.
 * Backend runs on http://localhost:8000
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "https://alpha-guard.onrender.com").replace(/\/$/, "");

// ── Types matching backend Pydantic models ──

export interface CompanyInfo {
    ticker: string;
    name: string | null;
    cik: string | null;
    sector: string | null;
}

export interface FinancialData {
    ticker: string;
    total_assets: number;
    current_assets: number;
    current_liabilities: number;
    retained_earnings: number;
    ebit: number;
    market_cap: number;
    total_liabilities: number;
    revenue: number;
}

export interface ZScoreComponents {
    x1_working_capital_to_total_assets: number;
    x2_retained_earnings_to_total_assets: number;
    x3_ebit_to_total_assets: number;
    x4_market_cap_to_total_liabilities: number;
    x5_revenue_to_total_assets: number;
}

export interface ZScoreResult {
    ticker: string;
    score: number;
    zone: "Safe" | "Gray" | "Distress";
    components: ZScoreComponents;
    interpretation: string;
}

export interface RedFlag {
    sentence: string;
    category: string;
    severity: number;
    explanation: string;
}

export interface LinguisticAnalysis {
    hedging_score: number;
    evasion_score: number;
    sentiment: string;
    sentiment_confidence: number;
    hedging_words_found: string[];
    suspicious_sentences: RedFlag[];
    total_words_analyzed: number;
}

export interface ForensicResult {
    truth_score: number;
    truth_zone: string;
    linguistic_analysis: LinguisticAnalysis;
    red_flags: RedFlag[];
    deception_alert: boolean;
    deception_reason: string | null;
    z_score_result: ZScoreResult | null;
    ai_confidence_score: number | null;
}

export interface ForensicAuditResponse {
    ticker: string;
    company_name: string | null;
    timestamp: string;
    forensic: ForensicResult;
    data_sources: string[];
    gemini_active: boolean;
}

export interface HealthCheck {
    status: string;
    platform: string;
    version: string;
    modules: string[];
}

// ── API Error ──

export class ApiError extends Error {
    status: number;
    detail: string;

    constructor(status: number, detail: string) {
        super(detail);
        this.status = status;
        this.detail = detail;
    }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    try {
        const res = await fetch(`${API_BASE}${path}`, {
            headers: { "Content-Type": "application/json" },
            ...options,
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new ApiError(
                res.status,
                body.detail || `API error: ${res.status} ${res.statusText}`
            );
        }

        return res.json();
    } catch (err) {
        if (err instanceof ApiError) throw err;
        throw new ApiError(0, `Network error: Unable to reach backend at ${API_BASE}. Check CORS or if the server is down.`);
    }
}

// ── Endpoints ──

export async function healthCheck(): Promise<HealthCheck> {
    return apiFetch<HealthCheck>("/");
}

export async function fetchCompanyInfo(ticker: string): Promise<CompanyInfo> {
    return apiFetch<CompanyInfo>(`/api/data/company/${encodeURIComponent(ticker)}`);
}

export async function fetchFinancials(ticker: string): Promise<FinancialData> {
    return apiFetch<FinancialData>(`/api/data/financials/${encodeURIComponent(ticker)}`);
}

export async function calculateZScore(data: FinancialData): Promise<ZScoreResult> {
    return apiFetch<ZScoreResult>("/api/risk/z-score", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function runForensicAudit(ticker: string): Promise<ForensicAuditResponse> {
    return apiFetch<ForensicAuditResponse>("/api/risk/forensic-audit", {
        method: "POST",
        body: JSON.stringify({ ticker }),
    });
}

// ── Monte Carlo ──

export interface MonteCarloInput {
    ticker: string;
    num_simulations?: number;
    time_horizon_years?: number;
    initial_revenue?: number;
    revenue_growth_mean?: number;
    revenue_growth_std?: number;
}

export interface MonteCarloResult {
    ticker: string;
    num_simulations: number;
    time_horizon_years: number;
    mean_final_revenue: number | null;
    median_final_revenue: number | null;
    percentile_5: number | null;
    percentile_95: number | null;
    probability_of_decline: number | null;
    status: string;
    initial_revenue: number | null;
    histogram: { range: string; count: number; pct: number; midpoint: number }[];
    sample_paths: { year: number; p5: number; p25: number; median: number; p75: number; p95: number; mean: number }[];
}

export async function runMonteCarlo(params: MonteCarloInput): Promise<MonteCarloResult> {
    return apiFetch<MonteCarloResult>("/api/risk/monte-carlo", {
        method: "POST",
        body: JSON.stringify(params),
    });
}

// ── Config Status ──

export interface ConfigStatus {
    gemini_configured: boolean;
}

export async function checkConfigStatus(): Promise<ConfigStatus> {
    return apiFetch<ConfigStatus>("/api/config/status");
}
