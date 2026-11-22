import type { Network } from "@cell-hygiene/core";

export const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;
export const ONE_HOUR_CACHE_HEADERS = { "Cache-Control": "public, max-age=3600" } as const;

export function isNetwork(value: unknown): value is Network {
  return value === "mainnet" || value === "testnet";
}

export function defaultNetwork(): Network {
  const configured = process.env.NEXT_PUBLIC_DEFAULT_NETWORK;
  return isNetwork(configured) ? configured : "mainnet";
}

export function networkFromParam(value: string | null): Network | null {
  if (value === null) {
    return defaultNetwork();
  }
  return isNetwork(value) ? value : null;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const SECRET_KEY_PATTERN = /private|secret|mnemonic|seed|key|sign/i;
const ALLOWED_SEARCH_KEYS = new Set(["cell_search_key", "search_key"]);

export function hasSuspiciousKeys(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some((item) => hasSuspiciousKeys(item));
  }
  if (isRecord(value)) {
    return Object.entries(value).some(([key, nested]) => {
      if (!ALLOWED_SEARCH_KEYS.has(key.toLowerCase()) && SECRET_KEY_PATTERN.test(key)) {
        return true;
      }
      return hasSuspiciousKeys(nested);
    });
  }
  return false;
}
