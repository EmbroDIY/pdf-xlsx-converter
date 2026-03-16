"use client";

import { useAuth } from "@/hooks/use-auth";
import { apiFetch, apiUrl } from "@/lib/api";
import { createClient } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface Run {
  id: string;
  file_name: string;
  status: string;
  row_count: number | null;
  page_count: number | null;
  pdf_url: string | null;
  file_url: string | null;
  progress_pct: number | null;
  progress_message: string | null;
  error_message: string | null;
  created_at: string;
  template_name: string | null;
}

export default function HistoryPage() {
  const { session } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    apiFetch("/api/runs", session.access_token)
      .then((r) => r.json())
      .then((data) => {
        setRuns(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  // Subscribe to Realtime updates for live progress
  useEffect(() => {
    const channel = supabase
      .channel("history-runs")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_task_runs",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newRun = payload.new as Run;
            if (!newRun.template_name) newRun.template_name = null;
            setRuns((prev) => [newRun, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Run;
            setRuns((prev) =>
              prev.map((r) =>
                r.id === updated.id ? { ...r, ...updated } : r
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const statusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default" as const;
      case "failed":
        return "destructive" as const;
      default:
        return "secondary" as const;
    }
  };

  const handleDownload = async (run: Run) => {
    if (!session) return;
    const res = await fetch(apiUrl(`/api/download/${run.id}`), {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = run.file_name.replace(/\.pdf$/i, ".xlsx");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  };

  const handleRetry = async (run: Run) => {
    if (!session) return;
    await apiFetch(`/api/runs/${run.id}/retry`, session.access_token, {
      method: "POST",
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">History</h2>
        <p className="text-muted-foreground">Past conversion runs.</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : runs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No conversion runs yet.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Rows</TableHead>
              <TableHead>Pages</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell className="font-medium">{run.file_name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {run.template_name ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <Badge variant={statusVariant(run.status)}>
                      {run.status}
                    </Badge>
                    {(run.status === "processing" || run.status === "pending") &&
                      run.progress_pct !== null && (
                        <div className="w-24">
                          <Progress value={run.progress_pct} className="h-1.5" />
                        </div>
                      )}
                    {run.status === "failed" && run.error_message && (
                      <p className="text-xs text-destructive max-w-[200px] truncate" title={run.error_message}>
                        {run.error_message}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell>{run.row_count ?? "—"}</TableCell>
                <TableCell>{run.page_count ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(run.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {run.status === "completed" && run.file_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(run)}
                        title="Download XLSX"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {run.status === "failed" && run.pdf_url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRetry(run)}
                        title="Retry conversion"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
