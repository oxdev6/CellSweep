import type { AssetCategory } from "@cell-hygiene/core";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CATEGORY_META } from "@/lib/categories";

export function CategoryBadge({
  category,
  label,
  showDescription = false,
}: {
  category: AssetCategory;
  label?: string;
  showDescription?: boolean;
}) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  const badge = (
    <Badge variant="outline" className="gap-1.5" style={{ color: meta.color, borderColor: `color-mix(in srgb, ${meta.color} 30%, transparent)`, background: meta.bg }}>
      <Icon className="size-3" />
      {label ?? meta.short}
    </Badge>
  );

  if (!showDescription) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{badge}</TooltipTrigger>
      <TooltipContent>{meta.description}</TooltipContent>
    </Tooltip>
  );
}
