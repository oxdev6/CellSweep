import type { KnownScript, Network } from "./types";

export const CKB_DECIMALS = 8;
export const SHANNONS_PER_CKB = 100_000_000n;

export const BASE_CELL_CAPACITY = 61n;
export const MIN_TRANSACTION_FEE = 0.0001;
export const DEFAULT_FEE_RATE = 0.001;
export const AGGREGATE_OUTPUT_CAPACITY = 142n;
export const MAX_CELLS_PER_BATCH = 100;

const MAINNET_DEP = (txHash: `0x${string}`, index = 0) => ({
  outPoint: { txHash, index },
  depType: "code" as const,
});

export const KNOWN_SCRIPTS: KnownScript[] = [
  {
    id: "nervos-dao",
    name: "Nervos DAO",
    category: "dao",
    codeHash: "0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e",
    hashType: "type",
    networks: ["mainnet", "testnet"],
    description: "Native DAO deposit cell. Capacity is time-locked and must not be swept.",
  },
  {
    id: "spore",
    name: "Spore DOB",
    category: "spore",
    codeHash: "0x4a4dce1df3dffff7f8b2cd7dff7303df3b6150c9788cb75dcf6747247132b9f5",
    hashType: "data1",
    networks: ["mainnet"],
    description: "Spore Protocol digital object. Capacity is recoverable via the melt rule.",
    cellDeps: [MAINNET_DEP("0x96b198fb5ddbd1eed57ed667068f1f1e55d07907b4c0dbd38675a69ea1b69824")],
  },
  {
    id: "spore-legacy",
    name: "Spore DOB (legacy)",
    category: "spore",
    codeHash: "0xcfba73b58b6f30e70caed8a999748781b164ef9a1e218424a6fb55ebf641cb33",
    hashType: "type",
    networks: ["mainnet"],
    description: "Legacy Spore deployment. Melt support depends on the deployed script version.",
  },
  {
    id: "cluster",
    name: "Spore Cluster",
    category: "spore",
    codeHash: "0x7366a61534fa7c7e6225ecc0d828ea3b5366adec2b58206f2ee84995fe030075",
    hashType: "data1",
    networks: ["mainnet"],
    description: "Spore Cluster cell. Clusters are indestructible by design — never included in sweeps.",
    cellDeps: [MAINNET_DEP("0xe464b7fb9311c5e2820e61c99afc615d6b98bdefbe318c34868c010cbd0dc938")],
  },
  {
    id: "xudt",
    name: "xUDT",
    category: "xudt",
    codeHash: "0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95",
    hashType: "data1",
    networks: ["mainnet"],
    description: "Extensible UDT token cell. Zero-balance cells can be safely closed.",
  },
  {
    id: "xudt-testnet",
    name: "xUDT (testnet)",
    category: "xudt",
    codeHash: "0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb",
    hashType: "type",
    networks: ["testnet"],
    description: "Extensible UDT token cell on Meepo testnet.",
  },
  {
    id: "sudt",
    name: "sUDT",
    category: "sudt",
    codeHash: "0x5e7a36a77e68eecc013dfa2fe6a23f3b6c344b04005808694ae6dd45eea4cfd5",
    hashType: "type",
    networks: ["mainnet"],
    description: "Simple UDT token cell.",
  },
  {
    id: "sudt-testnet",
    name: "sUDT (testnet)",
    category: "sudt",
    codeHash: "0xc5e5dcf215925f7ef4dfaf5f4b4f105bc321c02776d6e7d52a1db3fcd9d011a4",
    hashType: "type",
    networks: ["testnet"],
    description: "Simple UDT token cell on Meepo testnet.",
  },
  {
    id: "rgbpp",
    name: "RGB++ Lock",
    category: "rgbpp",
    codeHash: "0xbc6c568a1a0d0a09f6844dc9d74ddb4343c32143ff25f727c59edf4fb72d6936",
    hashType: "type",
    networks: ["mainnet"],
    description: "Bitcoin-bound RGB++ cell. Read-only: requires Bitcoin transaction participation.",
  },
  {
    id: "btc-time-lock",
    name: "BTC Time Lock",
    category: "rgbpp",
    codeHash: "0x70d64497a075bd651e98ac030455ea200637ee325a12ad08aff03f1a117e5a62",
    hashType: "type",
    networks: ["mainnet"],
    description: "RGB++ time-locked cell awaiting Bitcoin confirmations.",
  },
  {
    id: "joyid",
    name: "JoyID Lock",
    category: "other",
    codeHash: "0xd00c84f0ec8fd441c38bc3f87a371f547190f2fcff88e642bc5bf54b9e318323",
    hashType: "type",
    networks: ["mainnet"],
    description: "JoyID account lock script.",
  },
  {
    id: "joyid-testnet",
    name: "JoyID Lock (testnet)",
    category: "other",
    codeHash: "0xd23761b364210735c19c60561d213fb3beae2fd6172743719eff6920e020baac",
    hashType: "type",
    networks: ["testnet"],
    description: "JoyID account lock script on Meepo testnet.",
  },
  {
    id: "omnilock",
    name: "OmniLock",
    category: "other",
    codeHash: "0x9b819793a64463aed77c615d6cb226eea5487ccfc0783043a587254cda2b6f26",
    hashType: "type",
    networks: ["mainnet"],
    description: "OmniLock multi-auth lock script.",
  },
  {
    id: "cota",
    name: "CoTA NFT",
    category: "other",
    codeHash: "0x1122a4fb54697cf2e6e3a96c9d80fd398a936559b90954c6e88eb7ba0cf652df",
    hashType: "type",
    networks: ["mainnet"],
    description: "CoTA aggregated NFT registry cell.",
  },
];

export const RPC_ENDPOINTS: Record<Network, string> = {
  mainnet: "https://mainnet.ckb.dev/rpc",
  testnet: "https://testnet.ckb.dev/rpc",
};

export const NETWORK_LABELS: Record<Network, string> = {
  mainnet: "Mirana Mainnet",
  testnet: "Meepo Testnet",
};

export function getKnownScript(codeHash: string, hashType: string, network?: Network) {
  return KNOWN_SCRIPTS.find(
    (script) =>
      script.codeHash.toLowerCase() === codeHash.toLowerCase() &&
      script.hashType === hashType &&
      (!network || script.networks.includes(network)),
  );
}
