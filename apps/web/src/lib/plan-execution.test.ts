import type { CellInfo, LiveWallet } from "@cell-hygiene/core";
import { describe, expect, it, vi } from "vitest";
import { executePlan } from "./plan-execution";

const lock = { codeHash: "0x" + "0".repeat(64), hashType: "type" as const, args: "0x" };
const outputs = [{ capacity: "1", lock, type: null, outputData: "0x" as const }];
const cells = [{} as CellInfo];

function wallet(provider: "joyid" | "watch-only"): LiveWallet {
  return {
    session: { provider, address: "ckb1qexample", network: "mainnet", mode: "live" },
    send: vi.fn().mockResolvedValue("0xhash"),
  } as unknown as LiveWallet;
}

describe("executePlan", () => {
  it("simulates without a wallet in demo mode", async () => {
    await expect(
      executePlan({ mode: "demo", wallet: null, cells, outputs, policy: { frozen: [] } as never }),
    ).resolves.toBeNull();
  });

  it("requires a wallet in live mode", async () => {
    await expect(
      executePlan({ mode: "live", wallet: null, cells, outputs, policy: { frozen: [] } as never }),
    ).rejects.toThrow(/Connect a wallet/);
  });

  it("refuses to sign with a watch-only wallet", async () => {
    const signingWallet = wallet("watch-only");
    await expect(
      executePlan({ mode: "live", wallet: signingWallet, cells, outputs, policy: { frozen: [] } as never }),
    ).rejects.toThrow(/watch-only/);
    expect(signingWallet.send).not.toHaveBeenCalled();
  });
});
