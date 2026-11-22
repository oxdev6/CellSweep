import { describe, expect, it } from "vitest";
import {
  LiveWallet,
  addressMatchesNetwork,
  addressPrefixForNetwork,
  canWalletSign,
  isWalletProvider,
  selectCkbSigner,
  WalletConnectError,
} from "./ccc-adapter";

describe("wallet connection helpers", () => {
  it("accepts only known providers", () => {
    expect(isWalletProvider("joyid")).toBe(true);
    expect(isWalletProvider("utxo-global")).toBe(true);
    expect(isWalletProvider("metamask")).toBe(true);
    expect(isWalletProvider("watch-only")).toBe(true);
    expect(isWalletProvider("phantom")).toBe(false);
  });

  it("maps networks to address prefixes", () => {
    expect(addressPrefixForNetwork("mainnet")).toBe("ckb");
    expect(addressPrefixForNetwork("testnet")).toBe("ckt");
    expect(addressMatchesNetwork("ckb1qzexample", "mainnet")).toBe(true);
    expect(addressMatchesNetwork("ckt1qzexample", "mainnet")).toBe(false);
    expect(addressMatchesNetwork("ckt1qzexample", "testnet")).toBe(true);
  });

  it("allows signing only for live non-watch-only sessions", () => {
    expect(canWalletSign({ provider: "joyid", address: "ckb1q", network: "mainnet", mode: "live" })).toBe(true);
    expect(canWalletSign({ provider: "utxo-global", address: "ckb1q", network: "mainnet", mode: "live" })).toBe(true);
    expect(canWalletSign({ provider: "metamask", address: "ckb1q", network: "mainnet", mode: "live" })).toBe(true);
    expect(canWalletSign({ provider: "watch-only", address: "ckb1q", network: "mainnet", mode: "live" })).toBe(false);
    expect(canWalletSign({ provider: "watch-only", address: "ckb1q", network: "mainnet", mode: "demo" })).toBe(false);
  });

  it("selects only CKB signers", () => {
    const signer = { type: "CKB" };
    const infos = [{ signer: { type: "EVM" } }, { signer }, { signer: { type: "BTC" } }];
    expect(selectCkbSigner(infos, "joyid")).toBe(signer);

    expect(() => selectCkbSigner([{ signer: { type: "EVM" } }], "utxo-global")).toThrowError(WalletConnectError);
  });

  it("exposes a stable error code", () => {
    const error = new WalletConnectError("network-mismatch", "wrong network");
    expect(error.code).toBe("network-mismatch");
    expect(error.name).toBe("WalletConnectError");
  });

  it("falls back to direct RPC scanning when the signer yields no cells", async () => {
    const ccc = await import("@ckb-ccc/core");
    const script = {
      codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
      hashType: "type",
      args: "0x4a336470564d07ca7059b7980481c2d59809d637",
    } as const;
    const cell = {
      outPoint: { txHash: `0x${"ab".repeat(32)}`, index: 0 },
      cellOutput: { capacity: 10000000000n, lock: script, type: null },
      outputData: "0x",
    };
    const owner = ccc.ClientPublicMainnet.open();
    const client = owner.value as unknown as {
      findCells: () => AsyncGenerator<typeof cell>;
    };
    client.findCells = async function* () {
      yield cell;
    };
    const address = ccc.Address.fromScript(script, client as never).toString();
    const wallet = Object.create(LiveWallet.prototype) as LiveWallet;
    Object.assign(wallet, {
      session: { provider: "metamask", address, network: "mainnet", mode: "live" },
      owner: { dispose: async () => undefined },
      signer: {
        connect: async () => undefined,
        getRecommendedAddress: async () => address,
        findCells: async function* () {},
        sendTransaction: async () => `0x${"cd".repeat(32)}`,
      },
      client,
      configuredRpcUrl: "https://example.invalid/rpc",
      truncated: false,
    });

    const cells = await wallet.fetchCells(10);
    expect(cells).toHaveLength(1);
    expect(cells[0].outPoint.txHash).toBe(cell.outPoint.txHash);
    await owner.dispose();
  }, 20000);
});
