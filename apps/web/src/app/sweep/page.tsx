"use client";

import {
  buildReclaimPlan,
  canWalletSign,
  formatCkb,
  outPointKey,
  shortHash,
  type CellInfo,
} from "@cell-hygiene/core";
import type { AssetBurnOverride } from "@cell-hygiene/guard";
import { ArrowRight, Flame, Info, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CategoryBadge } from "@/components/common/category-badge";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { buildOutputs, executePlan } from "@/lib/plan-execution";
import { useAppStore } from "@/lib/store";
import { recordClientTelemetry } from "@/lib/telemetry-client";
import { cn } from "@/lib/utils";

function isReclaimable(cell: CellInfo): boolean {
  if (cell.category === "spore" && !cell.asset?.immovable) return true;
  return (
    (cell.category === "xudt" || cell.category === "sudt") &&
    BigInt(cell.asset?.amount ?? "1") === 0n
  );
}

export default function SweepPage() {
  const router = useRouter();
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

  const eligible = useMemo(() => cells.filter(isReclaimable), [cells]);
  const selectedCells = useMemo(
    () => eligible.filter((cell) => selected.includes(outPointKey(cell.outPoint))),
    [eligible, selected],
  );
  const plan = useMemo(() => buildReclaimPlan(selectedCells, policy), [selectedCells, policy]);
  const allSelected = eligible.length > 0 && selectedCells.length === eligible.length;
  const canBroadcast = mode === "demo" || (session ? canWalletSign(session) : false);

  async function execute() {
    if (!plan.executable || plan.actions.length === 0) {
      toast.error("Resolve the plan warnings before executing.");
      return;
    }
    setBusy(true);
    try {
      const actions = plan.actions;
      const overrides: AssetBurnOverride[] = actions
        .filter((action) => action.cell.type)
        .map((action) => ({
          typeScript: action.cell.type!,
          reason: `Authorized ${action.kind} during reclaim sweep`,
        }));
      const outputs = buildOutputs(plan.netCapacity, 1, actions[0].cell.lock);
      const hash = await executePlan({
        mode,
        wallet,
        cells: actions.map((action) => action.cell),
        outputs,
        policy,
        overrides,
      });
      logActivity({
        type: "reclaim",
        title: `${actions.length} cells reclaimed`,
        detail: `${shortHash(session?.address ?? "", 8, 6)} · ${actions.length} inputs`,
        amount: plan.netCapacity,
      });
      recordClientTelemetry("capacity_reclaimed", network, { amount: Number(plan.netCapacity) });
      clearSelection();
      toast.success(hash ? "Reclaim transaction broadcast" : "Demo reclaim completed", {
        description: hash ?? `${formatCkb(plan.netCapacity)} CKB returned to your liquid balance.`,
      });
    } catch (error) {
      toast.error("Reclaim blocked", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Capacity Recovery"
        title="Melt & Reclaim"
        description="Batch-spend spam DOBs and zero-balance token cells to return their locked CKB to free liquid capacity."
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

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">Eligible cells</p>
          <p className="number-tabular mt-1 text-2xl font-semibold">{eligible.length}</p>
          <p className="mt-1 text-xs text-muted">Spam DOBs and empty token cells</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">Gross capacity</p>
          <p className="number-tabular mt-1 text-2xl font-semibold">{formatCkb(plan.grossCapacity)}</p>
          <p className="mt-1 text-xs text-muted">CKB locked in selected cells</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted">Net after fees</p>
          <p className="number-tabular mt-1 text-2xl font-semibold text-brand">
            {formatCkb(plan.netCapacity)}
          </p>
          <p className="mt-1 text-xs text-muted">Fee estimate {formatCkb(plan.estimatedFee)} CKB</p>
        </Card>
      </div>

      {eligible.length === 0 ? (
        <Card className="p-5">
          <EmptyState
            icon={Sparkles}
            title="Nothing to reclaim"
            description="No meltable Spore DOBs or empty token cells were found in this cell set."
            action={{ label: "Open cell explorer", onClick: () => router.push("/cells") }}
          />
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Reclaim candidates</CardTitle>
                <CardDescription>Select the exact cells to melt or close</CardDescription>
              </div>
              <Flame className="size-4 text-amber" />
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
                    {cell.asset?.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cell.asset.image} alt="" className="size-9 rounded-md object-cover" />
                    ) : (
                      <span className="flex size-9 items-center justify-center rounded-md bg-amber/10 text-amber">
                        <Flame className="size-4" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">
                        {cell.asset?.name ?? cell.label}
                      </span>
                      <span className="block font-mono text-[10px] text-muted">
                        {shortHash(cell.outPoint.txHash, 10, 6)}:{cell.outPoint.index}
                      </span>
                    </span>
                    {cell.frozen ? (
                      <LockKeyhole className="size-3.5 shrink-0 text-danger" aria-label="Frozen" />
                    ) : null}
                    <CategoryBadge category={cell.category} />
                    <span className="number-tabular text-xs font-semibold">
                      {formatCkb(cell.capacity, 2)} CKB
                    </span>
                  </label>
                );
              })}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pre-flight plan</CardTitle>
                <CardDescription>Computed locally from your current selection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Inputs</span>
                  <span className="number-tabular font-semibold">{plan.actions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Gross in</span>
                  <span className="number-tabular">{formatCkb(plan.grossCapacity)} CKB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Estimated fee</span>
                  <span className="number-tabular text-amber">−{formatCkb(plan.estimatedFee)} CKB</span>
                </div>
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="font-medium">Net recovered</span>
                  <span className="number-tabular font-semibold text-brand">
                    {formatCkb(plan.netCapacity)} CKB
                  </span>
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
                        ? "Simulate reclaim"
                        : "Sign & broadcast"}
                </Button>
                <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-muted">
                  <Info className="mt-0.5 size-3 shrink-0" />
                  {canBroadcast
                    ? "In live mode the Burn Guard validates every input before your wallet is asked to sign."
                    : "Watch-only wallets can inspect cells but cannot broadcast. Connect a signing wallet in Settings."}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Warnings</CardTitle>
                <CardDescription>Plan checks and skipped cells</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {plan.warnings.length === 0 ? (
                  <p className="text-xs text-muted">No warnings. The plan is ready to execute.</p>
                ) : (
                  plan.warnings.map((warning, index) => (
                    <div
                      key={`${warning.code}-${index}`}
                      className="rounded-lg border border-border bg-surface-muted/50 p-2.5"
                    >
                      <Badge variant={warning.severity === "error" ? "danger" : "amber"}>
                        {warning.code}
                      </Badge>
                      <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{warning.message}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
