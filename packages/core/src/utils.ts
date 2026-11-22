import { CKB_DECIMALS, SHANNONS_PER_CKB } from "./constants";
import type { HexString, OutPoint } from "./types";

export function toShannons(ckb: string | number | bigint): bigint {
  if (typeof ckb === "bigint") return ckb * SHANNONS_PER_CKB;
  const value = typeof ckb === "number" ? ckb.toString() : ckb.trim();
  if (!value) return 0n;
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  if (!/^\d+$/.test(whole) || !/^\d*$/.test(fraction)) {
    throw new Error(`Invalid CKB amount: ${value}`);
  }
  const padded = (fraction + "0".repeat(CKB_DECIMALS)).slice(0, CKB_DECIMALS);
  const result = BigInt(whole || "0") * SHANNONS_PER_CKB + BigInt(padded || "0");
  return negative ? -result : result;
}

export function fromShannons(shannons: bigint): string {
  const negative = shannons < 0n;
  const value = negative ? -shannons : shannons;
  const whole = value / SHANNONS_PER_CKB;
  const fraction = (value % SHANNONS_PER_CKB).toString().padStart(CKB_DECIMALS, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole.toString()}${fraction ? `.${fraction}` : ""}`;
}

export function addCkb(...values: string[]): string {
  return values.reduce((sum, value) => sum + toShannons(value), 0n).toString();
}

export function subCkb(a: string, b: string): string {
  return (toShannons(a) - toShannons(b)).toString();
}

export function formatCkb(value: string | bigint, maximumFractionDigits = 2): string {
  const numeric = typeof value === "bigint" ? Number(fromShannons(value)) : Number(value);
  if (!Number.isFinite(numeric)) return "0";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(numeric);
}

export function formatShannons(value: string | bigint, maximumFractionDigits = 2): string {
  const shannons = typeof value === "bigint" ? value : BigInt(value.trim() || "0");
  return formatCkb(fromShannons(shannons), maximumFractionDigits);
}

export function formatCompact(value: string | number): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: Math.abs(numeric) >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(numeric);
}

export function shortHash(hash: string, head = 10, tail = 6): string {
  if (hash.length <= head + tail + 1) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

export function outPointKey(outPoint: OutPoint): string {
  return `${outPoint.txHash.toLowerCase()}:${outPoint.index}`;
}

export function parseOutPoint(value: string): OutPoint | null {
  const match = value.trim().match(/^(0x[0-9a-fA-F]{64})[:\s]+(\d+)$/);
  if (!match) return null;
  return { txHash: match[1] as HexString, index: Number(match[2]) };
}

export function decodeUdtAmount(data: HexString): bigint {
  const hex = data.replace(/^0x/, "");
  if (hex.length < 32) return 0n;
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  let result = 0n;
  for (let i = 15; i >= 0; i -= 1) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

export function hexToUtf8(data: HexString): string | null {
  try {
    const hex = data.replace(/^0x/, "");
    if (!hex || hex.length % 2 !== 0) return null;
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

export function createId(prefix = "id"): string {
  const random =
    typeof globalThis.crypto?.randomUUID === "function"
      ? globalThis.crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${random}`;
}
