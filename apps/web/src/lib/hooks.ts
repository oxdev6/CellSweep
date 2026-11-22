"use client";

import { classifyCells, createDemoCells } from "@cell-hygiene/core";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";

let hydration: Promise<void> | null = null;

function hydrateStore(): Promise<void> {
  if (!hydration) {
    hydration = Promise.resolve(useAppStore.persist.rehydrate()).then(() => {
      const state = useAppStore.getState();
      if (state.mode === "live" && !state.session) {
        useAppStore.setState({ mode: "demo", cells: [], selected: [] });
        toast.message("Reconnect required", {
          description: "Live data needs a wallet after a reload. Switched to demo data.",
        });
      }
    });
  }
  return hydration;
}

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let active = true;
    void hydrateStore().then(() => {
      if (active) setHydrated(true);
    });
    return () => {
      active = false;
    };
  }, []);
  return hydrated;
}

export function useCells() {
  const network = useAppStore((state) => state.network);
  const mode = useAppStore((state) => state.mode);
  const session = useAppStore((state) => state.session);
  const wallet = useAppStore((state) => state.wallet);
  const setCells = useAppStore((state) => state.setCells);
  const setLoadingCells = useAppStore((state) => state.setLoadingCells);
  const setCellsError = useAppStore((state) => state.setCellsError);
  const cellsRetryToken = useAppStore((state) => state.cellsRetryToken);
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated) return;
    let active = true;

    async function load() {
      setLoadingCells(true);
      try {
        if (wallet && mode === "live") {
          const raw = await wallet.fetchCells();
          if (active) {
            setCells(classifyCells(raw, { network }));
            if (wallet.truncatedCells) {
              toast.warning("Cell list truncated", {
                description: `Showing the first ${raw.length} cells. Narrow the wallet or use a dedicated indexer for the full set.`,
              });
            }
          }
        } else if (mode === "live") {
          if (active) setCellsError("Connect a wallet to load live cells.");
        } else {
          if (active) setCells(createDemoCells(network));
        }
      } catch (error) {
        if (active) setCellsError(error instanceof Error ? error.message : "Unable to load cells");
      } finally {
        if (active) setLoadingCells(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [
    hydrated,
    network,
    mode,
    session,
    wallet,
    cellsRetryToken,
    setCells,
    setLoadingCells,
    setCellsError,
  ]);
}

export function useFilteredCells() {
  const cells = useAppStore((state) => state.cells);
  const search = useAppStore((state) => state.search);
  const category = useAppStore((state) => state.category);
  const frozen = useAppStore((state) => state.freezePolicy.frozen);

  const frozenKeys = new Set(frozen.map((entry) => `${entry.outPoint.txHash.toLowerCase()}:${entry.outPoint.index}`));
  const query = search.trim().toLowerCase();

  return cells
    .filter((cell) => category === "all" || cell.category === category)
    .filter((cell) => {
      if (!query) return true;
      return (
        cell.outPoint.txHash.toLowerCase().includes(query) ||
        cell.label.toLowerCase().includes(query) ||
        (cell.asset?.name ?? "").toLowerCase().includes(query) ||
        `${cell.outPoint.txHash}:${cell.outPoint.index}`.toLowerCase().includes(query)
      );
    })
    .map((cell) => ({
      ...cell,
      frozen: frozenKeys.has(`${cell.outPoint.txHash.toLowerCase()}:${cell.outPoint.index}`),
    }));
}
