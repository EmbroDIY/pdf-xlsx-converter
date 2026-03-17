"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  FileText,
  LayoutTemplate,
  History,
  Settings,
  LogOut,
  Coffee,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/convert", label: "Convert", icon: FileText },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, session, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [balanceCents, setBalanceCents] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [session, loading, router]);

  // Fetch balance
  useEffect(() => {
    if (!session) return;
    const fetchBalance = () => {
      apiFetch("/api/billing/balance", session.access_token)
        .then((r) => r.json())
        .then((data) => setBalanceCents(data.balance_cents ?? 0))
        .catch(() => {});
    };
    fetchBalance();
    // Refresh balance every 30s
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [session]);

  if (loading || !session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col border-r bg-card">
        <div className="p-6">
          <h1 className="text-lg font-semibold">PDF Table Extractor</h1>
        </div>
        <Separator />
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start"
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <Separator />
        <div className="p-3 space-y-2">
          {balanceCents !== null && (
            <Link href="/settings">
              <div className="flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors cursor-pointer">
                <span className="text-muted-foreground">Balance</span>
                <span className={`font-medium ${balanceCents <= 0 ? "text-red-500" : "text-green-600"}`}>
                  ${(balanceCents / 100).toFixed(2)}
                </span>
              </div>
            </Link>
          )}
          {process.env.NEXT_PUBLIC_BUY_ME_A_COFFEE_LINK && (
            <a
              href={process.env.NEXT_PUBLIC_BUY_ME_A_COFFEE_LINK}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="ghost"
                className="w-full justify-start text-amber-600 hover:text-amber-700"
              >
                <Coffee className="mr-2 h-4 w-4" />
                Buy me a coffee
              </Button>
            </a>
          )}
          <p className="truncate px-3 text-sm text-muted-foreground">
            {user?.email}
          </p>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={() => signOut().then(() => router.replace("/login"))}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
