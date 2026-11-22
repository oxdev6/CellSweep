import { NextResponse, type NextRequest } from "next/server";
import { defaultNetwork, isNetwork, isRecord, NO_STORE_HEADERS } from "@/lib/server/helpers";
import {
  getTelemetrySnapshot,
  isTelemetryEvent,
  recordTelemetry,
  sanitizeMetric,
} from "@/lib/server/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getTelemetrySnapshot(), { headers: NO_STORE_HEADERS });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON body" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  if (!isRecord(body) || !isTelemetryEvent(body.event)) {
    return NextResponse.json(
      { error: "Invalid telemetry event" },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  let network = defaultNetwork();
  if (body.network !== undefined) {
    if (!isNetwork(body.network)) {
      return NextResponse.json(
        { error: "'network' must be 'mainnet' or 'testnet'" },
        { status: 400, headers: NO_STORE_HEADERS },
      );
    }
    network = body.network;
  }

  const snapshot = recordTelemetry({
    event: body.event,
    network,
    amount: sanitizeMetric(body.amount),
    count: sanitizeMetric(body.count),
  });

  return NextResponse.json(snapshot, { headers: NO_STORE_HEADERS });
}
