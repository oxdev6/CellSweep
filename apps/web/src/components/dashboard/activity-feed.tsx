"use client";

import { Activity, Flame, Layers, LockKeyhole, ShieldCheck, UnlockKeyhole, Wallet } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAppStore, type ActivityEntry } from "@/lib/store";

const ICONS: Record<ActivityEntry["type"], typeof Wallet> = {
  freeze: LockKeyhole,
  unfreeze: UnlockKeyhole,
  reclaim: Flame,
  consolidate: Layers,
  guard: ShieldCheck,
  wallet: Wallet,
  policy: Activity,
};

export function ActivityFeed() {
  const activity = useAppStore((state) => state.activity);

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Local actions from this session</CardDescription>
        </div>
        <Activity className="size-4 text-muted" />
      </CardHeader>
      <div className="px-5 pb-5">
        {activity.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
            Actions you take will appear here.
          </div>
        ) : (
          <ol className="relative space-y-4 border-l border-border pl-4">
            {activity.slice(0, 6).map((entry) => {
              const Icon = ICONS[entry.type];
              return (
                <li key={entry.id} className="relative">
                  <span className="absolute -left-[25px] top-0 flex size-4 items-center justify-center rounded-full border border-border bg-surface text-muted">
                    <Icon className="size-2.5" />
                  </span>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium">{entry.title}</p>
                    <time className="shrink-0 text-[10px] text-muted">
                      {new Date(entry.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </div>
                  {entry.detail ? (
                    <p className="mt-0.5 truncate font-mono text-[10px] text-muted">{entry.detail}</p>
                  ) : null}
                  {entry.amount ? <p className="mt-0.5 text-[11px] text-brand">{entry.amount} CKB</p> : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Card>
  );
}
