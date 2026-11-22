import type { Network } from "@cell-hygiene/core";

export type ClientTelemetryEvent =
  | "wallet_connected"
  | "capacity_reclaimed"
  | "cells_consolidated"
  | "guard_blocked"
  | "plan_executed";

export function recordClientTelemetry(
  event: ClientTelemetryEvent,
  network: Network,
  metrics: { amount?: number; count?: number } = {},
): void {
  void fetch("/api/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, network, ...metrics }),
  }).catch(() => undefined);
}
