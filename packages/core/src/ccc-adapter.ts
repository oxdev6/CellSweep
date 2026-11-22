import { KNOWN_SCRIPTS, RPC_ENDPOINTS } from "./constants";
import type {
  CellInfo,
  HexString,
  Network,
  RawCell,
  Script,
  WalletProvider,
  WalletSession,
} from "./types";
import { fromShannons, toShannons } from "./utils";

export type { WalletProvider } from "./types";

export type WalletConnectErrorCode =
  | "unsupported-provider"
  | "signer-unavailable"
  | "network-mismatch"
  | "connection-rejected"
  | "connection-failed";

export class WalletConnectError extends Error {
  constructor(
    readonly code: WalletConnectErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "WalletConnectError";
  }
}

export function isWalletProvider(value: string): value is WalletProvider {
  return value === "joyid" || value === "utxo-global" || value === "metamask" || value === "watch-only";
}

export function addressPrefixForNetwork(network: Network): "ckb" | "ckt" {
  return network === "mainnet" ? "ckb" : "ckt";
}

export function addressMatchesNetwork(address: string, network: Network): boolean {
  return address.startsWith(`${addressPrefixForNetwork(network)}1`);
}

export function canWalletSign(session: WalletSession): boolean {
  return session.mode === "live" && session.provider !== "watch-only";
}

export function selectCkbSigner<T extends { type?: string }>(
  infos: Array<{ signer: T }>,
  provider: WalletProvider,
): T {
  const ckb = infos.filter((info) => info.signer.type === "CKB");
  if (!ckb.length) {
    throw new WalletConnectError(
      "signer-unavailable",
      `No CKB signer was returned by ${provider === "joyid" ? "JoyID" : "UTXO Global"}. Select a CKB account in your wallet.`,
    );
  }
  return ckb[0].signer;
}

interface CccScript {
  codeHash: HexString;
  hashType: "type" | "data" | "data1";
  args: HexString;
}

interface CccCell {
  outPoint: { txHash: HexString; index: number };
  cellOutput: { capacity: bigint | number | string; lock: CccScript; type?: CccScript | null };
  outputData: HexString;
  blockNumber?: bigint | number;
}

interface CccSigner {
  connect: () => Promise<void>;
  disconnect?: () => Promise<void>;
  getRecommendedAddress: () => Promise<string>;
  findCells: (...args: unknown[]) => AsyncGenerator<CccCell>;
  sendTransaction: (tx: unknown) => Promise<HexString>;
}

interface CccClient {
  findCells: (
    key: {
      script: CccScript;
      scriptType: "lock";
      scriptSearchMode: "exact";
      withData: boolean;
    },
    order?: "asc" | "desc",
    limit?: number,
  ) => AsyncGenerator<CccCell>;
}

interface DisposableOwner {
  value: unknown;
  dispose(): Promise<void>;
}

export interface BuiltTransaction {
  inputs: Array<{ outPoint: { txHash: HexString; index: number } }>;
  outputs: Array<{ capacity: string; lock: Script; type?: Script | null }>;
  outputsData: HexString[];
  cellDeps: Array<{ outPoint: { txHash: HexString; index: number }; depType: "code" | "depGroup" }>;
}

function describeConnectError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message || "The wallet could not be reached. Check the extension and try again.";
}

function wasRejected(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /reject|declin|cancel|denied|user/i.test(message);
}

export class LiveWallet {
  private truncated = false;

  private constructor(
    readonly session: WalletSession,
    private readonly owner: DisposableOwner,
    private readonly signer: CccSigner,
    private readonly client: CccClient,
    private readonly configuredRpcUrl: string,
  ) {}

