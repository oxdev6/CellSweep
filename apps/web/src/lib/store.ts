"use client";

import type {
  AssetCategory,
  CellInfo,
  FreezePolicy,
  Network,
  OutPoint,
  WalletSession,
} from "@cell-hygiene/core";
import {
  clearPolicy as resetPolicy,
  createPolicy,
  freezeCell,
  parsePolicy,
  unfreezeCell,
} from "@cell-hygiene/core";
import type { LiveWallet } from "@cell-hygiene/core";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createId, outPointKey } from "@cell-hygiene/core";

export type AppMode = "demo" | "live";

export interface ActivityEntry {
  id: string;
  type: "freeze" | "unfreeze" | "reclaim" | "consolidate" | "guard" | "wallet" | "policy";
  title: string;
  detail?: string;
  amount?: string;
  at: string;
}

interface AppState {
  network: Network;
  mode: AppMode;
  session: WalletSession | null;
  wallet: LiveWallet | null;
  cells: CellInfo[];
  loadingCells: boolean;
  cellsError: string | null;
  cellsRetryToken: number;
  freezePolicy: FreezePolicy;
  selected: string[];
  search: string;
  category: AssetCategory | "all";
  activity: ActivityEntry[];
  setNetwork: (network: Network) => Promise<void>;
  setMode: (mode: AppMode) => Promise<void>;
  setSession: (session: WalletSession | null, wallet?: LiveWallet | null) => Promise<void>;
  disconnectWallet: () => Promise<void>;
  setCells: (cells: CellInfo[]) => void;
  setLoadingCells: (value: boolean) => void;
  setCellsError: (message: string | null) => void;
  reloadCells: () => void;
  setFreezePolicy: (policy: FreezePolicy) => void;
  toggleFreeze: (outPoint: OutPoint, reason?: string) => void;
  clearFreezePolicy: () => void;
  importFreezePolicy: (json: string) => void;
  toggleSelected: (key: string) => void;
  selectMany: (keys: string[]) => void;
  clearSelection: () => void;
  setSearch: (value: string) => void;
  setCategory: (value: AssetCategory | "all") => void;
  logActivity: (entry: Omit<ActivityEntry, "id" | "at">) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      network: "mainnet",
      mode: "demo",
      session: null,
      wallet: null,
      cells: [],
      loadingCells: false,
      cellsError: null,
      cellsRetryToken: 0,
      freezePolicy: createPolicy(),
      selected: [],
      search: "",
      category: "all",
      activity: [],
      setNetwork: async (network) => {
        await get().disconnectWallet();
        set({ network, cells: [], selected: [], cellsError: null });
      },
      setMode: async (mode) => {
        await get().disconnectWallet();
        set({ mode, cells: [], selected: [], cellsError: null });
      },
      setSession: async (session, wallet = null) => {
        const previous = get().wallet;
        if (previous && previous !== wallet) await previous.disconnect().catch(() => undefined);
        set({ session, wallet, cells: [], selected: [], cellsError: null });
      },
      disconnectWallet: async () => {
        const wallet = get().wallet;
        if (wallet) await wallet.disconnect().catch(() => undefined);
        set({ session: null, wallet: null, cells: [], selected: [], cellsError: null });
      },
      setCells: (cells) => set({ cells, cellsError: null }),
      setLoadingCells: (loadingCells) => set({ loadingCells }),
      setCellsError: (cellsError) => set({ cellsError, loadingCells: false }),
      reloadCells: () =>
        set((state) => ({ cellsRetryToken: state.cellsRetryToken + 1, cellsError: null })),
      setFreezePolicy: (freezePolicy) => set({ freezePolicy }),
      toggleFreeze: (outPoint, reason) => {
        const policy = get().freezePolicy;
        const isFrozen = policy.frozen.some(
          (entry) => outPointKey(entry.outPoint) === outPointKey(outPoint),
        );
        const next = isFrozen ? unfreezeCell(policy, outPoint) : freezeCell(policy, outPoint, reason);
        set({ freezePolicy: next });
        get().logActivity({
          type: isFrozen ? "unfreeze" : "freeze",
          title: isFrozen ? "Cell unfrozen" : "Cell frozen",
          detail: `${outPoint.txHash.slice(0, 10)}…:${outPoint.index}`,
        });
      },
      clearFreezePolicy: () => {
        set({ freezePolicy: resetPolicy(get().freezePolicy) });
        get().logActivity({ type: "policy", title: "Quarantine cleared" });
      },
      importFreezePolicy: (json) => {
        const policy = parsePolicy(json);
        set({ freezePolicy: policy });
        get().logActivity({ type: "policy", title: "Quarantine policy imported", detail: `${policy.frozen.length} rules` });
      },
      toggleSelected: (key) =>
        set((state) => ({
          selected: state.selected.includes(key)
            ? state.selected.filter((item) => item !== key)
            : [...state.selected, key],
        })),
      selectMany: (keys) =>
        set((state) => ({ selected: [...new Set([...state.selected, ...keys])] })),
      clearSelection: () => set({ selected: [] }),
      setSearch: (search) => set({ search }),
      setCategory: (category) => set({ category }),
      logActivity: (entry) =>
        set((state) => ({
          activity: [{ ...entry, id: createId("event"), at: new Date().toISOString() }, ...state.activity].slice(0, 40),
        })),
    }),
    {
      name: "cellsweep-state-v1",
      skipHydration: true,
      partialize: (state) => ({
        network: state.network,
        mode: state.mode,
        freezePolicy: state.freezePolicy,
        activity: state.activity,
      }),
    },
  ),
);
