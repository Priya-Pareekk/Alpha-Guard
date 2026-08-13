import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import StatusIndicator from "@/components/StatusIndicator";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alpha-Guard | Forensic Credit Risk Platform",
  description:
    "Professional-grade forensic credit risk analysis. Altman Z-Score, Monte Carlo simulations, and real-time SEC EDGAR data.",
  keywords: [
    "credit risk",
    "Altman Z-Score",
    "financial analysis",
    "Monte Carlo",
    "SEC EDGAR",
    "forensic finance",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-ag-bg text-ag-text`}
      >
        {children}
        <StatusIndicator />
      </body>
    </html>
  );
}
