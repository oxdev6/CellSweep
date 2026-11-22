import { KNOWN_SCRIPTS, type KnownScript } from "@cell-hygiene/core";
import { NextResponse, type NextRequest } from "next/server";
import { networkFromParam, NO_STORE_HEADERS, ONE_HOUR_CACHE_HEADERS } from "@/lib/server/helpers";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const network = networkFromParam(request.nextUrl.searchParams.get("network"));
  if (!network) {
    return NextResponse.json(
      { error: "Invalid network. Expected 'mainnet' or 'testnet'." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const scripts: KnownScript[] = KNOWN_SCRIPTS.filter((script) => script.networks.includes(network));
  return NextResponse.json({ scripts, count: scripts.length }, { headers: ONE_HOUR_CACHE_HEADERS });
}
