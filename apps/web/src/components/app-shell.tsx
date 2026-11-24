"use client";

import { NETWORK_LABELS, type Network } from "@cell-hygiene/core";
import {
  AlertTriangle,
  Boxes,
  Flame,
  Layers,
  LockKeyhole,
  Menu,
  Moon,
  ScanEye,
  Settings,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, useState, type ReactNode } from "react";
import { CellMark } from "@/components/common/cell-mark";
import { ModeBadge } from "@/components/common/mode-badge";
import { WalletButton } from "@/components/common/wallet-button";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCells, useHydrated } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: ScanEye, description: "X-Ray capacity dashboard" },
  { href: "/cells", label: "Cell Explorer", icon: Boxes, description: "Inspect and quarantine cells" },
  { href: "/sweep", label: "Melt & Reclaim", icon: Flame, description: "Recover trapped capacity" },
  { href: "/consolidate", label: "Consolidate", icon: Layers, description: "Defragment dust cells" },
  { href: "/guard", label: "Burn Guard", icon: ShieldCheck, description: "Pre-flight transaction safety" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [mobilePath, setMobilePath] = useState<string | null>(null);
  const pathname = usePathname();
  useCells();
  const hydrated = useHydrated();
  const mobileOpen = mobilePath === pathname;

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex min-h-screen">
        <Sidebar
          pathname={pathname}
          mobileOpen={mobileOpen}
          onClose={() => setMobilePath(null)}
          hydrated={hydrated}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setMobilePath(pathname)} />
          <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <CellsErrorBanner />
            {children}
          </main>
          <footer className="border-t border-border px-6 py-4 text-[11px] text-muted">
            <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2">
              <span>CellSweep · Non-custodial cell hygiene for Nervos CKB</span>
            </div>
          </footer>
        </div>
      </div>
    </TooltipProvider>
  );
}

function Sidebar({
  pathname,
  mobileOpen,
  onClose,
  hydrated,
}: {
  pathname: string;
  mobileOpen: boolean;
  onClose: () => void;
  hydrated: boolean;
}) {
  const frozenCount = useAppStore((state) => state.freezePolicy.frozen.length);
  const selectedCount = useAppStore((state) => state.selected.length);

  return (
    <>
      {mobileOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand p-1.5 text-white dark:text-brand-contrast">
              <CellMark className="size-full" />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-tight tracking-tight">CellSweep</span>
              <span className="block text-[10px] uppercase tracking-[0.16em] text-muted">Cell hygiene</span>
            </span>
          </Link>
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Workspace
          </p>
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                  active
                    ? "bg-brand-soft font-medium text-brand"
                    : "text-muted hover:bg-surface-muted hover:text-foreground",
                )}
              >
                {active ? (
                  <span className="absolute -left-3 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-brand" />
                ) : null}
                <Icon className={cn("size-4 shrink-0", active && "text-brand")} />
                <span className="flex-1">{item.label}</span>
                {item.href === "/cells" && hydrated && selectedCount > 0 ? (
                  <span className="rounded-full bg-brand px-1.5 text-[10px] font-semibold text-white dark:text-brand-contrast">
                    {selectedCount}
                  </span>
                ) : null}
              </Link>
            );
          })}

          <p className="px-3 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            System
          </p>
          <Link
            href="/settings"
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
              pathname === "/settings"
                ? "bg-brand-soft font-medium text-brand"
                : "text-muted hover:bg-surface-muted hover:text-foreground",
            )}
          >
            <Settings className="size-4" />
            Settings
          </Link>
        </nav>

        <div className="border-t border-border p-3">
          <div className="rounded-xl border border-border bg-surface-muted p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted">
                <LockKeyhole className="size-3.5" /> Quarantine
              </span>
              <span className="number-tabular font-semibold">{hydrated ? frozenCount : "—"}</span>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">
              Frozen outpoints are stored locally and enforced by the SDK.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

function CellsErrorBanner() {
  const cellsError = useAppStore((state) => state.cellsError);
  const reloadCells = useAppStore((state) => state.reloadCells);
  if (!cellsError) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-xs text-danger">
      <AlertTriangle className="size-4 shrink-0" />
      <span className="flex-1">Unable to load cells: {cellsError}</span>
      <Button variant="outline" size="sm" onClick={reloadCells}>
        Retry
      </Button>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const network = useAppStore((state) => state.network);
  const setNetwork = useAppStore((state) => state.setNetwork);
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenu}>
        <Menu className="size-5" />
      </Button>
      <div className="hidden items-center gap-2 text-xs text-muted md:flex">
        <span className="size-1.5 rounded-full bg-brand" />
        <span>Nervos CKB</span>
        <span className="text-border-strong">/</span>
        <span className="text-foreground">{NETWORK_LABELS[network]}</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ModeBadge />
        <Select value={network} onValueChange={(value) => void setNetwork(value as Network)}>
          <SelectTrigger className="hidden w-36 sm:flex">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mainnet">Mainnet</SelectItem>
            <SelectItem value="testnet">Testnet</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {mounted && theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <WalletButton />
      </div>
    </header>
  );
}
