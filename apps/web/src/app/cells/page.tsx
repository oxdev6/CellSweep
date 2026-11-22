"use client";

import { formatCkb, NETWORK_LABELS, outPointKey, shortHash, toShannons, type AssetCategory, type CellInfo } from "@cell-hygiene/core";
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  Download,
  Eye,
  Flame,
  Layers,
  LockKeyhole,
  RefreshCw,
  Search,
  Snowflake,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { CellDetailDialog } from "@/components/cells/cell-detail-dialog";
import { CategoryBadge } from "@/components/common/category-badge";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CATEGORY_META, CATEGORY_ORDER } from "@/lib/categories";
import { useFilteredCells } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type SortKey = "capacity" | "category" | "block";

export default function CellsPage() {
  const cells = useFilteredCells();
  const allCells = useAppStore((state) => state.cells);
  const search = useAppStore((state) => state.search);
  const setSearch = useAppStore((state) => state.setSearch);
  const category = useAppStore((state) => state.category);
  const setCategory = useAppStore((state) => state.setCategory);
  const selected = useAppStore((state) => state.selected);
  const toggleSelected = useAppStore((state) => state.toggleSelected);
  const selectMany = useAppStore((state) => state.selectMany);
  const clearSelection = useAppStore((state) => state.clearSelection);
  const toggleFreeze = useAppStore((state) => state.toggleFreeze);
  const policy = useAppStore((state) => state.freezePolicy);
  const importFreezePolicy = useAppStore((state) => state.importFreezePolicy);
  const loading = useAppStore((state) => state.loadingCells);
  const mode = useAppStore((state) => state.mode);
  const session = useAppStore((state) => state.session);
  const network = useAppStore((state) => state.network);
  const cellsError = useAppStore((state) => state.cellsError);
  const reloadCells = useAppStore((state) => state.reloadCells);
  const fileRef = useRef<HTMLInputElement>(null);
  const [detail, setDetail] = useState<CellInfo | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "capacity", dir: "desc" });

  const availableCategories = useMemo(() => {
    const counts = new Map<AssetCategory, number>();
    allCells.forEach((cell) => counts.set(cell.category, (counts.get(cell.category) ?? 0) + 1));
    return CATEGORY_ORDER.filter((item) => counts.has(item)).map((item) => ({
      category: item,
      count: counts.get(item) ?? 0,
    }));
  }, [allCells]);

  const sorted = useMemo(() => {
    const copy = [...cells];
    copy.sort((a, b) => {
      let result = 0;
      if (sort.key === "capacity") {
        const left = toShannons(a.capacity);
        const right = toShannons(b.capacity);
        result = left < right ? -1 : left > right ? 1 : 0;
      }
      if (sort.key === "category") result = a.category.localeCompare(b.category);
      if (sort.key === "block") result = (a.blockNumber ?? 0) - (b.blockNumber ?? 0);
      return sort.dir === "asc" ? result : -result;
    });
    return copy;
  }, [cells, sort]);

  const allVisibleSelected = sorted.length > 0 && sorted.every((cell) => selected.includes(outPointKey(cell.outPoint)));
  const liveEmpty = mode === "live" && allCells.length === 0;

  function exportPolicy() {
    const blob = new Blob([JSON.stringify(policy, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cellsweep-quarantine.json";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Quarantine policy exported");
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      importFreezePolicy(await file.text());
      toast.success("Quarantine policy imported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid policy file");
    } finally {
      event.target.value = "";
    }
  }

  function freezeSelected() {
    const targets = allCells.filter((cell) => selected.includes(outPointKey(cell.outPoint)));
    targets.forEach((cell) => {
      if (!cell.frozen) toggleFreeze(cell.outPoint, "Bulk quarantine from cell explorer");
    });
    toast.success(`${targets.length} cells added to quarantine`);
    clearSelection();
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Coin Control"
        title="Cell Explorer"
        description="Inspect exact outpoints, quarantine sensitive cells, and compose precise transaction inputs."
        actions={
          <>
            {mode === "live" ? (
              <Button variant="outline" size="sm" onClick={reloadCells} disabled={loading}>
                <RefreshCw className={cn("size-4", loading && "animate-spin")} /> Rescan
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Import policy
            </Button>
            <Button variant="outline" size="sm" onClick={exportPolicy}>
              <Download className="size-4" /> Export policy
            </Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(event) => void handleImport(event)} />
          </>
        }
      />

      {mode === "live" && session ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-muted">
          <span className="size-1.5 rounded-full bg-brand shadow-[0_0_8px_var(--brand)]" />
          <span className="font-mono text-foreground">{shortHash(session.address, 10, 6)}</span>
          <span>· {NETWORK_LABELS[network]}</span>
          <span>· {loading ? "Scanning cells…" : `${allCells.length} cells found`}</span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={reloadCells} disabled={loading}>
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Scan again
          </Button>
        </div>
      ) : null}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search outpoint, asset, or label…"
              className="pl-9 font-mono text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={category === "all"} onClick={() => setCategory("all")}>
              All <span className="opacity-60">{allCells.length}</span>
            </FilterChip>
            {availableCategories.map((item) => (
              <FilterChip
                key={item.category}
                active={category === item.category}
                onClick={() => setCategory(item.category)}
              >
                {CATEGORY_META[item.category].short}
                <span className="opacity-60">{item.count}</span>
              </FilterChip>
            ))}
          </div>
        </div>

        {selected.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-brand/20 bg-brand-soft px-4 py-2.5">
            <span className="text-xs font-medium text-brand">{selected.length} selected</span>
            <Button variant="ghost" size="sm" onClick={freezeSelected}>
              <Snowflake className="size-3.5" /> Freeze selected
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/sweep"><Flame className="size-3.5" /> Reclaim</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/consolidate"><Layers className="size-3.5" /> Consolidate</Link>
            </Button>
            <Button variant="ghost" size="sm" className="ml-auto" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        ) : null}

        {!loading && sorted.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={Boxes}
              title={liveEmpty ? "No cells found for this wallet" : "No cells match this view"}
              description={
                liveEmpty
                  ? cellsError ??
                    `CellSweep scanned ${shortHash(session?.address ?? "", 10, 6)} on ${NETWORK_LABELS[network]} and found no live cells. Confirm the address is funded on this network, then scan again.`
                  : "Try a different category or clear the search to see the full cell set."
              }
              action={
                liveEmpty
                  ? { label: "Scan again", onClick: reloadCells }
                  : { label: "Reset filters", onClick: () => { setSearch(""); setCategory("all"); } }
              }
            />
            {liveEmpty ? (
              <p className="mt-3 text-center text-[11px] text-muted">
                Wrong network? <Link href="/settings" className="text-brand underline underline-offset-2">Change network</Link>
              </p>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted">
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={allVisibleSelected}
                      onCheckedChange={() => (allVisibleSelected ? clearSelection() : selectMany(sorted.map((cell) => outPointKey(cell.outPoint))))}
                      aria-label="Select all visible cells"
                    />
                  </th>
                  <th className="px-3 py-3 font-medium">Cell</th>
                  <th className="px-3 py-3 font-medium">
                    <SortButton label="Category" active={sort.key === "category"} dir={sort.dir} onClick={() => setSort((s) => ({ key: "category", dir: s.key === "category" && s.dir === "asc" ? "desc" : "asc" }))} />
                  </th>
                  <th className="px-3 py-3 text-right font-medium">
                    <SortButton label="Capacity" active={sort.key === "capacity"} dir={sort.dir} onClick={() => setSort((s) => ({ key: "capacity", dir: s.key === "capacity" && s.dir === "desc" ? "asc" : "desc" }))} />
                  </th>
                  <th className="px-3 py-3 font-medium">
                    <SortButton label="Block" active={sort.key === "block"} dir={sort.dir} onClick={() => setSort((s) => ({ key: "block", dir: s.key === "block" && s.dir === "asc" ? "desc" : "asc" }))} />
                  </th>
                  <th className="px-3 py-3 text-right font-medium">Controls</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((cell) => {
                  const key = outPointKey(cell.outPoint);
                  const isSelected = selected.includes(key);
                  return (
                    <tr
                      key={key}
                      className={cn(
                        "border-b border-border/60 transition-colors last:border-0 hover:bg-surface-muted/60",
                        isSelected && "bg-brand-soft/50",
                      )}
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelected(key)}
                          aria-label={`Select ${key}`}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          {cell.asset?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cell.asset.image} alt="" className="size-9 shrink-0 rounded-lg object-cover" />
                          ) : (
                            <span
                              className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                              style={{ background: CATEGORY_META[cell.category].bg, color: CATEGORY_META[cell.category].color }}
                            >
                              {(() => { const Icon = CATEGORY_META[cell.category].icon; return <Icon className="size-4" />; })()}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium">{cell.asset?.name ?? cell.label}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-muted">
                              {shortHash(cell.outPoint.txHash, 12, 6)}:{cell.outPoint.index}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <CategoryBadge category={cell.category} showDescription />
                      </td>
                      <td className="number-tabular px-3 py-3 text-right text-xs font-semibold">
                        {formatCkb(cell.capacity, 2)}
                        <span className="ml-1 text-[10px] font-normal text-muted">CKB</span>
                      </td>
                      <td className="number-tabular px-3 py-3 font-mono text-[11px] text-muted">
                        {cell.blockNumber?.toLocaleString() ?? "—"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className={cell.frozen ? "text-danger" : ""}
                                onClick={() => toggleFreeze(cell.outPoint)}
                              >
                                <LockKeyhole className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{cell.frozen ? "Unfreeze this outpoint" : "Freeze this outpoint"}</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon-sm" onClick={() => setDetail(cell)}>
                                <Eye className="size-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Inspect cell</TooltipContent>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <p className="text-center text-[11px] text-muted">
        {sorted.length} of {allCells.length} cells · Quarantine contains {policy.frozen.length} outpoints
      </p>

      <CellDetailDialog cell={detail} open={Boolean(detail)} onOpenChange={(open) => !open && setDetail(null)} />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        active
          ? "border-brand/40 bg-brand-soft text-brand"
          : "border-border bg-surface text-muted hover:border-border-strong hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className={cn("inline-flex items-center gap-1 hover:text-foreground", active && "text-foreground")}>
      {label}
      {active ? dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : null}
    </button>
  );
}
