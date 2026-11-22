export type HexString = `0x${string}`;
export type Network = "mainnet" | "testnet";
export type HashType = "type" | "data" | "data1";

export interface Script {
  codeHash: HexString;
  hashType: HashType;
  args: HexString;
}

export interface OutPoint {
  txHash: HexString;
  index: number;
}

export type AssetCategory =
  | "liquid"
  | "spore"
  | "xudt"
  | "sudt"
  | "dao"
  | "rgbpp"
  | "other";

export interface AssetInfo {
  kind: Exclude<AssetCategory, "liquid">;
  name?: string;
  symbol?: string;
  amount?: string;
  decimals?: number;
  image?: string;
  collection?: string;
  status?: "deposited" | "withdrawing" | "unknown";
  protocol?: string;
  immovable?: boolean;
}

export interface CellInfo {
  outPoint: OutPoint;
  capacity: string;
  lock: Script;
  type: Script | null;
  outputData: HexString;
  category: AssetCategory;
  label: string;
  asset?: AssetInfo;
  blockNumber?: number;
  address?: string;
  source: "live" | "demo";
  frozen?: boolean;
}

export interface RawCell {
  outPoint: OutPoint;
  capacity: string;
  lock: Script;
  type: Script | null;
  outputData: HexString;
  blockNumber?: number;
  address?: string;
  source?: "live" | "demo";
}

export interface KnownScript {
  id: string;
  name: string;
  category: AssetCategory;
  codeHash: HexString;
  hashType: HashType;
  networks: Network[];
  description: string;
  cellDeps?: Array<{ outPoint: OutPoint; depType: "code" | "depGroup" }>;
}

export interface FrozenEntry {
  outPoint: OutPoint;
  reason?: string;
  frozenAt: string;
}

export interface FreezePolicy {
  version: 1;
  name: string;
  frozen: FrozenEntry[];
  updatedAt: string;
}

export interface PlanWarning {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
}

export interface ReclaimAction {
  cell: CellInfo;
  kind: "spore-melt" | "xudt-close";
  recovered: string;
}

export interface ReclaimPlan {
  id: string;
  createdAt: string;
  actions: ReclaimAction[];
  grossCapacity: string;
  estimatedFee: string;
  netCapacity: string;
  warnings: PlanWarning[];
  executable: boolean;
}

export interface ConsolidationPlan {
  id: string;
  createdAt: string;
  selected: CellInfo[];
  rejected: Array<{ cell: CellInfo; reason: string }>;
  capacityIn: string;
  capacityOut: string;
  estimatedFee: string;
  outputCount: number;
  warnings: PlanWarning[];
  executable: boolean;
}

export interface CapacityBreakdown {
  total: string;
  buckets: Array<{
    category: AssetCategory;
    label: string;
    capacity: string;
    count: number;
    percentage: number;
  }>;
}

export type WalletProvider = "joyid" | "utxo-global" | "metamask" | "watch-only";

export interface WalletSession {
  provider: WalletProvider;
  address: string;
  network: Network;
  mode: "live" | "demo";
}
