"use client";

import { LandingLayout } from "@/components/landing-layout";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Ship,
  Clock,
  FileSpreadsheet,
  Package,
  Globe,
  Upload,
  Eye,
} from "lucide-react";
import Link from "next/link";

export default function LogisticsLanding() {
  return (
    <LandingLayout>
      {/* Hero */}
      <section className="flex-1 flex items-center">
        <div className="mx-auto max-w-5xl px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm text-sky-700 mb-6">
            <Ship className="h-3.5 w-3.5" />
            Built for logistics & supply chain
          </div>

          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Shipping docs to Excel
            <br />
            <span className="text-muted-foreground">in seconds, not hours</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Bills of lading, customs declarations, packing lists, freight invoices —
            AI reads every line item and gives you a clean spreadsheet. No more
            manual data entry from carrier PDFs.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2 bg-sky-600 hover:bg-sky-700">
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
            Your team knows this struggle
          </h2>
          <div className="mx-auto max-w-2xl space-y-3 text-muted-foreground">
            <p className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5">&#x2717;</span>
              Retyping container numbers, weights, and line items from bills of lading
            </p>
            <p className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5">&#x2717;</span>
              Every carrier sends a different PDF format — tables never copy-paste cleanly
            </p>
            <p className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5">&#x2717;</span>
              Customs paperwork piling up, each document needs data pulled into your TMS
            </p>
            <p className="flex items-start gap-3">
              <span className="text-red-400 mt-0.5">&#x2717;</span>
              One wrong digit in a shipment weight or HS code means delays at the border
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-muted/30">
        <div className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold mb-12">
            From PDF to spreadsheet in three clicks
          </h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sky-100">
                <Upload className="h-6 w-6 text-sky-600" />
              </div>
              <h3 className="font-semibold">1. Upload the document</h3>
              <p className="text-sm text-muted-foreground">
                Bill of lading, packing list, freight invoice, customs form — any logistics PDF.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                <Eye className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold">2. AI extracts the data</h3>
              <p className="text-sm text-muted-foreground">
                Vision AI reads complex multi-column layouts, scanned docs, and handwritten annotations.
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <FileSpreadsheet className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold">3. Get your XLSX</h3>
              <p className="text-sm text-muted-foreground">
                Ready to import into your TMS, ERP, or share with partners. Properly formatted, every time.
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
              <Package className="h-6 w-6 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Any carrier format</h3>
                <p className="text-sm text-muted-foreground">
                  Maersk, MSC, CMA CGM, FedEx, DHL — create a template once and reuse it for every shipment.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="h-6 w-6 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Process docs 20x faster</h3>
                <p className="text-sm text-muted-foreground">
                  A 30-page manifest that took an hour to type? Done in under 2 minutes.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Globe className="h-6 w-6 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold">Multi-language support</h3>
                <p className="text-sm text-muted-foreground">
                  AI vision models read documents in any language — Chinese customs forms, Arabic invoices, you name it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-sky-50">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold">
            Your cargo moves fast. Your data should too.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Join logistics teams who stopped retyping shipping documents.
          </p>
          <Link href="/signup">
            <Button size="lg" className="mt-6 gap-2 bg-sky-600 hover:bg-sky-700">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </LandingLayout>
  );
}
