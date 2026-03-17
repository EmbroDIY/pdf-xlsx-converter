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
import { Eye, Type, CreditCard } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

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

interface Transaction {
  id: string;
  type: string;
  amount_cents: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { session, user } = useAuth();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<UserSettings>({
    llm_provider: "gemini",
    model_name: null,
    default_template_id: null,
  });
  const [templates, setTemplates] = useState<Template[]>([]);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [balanceCents, setBalanceCents] = useState<number>(0);
  const [costPerPage, setCostPerPage] = useState<number>(5);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupMessage, setTopupMessage] = useState<string | null>(null);

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

    apiFetch("/api/billing/balance", session.access_token)
      .then((r) => r.json())
      .then((data) => {
        setBalanceCents(data.balance_cents ?? 0);
        setCostPerPage(data.cost_per_page_cents ?? 5);
      })
      .catch(() => {});

    apiFetch("/api/billing/transactions", session.access_token)
      .then((r) => r.json())
      .then((data) => setTransactions(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [session]);

  // Handle redirect from Stripe: confirm payment and credit balance
  useEffect(() => {
    const topup = searchParams.get("topup");
    const sessionId = searchParams.get("session_id");

    if (topup === "success" && sessionId && session) {
      // Confirm the checkout session server-side to credit balance
      apiFetch("/api/billing/confirm", session.access_token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.credited) {
            setTopupMessage("Payment successful! Your balance has been updated.");
            setBalanceCents(data.balance_cents);
          } else if (data.reason === "Already credited") {
            setTopupMessage("Payment already processed.");
            setBalanceCents(data.balance_cents);
          } else {
            setTopupMessage("Payment is being processed. Balance will update shortly.");
          }
          // Refresh transactions
          apiFetch("/api/billing/transactions", session.access_token)
            .then((r) => r.json())
            .then((data) => setTransactions(Array.isArray(data) ? data : []))
            .catch(() => {});
        })
        .catch(() => {
          setTopupMessage("Could not verify payment. Please refresh the page.");
        });
      setTimeout(() => setTopupMessage(null), 8000);
    } else if (topup === "cancelled") {
      setTopupMessage("Payment was cancelled.");
      setTimeout(() => setTopupMessage(null), 5000);
    }
  }, [searchParams, session]);

  const handleTopUp = async (amount: number = 5) => {
    if (!session) return;
    setTopupLoading(true);
    try {
      const res = await apiFetch("/api/billing/checkout", session.access_token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch {
      setTopupMessage("Failed to start checkout. Please try again.");
    } finally {
      setTopupLoading(false);
    }
  };

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

      {/* Billing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </CardTitle>
          <CardDescription>
            Conversions cost ${(costPerPage / 100).toFixed(2)} per page processed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {topupMessage && (
            <div className={`rounded-md px-3 py-2 text-sm ${
              topupMessage.includes("successful")
                ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
            }`}>
              {topupMessage}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current balance</p>
              <p className={`text-2xl font-bold ${balanceCents <= 0 ? "text-red-500" : ""}`}>
                ${(balanceCents / 100).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                ~{Math.floor(balanceCents / costPerPage)} pages remaining
              </p>
            </div>
            <Button onClick={() => handleTopUp(5)} disabled={topupLoading}>
              <CreditCard className="mr-2 h-4 w-4" />
              {topupLoading ? "Redirecting..." : "Add $5.00"}
            </Button>
          </div>

          {transactions.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Recent transactions</p>
              <div className="max-h-48 overflow-auto rounded-md border">
                <table className="w-full text-sm">
                  <tbody>
                    {transactions.slice(0, 10).map((t) => (
                      <tr key={t.id} className="border-b last:border-0">
                        <td className="px-3 py-2 text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2">{t.description}</td>
                        <td className={`px-3 py-2 text-right font-medium ${
                          t.amount_cents >= 0 ? "text-green-600" : "text-red-500"
                        }`}>
                          {t.amount_cents >= 0 ? "+" : ""}${(t.amount_cents / 100).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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
