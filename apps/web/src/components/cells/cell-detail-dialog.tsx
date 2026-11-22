"use client";

import type { CellInfo } from "@cell-hygiene/core";
import { Copy, ExternalLink } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CategoryBadge } from "@/components/common/category-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid gap-1 border-b border-border py-2 last:border-0 sm:grid-cols-[110px_1fr]">
      <span className="text-[11px] text-muted">{label}</span>
      <span className={cn("break-all text-xs", mono && "font-mono")}>{value}</span>
    </div>
  );
}

export function CellDetailDialog({
  cell,
  open,
  onOpenChange,
}: {
  cell: CellInfo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!cell) return null;

  async function copy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error("Clipboard unavailable");
    }
  }

  const dataText =
    cell.outputData.length > 180 ? `${cell.outputData.slice(0, 180)}…` : cell.outputData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle>Cell details</DialogTitle>
            <CategoryBadge category={cell.category} />
            {cell.frozen ? <span className="text-[11px] font-medium text-danger">Frozen</span> : null}
          </div>
          <DialogDescription>
            {cell.label} · {cell.capacity} CKB · block {cell.blockNumber?.toLocaleString() ?? "unknown"}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="mb-4 grid grid-cols-3 gap-2">
            <MiniStat label="Capacity" value={`${cell.capacity}`} suffix="CKB" />
            <MiniStat label="Data size" value={`${Math.max(0, (cell.outputData.length - 2) / 2)}`} suffix="bytes" />
            <MiniStat label="Source" value={cell.source === "demo" ? "Demo" : "Live"} />
          </div>

          <Section title="Outpoint">
            <Row label="Transaction hash" value={cell.outPoint.txHash} mono />
            <Row label="Output index" value={String(cell.outPoint.index)} mono />
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => void copy("outpoint", `${cell.outPoint.txHash}:${cell.outPoint.index}`)}>
                {copied === "outpoint" ? "Copied" : <><Copy className="size-3.5" /> Copy outpoint</>}
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a
                  href={`https://explorer.nervos.org/transaction/${cell.outPoint.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="size-3.5" /> Explorer
                </a>
              </Button>
            </div>
          </Section>

          <Section title="Lock script">
            <Row label="Code hash" value={cell.lock.codeHash} mono />
            <Row label="Hash type" value={cell.lock.hashType} mono />
            <Row label="Args" value={cell.lock.args} mono />
          </Section>

          <Section title="Type script">
            {cell.type ? (
              <>
                <Row label="Code hash" value={cell.type.codeHash} mono />
                <Row label="Hash type" value={cell.type.hashType} mono />
                <Row label="Args" value={cell.type.args} mono />
              </>
            ) : (
              <p className="py-2 text-xs text-muted">None — this is a pure capacity cell.</p>
            )}
          </Section>

          <Section title="Cell data">
            <pre className="overflow-x-auto rounded-lg border border-border bg-surface-muted p-3 font-mono text-[10px] leading-relaxed text-muted">
              {dataText || "0x"}
            </pre>
          </Section>

          {cell.asset ? (
            <Section title="Decoded asset">
              <Row label="Protocol" value={cell.asset.protocol ?? "Unknown"} />
              {cell.asset.name ? <Row label="Name" value={cell.asset.name} /> : null}
              {cell.asset.symbol ? <Row label="Symbol" value={cell.asset.symbol} /> : null}
              {cell.asset.amount ? <Row label="Raw amount" value={cell.asset.amount} mono /> : null}
              {cell.asset.status ? <Row label="Status" value={cell.asset.status} /> : null}
            </Section>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{title}</h4>
      {children}
    </div>
  );
}

function MiniStat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted">{label}</p>
      <p className="number-tabular mt-1 text-sm font-semibold">
        {value} {suffix ? <span className="text-[10px] font-normal text-muted">{suffix}</span> : null}
      </p>
    </div>
  );
}
