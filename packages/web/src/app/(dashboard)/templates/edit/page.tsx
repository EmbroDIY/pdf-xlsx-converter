"use client";

import { TemplateForm } from "@/components/template-form";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface Template {
  id: string;
  name: string;
  headers: string[];
  header_marker: string;
  stop_marker: string;
}

function EditTemplateContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { session } = useAuth();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session || !id) return;
    apiFetch(`/api/templates/${id}`, session.access_token)
      .then((r) => r.json())
      .then((data) => {
        setTemplate(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, session]);

  if (!id) {
    return <p className="text-destructive">No template ID provided.</p>;
  }

  if (loading) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (!template) {
    return <p className="text-destructive">Template not found.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold tracking-tight">
        Edit Template
      </h2>
      <TemplateForm template={template} />
    </div>
  );
}

export default function EditTemplatePage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading...</p>}>
      <EditTemplateContent />
    </Suspense>
  );
}
