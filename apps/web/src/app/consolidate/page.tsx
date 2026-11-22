"use client";

import {
  buildConsolidationPlan,
  canWalletSign,
  formatCkb,
  outPointKey,
  shortHash,
  type CellInfo,
} from "@cell-hygiene/core";
import { ArrowRight, Info, Layers, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { buildOutputs, executePlan } from "@/lib/plan-execution";
import { useAppStore } from "@/lib/store";
import { recordClientTelemetry } from "@/lib/telemetry-client";
import { cn } from "@/lib/utils";

function isConsolidatable(cell: CellInfo): boolean {
  return cell.category === "liquid" && !cell.type && !cell.frozen;
}

export default function ConsolidatePage() {
  const cells = useAppStore((state) => state.cells);
  const selected = useAppStore((state) => state.selected);
  const toggleSelected = useAppStore((state) => state.toggleSelected);
  const selectMany = useAppStore((state) => state.selectMany);
  const clearSelection = useAppStore((state) => state.clearSelection);
  const policy = useAppStore((state) => state.freezePolicy);
  const mode = useAppStore((state) => state.mode);
  const network = useAppStore((state) => state.network);
  const wallet = useAppStore((state) => state.wallet);
  const session = useAppStore((state) => state.session);
  const logActivity = useAppStore((state) => state.logActivity);
  const [busy, setBusy] = useState(false);

  const eligible = useMemo(() => cells.filter(isConsolidatable), [cells]);
  const selectedCells = useMemo(
    () => cells.filter((cell) => selected.includes(outPointKey(cell.outPoint))),
    [cells, selected],
  );
  const plan = useMemo(() => buildConsolidationPlan(selectedCells, policy), [selectedCells, policy]);
  const allSelected = eligible.length > 0 && selectedCells.length === eligible.length;
  const canBroadcast = mode === "demo" || (session ? canWalletSign(session) : false);

  async function execute() {
    if (!plan.executable || plan.selected.length === 0) {
      toast.error("Select at least two eligible cells and resolve all warnings.");
      return;
    }
    setBusy(true);
    try {
      const outputs = buildOutputs(plan.capacityOut, plan.outputCount, plan.selected[0].lock);
      const hash = await executePlan({
        mode,
        wallet,
        cells: plan.selected,
        outputs,
        policy,
      });
      logActivity({
        type: "consolidate",
        title: `${plan.selected.length} cells consolidated`,
        detail: `${shortHash(session?.address ?? "", 8, 6)} · ${plan.outputCount} outputs`,
        amount: plan.capacityOut,
      });
      recordClientTelemetry("cells_consolidated", network, { count: plan.selected.length });
      clearSelection();
      toast.success(hash ? "Consolidation broadcast" : "Demo consolidation completed", {
        description: hash ?? `${formatCkb(plan.capacityOut)} CKB merged into ${plan.outputCount} cells.`,
      });
    } catch (error) {
      toast.error("Consolidation blocked", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Dust Management"
        title="Safe Dust Consolidator"
        description="Merge fragmented pure-CKB cells into clean outputs. Type-script and non-standard lock cells are excluded by an invariant."
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href="/cells">
                Pick exact cells <ArrowRight className="size-3.5" />
              </Link>
            </Button>
            <Button
              size="sm"
              disabled={eligible.length === 0}
              onClick={() => (allSelected ? clearSelection() : selectMany(eligible.map((cell) => outPointKey(cell.outPoint))))}
            >
              {allSelected ? "Clear selection" : `Select all (${eligible.length})`}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">Inputs</p>
          <p className="number-tabular mt-1 text-2xl font-semibold">{plan.selected.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">Rejected</p>
          <p className="number-tabular mt-1 text-2xl font-semibold text-danger">{plan.rejected.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">Capacity in</p>
          <p className="number-tabular mt-1 text-2xl font-semibold">{formatCkb(plan.capacityIn)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">Outputs · fee</p>
          <p className="number-tabular mt-1 text-2xl font-semibold text-brand">
            {plan.outputCount} <span className="text-sm text-muted">· {formatCkb(plan.estimatedFee)}</span>
          </p>
        </Card>
      </div>

      {eligible.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={Layers}
            title="No dust to consolidate"
            description="There are no unfrozen pure-CKB cells in this cell set. Asset-bearing cells are never eligible."
          />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Pure-CKB inputs</CardTitle>
                <CardDescription>Every selected cell passes the type-script exclusion</CardDescription>
              </div>
              <Layers className="size-4 text-brand" />
            </CardHeader>
            <CardContent className="space-y-2">
              {eligible.map((cell) => {
                const key = outPointKey(cell.outPoint);
                return (
                  <label
                    key={key}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
                      selected.includes(key)
                        ? "border-brand/40 bg-brand-soft"
                        : "border-border bg-surface-muted/40 hover:border-border-strong",
                    )}
                  >
                    <Checkbox
                      checked={selected.includes(key)}
                      onCheckedChange={() => toggleSelected(key)}
                      aria-label={`Select ${key}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{cell.label}</span>
                      <span className="block font-mono text-[10px] text-muted">
                        {shortHash(cell.outPoint.txHash, 10, 6)}:{cell.outPoint.index}
                      </span>
                    </span>
                    <span className="number-tabular text-xs font-semibold">{formatCkb(cell.capacity, 2)} CKB</span>
                  </label>
                );
              })}
              {plan.rejected.length > 0 ? (
                <div className="mt-3 space-y-1.5 rounded-xl border border-danger/20 bg-danger/5 p-3">
                  <p className="text-[11px] font-semibold text-danger">Excluded by invariant</p>
                  {plan.rejected.slice(0, 5).map(({ cell, reason }) => (
                    <p key={outPointKey(cell.outPoint)} className="text-[10px] leading-relaxed text-muted">
                      {shortHash(cell.outPoint.txHash, 8, 4)}:{cell.outPoint.index} — {reason}
                    </p>
                  ))}
                  {plan.rejected.length > 5 ? (
                    <p className="text-[10px] text-muted">+{plan.rejected.length - 5} more</p>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Consolidation plan</CardTitle>
                <CardDescription>Computed locally before any signing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Capacity in</span>
                  <span className="number-tabular">{formatCkb(plan.capacityIn)} CKB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Fee</span>
                  <span className="number-tabular text-amber">−{formatCkb(plan.estimatedFee)} CKB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Capacity out</span>
                  <span className="number-tabular">{formatCkb(plan.capacityOut)} CKB</span>
                </div>
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="font-medium">Result</span>
                  <span className="number-tabular font-semibold text-brand">{plan.outputCount} clean cells</span>
                </div>
                <Button
                  className="mt-2 w-full"
                  disabled={!plan.executable || busy || !canBroadcast}
                  onClick={() => void execute()}
                >
                  <ShieldCheck className="size-4" />
                  {busy
                    ? "Working…"
                    : !canBroadcast
                      ? "Watch-only · no signing"
                      : mode === "demo"
                        ? "Simulate consolidation"
                        : "Sign & broadcast"}
                </Button>
                <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
                  <Info className="mt-0.5 size-3 shrink-0" />
                  {canBroadcast
                    ? "Frozen and asset-bearing cells are always rejected, even if selected elsewhere."
                    : "Watch-only wallets can inspect cells but cannot broadcast. Connect a signing wallet in Settings."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Warnings</CardTitle>
                <CardDescription>Invariant checks from the planner</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {plan.warnings.length === 0 ? (
                  <p className="text-xs text-muted">No warnings. The plan is ready to execute.</p>
                ) : (
                  plan.warnings.map((warning, index) => (
                    <div key={`${warning.code}-${index}`} className="rounded-lg border border-border bg-surface-muted/50 p-2.5">
                      <Badge variant={warning.severity === "error" ? "danger" : "amber"}>{warning.code}</Badge>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{warning.message}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {session ? (
              <p className="flex items-center gap-1.5 text-[11px] text-muted">
                <LockKeyhole className="size-3" />
                Outputs return to {shortHash(session.address, 10, 6)}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
