import { NextResponse } from "next/server";
import { defaultNetwork, NO_STORE_HEADERS } from "@/lib/server/helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "cellsweep",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      network: defaultNetwork(),
    },
    { headers: NO_STORE_HEADERS },
  );
}
