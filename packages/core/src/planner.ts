import { AGGREGATE_OUTPUT_CAPACITY, DEFAULT_FEE_RATE, MAX_CELLS_PER_BATCH, MIN_TRANSACTION_FEE } from "./constants";
import { isFrozen } from "./freeze";
import type {
  CellInfo,
  ConsolidationPlan,
  FreezePolicy,
  PlanWarning,
  ReclaimAction,
  ReclaimPlan,
} from "./types";
import { createId, fromShannons, toShannons } from "./utils";

export function estimateFee(inputCount: number, outputCount: number, feeRate = DEFAULT_FEE_RATE): string {
  const virtualBytes = 150 + inputCount * 85 + outputCount * 95;
  const fee = Math.max(MIN_TRANSACTION_FEE, (virtualBytes / 1000) * feeRate * 1000);
  return fee.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}

function sumCapacity(cells: CellInfo[]): bigint {
  return cells.reduce((sum, cell) => sum + toShannons(cell.capacity), 0n);
}

export function buildReclaimPlan(
  cells: CellInfo[],
  policy: FreezePolicy,
  options: { feeRate?: number } = {},
): ReclaimPlan {
  const warnings: PlanWarning[] = [];
  const actions: ReclaimAction[] = [];

  for (const cell of cells) {
    if (isFrozen(policy, cell.outPoint)) {
      warnings.push({
        code: "FROZEN_INPUT",
        severity: "error",
        message: `${cell.label} is frozen by the quarantine policy and cannot be consumed.`,
      });
      continue;
    }

    const isSpore = cell.category === "spore" && !cell.asset?.immovable;
    const isEmptyToken =
      (cell.category === "xudt" || cell.category === "sudt") && BigInt(cell.asset?.amount ?? "1") === 0n;

    if (isSpore) {
      actions.push({ cell, kind: "spore-melt", recovered: cell.capacity });
    } else if (isEmptyToken) {
      actions.push({ cell, kind: "xudt-close", recovered: cell.capacity });
    } else {
      warnings.push({
        code: "INELIGIBLE_CELL",
        severity: "warning",
        message: `${cell.label} is not a meltable Spore or empty token cell and was skipped.`,
      });
    }
  }

  if (actions.length > MAX_CELLS_PER_BATCH) {
    warnings.push({
      code: "BATCH_LIMIT",
      severity: "error",
      message: `A batch may contain at most ${MAX_CELLS_PER_BATCH} cells. Split the selection.`,
    });
  }

  const gross = sumCapacity(actions.map((action) => action.cell));
  const fee = toShannons(estimateFee(actions.length, 1, options.feeRate));
  const net = gross - fee;

  if (net <= 0n) {
    warnings.push({
      code: "NEGATIVE_YIELD",
      severity: "error",
      message: "Transaction fees exceed the recoverable capacity. Select more cells.",
    });
  }

  return {
    id: createId("reclaim"),
    createdAt: new Date().toISOString(),
    actions: actions.slice(0, MAX_CELLS_PER_BATCH),
    grossCapacity: fromShannons(gross),
    estimatedFee: fromShannons(fee),
    netCapacity: fromShannons(net > 0n ? net : 0n),
    warnings,
    executable: actions.length > 0 && !warnings.some((warning) => warning.severity === "error"),
  };
}

export function buildConsolidationPlan(
  cells: CellInfo[],
  policy: FreezePolicy,
  options: { feeRate?: number; targetOutputCapacity?: number } = {},
): ConsolidationPlan {
  const selected: CellInfo[] = [];
  const rejected: Array<{ cell: CellInfo; reason: string }> = [];
  const warnings: PlanWarning[] = [];
  const target = toShannons(options.targetOutputCapacity ?? "2000");

  for (const cell of cells) {
    if (cell.type) {
      rejected.push({ cell, reason: "Type script present — consolidation is restricted to pure CKB cells." });
      continue;
    }
    if (cell.category !== "liquid") {
      rejected.push({ cell, reason: `Classified as ${cell.label} — not a pure CKB cell.` });
      continue;
    }
    if (isFrozen(policy, cell.outPoint)) {
      rejected.push({ cell, reason: "Frozen by the quarantine policy." });
      continue;
    }
    selected.push(cell);
  }

  if (rejected.length > 0) {
    warnings.push({
      code: "TYPE_SCRIPT_EXCLUSION",
      severity: "error",
      message: `${rejected.length} cell${rejected.length > 1 ? "s were" : " was"} rejected by the strict type-script exclusion invariant.`,
    });
  }

  if (selected.length < 2) {
    warnings.push({
      code: "NOT_ENOUGH_CELLS",
      severity: "error",
      message: "Select at least two pure-CKB cells to consolidate.",
    });
  }

  if (selected.length > MAX_CELLS_PER_BATCH) {
    warnings.push({
      code: "BATCH_LIMIT",
      severity: "error",
      message: `A batch may contain at most ${MAX_CELLS_PER_BATCH} cells. Split the selection.`,
    });
  }

  const capacityIn = sumCapacity(selected);
  const outputCount = Math.max(1, Math.ceil(Number(capacityIn / target)) || 1);
  const fee = toShannons(estimateFee(selected.length, outputCount, options.feeRate));
  const capacityOut = capacityIn - fee;

  if (capacityOut < AGGREGATE_OUTPUT_CAPACITY) {
    warnings.push({
      code: "INSUFFICIENT_CAPACITY",
      severity: "error",
      message: "Selected capacity cannot cover fees and a valid output cell.",
    });
  }

  return {
    id: createId("consolidate"),
    createdAt: new Date().toISOString(),
    selected,
    rejected,
    capacityIn: fromShannons(capacityIn),
    capacityOut: fromShannons(capacityOut > 0n ? capacityOut : 0n),
    estimatedFee: fromShannons(fee),
    outputCount,
    warnings,
    executable: selected.length >= 2 && !warnings.some((warning) => warning.severity === "error"),
  };
}
