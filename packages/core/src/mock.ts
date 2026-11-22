import { classifyCells } from "./classifier";
import type { AssetInfo, CellInfo, HexString, Network, RawCell, Script } from "./types";

const SPORE_MAINNET = "0x4a4dce1df3dffff7f8b2cd7dff7303df3b6150c9788cb75dcf6747247132b9f5";
const CLUSTER_MAINNET = "0x7366a61534fa7c7e6225ecc0d828ea3b5366adec2b58206f2ee84995fe030075";
const XUDT_MAINNET = "0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95";
const DAO = "0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e";
const RGBPP = "0xbc6c568a1a0d0a09f6844dc9d74ddb4343c32143ff25f727c59edf4fb72d6936";
const OWNER_LOCK = "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8";
const UNKNOWN_TYPE = "0x8f7b1c2d3e4f5061728394a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f9";

export const DEMO_ADDRESS_MAINNET =
  "ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsv6ms6x8w0f4lq5nf5h4u8c4u7c93w9n3k2m7q6f8t7x";
export const DEMO_ADDRESS_TESTNET =
  "ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsv6ms6x8w0f4lq5nf5h4u8c4u7c93w9n3k2m7q6f8t7x";

function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function txHash(seed: number): HexString {
  const random = seeded(seed);
  let result = "0x";
  for (let i = 0; i < 64; i += 1) {
    result += Math.floor(random() * 16).toString(16);
  }
  return result as HexString;
}

function lock(args: string) {
  return { codeHash: OWNER_LOCK as HexString, hashType: "type" as const, args: args as HexString };
}

function typeScript(codeHash: string, hashType: "type" | "data1", args: string) {
  return { codeHash: codeHash as HexString, hashType, args: args as HexString };
}

function art(seed: number, label: string): string {
  const random = seeded(seed);
  const hues = [168, 190, 262, 312, 36, 12, 208, 142];
  const hue = hues[seed % hues.length];
  const hue2 = (hue + 40 + Math.floor(random() * 40)) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 80% 52%)"/><stop offset="1" stop-color="hsl(${hue2} 85% 38%)"/></linearGradient></defs><rect width="200" height="200" rx="24" fill="url(#g)"/><circle cx="${40 + random() * 120}" cy="${40 + random() * 120}" r="${20 + random() * 50}" fill="rgba(255,255,255,.14)"/><circle cx="${40 + random() * 120}" cy="${40 + random() * 120}" r="${10 + random() * 30}" fill="rgba(0,0,0,.12)"/><text x="18" y="182" font-family="monospace" font-size="20" fill="rgba(255,255,255,.9)">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function utf8ToHex(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function udtData(amount: bigint): HexString {
  let hex = "";
  let value = amount;
  for (let i = 0; i < 16; i += 1) {
    hex += (value & 0xffn).toString(16).padStart(2, "0");
    value >>= 8n;
  }
  return `0x${hex}` as HexString;
}

export function createDemoCells(network: Network = "mainnet"): CellInfo[] {
  const random = seeded(20261117);
  const address = network === "mainnet" ? DEMO_ADDRESS_MAINNET : DEMO_ADDRESS_TESTNET;
  const raw: RawCell[] = [];
  const metadata: Record<string, Partial<AssetInfo>> = {};
  let counter = 0;

  const push = (cell: {
    capacity: string;
    type: Script | null;
    lock?: Script;
    outputData?: HexString;
    address?: string;
  }) => {
    counter += 1;
    const outPoint = { txHash: txHash(counter * 7919), index: counter % 4 };
    raw.push({
      outPoint,
      lock: lock(`0x${counter.toString(16).padStart(40, "0")}`),
      outputData: cell.outputData ?? "0x",
      blockNumber: 12_480_000 + Math.floor(random() * 8000),
      address,
      source: "demo",
      ...cell,
    });
    return outPoint;
  };

  for (const capacity of [412, 288, 176, 94, 61, 233, 147, 82, 61, 318, 129, 74]) {
    push({ capacity: capacity.toString(), type: null });
  }

  const dobs = [
    { name: "Mirana #014", collection: "Mirana Pass", spam: false },
    { name: "Pixel Koi", collection: "CKB Arts", spam: false },
    { name: "Genesis Glyph", collection: "Genesis", spam: false },
    { name: "Airdrop #8821", collection: "Unsolicited", spam: true },
    { name: "Airdrop #9934", collection: "Unsolicited", spam: true },
    { name: "Airdrop #1170", collection: "Unsolicited", spam: true },
  ];
  dobs.forEach((dob, index) => {
    const point = push({
      capacity: (dob.spam ? 161 + Math.floor(random() * 20) : 221 + Math.floor(random() * 80)).toString(),
      type: typeScript(SPORE_MAINNET, "data1", `0x${(index + 1).toString(16).padStart(64, "0")}`),
      outputData: `0x${utf8ToHex(`image/png;charset=utf-8${dob.name}`)}`,
      address,
    });
    metadata[`${point.txHash}:${point.index}`] = {
      name: dob.name,
      collection: dob.collection,
      image: dob.spam ? undefined : art(index + 1, `#${String(index + 1).padStart(2, "0")}`),
    };
  });

  push({
    capacity: "1000",
    type: typeScript(CLUSTER_MAINNET, "data1", `0x${"3".repeat(64)}`),
    outputData: `0x${utf8ToHex("Cluster: Mirana Pass")}`,
    address,
  });

  for (let index = 0; index < 5; index += 1) {
    push({
      capacity: (142 + Math.floor(random() * 12)).toString(),
      type: typeScript(XUDT_MAINNET, "data1", `0x${(10 + index).toString(16).padStart(64, "0")}`),
      outputData: udtData(0n),
      address,
    });
  }

  for (const [index, amount] of [12500n, 842n].entries()) {
    const point = push({
      capacity: (286 + index * 40).toString(),
      type: typeScript(XUDT_MAINNET, "data1", `0x${(30 + index).toString(16).padStart(64, "0")}`),
      outputData: udtData(amount),
      address,
    });
    metadata[`${point.txHash}:${point.index}`] = {
      name: index === 0 ? "NervosDAO Token" : "Game Credit",
      symbol: index === 0 ? "nDAO" : "GC",
      decimals: 8,
    };
  }

  for (let index = 0; index < 2; index += 1) {
    push({
      capacity: (1000 + index * 500).toString(),
      type: typeScript(DAO, "type", `0x${"a".repeat(64)}`),
      outputData: (`0x${(index === 0 ? "0" : "1").repeat(16)}`) as HexString,
      address,
    });
  }

  push({
    capacity: "312",
    lock: { codeHash: RGBPP as HexString, hashType: "type", args: `0x${"b".repeat(64)}` },
    type: typeScript(XUDT_MAINNET, "data1", `0x${"c".repeat(64)}`),
    outputData: udtData(1500n),
    address,
  });

  push({
    capacity: "205",
    type: typeScript(UNKNOWN_TYPE, "type", `0x${"d".repeat(64)}`),
    outputData: "0x1234",
    address,
  });

  return classifyCells(raw, { network, metadata });
}

export const DEMO_METADATA = {
  protocol: "CellSweep Demo",
  version: "1.0.0",
};
