"use client";

import { createClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

interface TaskProgress {
  status: string;
  progressPct: number;
  progressMessage: string | null;
  fileUrl: string | null;
  errorMessage: string | null;
  rowCount: number | null;
  pageCount: number | null;
}

const INITIAL: TaskProgress = {
  status: "pending",
  progressPct: 0,
  progressMessage: "Queued...",
  fileUrl: null,
  errorMessage: null,
  rowCount: null,
  pageCount: null,
};

export function useTaskProgress(runId: string | null) {
  const supabase: SupabaseClient = useMemo(() => createClient(), []);
  const [progress, setProgress] = useState<TaskProgress>(INITIAL);

  useEffect(() => {
    if (!runId) {
      setProgress(INITIAL);
      return;
    }

    // Subscribe to Realtime updates on this specific run
    const channel = supabase
      .channel(`run:${runId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agent_task_runs",
          filter: `id=eq.${runId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          setProgress({
            status: (row.status as string) || "pending",
            progressPct: (row.progress_pct as number) || 0,
            progressMessage: (row.progress_message as string) || null,
            fileUrl: (row.file_url as string) || null,
            errorMessage: (row.error_message as string) || null,
            rowCount: (row.row_count as number) || null,
            pageCount: (row.page_count as number) || null,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, supabase]);

  const reset = () => setProgress(INITIAL);

  return { ...progress, reset };
}
