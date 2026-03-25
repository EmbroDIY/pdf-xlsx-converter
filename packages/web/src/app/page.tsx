"use client";

import { LandingLayout } from "@/components/landing-layout";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  Upload,
  Zap,
  Eye,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <LandingLayout>
      {/* Hero */}
      <section className="flex-1 flex items-center">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground mb-6">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            Powered by AI vision models
          </div>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            PDF tables to Excel
            <br />
            <span className="text-muted-foreground">in seconds</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Upload a PDF, pick a template, get a clean XLSX. No manual copying,
            no broken formatting. AI reads your tables exactly as they are.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Start extracting
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Log in
              </Button>
            </Link>
          </div>

          {/* Flow visual */}
          <div className="mx-auto mt-16 max-w-2xl">
            <div className="rounded-xl border bg-card p-1 shadow-lg">
              <div className="rounded-lg bg-muted/50 p-8">
                <div className="flex items-center justify-center gap-8 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-16 w-14 items-center justify-center rounded-lg border-2 border-dashed">
                      <Upload className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-medium">Upload PDF</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-16 w-14 items-center justify-center rounded-lg border bg-background">
                      <Eye className="h-6 w-6 text-blue-500" />
                    </div>
                    <span className="text-xs font-medium">AI reads tables</span>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground/50" />
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex h-16 w-14 items-center justify-center rounded-lg border bg-background">
                      <FileSpreadsheet className="h-6 w-6 text-green-600" />
                    </div>
                    <span className="text-xs font-medium">Get XLSX</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">AI Vision Extraction</h3>
              <p className="text-sm text-muted-foreground">
                Uses Gemini and Ollama vision models to read table data directly
                from page images. Works with any PDF layout.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Clean Excel Output</h3>
              <p className="text-sm text-muted-foreground">
                Auto-formatted XLSX with proper columns, filters, and number
                detection. Ready to use — no cleanup needed.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">Reusable Templates</h3>
              <p className="text-sm text-muted-foreground">
                Define column headers and table markers once, then extract from
                any PDF with the same layout. Batch-ready.
              </p>
            </div>
          </div>
        </div>
      </section>
    </LandingLayout>
  );
}
