# CLAUDE.md

ArchitectMind is a system design visualizer with a React Flow canvas and a Go Gin backend for architecture validation.

**Deployment:** [https://architect-mind.vercel.app/](https://architect-mind.vercel.app/)

**PWA deployment rules:** Never use Vercel Instant Rollback to a deployment from before the PWA — its `/sw.js` is rewritten to `index.html`, so users stay on the cached version; revert and redeploy instead. To remove the PWA, first deploy `VitePWA({ selfDestroying: true })` and wait before removing the plugin. Keep `POST /api/topology` compatible with the previous frontend, because installed apps can keep running an older version.

## Commands

### Backend (Go + Gin)

- `go run _cmd/main.go` - Start server on :8080
- `go build ./...` - Build check
- `go test ./...` - Run all tests

### Frontend (React + Vite + TypeScript)

- `cd frontend && npm install` - Install dependencies
- `cd frontend && npm run dev` - Dev server on :5173
- `cd frontend && npm run build` - Type-check and bundle
- `cd frontend && npm run lint` - ESLint
- `cd frontend && npm test` - Vitest unit tests
- `cd frontend && npm run test:coverage` - Unit tests with the 80% coverage threshold
- `cd frontend && npm run test:e2e` - Playwright regression suite on the production build (Chromium with and without a service worker, and WebKit; API mocked)
- `cd frontend && E2E_REAL_BACKEND=1 npx playwright test --project=real-backend` - Smoke test against the Go backend (port 8080 must be free)

## Architecture

- **Analysis**: `POST /api/topology` sends nodes/edges (plus optional system params) to the backend. Triggered automatically from `Canvas.tsx` with an 800ms debounce whenever nodes or params change — there is no manual Analyze button.
- **Backend Entry Points**: `_cmd/main.go` for local dev; `api/topology.go` for the Vercel serverless function. Both route to `logic.PostTopology`.
- **Validation Rules**: Implemented in `logic/check_*.go`. 45 rules covering Availability, Performance, Security, Observability, and Capacity Planning. The canonical list lives in `logic.AllRuleNames` (`logic/warning.go`) and is documented in `docs/RULES.md`.
- **Frontend State**: Managed in `Canvas.tsx` (nodes, edges, system params) with undo/redo history. Multi-tab support via `useCanvasTabs`, which restores every tab from localStorage (`architectmind:workspace`) and saves changes through `src/persistence/` and `useWorkspacePersistence` (500 ms debounce, writes only when the workspace changed). Sidebar visibility and theme live in `App.tsx`.
- **PWA**: `vite-plugin-pwa` (prompt mode) precaches the build and the self-hosted Caveat font; `PwaUpdatePrompt` asks before activating a new version, and auto analysis pauses while offline.
- **Export**: Utilities in `src/utils/` for Excalidraw, Image, Mermaid, and PDF, wired up in `SettingsMenu.tsx`.
- **Presets**: Basic, Twitter, YouTube, and Google architectures under the Demo dropdown in the canvas toolbar.
- **Editing**: Duplicate (Shift+drag), Merge/Split of role-based nodes, copy/paste, select all, undo/redo — all keyboard-driven in `Canvas.tsx`.

## E2E Regression Baseline

- `frontend/e2e/` characterizes the existing desktop behavior. Do not edit these tests to make a change pass unless the change is listed in §9.3 of `docs/superpowers/specs/2026-09-13-pwa-canvas-persistence-design.md`, and explain it in the commit message.
- Snapshot and screenshot baselines are generated on macOS (`*-darwin.*`). Regenerate them with `npx playwright test --update-snapshots` only for intentional changes, and review the new files before committing.
- First-time setup: `cd frontend && npx playwright install chromium webkit`.
- The suite builds the app and starts its own `vite preview` on port 4173 and never reuses an existing server, so stop anything else listening on 4173 first.
- The hand-drawn font (Caveat) is self-hosted through `@fontsource-variable/caveat` and precached by the service worker, so the suite does not need network access for fonts.

## Adding Features

- **New Component**: Update `model/topology.go`, `model/properties.go`, `frontend/src/types/topology.ts`, and `frontend/src/nodes/nodeConfig.ts`.
- **New Rule**: Add `check_newrule.go` in `logic/`, register in `logic/topology_handler.go`, and add a test.
