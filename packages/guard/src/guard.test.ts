import { describe, expect, it } from "vitest";
import { createAssetBurnGuard, guardTransaction } from "./guard";
import type { GuardOutPoint, GuardScript, ProposedOutput, ResolvedInput } from "./types";

const SPORE: GuardScript = {
  codeHash: "0x4a4dce1df3dffff7f8b2cd7dff7303df3b6150c9788cb75dcf6747247132b9f5",
  hashType: "data1",
  args: "0xspore01",
};
const XUDT: GuardScript = {
  codeHash: "0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95",
  hashType: "data1",
  args: "0xtoken01",
};
const LOCK: GuardScript = {
  codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
  hashType: "type",
  args: "0xowner",
};
const POINT_A: GuardOutPoint = { txHash: `0x${"a".repeat(64)}`, index: 0 };
const POINT_B: GuardOutPoint = { txHash: `0x${"b".repeat(64)}`, index: 1 };

function input(point: GuardOutPoint, type: GuardScript | null, capacity = "200"): ResolvedInput {
  return { outPoint: point, capacity, lock: LOCK, type, outputData: type ? "0x1234" : "0x" };
}

function output(type: GuardScript | null, capacity = "200", data = "0x1234"): ProposedOutput {
  return { capacity, lock: LOCK, type, outputData: data };
}

describe("Burn Guard — asset preservation invariant", () => {
  it("passes when a Spore input carries its type script into an output", () => {
    const result = guardTransaction([input(POINT_A, SPORE)], [output(SPORE)]);
    expect(result.safe).toBe(true);
    expect(result.preservedAssets).toBe(1);
    expect(result.violations).toHaveLength(0);
  });

  it("catches accidental Spore destruction (fault injection)", () => {
    const result = guardTransaction([input(POINT_A, SPORE)], [output(null)]);
    expect(result.safe).toBe(false);
    expect(result.violations[0]).toMatchObject({ code: "ASSET_BURN", severity: "error" });
    expect(result.violations[0].message).toContain("permanently burn");
  });

  it("catches accidental xUDT destruction (fault injection)", () => {
    const result = guardTransaction([input(POINT_B, XUDT)], [output(null)]);
    expect(result.safe).toBe(false);
    expect(result.violations[0].code).toBe("ASSET_BURN");
  });

  it("detects capacity loss on a preserved asset cell", () => {
    const result = guardTransaction([input(POINT_A, SPORE, "220")], [output(SPORE, "180")]);
    expect(result.safe).toBe(false);
    expect(result.violations.some((v) => v.code === "CAPACITY_LOSS")).toBe(true);
  });

  it("detects output data truncation on an asset cell", () => {
    const result = guardTransaction([input(POINT_A, SPORE)], [output(SPORE, "199", "0x12")]);
    expect(result.violations.some((v) => v.code === "DATA_LOSS")).toBe(true);
  });

  it("blocks frozen outpoints", () => {
    const result = guardTransaction([input(POINT_A, null)], [output(null)], {
      frozenOutPoints: [POINT_A],
    });
    expect(result.safe).toBe(false);
    expect(result.violations[0]).toMatchObject({ code: "FROZEN_OUTPOINT", severity: "error" });
  });

  it("respects an explicit, reasoned override for a deliberate melt", () => {
    const result = guardTransaction([input(POINT_A, SPORE)], [output(null)], {
      overrides: [{ typeScript: { codeHash: SPORE.codeHash }, reason: "Batch Spore melt" }],
    });
    expect(result.safe).toBe(true);
    expect(result.violations[0]).toMatchObject({ code: "ASSET_BURN", overridden: true, severity: "warning" });
  });

  it("rejects an override for a different asset", () => {
    const result = guardTransaction([input(POINT_A, XUDT)], [output(null)], {
      overrides: [{ typeScript: { codeHash: SPORE.codeHash }, reason: "Melt" }],
    });
    expect(result.safe).toBe(false);
  });

  it("rejects capacity inflation", () => {
    const result = guardTransaction([input(POINT_A, null, "100")], [output(null, "150")]);
    expect(result.violations.some((v) => v.code === "CAPACITY_INFLATION")).toBe(true);
  });

  it("warns on unusually high fees", () => {
    const result = guardTransaction([input(POINT_A, null, "100")], [output(null, "80")], {
      maxFeeRatio: 0.1,
    });
    expect(result.safe).toBe(true);
    expect(result.violations.some((v) => v.code === "HIGH_FEE")).toBe(true);
  });

  it("supports the drop-in factory API", () => {
    const inspect = createAssetBurnGuard({ frozenOutPoints: [POINT_B] });
    const result = inspect([input(POINT_A, SPORE)], [output(SPORE)]);
    expect(result.safe).toBe(true);
    const blocked = inspect([input(POINT_B, null)], [output(null)]);
    expect(blocked.safe).toBe(false);
  });
});
