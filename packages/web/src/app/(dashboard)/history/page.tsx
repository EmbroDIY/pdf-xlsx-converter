"use client";

import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEffect, useState } from "react";

interface Run {
  id: string;
  file_name: string;
  status: string;
  row_count: number | null;
  page_count: number | null;
  created_at: string;
  template_name: string | null;
}

export default function HistoryPage() {
  const { session } = useAuth();
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
                  <Badge variant={statusVariant(run.status)}>
                    {run.status}
                  </Badge>
                </TableCell>
                <TableCell>{run.row_count ?? "—"}</TableCell>
                <TableCell>{run.page_count ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(run.created_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
