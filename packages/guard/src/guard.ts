import type {
  AssetBurnOverride,
  GuardOptions,
  GuardResult,
  GuardScript,
  ProposedOutput,
  ResolvedInput,
  Violation,
} from "./types";

export const DEFAULT_RECOGNIZED_ASSET_TYPES: GuardScript[] = [
  {
    codeHash: "0x4a4dce1df3dffff7f8b2cd7dff7303df3b6150c9788cb75dcf6747247132b9f5",
    hashType: "data1",
  },
  {
    codeHash: "0xcfba73b58b6f30e70caed8a999748781b164ef9a1e218424a6fb55ebf641cb33",
    hashType: "type",
  },
  {
    codeHash: "0x7366a61534fa7c7e6225ecc0d828ea3b5366adec2b58206f2ee84995fe030075",
    hashType: "data1",
  },
  {
    codeHash: "0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95",
    hashType: "data1",
  },
  {
    codeHash: "0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb",
    hashType: "type",
  },
  {
    codeHash: "0x5e7a36a77e68eecc013dfa2fe6a23f3b6c344b04005808694ae6dd45eea4cfd5",
    hashType: "type",
  },
  {
    codeHash: "0xc5e5dcf215925f7ef4dfaf5f4b4f105bc321c02776d6e7d52a1db3fcd9d011a4",
    hashType: "type",
  },
  {
    codeHash: "0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e",
    hashType: "type",
  },
];

function scriptKey(script: GuardScript): string {
  return `${script.codeHash.toLowerCase()}|${script.hashType}|${script.args?.toLowerCase() ?? "*"}`;
}

function matchesOverride(script: GuardScript, override: AssetBurnOverride): boolean {
  if (override.typeScript.codeHash && override.typeScript.codeHash.toLowerCase() !== script.codeHash.toLowerCase()) {
    return false;
  }
  if (override.typeScript.hashType && override.typeScript.hashType !== script.hashType) return false;
  if (override.typeScript.args && override.typeScript.args.toLowerCase() !== (script.args ?? "").toLowerCase()) {
    return false;
  }
  return true;
}

function outPointKey(point: { txHash: string; index: number }): string {
  return `${point.txHash.toLowerCase()}:${point.index}`;
}

function capacity(script: { capacity: string }): bigint {
  const value = script.capacity.trim();
  if (/^\d+$/.test(value)) return BigInt(value);
  const [whole = "0", fraction = ""] = value.split(".");
  return BigInt(whole || "0") * 100_000_000n + BigInt((fraction + "00000000").slice(0, 8) || "0");
}

function describe(script: GuardScript): string {
  return `${script.codeHash.slice(0, 12)}…${script.hashType}${script.args ? `/${script.args.slice(0, 8)}…` : ""}`;
}

export function guardTransaction(
  inputs: ResolvedInput[],
  outputs: ProposedOutput[],
  options: GuardOptions = {},
): GuardResult {
  const violations: Violation[] = [];
  const recognized = options.recognizedAssetTypes ?? DEFAULT_RECOGNIZED_ASSET_TYPES;
  const frozen = new Set((options.frozenOutPoints ?? []).map(outPointKey));
  const overrides = options.overrides ?? [];
  const maxFeeRatio = options.maxFeeRatio ?? 0.01;
  let preservedAssets = 0;

  for (const input of inputs) {
    if (frozen.has(outPointKey(input.outPoint))) {
      violations.push({
        code: "FROZEN_OUTPOINT",
        severity: "error",
        message: `Frozen outpoint ${outPointKey(input.outPoint)} would be consumed by this transaction.`,
        outPoint: input.outPoint,
      });
    }

    if (!input.type) continue;
    const isRecognized = recognized.some(
      (script) =>
        script.codeHash.toLowerCase() === input.type!.codeHash.toLowerCase() &&
        script.hashType === input.type!.hashType,
    );
    if (!isRecognized) continue;

    const matching = outputs.find(
      (output) => output.type && scriptKey(output.type) === scriptKey(input.type!),
    );

    if (!matching) {
      const override = overrides.find((candidate) => matchesOverride(input.type!, candidate));
      violations.push({
        code: "ASSET_BURN",
        severity: override ? "warning" : "error",
        message: override
          ? `Asset ${describe(input.type)} is intentionally consumed: ${override.reason}`
          : `Asset-bearing cell ${describe(input.type)} has no matching output. This would permanently burn the asset.`,
        outPoint: input.outPoint,
        typeScript: input.type,
        overridden: Boolean(override),
      });
      continue;
    }

    preservedAssets += 1;

    if (capacity(matching) < capacity(input)) {
      violations.push({
        code: "CAPACITY_LOSS",
        severity: "error",
        message: `Output preserving ${describe(input.type)} has less capacity than its input.`,
        outPoint: input.outPoint,
        typeScript: input.type,
      });
    }

    const inputData = input.outputData ?? "0x";
    const outputData = matching.outputData ?? "0x";
    if (inputData.length > outputData.length) {
      violations.push({
        code: "DATA_LOSS",
        severity: "warning",
        message: `Output preserving ${describe(input.type)} has shorter cell data than its input.`,
        outPoint: input.outPoint,
        typeScript: input.type,
      });
    }
  }

  const inputCapacity = inputs.reduce((sum, input) => sum + capacity(input), 0n);
  const outputCapacity = outputs.reduce((sum, output) => sum + capacity(output), 0n);

  if (outputCapacity > inputCapacity) {
    violations.push({
      code: "CAPACITY_INFLATION",
      severity: "error",
      message: `Outputs require ${outputCapacity - inputCapacity} shannons more than the inputs provide.`,
    });
  } else if (inputCapacity > 0n) {
    const feeRatio = Number(inputCapacity - outputCapacity) / Number(inputCapacity);
    if (feeRatio > maxFeeRatio) {
      violations.push({
        code: "HIGH_FEE",
        severity: "warning",
        message: `Transaction fee is ${(feeRatio * 100).toFixed(2)}% of input capacity (limit ${(maxFeeRatio * 100).toFixed(2)}%).`,
      });
    }
  }

  return {
    safe: !violations.some((violation) => violation.severity === "error"),
    violations,
    checkedInputs: inputs.length,
    preservedAssets,
  };
}

export function createAssetBurnGuard(options: GuardOptions = {}) {
  return (inputs: ResolvedInput[], outputs: ProposedOutput[]) => guardTransaction(inputs, outputs, options);
}
