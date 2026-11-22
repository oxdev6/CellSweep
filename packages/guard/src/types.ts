export interface GuardScript {
  codeHash: string;
  hashType: string;
  args?: string;
}

export interface GuardOutPoint {
  txHash: string;
  index: number;
}

export interface ResolvedInput {
  outPoint: GuardOutPoint;
  capacity: string;
  lock: GuardScript;
  type: GuardScript | null;
  outputData?: string;
}

export interface ProposedOutput {
  capacity: string;
  lock: GuardScript;
  type: GuardScript | null;
  outputData?: string;
}

export interface AssetBurnOverride {
  typeScript: Partial<GuardScript>;
  reason: string;
}

export type ViolationCode =
  | "ASSET_BURN"
  | "CAPACITY_LOSS"
  | "FROZEN_OUTPOINT"
  | "CAPACITY_INFLATION"
  | "HIGH_FEE"
  | "DATA_LOSS";

export interface Violation {
  code: ViolationCode;
  severity: "error" | "warning";
  message: string;
  outPoint?: GuardOutPoint;
  typeScript?: GuardScript;
  overridden?: boolean;
}

export interface GuardResult {
  safe: boolean;
  violations: Violation[];
  checkedInputs: number;
  preservedAssets: number;
}

export interface GuardOptions {
  frozenOutPoints?: GuardOutPoint[];
  recognizedAssetTypes?: GuardScript[];
  overrides?: AssetBurnOverride[];
  maxFeeRatio?: number;
}
