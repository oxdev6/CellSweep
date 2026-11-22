import { KNOWN_SCRIPTS, type AssetCategory } from "@cell-hygiene/core";
import { NextResponse, type NextRequest } from "next/server";
import { ONE_HOUR_CACHE_HEADERS } from "@/lib/server/helpers";

export const runtime = "nodejs";

interface AssetMetadata {
  codeHash: string;
  name: string;
  category: AssetCategory;
  description: string;
  verified: boolean;
}

const REGISTRY = new Map<string, AssetMetadata>(
  KNOWN_SCRIPTS.map((script) => [
    script.codeHash.toLowerCase(),
    {
      codeHash: script.codeHash,
      name: script.name,
      category: script.category,
      description: script.description,
      verified: true,
    },
  ]),
);

export function GET(request: NextRequest) {
  const rawIds = request.nextUrl.searchParams.get("ids");
  const ids = rawIds
    ? Array.from(new Set(rawIds.split(",").map((id) => id.trim()).filter(Boolean)))
    : [];

  const assets: AssetMetadata[] = ids.length
    ? ids.map(
        (id) =>
          REGISTRY.get(id.toLowerCase()) ?? {
            codeHash: id,
            name: "Unverified asset",
            category: "other",
            description: "Not in the local registry",
            verified: false,
          },
      )
    : Array.from(REGISTRY.values());

  return NextResponse.json({ assets }, { headers: ONE_HOUR_CACHE_HEADERS });
}
