"use client";

import { useAuth } from "@/hooks/use-auth";
import { useTaskProgress } from "@/hooks/use-task-progress";
import { apiFetch, apiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, AlertCircle, Download } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface Template {
  id: string;
  name: string;
  headers: string[];
}

export default function ConvertPage() {
  const { session } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const task = useTaskProgress(runId);

  // Load templates
  useEffect(() => {
    if (!session) return;
    apiFetch("/api/templates", session.access_token)
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [session]);

  // Check model health
  useEffect(() => {
    apiFetch("/api/health/model", null)
      .then((r) => r.json())
      .then(setModelStatus)
      .catch(() => setModelStatus({ ok: false, message: "API unreachable" }));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.toLowerCase().endsWith(".pdf")) {
      setFile(droppedFile);
    }
  }, []);

  const handleConvert = async () => {
    if (!file || !selectedTemplate || !session) return;

    setSubmitting(true);
    setError(null);
    setRunId(null);
    task.reset();

    const form = new FormData();
    form.append("file", file);
    form.append("template_id", selectedTemplate);

    try {
      const res = await fetch(`${apiUrl("/api/convert")}`, {
        method: "POST",
        body: form,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        if (res.status === 402) {
          setError("Insufficient credits. Please top up your balance in Settings.");
          return;
        }
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setRunId(data.run_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start conversion");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!runId || !session) return;
    const res = await fetch(apiUrl(`/api/download/${runId}`), {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = file?.name.replace(/\.pdf$/i, ".xlsx") || "result.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  const reset = () => {
    setFile(null);
    setRunId(null);
    setError(null);
    setSubmitting(false);
    task.reset();
  };

  const isActive = submitting || (runId && task.status !== "completed" && task.status !== "failed");
  const showProgress = runId !== null || submitting;

  // Derive display status
  let displayStatus: string;
  let badgeVariant: "default" | "destructive" | "secondary";
  if (error || task.status === "failed") {
    displayStatus = "error";
    badgeVariant = "destructive";
  } else if (task.status === "completed") {
    displayStatus = "complete";
    badgeVariant = "default";
  } else if (submitting) {
    displayStatus = "uploading";
    badgeVariant = "secondary";
  } else if (runId) {
    displayStatus = task.status || "processing";
    badgeVariant = "secondary";
  } else {
    displayStatus = "idle";
    badgeVariant = "secondary";
  }

  const isInsufficientCredits = error?.includes("Insufficient credits");
  const displayMessage = error || task.progressMessage || (submitting ? "Uploading..." : "");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Convert PDF</h2>
        <p className="text-muted-foreground">
          Extract table data from a PDF into an XLSX spreadsheet.
        </p>
      </div>

      {/* Model status — only show if there's a problem */}
      {modelStatus && !modelStatus.ok && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <AlertCircle className="h-4 w-4" />
          {modelStatus.message}
        </div>
      )}

      {/* Template selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Extraction Template</CardTitle>
          <CardDescription>
            Select a template that matches your PDF&apos;s table layout.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}{" "}
                  <span className="text-muted-foreground">
                    ({t.headers.length} columns)
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Drop zone */}
      <Card>
        <CardContent className="pt-6">
          <div
            ref={dropRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors hover:border-primary hover:bg-muted/50"
          >
            {file ? (
              <>
                <FileText className="mb-2 h-8 w-8 text-primary" />
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </>
            ) : (
              <>
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">Drop a PDF here</p>
                <p className="text-sm text-muted-foreground">
                  or click to browse
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Insufficient credits banner */}
      {isInsufficientCredits && (
        <div className="flex items-center justify-between rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {displayMessage}
          </div>
          <Link href="/settings">
            <Button size="sm" variant="outline">Top up</Button>
          </Link>
        </div>
      )}

      {/* Progress */}
      {showProgress && !isInsufficientCredits && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{displayMessage}</p>
              <Badge variant={badgeVariant}>{displayStatus}</Badge>
            </div>
            <Progress value={task.progressPct} />
            {task.status === "completed" && task.rowCount !== null && (
              <p className="text-sm text-muted-foreground">
                Extracted {task.rowCount} rows from {task.pageCount} page(s).
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleConvert}
          disabled={!file || !selectedTemplate || !!isActive}
        >
          {isActive ? "Converting..." : "Convert"}
        </Button>
        {task.status === "completed" && (
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Download XLSX
          </Button>
        )}
        {(task.status === "completed" || task.status === "failed" || error) && (
          <Button variant="ghost" onClick={reset}>
            Convert another
          </Button>
        )}
      </div>
    </div>
  );
}
