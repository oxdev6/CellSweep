import { createDemoCells } from "@cell-hygiene/core";
import { NextResponse, type NextRequest } from "next/server";
import { networkFromParam, NO_STORE_HEADERS } from "@/lib/server/helpers";

export const runtime = "nodejs";

export function GET(request: NextRequest) {
  const network = networkFromParam(request.nextUrl.searchParams.get("network"));
  if (!network) {
    return NextResponse.json(
      { error: "Invalid network. Expected 'mainnet' or 'testnet'." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const cells = createDemoCells(network);
  return NextResponse.json(
    { cells, network, count: cells.length, mode: "demo" },
    { headers: NO_STORE_HEADERS },
  );
}
