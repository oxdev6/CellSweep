"use client";

import {
  canWalletSign,
  DEMO_ADDRESS_MAINNET,
  DEMO_ADDRESS_TESTNET,
  LiveWallet,
  shortHash,
  WalletConnectError,
  type WalletSession,
} from "@cell-hygiene/core";
import { Check, ChevronDown, ExternalLink, KeyRound, LogOut, Monitor, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import { recordClientTelemetry } from "@/lib/telemetry-client";
import { NETWORK_LABELS } from "@cell-hygiene/core";

export function WalletButton() {
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  const network = useAppStore((state) => state.network);
  const session = useAppStore((state) => state.session);
  const setSession = useAppStore((state) => state.setSession);
  const disconnectWallet = useAppStore((state) => state.disconnectWallet);
  const logActivity = useAppStore((state) => state.logActivity);
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [connecting, setConnecting] = useState<string | null>(null);

  async function connectDemo() {
    const demoSession: WalletSession = {
      provider: "watch-only",
      address: network === "mainnet" ? DEMO_ADDRESS_MAINNET : DEMO_ADDRESS_TESTNET,
      network,
      mode: "demo",
    };
    await setSession(demoSession, null);
    logActivity({ type: "wallet", title: "Demo wallet connected", detail: NETWORK_LABELS[network] });
    setOpen(false);
    toast.success("Demo wallet connected", {
      description: "You are exploring a realistic local cell set. Nothing is broadcast.",
    });
  }

  async function connectLive(provider: "joyid" | "metamask" | "utxo-global" | "watch-only") {
    if (provider === "watch-only" && !address.trim()) {
      toast.error("Enter a CKB address first");
      return;
    }
    setConnecting(provider);
    try {
      if (mode === "demo") await setMode("live");
      const wallet = await LiveWallet.connect(provider, network, {
        address: provider === "watch-only" ? address.trim() : undefined,
        appName: "CellSweep",
      });
      await setSession(wallet.session, wallet);
      logActivity({
        type: "wallet",
        title: "Wallet connected",
        detail: `${provider} · ${NETWORK_LABELS[network]} · ${shortHash(wallet.session.address, 8, 6)}`,
      });
      recordClientTelemetry("wallet_connected", network);
      setOpen(false);
      toast.success("Wallet connected", {
        description: `${NETWORK_LABELS[network]} · ${shortHash(wallet.session.address, 12, 8)}`,
      });
    } catch (error) {
      const connectError = error instanceof WalletConnectError ? error : null;
      toast.error(connectError?.code === "connection-rejected" ? "Connection cancelled" : "Connection failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setConnecting(null);
    }
  }

  if (session) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-1.5 sm:flex">
          <span className="size-1.5 rounded-full bg-brand shadow-[0_0_8px_var(--brand)]" />
          <span className="font-mono text-xs text-foreground">{shortHash(session.address, 10, 6)}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted">
            {canWalletSign(session) ? session.provider : `${session.provider} · read only`}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          title="Disconnect"
          onClick={() => {
            void disconnectWallet().then(() => {
              logActivity({ type: "wallet", title: "Wallet disconnected" });
              toast.message("Wallet disconnected");
            });
          }}
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <Wallet className="size-4" />
        <span className="hidden sm:inline">Connect wallet</span>
        <span className="sm:hidden">Connect</span>
        <ChevronDown className="size-3 opacity-60" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Connect to CellSweep</DialogTitle>
            <DialogDescription>
              CellSweep never sees your keys. Connections are handled by the wallet or by read-only RPC.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-2">
            {mode === "demo" ? (
              <>
                <button
                  onClick={() => void connectDemo()}
                  className="flex w-full items-center gap-3 rounded-xl border border-brand/30 bg-brand-soft p-3 text-left transition-colors hover:border-brand"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-brand/15 text-brand">
                    <Check className="size-4" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium">Use demo wallet</span>
                    <span className="block text-xs text-muted">Instant, realistic cells · no RPC required</span>
                  </span>
                </button>
                <p className="px-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Or connect a live wallet
                </p>
              </>
            ) : null}
            <WalletOption
              icon={<Wallet className="size-4" />}
              title="JoyID"
              description="Connect via the JoyID passkey wallet"
              loading={connecting === "joyid"}
              disabled={connecting !== null}
              onClick={() => void connectLive("joyid")}
            />
            <WalletOption
              icon={<KeyRound className="size-4" />}
              title="MetaMask"
              description="Connect via MetaMask (EVM signer)"
              loading={connecting === "metamask"}
              disabled={connecting !== null}
              onClick={() => void connectLive("metamask")}
            />
            <WalletOption
              icon={<ExternalLink className="size-4" />}
              title="UTXO Global"
              description="Connect via the UTXO Global extension"
              loading={connecting === "utxo-global"}
              disabled={connecting !== null}
              onClick={() => void connectLive("utxo-global")}
            />
            <div className="rounded-xl border border-border bg-surface-muted p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Monitor className="size-4 text-muted" /> Watch-only address
              </div>
              <Label htmlFor="watch-address" className="sr-only">
                CKB address
              </Label>
              <Input
                id="watch-address"
                placeholder="ckb1q… or ckt1q…"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="font-mono text-xs"
              />
              <Button
                size="sm"
                variant="secondary"
                className="mt-2 w-full"
                disabled={connecting !== null}
                onClick={() => void connectLive("watch-only")}
              >
                {connecting === "watch-only" ? "Resolving…" : "Track this address"}
              </Button>
            </div>
          </div>

          <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-muted">
            <KeyRound className="mt-0.5 size-3.5 shrink-0" />
            Network is set to {NETWORK_LABELS[network]}. Choosing a live wallet switches the app to Live data
            automatically.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

function WalletOption({
  icon,
  title,
  description,
  onClick,
  loading,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-muted p-3 text-left transition-colors hover:border-brand/50 disabled:opacity-50"
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-surface-elevated text-foreground">
        {icon}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted">{description}</span>
      </span>
      {loading ? <span className="text-xs text-muted">Opening…</span> : null}
    </button>
  );
}
