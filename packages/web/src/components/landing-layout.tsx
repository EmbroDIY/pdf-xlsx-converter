"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  Coffee,
  Github,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const COFFEE_LINK = process.env.NEXT_PUBLIC_BUY_ME_A_COFFEE_LINK;

export function LandingLayout({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) {
      router.replace("/convert");
    }
  }, [session, loading, router]);

  if (loading || session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" />
            <span className="text-lg font-semibold">PDF Table Extractor</span>
          </Link>
          <div className="flex items-center gap-3">
            {COFFEE_LINK && (
              <a href={COFFEE_LINK} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700">
                  <Coffee className="mr-1.5 h-4 w-4" />
                  Buy me a coffee
                </Button>
              </a>
            )}
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get started free</Button>
            </Link>
          </div>
        </div>
      </header>

      {children}

      {/* Footer */}
      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>PDF Table Extractor</span>
          <div className="flex items-center gap-4">
            {COFFEE_LINK && (
              <a
                href={COFFEE_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                <Coffee className="h-4 w-4" />
              </a>
            )}
            <a
              href="https://github.com/EmbroDIY/pdf-xlsx-converter"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              <Github className="h-4 w-4" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
