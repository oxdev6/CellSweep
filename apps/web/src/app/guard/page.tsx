"use client";

import type { GuardResult, ProposedOutput, ResolvedInput } from "@cell-hygiene/guard";
import { guardTransaction } from "@cell-hygiene/guard";
import type { CellInfo, Script } from "@cell-hygiene/core";
import { shortHash } from "@cell-hygiene/core";
import { AlertTriangle, CheckCircle2, Play, ShieldCheck, ShieldX } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/page-header";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type ScenarioId = "safe" | "asset-burn" | "capacity-loss" | "frozen" | "high-fee";

const SCENARIOS: Array<{ id: ScenarioId; label: string; description: string }> = [
  { id: "safe", label: "Safe transfer", description: "Pure CKB input with a normal fee" },
  { id: "asset-burn", label: "Asset burn", description: "Asset type script disappears from outputs" },
  { id: "capacity-loss", label: "Capacity loss", description: "Preserved asset output loses capacity" },
  { id: "frozen", label: "Frozen outpoint", description: "A quarantined cell is consumed" },
  { id: "high-fee", label: "High fee", description: "Fee exceeds the configured ratio" },
];

const DEMO_LOCK: Script = {
  codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
  hashType: "type",
  args: "0x0000000000000000000000000000000000000000",
};
const DEMO_SPORE: Script = {
  codeHash: "0x4a4dce1df3dffff7f8b2cd7dff7303df3b6150c9788cb75dcf6747247132b9f5",
  hashType: "data1",
  args: `0x${"11".repeat(32)}`,
};

function toInput(cell: CellInfo): ResolvedInput {
  return {
    outPoint: cell.outPoint,
    capacity: cell.capacity,
    lock: cell.lock,
    type: cell.type,
    outputData: cell.outputData,
  };
}

function syntheticInput(type: Script | null, capacity: string, index: number): ResolvedInput {
  return {
    outPoint: {
      txHash: `0x${String(index).repeat(64)}`,
      index,
    },
    capacity,
    lock: DEMO_LOCK,
    type,
    outputData: type ? "0x1234" : "0x",
  };
}

function outputFrom(input: ResolvedInput, patch: Partial<ProposedOutput> = {}): ProposedOutput {
  return {
    capacity: input.capacity,
    lock: input.lock,
    type: input.type,
    outputData: input.outputData ?? "0x",
    ...patch,
  };
}

