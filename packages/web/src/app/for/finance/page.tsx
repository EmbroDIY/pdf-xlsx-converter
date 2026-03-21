"use client";

import { LandingLayout } from "@/components/landing-layout";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BadgeDollarSign,
  Clock,
  FileSpreadsheet,
  ShieldCheck,
  TrendingUp,
  Upload,
  Eye,
} from "lucide-react";
import Link from "next/link";

export default function FinanceLanding() {
  return (
    <LandingLayout>
      {/* Hero */}
      <section className="flex-1 flex items-center">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm text-emerald-700 mb-6">
            <BadgeDollarSign className="h-3.5 w-3.5" />
            Built for finance teams
          </div>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Bank statements to Excel
            <br />
            <span className="text-muted-foreground">without the pain</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Stop wasting hours re-typing financial data. Upload any bank statement,
            invoice, or financial report — AI extracts every row, column, and number
            into a clean, audit-ready spreadsheet.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                Try it free
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Log in
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Pay per page. No subscription required.
          </p>
        </div>
      </section>

      {/* Pain points */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold mb-4">
            Sound familiar?
          </h2>
          <div className="mx-auto max-w-2xl space-y-3 text-muted-foreground">
            <p className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5">&#x2717;</span>
              Manually retyping 50-page bank statements into Excel every month
            </p>
            <p className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5">&#x2717;</span>
              Copy-paste from PDFs that breaks formatting, merges cells, loses decimals
            </p>
            <p className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5">&#x2717;</span>
              Spending $200/month on tools that still need manual corrections
            </p>
            <p className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5">&#x2717;</span>
              Year-end audits where you need data from dozens of different PDF formats
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold mb-12">
            Three steps. Any financial PDF.
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <Upload className="h-6 w-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold">1. Upload your PDF</h3>
              <p className="text-sm text-muted-foreground">
                Bank statement, invoice, P&L, balance sheet, tax form — any financial document.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold">2. AI reads every cell</h3>
              <p className="text-sm text-muted-foreground">
                Vision AI reads the page like a human — even scanned documents and unusual layouts.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <FileSpreadsheet className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold">3. Download your XLSX</h3>
              <p className="text-sm text-muted-foreground">
                Clean columns, proper number formatting, auto-filters. Import straight into your accounting software.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust signals */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Audit-ready output</h3>
                <p className="text-sm text-muted-foreground">
                  Numbers stay precise. No rounding errors, no missing decimals. Every row accounted for.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Save 10+ hours/month</h3>
                <p className="text-sm text-muted-foreground">
                  What used to take a full day now takes minutes. Process hundreds of pages without fatigue.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <TrendingUp className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Reusable templates</h3>
                <p className="text-sm text-muted-foreground">
                  Set up once for each bank or vendor format. Every future statement extracts instantly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-emerald-50">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold">
            Stop retyping. Start extracting.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Join finance teams who save hours every week on PDF data entry.
          </p>
          <Link href="/signup">
            <Button size="lg" className="mt-6 gap-2 bg-emerald-600 hover:bg-emerald-700">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </LandingLayout>
  );
}