  static async connect(
    provider: WalletProvider,
    network: Network,
    options: { rpcUrl?: string; address?: string; appName?: string; icon?: string } = {},
  ): Promise<LiveWallet> {
    if (!isWalletProvider(provider)) {
      throw new WalletConnectError("unsupported-provider", `Unsupported wallet provider: ${provider}`);
    }

    const ccc = await import("@ckb-ccc/core");
    const ClientClass = (
      network === "mainnet" ? ccc.ClientPublicMainnet : ccc.ClientPublicTestnet
    ) as unknown as { open: (config: { urls: string[] }) => DisposableOwner };
    const rpcUrl = options.rpcUrl ?? RPC_ENDPOINTS[network];
    const owner = ClientClass.open({ urls: [rpcUrl] });
    const client = owner.value;
    const preferredNetworks = [
      {
        addressPrefix: addressPrefixForNetwork(network),
        signerType: "CKB",
        network,
      },
    ];
    let signer: CccSigner | undefined;

    try {
      if (provider === "watch-only") {
        if (!options.address?.trim()) {
          throw new WalletConnectError("signer-unavailable", "A CKB address is required for watch-only mode.");
        }
        let parsed: Awaited<ReturnType<typeof ccc.Address.fromString>>;
        try {
          parsed = await ccc.Address.fromString(options.address.trim(), client as never);
        } catch {
          throw new WalletConnectError(
            "network-mismatch",
            `Enter a valid ${addressPrefixForNetwork(network)}1 address for ${network}.`,
          );
        }
        if (parsed.prefix !== addressPrefixForNetwork(network)) {
          throw new WalletConnectError(
            "network-mismatch",
            `That address uses the ${parsed.prefix} prefix but ${network} is selected.`,
          );
        }
        signer = new ccc.SignerCkbScriptReadonly(client as never, parsed.script) as unknown as CccSigner;
      } else if (provider === "joyid") {
        const connector = (await import("@ckb-ccc/joy-id")) as unknown as {
          JoyId: {
            getJoyIdSigners: (
              client: unknown,
              name: string,
              icon: string,
              preferredNetworks?: unknown[],
            ) => Array<{ signer: { type?: string } }>;
          };
        };
        const infos = connector.JoyId.getJoyIdSigners(
          client,
          options.appName ?? "CellSweep",
          options.icon ?? "",
          preferredNetworks,
        );
        signer = selectCkbSigner(infos, provider) as unknown as CccSigner;
      } else if (provider === "metamask") {
        const connector = (await import("@ckb-ccc/eip6963")) as unknown as {
          Eip6963: {
            SignerFactory: new (client: unknown) => {
              subscribeSigners: (
                callback: (
                  signer: CccSigner,
                  detail?: { info: { name: string; rdns: string } },
                ) => unknown,
              ) => () => void;
            };
          };
        };
        const factory = new connector.Eip6963.SignerFactory(client);
        let unsubscribe: (() => void) | undefined;
        try {
          signer = await new Promise<CccSigner>((resolve, reject) => {
            const timer = setTimeout(
              () =>
                reject(
                  new WalletConnectError(
                    "signer-unavailable",
                    "MetaMask was not detected. Install or unlock the extension, then retry.",
                  ),
                ),
              12000,
            );
            unsubscribe = factory.subscribeSigners((candidate, detail) => {
              const isMetaMask = !detail || /metamask/i.test(`${detail.info.name} ${detail.info.rdns}`);
              if (!isMetaMask) return;
              clearTimeout(timer);
              resolve(candidate);
            });
          });
        } finally {
          unsubscribe?.();
        }
      } else {
        const connector = (await import("@ckb-ccc/utxo-global")) as unknown as {
          UtxoGlobal: {
            getUtxoGlobalSigners: (
              client: unknown,
              preferredNetworks?: unknown[],
            ) => Array<{ signer: { type?: string } }>;
          };
        };
        const infos = connector.UtxoGlobal.getUtxoGlobalSigners(client, preferredNetworks);
        signer = selectCkbSigner(infos, provider) as unknown as CccSigner;
      }

      try {
        await signer.connect();
      } catch (error) {
        throw new WalletConnectError(
          wasRejected(error) ? "connection-rejected" : "connection-failed",
          describeConnectError(error),
        );
      }

      const address = await signer.getRecommendedAddress();
      if (!addressMatchesNetwork(address, network)) {
        throw new WalletConnectError(
          "network-mismatch",
          `The wallet returned a ${address.slice(0, 4)} address while ${network} is selected. Switch the wallet network and retry.`,
        );
      }

      const session: WalletSession = { provider, address, network, mode: "live" };
      return new LiveWallet(session, owner, signer, client as unknown as CccClient, rpcUrl);
    } catch (error) {
      if (signer) await signer.disconnect?.().catch(() => undefined);
      await owner.dispose().catch(() => undefined);
      if (error instanceof WalletConnectError) throw error;
      throw new WalletConnectError(
        wasRejected(error) ? "connection-rejected" : "connection-failed",
        describeConnectError(error),
      );
    }
  }

