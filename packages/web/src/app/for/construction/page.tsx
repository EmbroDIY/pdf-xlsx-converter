"use client";

import { LandingLayout } from "@/components/landing-layout";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  HardHat,
  Clock,
  FileSpreadsheet,
  ClipboardList,
  DollarSign,
  Upload,
  Eye,
} from "lucide-react";
import Link from "next/link";

export default function ConstructionLanding() {
  return (
    <LandingLayout>
      {/* Hero */}
      <section className="flex-1 flex items-center">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-sm text-orange-700 mb-6">
            <HardHat className="h-3.5 w-3.5" />
            Built for construction & real estate
          </div>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Bid tabs & specs to Excel
            <br />
            <span className="text-muted-foreground">without retyping a single line</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Bid tabulations, material takeoffs, inspection reports, subcontractor quotes —
            AI pulls every number from your PDFs into a ready-to-use spreadsheet.
            Compare bids in minutes, not days.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-orange-600 hover:bg-orange-700">
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
            Every GC and estimator knows this
          </h2>
          <div className="mx-auto max-w-2xl space-y-3 text-muted-foreground">
            <p className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5">&#x2717;</span>
              Retyping 15 subcontractor bids into a comparison spreadsheet before the deadline
            </p>
            <p className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5">&#x2717;</span>
              Material takeoff PDFs from suppliers with tables that won't copy-paste
            </p>
            <p className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5">&#x2717;</span>
              Inspection reports with dozens of line items that need to go into your project tracker
            </p>
            <p className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5">&#x2717;</span>
              A missed number in a bid comparison that cost the project thousands
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold mb-12">
            From PDF to spreadsheet — every time
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100">
                <Upload className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-semibold">1. Upload your document</h3>
              <p className="text-sm text-muted-foreground">
                Bid tab, material schedule, inspection report, change order — any construction PDF.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold">2. AI reads the tables</h3>
              <p className="text-sm text-muted-foreground">
                Even messy scanned docs, hand-marked prints, and multi-page specs. Every row captured.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <FileSpreadsheet className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold">3. Download your XLSX</h3>
              <p className="text-sm text-muted-foreground">
                Formatted columns, correct numbers, ready to drop into your cost estimate or project tracker.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <ClipboardList className="h-6 w-6 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Bid comparison in minutes</h3>
                <p className="text-sm text-muted-foreground">
                  Extract all sub bids into one sheet. Compare line items side-by-side without a single keystroke.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-6 w-6 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Beat the deadline</h3>
                <p className="text-sm text-muted-foreground">
                  Process a full bid package in minutes, not hours. More time to review, less time typing.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DollarSign className="h-6 w-6 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">No missed numbers</h3>
                <p className="text-sm text-muted-foreground">
                  AI catches every line item — unit prices, quantities, totals. No more costly transcription errors.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-orange-50">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold">
            Build faster. Bid smarter.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Join contractors and estimators who stopped retyping bid documents.
          </p>
          <Link href="/signup">
            <Button size="lg" className="mt-6 gap-2 bg-orange-600 hover:bg-orange-700">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </LandingLayout>
  );
}
