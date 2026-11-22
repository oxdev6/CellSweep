import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-border bg-surface-muted text-foreground",
        brand: "border-brand/25 bg-brand-soft text-brand",
        accent: "border-accent/25 bg-accent/10 text-accent",
        amber: "border-amber/25 bg-amber/10 text-amber",
        danger: "border-danger/25 bg-danger/10 text-danger",
        outline: "border-border-strong bg-transparent text-muted",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