  async disconnect(): Promise<void> {
    await this.signer.disconnect?.().catch(() => undefined);
    await this.owner.dispose().catch(() => undefined);
  }

  get canSign(): boolean {
    return canWalletSign(this.session);
  }

  get truncatedCells(): boolean {
    return this.truncated;
  }

  async fetchCells(limit = 500): Promise<RawCell[]> {
    const cells: RawCell[] = [];
    this.truncated = false;
    const pushCell = (cell: CccCell) => {
      if (cells.length >= limit) return;
      cells.push({
        outPoint: { txHash: cell.outPoint.txHash, index: cell.outPoint.index },
        capacity: fromShannons(BigInt(cell.cellOutput.capacity)),
        lock: {
          codeHash: cell.cellOutput.lock.codeHash,
          hashType: cell.cellOutput.lock.hashType,
          args: cell.cellOutput.lock.args,
        },
        type: cell.cellOutput.type
          ? {
              codeHash: cell.cellOutput.type.codeHash,
              hashType: cell.cellOutput.type.hashType,
              args: cell.cellOutput.type.args,
            }
          : null,
        outputData: cell.outputData,
        blockNumber: cell.blockNumber === undefined ? undefined : Number(cell.blockNumber),
        address: this.session.address,
        source: "live",
      });
    };

    for await (const cell of this.signer.findCells({}, true, "desc", limit)) {
      if (cells.length >= limit) break;
      pushCell(cell);
    }

    if (cells.length === 0) {
      try {
        const ccc = await import("@ckb-ccc/core");
        const parsed = await ccc.Address.fromString(this.session.address, this.client as never);
        for await (const cell of this.client.findCells(
          {
            script: parsed.script as unknown as CccScript,
            scriptType: "lock",
            scriptSearchMode: "exact",
            withData: true,
          },
          "desc",
          limit,
        )) {
          if (cells.length >= limit) break;
          pushCell(cell);
        }
      } catch {
        this.truncated = false;
        return cells;
      }
    }

    this.truncated = cells.length >= limit;
    return cells;
  }

  async send(transaction: BuiltTransaction): Promise<HexString> {
    if (!this.canSign) {
      throw new WalletConnectError("signer-unavailable", "This wallet is watch-only and cannot sign or broadcast.");
    }
    const ccc = await import("@ckb-ccc/core");
    const tx = ccc.Transaction.from({
      inputs: transaction.inputs.map((input) => ({ previousOutput: input.outPoint })),
      outputs: transaction.outputs.map((output) => ({
        capacity: toShannons(output.capacity),
        lock: output.lock,
        ...(output.type ? { type: output.type } : {}),
      })),
      outputsData: transaction.outputsData,
      cellDeps: transaction.cellDeps,
    });
    return this.signer.sendTransaction(tx);
  }

  get rpcUrl(): string {
    return this.configuredRpcUrl;
  }
}

export function buildTransferTransaction(options: {
  inputs: CellInfo[];
  outputs: Array<{ capacity: string; lock: Script; type?: Script | null; data?: HexString }>;
  cellDeps?: BuiltTransaction["cellDeps"];
}): BuiltTransaction {
  const deps = new Map<string, BuiltTransaction["cellDeps"][number]>();
  for (const script of KNOWN_SCRIPTS) {
    for (const dep of script.cellDeps ?? []) {
      deps.set(`${dep.outPoint.txHash}:${dep.outPoint.index}`, dep);
    }
  }
  for (const dep of options.cellDeps ?? []) {
    deps.set(`${dep.outPoint.txHash}:${dep.outPoint.index}`, dep);
  }

  return {
    inputs: options.inputs.map((input) => ({ outPoint: input.outPoint })),
    outputs: options.outputs.map((output) => ({
      capacity: output.capacity,
      lock: output.lock,
      type: output.type ?? null,
    })),
    outputsData: options.outputs.map((output) => output.data ?? "0x"),
    cellDeps: [...deps.values()],
  };
}
