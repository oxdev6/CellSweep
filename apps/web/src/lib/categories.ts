import type { AssetCategory } from "@cell-hygiene/core";
import {
  Banknote,
  Box,
  Coins,
  Image as ImageIcon,
  Landmark,
  LockKeyhole,
  Network,
  type LucideIcon,
} from "lucide-react";

export interface CategoryMeta {
  label: string;
  short: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

export const CATEGORY_META: Record<AssetCategory, CategoryMeta> = {
  liquid: {
    label: "Free Liquid CKB",
    short: "Liquid",
    description: "Pure capacity cells with no type script. Freely spendable and consolidatable.",
    icon: Coins,
    color: "var(--brand)",
    bg: "var(--brand-soft)",
  },
  spore: {
    label: "Spore DOBs / NFTs",
    short: "Spore",
    description: "On-chain digital objects with recoverable storage capacity.",
    icon: ImageIcon,
    color: "var(--accent)",
    bg: "color-mix(in srgb, var(--accent) 12%, transparent)",
  },
  xudt: {
    label: "xUDT Token Cells",
    short: "xUDT",
    description: "Extensible token cells. Zero-balance cells are reclaimable.",
    icon: Banknote,
    color: "var(--amber)",
    bg: "color-mix(in srgb, var(--amber) 12%, transparent)",
  },
  sudt: {
    label: "sUDT Token Cells",
    short: "sUDT",
    description: "Simple UDT token cells.",
    icon: Banknote,
    color: "var(--amber)",
    bg: "color-mix(in srgb, var(--amber) 12%, transparent)",
  },
  dao: {
    label: "Nervos DAO",
    short: "DAO",
    description: "Time-locked deposits and withdrawals. Never swept automatically.",
    icon: Landmark,
    color: "var(--sky)",
    bg: "color-mix(in srgb, var(--sky) 12%, transparent)",
  },
  rgbpp: {
    label: "RGB++ / Complex Locks",
    short: "RGB++",
    description: "Bitcoin-bound cells isolated as read-only for safety.",
    icon: Network,
    color: "var(--copper)",
    bg: "color-mix(in srgb, var(--copper) 12%, transparent)",
  },
  other: {
    label: "Other Type Scripts",
    short: "Other",
    description: "Unrecognized or aggregated asset cells requiring manual review.",
    icon: Box,
    color: "var(--muted)",
    bg: "var(--surface-muted)",
  },
};

export const FROZEN_META = {
  label: "Frozen / Quarantined",
  short: "Frozen",
  description: "Blocked by the local quarantine policy.",
  icon: LockKeyhole,
  color: "var(--danger)",
  bg: "color-mix(in srgb, var(--danger) 12%, transparent)",
};

export const CATEGORY_ORDER: AssetCategory[] = [
  "liquid",
  "spore",
  "xudt",
  "sudt",
  "dao",
  "rgbpp",
  "other",
];

export function categoryColor(category: AssetCategory) {
  return CATEGORY_META[category].color;
}
