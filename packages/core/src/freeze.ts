import type { CellInfo, FreezePolicy, FrozenEntry, OutPoint } from "./types";
import { createId, outPointKey } from "./utils";

export const EMPTY_POLICY: FreezePolicy = {
  version: 1,
  name: "CellSweep Quarantine",
  frozen: [],
  updatedAt: new Date(0).toISOString(),
};

export function createPolicy(name = EMPTY_POLICY.name): FreezePolicy {
  return { ...EMPTY_POLICY, name, frozen: [], updatedAt: new Date().toISOString() };
}

export function clearPolicy(policy: FreezePolicy): FreezePolicy {
  return createPolicy(policy.name);
}

export function isFrozen(policy: FreezePolicy, outPoint: OutPoint): boolean {
  const key = outPointKey(outPoint);
  return policy.frozen.some((entry) => outPointKey(entry.outPoint) === key);
}

export function assertNotFrozen(policy: FreezePolicy, cells: CellInfo[]): CellInfo[] {
  const frozen = cells.filter((cell) => isFrozen(policy, cell.outPoint));
  if (frozen.length > 0) {
    throw new Error(
      `Refusing to consume ${frozen.length} frozen outpoint${frozen.length > 1 ? "s" : ""}: ${frozen
        .map((cell) => outPointKey(cell.outPoint))
        .join(", ")}`,
    );
  }
  return cells;
}

export function freezeCell(policy: FreezePolicy, outPoint: OutPoint, reason?: string): FreezePolicy {
  if (isFrozen(policy, outPoint)) return policy;
  const entry: FrozenEntry = {
    outPoint: { ...outPoint },
    reason: reason?.trim() || undefined,
    frozenAt: new Date().toISOString(),
  };
  return {
    ...policy,
    version: 1,
    frozen: [...policy.frozen, entry],
    updatedAt: new Date().toISOString(),
  };
}

export function unfreezeCell(policy: FreezePolicy, outPoint: OutPoint): FreezePolicy {
  const key = outPointKey(outPoint);
  return {
    ...policy,
    frozen: policy.frozen.filter((entry) => outPointKey(entry.outPoint) !== key),
    updatedAt: new Date().toISOString(),
  };
}

export function validatePolicy(input: unknown): FreezePolicy {
  if (!input || typeof input !== "object") throw new Error("Policy must be an object");
  const candidate = input as Partial<FreezePolicy>;
  if (candidate.version !== 1) throw new Error("Unsupported policy version");
  if (!Array.isArray(candidate.frozen)) throw new Error("Policy frozen list must be an array");

  const seen = new Set<string>();
  const frozen: FrozenEntry[] = candidate.frozen.map((entry, index) => {
    if (!entry?.outPoint?.txHash || !/^0x[0-9a-fA-F]{64}$/.test(entry.outPoint.txHash)) {
      throw new Error(`Invalid txHash in frozen entry ${index}`);
    }
    if (!Number.isInteger(entry.outPoint.index) || entry.outPoint.index < 0) {
      throw new Error(`Invalid output index in frozen entry ${index}`);
    }
    const key = outPointKey(entry.outPoint);
    if (seen.has(key)) throw new Error(`Duplicate frozen outpoint: ${key}`);
    seen.add(key);
    return {
      outPoint: { txHash: entry.outPoint.txHash, index: entry.outPoint.index },
      reason: typeof entry.reason === "string" ? entry.reason : undefined,
      frozenAt: typeof entry.frozenAt === "string" ? entry.frozenAt : new Date().toISOString(),
    };
  });

  return {
    version: 1,
    name: typeof candidate.name === "string" ? candidate.name : EMPTY_POLICY.name,
    frozen,
    updatedAt: typeof candidate.updatedAt === "string" ? candidate.updatedAt : new Date().toISOString(),
  };
}

export function parsePolicy(json: string): FreezePolicy {
  try {
    return validatePolicy(JSON.parse(json));
  } catch (error) {
    throw new Error(`Invalid quarantine policy: ${(error as Error).message}`);
  }
}

export class FreezePolicyStore {
  private current: FreezePolicy;

  constructor(policy: FreezePolicy = createPolicy()) {
    this.current = validatePolicy(policy);
  }

  static fromJSON(json: string): FreezePolicyStore {
    return new FreezePolicyStore(parsePolicy(json));
  }

  get policy(): FreezePolicy {
    return structuredClone(this.current);
  }

  isFrozen(outPoint: OutPoint): boolean {
    return isFrozen(this.current, outPoint);
  }

  freeze(outPoint: OutPoint, reason?: string): FreezePolicy {
    this.current = freezeCell(this.current, outPoint, reason);
    return this.policy;
  }

  unfreeze(outPoint: OutPoint): FreezePolicy {
    this.current = unfreezeCell(this.current, outPoint);
    return this.policy;
  }

  toggle(outPoint: OutPoint, reason?: string): FreezePolicy {
    return this.isFrozen(outPoint) ? this.unfreeze(outPoint) : this.freeze(outPoint, reason);
  }

  clear(): FreezePolicy {
    this.current = clearPolicy(this.current);
    return this.policy;
  }

  toJSON(pretty = true): string {
    return JSON.stringify(this.current, null, pretty ? 2 : 0);
  }

  get id(): string {
    return createId("policy");
  }
}
