"use client";

import { FlaskConical, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";

export function ModeBadge() {
  const mode = useAppStore((state) => state.mode);
  return mode === "demo" ? (
    <Badge variant="amber" className="gap-1.5">
      <FlaskConical className="size-3" /> Demo data
    </Badge>
  ) : (
    <Badge variant="brand" className="gap-1.5">
      <Radio className="size-3" /> Live chain
    </Badge>
  );
}
