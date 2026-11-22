"use client";

import { summarizeCapacity, type CellInfo } from "@cell-hygiene/core";
import { Activity, ArrowRight, Coins, Flame, Layers, LockKeyhole, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { CategoryBadge } from "@/components/common/category-badge";
import { PageHeader } from "@/components/common/page-header";
import { StatCard } from "@/components/common/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/categories";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { formatShannons, shortHash, toShannons } from "@cell-hygiene/core";

export default function DashboardPage() {
  const cells = useAppStore((state) => state.cells);
  const loading = useAppStore((state) => state.loadingCells);
  const mode = useAppStore((state) => state.mode);
  const session = useAppStore((state) => state.session);
  const frozen = useAppStore((state) => state.freezePolicy.frozen);
  const hydrated = useAppStore((state) => state.activity.length);

  const summary = useMemo(() => summarizeCapacity(cells), [cells]);
  const frozenKeys = useMemo(
    () => new Set(frozen.map((entry) => `${entry.outPoint.txHash.toLowerCase()}:${entry.outPoint.index}`)),
    [frozen],
  );

  const reclaimable = useMemo(
    () =>
      cells.filter((cell) => {
        if (frozenKeys.has(`${cell.outPoint.txHash.toLowerCase()}:${cell.outPoint.index}`)) return false;
        if (cell.category === "spore" && !cell.asset?.immovable) return true;
        return (
          (cell.category === "xudt" || cell.category === "sudt") &&
          BigInt(cell.asset?.amount ?? "1") === 0n
        );
      }),
    [cells, frozenKeys],
  );

  const reclaimCapacity = reclaimable.reduce((sum, cell) => sum + toShannons(cell.capacity), 0n);
  const liquidCells = cells.filter((cell) => cell.category === "liquid");
  const totalLiquid = liquidCells.reduce((sum, cell) => sum + toShannons(cell.capacity), 0n);

  if (!hydrated && !cells.length) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="X-Ray Dashboard"
        title="Your capacity, cell by cell"
        description="A complete view of every live cell, what locks it, and how much CKB you can safely recover."
        actions={
          <>
            {mode === "demo" ? (
              <span className="rounded-lg border border-amber/25 bg-amber/10 px-3 py-2 text-xs text-amber">
                Demo dataset · connect a wallet in Settings for live data
              </span>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              <RefreshCw className={cn("size-4", loading && "animate-spin")} /> Refresh
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total capacity"
          value={formatShannons(summary.total)}
          suffix="CKB"
          hint={`${cells.length} cells across ${summary.buckets.length} categories`}
          icon={<Coins className="size-4" />}
        />
        <StatCard
          label="Free liquid"
          value={formatShannons(totalLiquid.toString())}
          suffix="CKB"
          hint={`${liquidCells.length} spendable cells`}
          icon={<Sparkles className="size-4" />}
        />
        <StatCard
          label="Reclaimable"
          value={formatShannons(reclaimCapacity.toString())}
          suffix="CKB"
          hint={`${reclaimable.length} spam / empty cells`}
          accent="var(--amber)"
          icon={<Flame className="size-4" />}
        />
        <StatCard
          label="Quarantined"
          value={frozen.length}
          suffix="cells"
          hint="Protected by local policy"
          accent="var(--danger)"
          icon={<LockKeyhole className="size-4" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <CapacityOverview summary={summary} loading={loading} />

        <div className="space-y-6">
          <OpportunitiesCard cells={reclaimable} />
          <ActivityFeed />
        </div>
      </div>

      <QuickActions liquidCount={liquidCells.length} reclaimCount={reclaimable.length} connected={Boolean(session)} />
    </div>
  );
}

function CapacityOverview({
  summary,
  loading,
}: {
  summary: ReturnType<typeof summarizeCapacity>;
  loading: boolean;
}) {
  const buckets = CATEGORY_ORDER.map((category) => {
    const bucket = summary.buckets.find((item) => item.category === category);
    return {
      category,
      capacity: bucket?.capacity ?? "0",
      count: bucket?.count ?? 0,
      percentage: bucket?.percentage ?? 0,
    };
  }).filter((bucket) => bucket.count > 0);

  const totalNumber = Number(summary.total);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Capacity composition</CardTitle>
          <CardDescription>Where your CKB is actually stored</CardDescription>
        </div>
        <span className="rounded-md border border-border bg-surface-muted px-2 py-1 font-mono text-[10px] text-muted">
          {formatShannons(summary.total)} CKB
        </span>
      </CardHeader>
      <CardContent>
        {loading && !buckets.length ? (
          <div className="shimmer h-56 rounded-xl bg-surface-muted" />
        ) : buckets.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted">
            Connect a wallet to scan your cells.
          </div>
        ) : (
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative mx-auto size-48 shrink-0">
              <svg viewBox="0 0 42 42" className="size-full -rotate-90">
                <circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--surface-muted)" strokeWidth="5" />
                {buckets.map((bucket, index) => {
                  const previous = buckets
                    .slice(0, index)
                    .reduce((sum, item) => sum + (totalNumber ? (Number(item.capacity) / totalNumber) * 100 : 0), 0);
                  const value = totalNumber ? (Number(bucket.capacity) / totalNumber) * 100 : 0;
                  return (
                    <circle
                      key={bucket.category}
                      cx="21"
                      cy="21"
                      r="15.9155"
                      fill="none"
                      stroke={CATEGORY_META[bucket.category].color}
                      strokeWidth="5"
                      strokeDasharray={`${Math.max(value - 0.6, 0)} ${100 - Math.max(value - 0.6, 0)}`}
                      strokeDashoffset={-previous}
                      className="transition-all duration-500"
                    />
                  );
                })}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="number-tabular text-xl font-semibold">{formatShannons(summary.total, 0)}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted">total CKB</span>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              {buckets.map((bucket) => {
                const meta = CATEGORY_META[bucket.category];
                return (
                  <div key={bucket.category} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2 font-medium">
                        <span className="size-2 rounded-full" style={{ background: meta.color }} />
                        {meta.label}
                        <span className="text-muted">· {bucket.count}</span>
                      </span>
                      <span className="number-tabular text-muted">{formatShannons(bucket.capacity, 1)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${bucket.percentage}%`, background: meta.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OpportunitiesCard({ cells }: { cells: CellInfo[] }) {
  const top = cells.slice(0, 4);
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Reclaim opportunities</CardTitle>
          <CardDescription>Spam DOBs and empty token cells</CardDescription>
        </div>
        <Flame className="size-4 text-amber" />
      </CardHeader>
      <CardContent className="space-y-2">
        {top.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
            Nothing to reclaim. Your wallet is clean.
          </div>
        ) : (
          top.map((cell) => (
            <Link
              key={`${cell.outPoint.txHash}:${cell.outPoint.index}`}
              href="/sweep"
              className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted/60 p-2.5 transition-colors hover:border-brand/40"
            >
              {cell.asset?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cell.asset.image} alt="" className="size-9 rounded-md object-cover" />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-md bg-amber/10 text-amber">
                  <Flame className="size-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{cell.asset?.name ?? cell.label}</p>
                <p className="font-mono text-[10px] text-muted">
                  {shortHash(cell.outPoint.txHash, 8, 4)}:{cell.outPoint.index}
                </p>
              </div>
              <CategoryBadge category={cell.category} />
              <span className="number-tabular text-xs font-semibold text-brand">{cell.capacity}</span>
            </Link>
          ))
        )}
        {top.length > 0 ? (
          <Button asChild variant="ghost" size="sm" className="w-full justify-between">
            <Link href="/sweep">
              Open reclaim workbench <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function QuickActions({
  liquidCount,
  reclaimCount,
  connected,
}: {
  liquidCount: number;
  reclaimCount: number;
  connected: boolean;
}) {
  const actions = [
    {
      href: "/cells",
      icon: Activity,
      title: "Inspect every cell",
      description: "Search, filter, freeze, and export exact outpoints.",
    },
    {
      href: "/consolidate",
      icon: Layers,
      title: `Consolidate ${liquidCount} dust cells`,
      description: "Merge pure CKB cells with strict type-script exclusion.",
    },
    {
      href: "/guard",
      icon: ShieldCheck,
      title: "Test Burn Guard",
      description: "Inject a faulty transaction and watch the guard stop it.",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.href}
            href={action.href}
            className="group flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 transition-all hover:border-brand/40 hover:shadow-[var(--shadow)]"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-brand">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{action.title}</span>
              <span className="mt-0.5 block text-xs text-muted">{action.description}</span>
            </span>
            <ArrowRight className="mt-1 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-brand" />
          </Link>
        );
      })}
      {!connected ? (
        <p className="text-xs text-muted md:col-span-3">
          {reclaimCount > 0
            ? "Connect a wallet before executing any plan — all signing happens in your wallet."
            : "Connect a wallet to load your live cell set."}
        </p>
      ) : null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="shimmer h-3 w-28 rounded bg-surface-muted" />
        <div className="shimmer h-9 w-96 max-w-full rounded bg-surface-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((key) => (
          <div key={key} className="shimmer h-32 rounded-2xl border border-border bg-surface" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="shimmer h-80 rounded-2xl border border-border bg-surface" />
        <div className="shimmer h-80 rounded-2xl border border-border bg-surface" />
      </div>
    </div>
  );
}
