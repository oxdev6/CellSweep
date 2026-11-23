# CellSweep

Non-custodial cell hygiene and coin control for Nervos CKB. CellSweep helps you inspect wallet cells, quarantine cells you want to keep, reclaim capacity from meltable Spore cells and empty token cells, consolidate dust, and check transactions before signing.

## Features

- **Overview** — capacity breakdown by cell category and wallet state.
- **Cell Explorer** — inspect, filter, and freeze cells with a local quarantine policy.
- **Melt & Reclaim** — build batched reclaim plans for Spore melts and empty xUDT/sUDT cells, with fee estimates and warnings.
- **Consolidate** — plan defragmentation of small cells into a single output.
- **Burn Guard** — pre-flight checks for accidental asset burns, unexpected outputs, and capacity loss.
- **Demo and live wallet modes** — explore with mock cells or connect a CKB wallet through `@ckb-ccc`.

## Tech stack

- Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI, Zustand, and Recharts.
- `@cell-hygiene/core` — cell classification, freeze policies, planning, fee estimation, and wallet adapter.
- `@cell-hygiene/guard` — transaction safety checks.
- Vitest for tests and ESLint for linting.

## Getting started

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Build workspace packages and start the web app. |
| `npm run build` | Build workspace packages and the web app. |
| `npm start` | Start the built web app. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Type-check the web app and both packages. |
| `npm test` | Run the Vitest suite. |
| `npm run build:packages` | Build `@cell-hygiene/core` and `@cell-hygiene/guard`. |

## Repository layout

```text
apps/web          Next.js application and UI components
packages/core     Cell classification, freeze policy, planning, and wallet adapter
packages/guard    Transaction burn guard
eslint.config.mjs Workspace ESLint configuration
vitest.config.mts Workspace Vitest configuration
```
