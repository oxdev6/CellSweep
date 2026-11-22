"use client";

import { canWalletSign, NETWORK_LABELS, RPC_ENDPOINTS, shortHash, type Network } from "@cell-hygiene/core";
import { Download, KeyRound, LockKeyhole, Monitor, Settings2, ShieldCheck, Trash2, Upload, Wallet } from "lucide-react";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/page-header";
import { WalletButton } from "@/components/common/wallet-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/lib/store";

export default function SettingsPage() {
  const network = useAppStore((state) => state.network);
  const setNetwork = useAppStore((state) => state.setNetwork);
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);
  const session = useAppStore((state) => state.session);
  const policy = useAppStore((state) => state.freezePolicy);
  const clearFreezePolicy = useAppStore((state) => state.clearFreezePolicy);
  const importFreezePolicy = useAppStore((state) => state.importFreezePolicy);
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  function exportPolicy() {
    const blob = new Blob([JSON.stringify(policy, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "cellsweep-quarantine.json";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Quarantine policy exported");
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      importFreezePolicy(await file.text());
      toast.success("Quarantine policy imported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Invalid policy file");
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Choose your network and data mode, connect a wallet, and manage the local quarantine policy."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Network & data mode</CardTitle>
            <CardDescription>Switching network disconnects live wallets and reloads cells</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Network</Label>
              <Select value={network} onValueChange={(value) => void setNetwork(value as Network)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mainnet">Mainnet</SelectItem>
                  <SelectItem value="testnet">Testnet</SelectItem>
                </SelectContent>
              </Select>
              <p className="font-mono text-[10px] text-muted">{RPC_ENDPOINTS[network]}</p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <Label htmlFor="mode-switch" className="mb-0">Live data</Label>
                <p className="mt-0.5 text-[11px] text-muted">
                  {mode === "demo"
                    ? "Exploring a deterministic local demo cell set"
                    : "Reading real cells from the connected CKB node"}
                </p>
              </div>
              <Switch
                id="mode-switch"
                checked={mode === "live"}
                onCheckedChange={(checked) => void setMode(checked ? "live" : "demo")}
              />
            </div>

            <div className="rounded-xl border border-brand/20 bg-brand-soft p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-brand">
                <ShieldCheck className="size-3.5" /> {NETWORK_LABELS[network]} · {mode === "demo" ? "Demo" : "Live"}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                CellSweep never stores keys. Transaction construction stays in your browser and signing is delegated to your wallet.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wallet connection</CardTitle>
            <CardDescription>JoyID, MetaMask, UTXO Global, or a watch-only address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {session ? (
              <div className="space-y-2 rounded-xl border border-border bg-surface-muted/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-medium">
                    <Wallet className="size-3.5 text-brand" /> Connected
                  </span>
                  <Badge variant="brand">{session.provider}</Badge>
                </div>
                <p className="break-all font-mono text-[11px] text-muted">{session.address}</p>
                <p className="text-[11px] text-muted">
                  {NETWORK_LABELS[session.network]} · {session.mode} mode
                </p>
                {!canWalletSign(session) ? (
                  <p className="rounded-lg border border-amber/25 bg-amber/10 px-2 py-1.5 text-[11px] text-amber">
                    Read-only connection: signing and broadcasting are disabled.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-3">
                <p className="text-xs text-muted">No wallet connected. You can browse in demo mode or connect a real wallet.</p>
                <WalletButton />
              </div>
            )}
            <div className="space-y-2">
              <WalletNote icon={<KeyRound className="size-3.5" />} text="Signing happens inside your wallet. CellSweep cannot move funds on its own." />
              <WalletNote icon={<Monitor className="size-3.5" />} text="Watch-only mode reads cells by RPC and cannot broadcast transactions." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quarantine policy</CardTitle>
            <CardDescription>{policy.frozen.length} frozen outpoint{policy.frozen.length === 1 ? "" : "s"} stored locally</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={exportPolicy}>
                <Download className="size-3.5" /> Export JSON
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Upload className="size-3.5" /> Import JSON
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(event) => void handleImport(event)}
              />
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (!confirmClear) {
                    setConfirmClear(true);
                    return;
                  }
                  clearFreezePolicy();
                  setConfirmClear(false);
                  toast.success("Quarantine policy cleared");
                }}
              >
                <Trash2 className="size-3.5" /> {confirmClear ? "Confirm clear" : "Clear policy"}
              </Button>
            </div>
            {policy.frozen.length > 0 ? (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-surface-muted/50 p-2 font-mono text-[10px]">
                {policy.frozen.map((entry) => (
                  <p key={`${entry.outPoint.txHash}:${entry.outPoint.index}`} className="truncate text-muted">
                    {shortHash(entry.outPoint.txHash, 12, 8)}:{entry.outPoint.index}
                    {entry.reason ? ` · ${entry.reason}` : ""}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">No outpoints are frozen. Use the padlock in Cell Explorer to quarantine a cell.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How protection works</CardTitle>
            <CardDescription>Local-first safeguards applied to every plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SecurityNote
              icon={<LockKeyhole className="size-4" />}
              title="Frozen outpoints"
              text="The planner and Burn Guard refuse to consume any outpoint in your quarantine policy."
            />
            <SecurityNote
              icon={<Settings2 className="size-4" />}
              title="Type-script exclusion"
              text="Consolidation accepts only pure CKB cells with standard lock scripts."
            />
            <SecurityNote
              icon={<ShieldCheck className="size-4" />}
              title="Pre-flight inspection"
              text="Every live transaction is checked for asset burns, capacity loss, and inflation before signing."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function WalletNote({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <p className="flex items-start gap-2 text-[11px] leading-relaxed text-muted">
      <span className="mt-0.5 shrink-0 text-brand">{icon}</span>
      {text}
    </p>
  );
}

function SecurityNote({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-surface-muted/40 p-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">{icon}</span>
      <div>
        <p className="text-xs font-medium">{title}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{text}</p>
      </div>
    </div>
  );
}
