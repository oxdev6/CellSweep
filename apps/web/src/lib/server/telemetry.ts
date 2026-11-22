import type { Network } from "@cell-hygiene/core";

export const TELEMETRY_EVENTS = [
  "wallet_connected",
  "capacity_reclaimed",
  "cells_consolidated",
  "guard_blocked",
  "plan_executed",
] as const;

export type TelemetryEvent = (typeof TELEMETRY_EVENTS)[number];

export interface TelemetryAggregate {
  totalEvents: number;
  byEvent: Record<TelemetryEvent, number>;
  byNetwork: Record<Network, number>;
  totalCapacityReclaimed: number;
  totalCellsConsolidated: number;
  startedAt: string;
}

export interface TelemetryInput {
  event: TelemetryEvent;
  network: Network;
  amount: number;
  count: number;
}

const MAX_METRIC = 1e9;

const aggregate: TelemetryAggregate = {
  totalEvents: 0,
  byEvent: {
    wallet_connected: 0,
    capacity_reclaimed: 0,
    cells_consolidated: 0,
    guard_blocked: 0,
    plan_executed: 0,
  },
  byNetwork: { mainnet: 0, testnet: 0 },
  totalCapacityReclaimed: 0,
  totalCellsConsolidated: 0,
  startedAt: new Date().toISOString(),
};

export function isTelemetryEvent(value: unknown): value is TelemetryEvent {
  return typeof value === "string" && (TELEMETRY_EVENTS as readonly string[]).includes(value);
}

export function sanitizeMetric(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.min(value, MAX_METRIC);
}

export function getTelemetrySnapshot(): TelemetryAggregate {
  return {
    ...aggregate,
    byEvent: { ...aggregate.byEvent },
    byNetwork: { ...aggregate.byNetwork },
  };
}

export function recordTelemetry(input: TelemetryInput): TelemetryAggregate {
  aggregate.totalEvents += 1;
  aggregate.byEvent[input.event] += 1;
  aggregate.byNetwork[input.network] += 1;

  if (input.event === "capacity_reclaimed") {
    aggregate.totalCapacityReclaimed += input.amount;
  }
  if (input.event === "cells_consolidated") {
    aggregate.totalCellsConsolidated += input.count;
  }

  return getTelemetrySnapshot();
}
