"use client";

import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface TemplateData {
  id?: string;
  name: string;
  headers: string[];
  header_marker: string;
  stop_marker: string;
}

export function TemplateForm({ template }: { template?: TemplateData }) {
  const { session } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(template?.name ?? "");
  const [headerMarker, setHeaderMarker] = useState(
    template?.header_marker ?? ""
  );
  const [stopMarker, setStopMarker] = useState(template?.stop_marker ?? "");
  const [headers, setHeaders] = useState(
    template?.headers.join("\n") ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    const headerList = headers
      .split("\n")
      .map((h) => h.trim())
      .filter(Boolean);
    if (headerList.length === 0) {
      setError("At least one column header is required.");
      return;
    }

    setError(null);
    setSubmitting(true);

    const body = {
      name: name.trim(),
      headers: headerList,
      header_marker: headerMarker.trim(),
      stop_marker: stopMarker.trim(),
    };

    try {
      const url = template?.id
        ? `/api/templates/${template.id}`
        : "/api/templates";
      const method = template?.id ? "PUT" : "POST";
      const res = await apiFetch(url, session.access_token, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      router.push("/templates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Template Details</CardTitle>
        <CardDescription>
          Define the table structure for a PDF type.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template name</Label>
            <Input
              id="name"
              placeholder="e.g. Invoice Table"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="headerMarker">Header marker</Label>
            <Input
              id="headerMarker"
              placeholder="e.g. Item No."
              value={headerMarker}
              onChange={(e) => setHeaderMarker(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Text from the table&apos;s header row that helps identify where
              the table starts.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stopMarker">Stop marker (optional)</Label>
            <Input
              id="stopMarker"
              placeholder="e.g. Total"
              value={stopMarker}
              onChange={(e) => setStopMarker(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Text that appears after the table ends.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="headers">Column headers (one per line)</Label>
            <textarea
              id="headers"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder={"Item No.\nDescription\nQuantity\nUnit Price\nTotal"}
              value={headers}
              onChange={(e) => setHeaders(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : template?.id
                  ? "Update template"
                  : "Create template"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/templates")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
