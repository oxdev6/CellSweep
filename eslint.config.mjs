import nextPlugin from "@next/eslint-plugin-next";
import js from "@eslint/js";
import { globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default tseslint.config(
  globalIgnores([
    "**/.next/**",
    "**/out/**",
    "**/build/**",
    "**/dist/**",
    "node_modules/**",
    "**/next-env.d.ts",
    "**/tsconfig.tsbuildinfo",
  ]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "@next/next": nextPlugin },
    rules: { "@next/next/no-img-element": "warn" },
  },
);
