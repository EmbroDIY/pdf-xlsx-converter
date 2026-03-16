"use client";

import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Template {
  id: string;
  name: string;
  headers: string[];
  header_marker: string;
}

export default function TemplatesPage() {
  const { session } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTemplates = () => {
    if (!session) return;
    apiFetch("/api/templates", session.access_token)
      .then((r) => r.json())
      .then((data) => {
        setTemplates(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    if (!session) return;
    await apiFetch(`/api/templates/${id}`, session.access_token, {
      method: "DELETE",
    });
    fetchTemplates();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Templates</h2>
          <p className="text-muted-foreground">
            Manage extraction templates for different PDF layouts.
          </p>
        </div>
        <Link href="/templates/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add template
          </Button>
        </Link>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No templates yet.</p>
          <Link href="/templates/new">
            <Button variant="outline" className="mt-4">
              Create your first template
            </Button>
          </Link>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Header marker</TableHead>
              <TableHead>Columns</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {t.header_marker}
                </TableCell>
                <TableCell>{t.headers.length}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Link href={`/templates/${t.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(t.id, t.name)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
