import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  suffix,
  hint,
  icon,
  accent = "var(--brand)",
  className,
}: {
  label: string;
  value: ReactNode;
  suffix?: string;
  hint?: ReactNode;
  icon?: ReactNode;
  accent?: string;
  className?: string;
}) {
  return (
    <Card className={cn("relative overflow-hidden p-5", className)}>
      <div
        className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full opacity-15 blur-2xl"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="number-tabular text-2xl font-semibold tracking-tight">{value}</span>
            {suffix ? <span className="text-xs font-medium text-muted">{suffix}</span> : null}
          </div>
          {hint ? <div className="text-xs text-muted">{hint}</div> : null}
        </div>
        {icon ? (
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg"
            style={{ color: accent, background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
