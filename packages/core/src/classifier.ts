import { getKnownScript } from "./constants";
import type {
  AssetCategory,
  AssetInfo,
  CellInfo,
  Network,
  RawCell,
  Script,
} from "./types";
import { decodeUdtAmount, fromShannons, hexToUtf8, toShannons } from "./utils";

export interface ClassifyOptions {
  network?: Network;
  isFrozen?: (cell: RawCell) => boolean;
  metadata?: Record<string, Partial<AssetInfo>>;
}

const LABELS: Record<AssetCategory, string> = {
  liquid: "Free Liquid CKB",
  spore: "Spore DOB / NFT",
  xudt: "xUDT Token Cell",
  sudt: "sUDT Token Cell",
  dao: "Nervos DAO",
  rgbpp: "RGB++ / Complex Lock",
  other: "Other Type Script",
};

function scriptMatches(script: Script | null, codeHash: string, hashType: string) {
  return (
    !!script &&
    script.codeHash.toLowerCase() === codeHash.toLowerCase() &&
    script.hashType === hashType
  );
}

function isComplexLock(lock: Script, network: Network | undefined): boolean {
  const known = getKnownScript(lock.codeHash, lock.hashType, network);
  if (known?.category === "rgbpp") return true;
  return !known && lock.codeHash !== "0x" && lock.args.length > 42;
}

function inferDaoStatus(data: string): AssetInfo["status"] {
  const hex = data.replace(/^0x/, "").padStart(16, "0");
  return hex.startsWith("0000000000000000") ? "deposited" : "withdrawing";
}

function inferSporeName(data: string): string | undefined {
  const text = hexToUtf8(data as `0x${string}`);
  if (!text) return undefined;
  const contentTypeMatch = text.match(/image\/([\w+-]+)/);
  if (contentTypeMatch) return `DOB · ${contentTypeMatch[1].toUpperCase()}`;
  return undefined;
}

export function classifyCell(raw: RawCell, options: ClassifyOptions = {}): CellInfo {
  const network = options.network ?? "mainnet";
  const meta = options.metadata?.[`${raw.outPoint.txHash}:${raw.outPoint.index}`];

  let category: AssetCategory = "liquid";
  let asset: AssetInfo | undefined;
  let label = LABELS.liquid;

  if (raw.type) {
    const known = getKnownScript(raw.type.codeHash, raw.type.hashType, network);
    if (known) {
      category = known.category;
      label = known.name;
      asset = { kind: known.category as AssetInfo["kind"], protocol: known.name };
    } else {
      category = "other";
      label = LABELS.other;
      asset = { kind: "other", protocol: "Unrecognized" };
    }
  }

  if (isComplexLock(raw.lock, network)) {
    category = "rgbpp";
    label = LABELS.rgbpp;
    asset = { ...asset, kind: "rgbpp", protocol: asset?.protocol ?? "Complex lock" };
  }

  if (category === "spore") {
    const cluster = scriptMatches(raw.type, "0x7366a61534fa7c7e6225ecc0d828ea3b5366adec2b58206f2ee84995fe030075", "data1");
    label = cluster ? "Spore Cluster" : LABELS.spore;
    asset = {
      ...asset,
      kind: "spore",
      name: meta?.name ?? inferSporeName(raw.outputData) ?? (cluster ? "Spore Cluster" : "Spore DOB"),
      image: meta?.image,
      collection: meta?.collection,
      immovable: cluster || meta?.immovable,
      status: cluster ? "unknown" : undefined,
    };
  }

  if (category === "xudt" || category === "sudt") {
    const amount = decodeUdtAmount(raw.outputData);
    const empty = amount === 0n;
    asset = {
      ...asset,
      kind: category,
      amount: amount.toString(),
      decimals: meta?.decimals ?? 8,
      symbol: meta?.symbol ?? (category === "xudt" ? "xUDT" : "sUDT"),
      name: meta?.name ?? (empty ? "Empty token cell" : "Token cell"),
    };
    label = empty ? `Empty ${category.toUpperCase()} · Reclaimable` : LABELS[category];
  }

  if (category === "dao") {
    asset = { ...asset, kind: "dao", status: inferDaoStatus(raw.outputData), name: "Nervos DAO" };
    label = `Nervos DAO · ${asset.status === "deposited" ? "Deposited" : "Withdrawing"}`;
  }

  if (category === "rgbpp") {
    asset = { ...asset, kind: "rgbpp", name: meta?.name ?? "RGB++ Asset" };
    label = LABELS.rgbpp;
  }

  const capacity = fromShannons(BigInt(raw.capacity));

  return {
    ...raw,
    source: raw.source ?? "live",
    capacity,
    category,
    label,
    asset: meta && asset ? { ...asset, ...meta, kind: asset.kind } : asset,
  };
}

export function classifyCells(raw: RawCell[], options: ClassifyOptions = {}): CellInfo[] {
  return raw.map((cell) => classifyCell(cell, options));
}

export function summarizeCapacity(cells: CellInfo[]) {
  const total = cells.reduce((sum, cell) => sum + toShannons(cell.capacity), 0n);
  const buckets = new Map<AssetCategory, { capacity: bigint; count: number }>();
  for (const cell of cells) {
    const current = buckets.get(cell.category) ?? { capacity: 0n, count: 0 };
    buckets.set(cell.category, {
      capacity: current.capacity + toShannons(cell.capacity),
      count: current.count + 1,
    });
  }
  const totalNumber = Number(total);
  return {
    total: total.toString(),
    buckets: [...buckets.entries()]
      .map(([category, value]) => ({
        category,
        label: LABELS[category],
        capacity: value.capacity.toString(),
        count: value.count,
        percentage: totalNumber === 0 ? 0 : (Number(value.capacity) / totalNumber) * 100,
      }))
      .sort((a, b) => Number(b.capacity) - Number(a.capacity)),
  };
}
