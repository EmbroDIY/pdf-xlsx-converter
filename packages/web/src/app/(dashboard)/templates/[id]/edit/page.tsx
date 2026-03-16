"use client";

import { TemplateForm } from "@/components/template-form";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

interface Template {
  id: string;
  name: string;
  headers: string[];
  header_marker: string;
  stop_marker: string;
}

export default function EditTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAuth();
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    apiFetch(`/api/templates/${id}`, session.access_token)
      .then((r) => r.json())
      .then((data) => {
        setTemplate(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id, session]);

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
