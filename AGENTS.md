# AGENTS.md - System Design Visualizer

**Deployment:** [https://architect-mind.vercel.app/](https://architect-mind.vercel.app/)

## Project Overview

A full-stack system design visualizer with a React frontend (using React Flow) and a Go Gin backend. The app allows users to visually design system architectures and analyze them for best practices.

## Directory Structure

```
├── frontend/            # React + TypeScript + Vite
│   └── src/
│       ├── api/         # API client functions
│       ├── components/  # React components (Canvas, Sidebar, TabBar, SettingsMenu)
│       ├── hooks/       # useCanvasTabs (multi-tab state)
│       ├── nodes/       # Custom React Flow node types
│       ├── edges/       # Custom edge rendering
│       ├── types/       # Shared topology types
│       └── utils/       # Export utilities (Excalidraw, Mermaid, Image, PDF)
├── _cmd/main.go         # Local dev server entry (:8080)
├── api/topology.go      # Vercel serverless entry
├── logic/               # Validation engine (check_*.go) + topology_handler.go
├── model/               # Data models (topology, properties, protocols)
└── docs/RULES.md        # Rule index
```

---

## Build, Lint & Development Commands

| Command | Description |
|---------|-------------|
| `./start-dev.sh` | Start both frontend and backend (Ctrl+C to stop) |

### Frontend (React + TypeScript + Vite)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (localhost:5173) |
| `npm run build` | Build for production (typecheck + Vite build) |
| `npm run lint` | Run ESLint on all files |

### Backend (Go + Gin)

| Command | Description |
|---------|-------------|
| `go run _cmd/main.go` | Run backend server (localhost:8080) |
| `go build ./...` | Build check |
| `go test ./...` | Run all tests |
| `go fmt ./...` | Format Go code |

---

## Code Style Guidelines

- **Keep files small and focused** - Single responsibility per file
- **Functional Components** - React components should be functions
- **Explicit TypeScript types** - Avoid `any`, use interfaces/types
- **Error Handling** - Handle Go errors explicitly; wrap async calls in React with try/catch

---

## Working with this Codebase

### Adding a New Validation Rule

1. Add a new `check_*.go` file in `logic/` (or extend an existing category file)
2. Implement the rule using `model.TopologyContext`
3. Call the rule function in `validate()` within `logic/topology_handler.go`
4. Register the rule ID in `AllRuleNames` (`logic/warning.go`) so the "rules passed" counter stays correct
5. Add corresponding tests in `logic/check_*_test.go` and a row in `docs/RULES.md`

### Adding a New Export Format

1. Create an export utility in `frontend/src/utils/`
2. Register the format in the export view of `frontend/src/components/SettingsMenu.tsx`
