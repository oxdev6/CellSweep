import { RPC_ENDPOINTS } from "@cell-hygiene/core";
import { NextResponse, type NextRequest } from "next/server";
import {
  defaultNetwork,
  hasSuspiciousKeys,
  isNetwork,
  isRecord,
  NO_STORE_HEADERS,
} from "@/lib/server/helpers";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 32 * 1024;
const TIMEOUT_MS = 12_000;

const ALLOWED_METHODS = new Set([
  "get_blockchain_info",
  "get_tip_block_number",
  "get_block",
  "get_block_by_number",
  "get_header",
  "get_header_by_number",
  "get_transaction",
  "get_cellbase_output_capacity_details",
  "get_cells",
  "get_cells_capacity",
  "get_transactions",
  "get_indexer_tip",
  "get_epoch_by_number",
  "estimate_fee_rate",
]);

function errorResponse(error: string, status: number, details?: unknown) {
  return NextResponse.json(
    details === undefined ? { error } : { error, details },
    { status, headers: NO_STORE_HEADERS },
  );
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return errorResponse("Request body exceeds 32KB", 413);
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return errorResponse("Unable to read request body", 400);
  }

  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return errorResponse("Request body exceeds 32KB", 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return errorResponse("Malformed JSON body", 400);
  }

  if (!isRecord(body)) {
    return errorResponse("Request body must be a JSON object", 400);
  }

  if (hasSuspiciousKeys(body)) {
    return errorResponse("Request contains a disallowed secret-like field", 400);
  }

  if (typeof body.method !== "string") {
    return errorResponse("'method' must be a string", 400);
  }

  if (!ALLOWED_METHODS.has(body.method)) {
    return errorResponse(`RPC method '${body.method}' is not allowed`, 403);
  }

  const params = body.params === undefined ? [] : body.params;
  if (!Array.isArray(params)) {
    return errorResponse("'params' must be an array", 400);
  }

  let network = defaultNetwork();
  if (body.network !== undefined) {
    if (!isNetwork(body.network)) {
      return errorResponse("'network' must be 'mainnet' or 'testnet'", 400);
    }
    network = body.network;
  }

  const endpoint =
    network === "testnet"
      ? process.env.CKB_TESTNET_RPC_URL || RPC_ENDPOINTS.testnet
      : process.env.CKB_RPC_URL || RPC_ENDPOINTS.mainnet;

  let upstream: Response;
  try {
    upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: body.method, params }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (cause) {
    return errorResponse(
      "Upstream RPC request failed",
      502,
      cause instanceof Error ? cause.message : String(cause),
    );
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    return errorResponse("Upstream RPC returned invalid JSON", 502, { status: upstream.status });
  }

  if (!upstream.ok) {
    return errorResponse("Upstream RPC returned an error", 502, {
      status: upstream.status,
      body: payload,
    });
  }

  if (isRecord(payload) && payload.error != null) {
    return errorResponse("Upstream RPC returned an error", 502, payload.error);
  }

  const result = isRecord(payload) ? payload.result : payload;
  return NextResponse.json({ result, network, method: body.method }, { headers: NO_STORE_HEADERS });
}