export default function GuardPage() {
  const cells = useAppStore((state) => state.cells);
  const policy = useAppStore((state) => state.freezePolicy);
  const logActivity = useAppStore((state) => state.logActivity);
  const [scenario, setScenario] = useState<ScenarioId>("asset-burn");
  const [allowOverride, setAllowOverride] = useState(false);
  const [result, setResult] = useState<GuardResult | null>(null);

  const fixtures = useMemo(() => {
    const plain = cells.find((cell) => cell.category === "liquid" && !cell.type);
    const asset = cells.find((cell) => cell.type && cell.category !== "rgbpp");
    return {
      plain: plain ? toInput(plain) : syntheticInput(null, "400", 1),
      asset: asset ? toInput(asset) : syntheticInput(DEMO_SPORE, "180", 2),
    };
  }, [cells]);

  function run() {
    let inputs: ResolvedInput[] = [];
    let outputs: ProposedOutput[] = [];

    if (scenario === "safe") {
      inputs = [fixtures.plain];
      outputs = [outputFrom(fixtures.plain, { capacity: "399" })];
    } else if (scenario === "asset-burn") {
      inputs = [fixtures.asset];
      outputs = [outputFrom(fixtures.asset, { type: null, outputData: "0x" })];
    } else if (scenario === "capacity-loss") {
      inputs = [fixtures.asset];
      outputs = [outputFrom(fixtures.asset, { capacity: "1" })];
    } else if (scenario === "frozen") {
      inputs = [fixtures.plain];
      outputs = [outputFrom(fixtures.plain, { capacity: "399" })];
    } else {
      inputs = [fixtures.plain];
      outputs = [outputFrom(fixtures.plain, { capacity: "360" })];
    }

    const frozenOutPoints =
      scenario === "frozen"
        ? policy.frozen.length
          ? policy.frozen.map((entry) => entry.outPoint)
          : [fixtures.plain.outPoint]
        : policy.frozen.map((entry) => entry.outPoint);

    const guardResult = guardTransaction(inputs, outputs, {
      frozenOutPoints,
      overrides:
        allowOverride && fixtures.asset.type
          ? [{ typeScript: fixtures.asset.type, reason: "Explicit test override" }]
          : [],
    });

    setResult(guardResult);
    logActivity({
      type: "guard",
      title: guardResult.safe ? "Guard passed a transaction" : "Guard stopped a transaction",
      detail: `${SCENARIOS.find((item) => item.id === scenario)?.label} · ${guardResult.violations.length} findings`,
    });
    toast[guardResult.safe ? "success" : "error"](
      guardResult.safe ? "Transaction is safe" : "Transaction blocked",
      { description: `${guardResult.violations.length} guard findings` },
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="Pre-flight Safety"
        title="Burn Guard Test Bench"
        description="Inject faulty transactions and verify the SDK stops accidental asset destruction before a wallet ever signs."
        actions={
          <Badge variant="brand" className="px-3 py-1.5">
            <ShieldCheck className="size-3.5" /> Live SDK checks
          </Badge>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fault injection scenarios</CardTitle>
              <CardDescription>Choose a transaction shape, then run the inspector</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={scenario} onValueChange={(value) => { setScenario(value as ScenarioId); setResult(null); }}>
                <TabsList className="flex flex-wrap">
                  {SCENARIOS.map((item) => (
                    <TabsTrigger key={item.id} value={item.id}>
                      {item.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <p className="mt-4 rounded-lg border border-border bg-surface-muted/60 p-3 text-xs leading-relaxed text-muted">
                {SCENARIOS.find((item) => item.id === scenario)?.description}
              </p>

              <div className="mt-4 flex items-center justify-between rounded-lg border border-border p-3">
                <div>
                  <Label htmlFor="guard-override" className="mb-0">Allow documented override</Label>
                  <p className="mt-0.5 text-[11px] text-muted">Turns an intentional asset burn into a warning</p>
                </div>
                <Switch
                  id="guard-override"
                  checked={allowOverride}
                  onCheckedChange={(checked) => { setAllowOverride(checked); setResult(null); }}
                />
              </div>

              <Button className="mt-4 w-full" onClick={run}>
                <Play className="size-4" /> Run guard check
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction under test</CardTitle>
              <CardDescription>Resolved inputs and proposed outputs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 font-mono text-[11px]">
              <div>
                <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted">Input</p>
                <div className="rounded-lg border border-border bg-surface-muted/60 p-3">
                  <p className="truncate">{shortHash(fixtures.asset.outPoint.txHash, 14, 8)}:{fixtures.asset.outPoint.index}</p>
                  <p className="mt-1 text-muted">
                    {(scenario === "safe" || scenario === "frozen" || scenario === "high-fee")
                      ? `${fixtures.plain.capacity} CKB · pure CKB`
                      : `${fixtures.asset.capacity} CKB · ${fixtures.asset.type ? "asset type script" : "no type script"}`}
                  </p>
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted">Expected guard behavior</p>
                <p className="rounded-lg border border-border bg-surface-muted/60 p-3 font-sans text-xs text-muted">
                  {scenario === "safe"
                    ? "No violations. Fee ratio stays under 1%."
                    : scenario === "asset-burn"
                      ? "ASSET_BURN error unless an explicit override is supplied."
                      : scenario === "capacity-loss"
                        ? "CAPACITY_LOSS error on the asset-preserving output."
                        : scenario === "frozen"
                          ? "FROZEN_OUTPOINT error from the quarantine policy."
                          : "HIGH_FEE warning for an oversized fee."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Guard verdict</CardTitle>
            <CardDescription>Result from @cell-hygiene/guard</CardDescription>
          </CardHeader>
          <CardContent>
            {result === null ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
                <ShieldCheck className="size-8 text-muted" />
                <p className="mt-3 text-sm font-medium">No check run yet</p>
                <p className="mt-1 text-xs text-muted">Pick a scenario and run the guard to see its findings.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-4",
                    result.safe
                      ? "border-brand/30 bg-brand-soft text-brand"
                      : "border-danger/30 bg-danger/10 text-danger",
                  )}
                >
                  {result.safe ? <CheckCircle2 className="size-6" /> : <ShieldX className="size-6" />}
                  <div>
                    <p className="text-sm font-semibold">{result.safe ? "SAFE TO SIGN" : "BLOCKED"}</p>
                    <p className="text-[11px] opacity-80">
                      {result.checkedInputs} inputs checked · {result.preservedAssets} assets preserved
                    </p>
                  </div>
                </div>

                {result.violations.length === 0 ? (
                  <p className="rounded-lg border border-border bg-surface-muted/60 p-3 text-xs text-muted">
                    The transaction satisfies every guard invariant.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {result.violations.map((violation, index) => (
                      <div key={`${violation.code}-${index}`} className="rounded-lg border border-border bg-surface-muted/50 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={violation.severity === "error" ? "danger" : "amber"}>
                            {violation.severity === "error" ? <AlertTriangle className="size-3" /> : null}
                            {violation.code}
                          </Badge>
                          {violation.overridden ? <Badge variant="accent">overridden</Badge> : null}
                        </div>
                        <p className="mt-2 text-[11px] leading-relaxed text-muted">{violation.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
