import {
  buildTransferTransaction,
  canWalletSign,
  fromShannons,
  toShannons,
  type CellInfo,
  type FreezePolicy,
  type LiveWallet,
  type Script,
} from "@cell-hygiene/core";
import {
  guardTransaction,
  type AssetBurnOverride,
  type ProposedOutput,
  type ResolvedInput,
} from "@cell-hygiene/guard";

export function toResolvedInputs(cells: CellInfo[]): ResolvedInput[] {
  return cells.map((cell) => ({
    outPoint: cell.outPoint,
    capacity: cell.capacity,
    lock: cell.lock,
    type: cell.type,
    outputData: cell.outputData,
  }));
}

export function buildOutputs(capacity: string, count: number, lock: CellInfo["lock"]): ProposedOutput[] {
  const total = toShannons(capacity);
  const perOutput = total / BigInt(count);
  const remainder = total - perOutput * BigInt(count);
  return Array.from({ length: count }, (_, index) => ({
    capacity: fromShannons(perOutput + (index === 0 ? remainder : 0n)),
    lock,
    type: null,
    outputData: "0x" as const,
  }));
}

export function checkPlan(
  cells: CellInfo[],
  outputs: ProposedOutput[],
  policy: FreezePolicy,
  overrides: AssetBurnOverride[] = [],
) {
  return guardTransaction(toResolvedInputs(cells), outputs, {
    frozenOutPoints: policy.frozen.map((entry) => entry.outPoint),
    overrides,
  });
}

export async function executePlan(options: {
  mode: "demo" | "live";
  wallet: LiveWallet | null;
  cells: CellInfo[];
  outputs: ProposedOutput[];
  policy: FreezePolicy;
  overrides?: AssetBurnOverride[];
}): Promise<string | null> {
  if (options.cells.length === 0) throw new Error("Select at least one cell first.");
  if (options.mode === "demo") return null;
  if (!options.wallet) throw new Error("Connect a wallet before executing a plan.");
  if (!canWalletSign(options.wallet.session)) {
    throw new Error("This wallet is watch-only. Connect a signing wallet to broadcast.");
  }

  const result = checkPlan(options.cells, options.outputs, options.policy, options.overrides);
  if (!result.safe) {
    const error = result.violations.find((violation) => violation.severity === "error");
    throw new Error(error?.message ?? "The Burn Guard blocked this transaction.");
  }

  const transaction = buildTransferTransaction({
    inputs: options.cells,
    outputs: options.outputs.map((output) => ({
      capacity: output.capacity,
      lock: output.lock as Script,
      type: (output.type as Script | null) ?? null,
      data: output.outputData as `0x${string}`,
    })),
  });
  return options.wallet.send(transaction);
}
