"use client";

import { useAuth } from "@/hooks/use-auth";
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
import { Upload, FileText, AlertCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Template {
  id: string;
  name: string;
  headers: string[];
}

type Status = "idle" | "uploading" | "processing" | "complete" | "error";

export default function ConvertPage() {
  const { session } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [modelStatus, setModelStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    setStatus("uploading");
    setProgress(0);
    setMessage("Starting extraction...");

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
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.percent !== undefined) setProgress(data.percent);
              if (data.message) setMessage(data.message);
              if (data.download_url) {
                setStatus("complete");
                // Trigger download
                const link = document.createElement("a");
                link.href = apiUrl(data.download_url);
                link.download = data.filename || "result.xlsx";
                // Add auth header via fetch for download
                const dlRes = await fetch(apiUrl(data.download_url), {
                  headers: {
                    Authorization: `Bearer ${session.access_token}`,
                  },
                });
                const blob = await dlRes.blob();
                link.href = URL.createObjectURL(blob);
                document.body.appendChild(link);
                link.click();
                link.remove();
              }
            } catch {
              // skip malformed JSON
            }
          } else if (line.startsWith("event: error")) {
            setStatus("error");
          }
        }
      }

      if (status !== "complete" && status !== "error") {
        setStatus("complete");
      }
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Conversion failed");
    }
  };

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    setMessage("");
  };

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

      {/* Progress */}
      {status !== "idle" && (
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{message}</p>
              <Badge
                variant={
                  status === "complete"
                    ? "default"
                    : status === "error"
                      ? "destructive"
                      : "secondary"
                }
              >
                {status}
              </Badge>
            </div>
            <Progress value={progress} />
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleConvert}
          disabled={
            !file ||
            !selectedTemplate ||
            status === "uploading" ||
            status === "processing"
          }
        >
          {status === "uploading" || status === "processing"
            ? "Converting..."
            : "Convert"}
        </Button>
        {status === "complete" || status === "error" ? (
          <Button variant="outline" onClick={reset}>
            Convert another
          </Button>
        ) : null}
      </div>
    </div>
  );
}
