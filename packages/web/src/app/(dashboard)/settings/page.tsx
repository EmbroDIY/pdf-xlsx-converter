"use client";

import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Type } from "lucide-react";
import { useEffect, useState } from "react";

interface UserSettings {
  llm_provider: string;
  model_name: string | null;
  default_template_id: string | null;
}

interface Template {
  id: string;
  name: string;
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  vision: boolean;
}

interface ProviderInfo {
  name: string;
  label: string;
  models: ModelInfo[];
}

export default function SettingsPage() {
  const { session, user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    llm_provider: "gemini",
    model_name: null,
    default_template_id: null,
  });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!session) return;

    apiFetch("/api/settings", session.access_token)
      .then((r) => r.json())
      .then(setSettings)
      .catch(() => {});

    apiFetch("/api/templates", session.access_token)
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => {});

    apiFetch("/api/models", session.access_token)
      .then((r) => r.json())
      .then((data) => setProviders(data.providers || []))
      .catch(() => {});
  }, [session]);

  const handleModelChange = (value: string) => {
    // value format: "provider:model_id"
    const [provider, ...modelParts] = value.split(":");
    const modelId = modelParts.join(":");
    setSettings({ ...settings, llm_provider: provider, model_name: modelId });
  };

  const currentModelValue =
    settings.llm_provider && settings.model_name
      ? `${settings.llm_provider}:${settings.model_name}`
      : "";

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    setSaved(false);
    await apiFetch("/api/settings", session.access_token, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Configure your preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-muted-foreground">Email:</span> {user?.email}
          </p>
          <p>
            <span className="text-muted-foreground">Name:</span>{" "}
            {user?.user_metadata?.full_name ?? "—"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Model</CardTitle>
          <CardDescription>
            Choose which AI model to use for table extraction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Vision Model</Label>
            {providers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Loading available models...
              </p>
            ) : (
              <Select
                value={currentModelValue}
                onValueChange={handleModelChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model..." />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectGroup key={provider.name}>
                      <SelectLabel>{provider.label}</SelectLabel>
                      {provider.models.map((m) => (
                        <SelectItem
                          key={`${provider.name}:${m.id}`}
                          value={`${provider.name}:${m.id}`}
                        >
                          <span className="flex items-center gap-2">
                            {m.vision ? (
                              <Eye className="h-3.5 w-3.5 text-blue-500" />
                            ) : (
                              <Type className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            {m.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3 text-blue-500" /> Vision
              </span>
              <span className="flex items-center gap-1">
                <Type className="h-3 w-3" /> Text only
              </span>
            </div>
            {settings.model_name && (
              <p className="text-xs text-muted-foreground">
                Using <strong>{settings.model_name}</strong> via{" "}
                {settings.llm_provider}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Default Template</Label>
            <Select
              value={settings.default_template_id ?? "none"}
              onValueChange={(v) =>
                setSettings({
                  ...settings,
                  default_template_id: v === "none" ? null : v,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save settings"}
            </Button>
            {saved && (
              <span className="text-sm text-green-600">Saved!</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
