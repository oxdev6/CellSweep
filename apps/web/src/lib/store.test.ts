import type { LiveWallet } from "@cell-hygiene/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "./store";

function fakeWallet(): LiveWallet {
  return {
    session: { provider: "joyid", address: "ckb1qexample", network: "mainnet", mode: "live" },
    disconnect: vi.fn().mockResolvedValue(undefined),
  } as unknown as LiveWallet;
}

beforeEach(() => {
  useAppStore.setState({
    network: "mainnet",
    mode: "live",
    session: null,
    wallet: null,
    cells: [],
    cellsError: null,
    cellsRetryToken: 0,
    selected: [],
  });
});

describe("wallet session lifecycle", () => {
  it("disconnects and clears the session when the network changes", async () => {
    const wallet = fakeWallet();
    useAppStore.setState({ session: wallet.session, wallet });

    await useAppStore.getState().setNetwork("testnet");

    expect(wallet.disconnect).toHaveBeenCalledOnce();
    expect(useAppStore.getState()).toMatchObject({
      network: "testnet",
      session: null,
      wallet: null,
      cells: [],
    });
  });

  it("disconnects and clears the session when the mode changes", async () => {
    const wallet = fakeWallet();
    useAppStore.setState({ session: wallet.session, wallet });

    await useAppStore.getState().setMode("demo");

    expect(wallet.disconnect).toHaveBeenCalledOnce();
    expect(useAppStore.getState()).toMatchObject({ mode: "demo", session: null, wallet: null });
  });

  it("disconnects a replaced wallet when a new session is set", async () => {
    const previous = fakeWallet();
    const next = fakeWallet();
    useAppStore.setState({ session: previous.session, wallet: previous });

    await useAppStore.getState().setSession(next.session, next);

    expect(previous.disconnect).toHaveBeenCalledOnce();
    expect(useAppStore.getState().wallet).toBe(next);
  });

  it("retries cell loading after an error", () => {
    useAppStore.setState({ cellsError: "RPC down", cellsRetryToken: 2 });
    useAppStore.getState().reloadCells();
    expect(useAppStore.getState()).toMatchObject({ cellsError: null, cellsRetryToken: 3 });
  });
});
