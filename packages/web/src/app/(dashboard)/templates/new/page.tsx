"use client";

import { TemplateForm } from "@/components/template-form";

export default function NewTemplatePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-6 text-2xl font-bold tracking-tight">
        New Template
      </h2>
      <TemplateForm />
    </div>
  );
}
