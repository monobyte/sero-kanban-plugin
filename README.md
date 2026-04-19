# @sero-ai/plugin-kanban

Kanban workflow plugin for Sero: a standard Pi extension, a federated React UI,
and a plugin-owned background runtime that watches each open workspace and
advances board state from `.sero/apps/kanban/state.json`.

## Install

Install from GitHub in Sero:

```ts
await window.sero.plugins.install(
  'git:https://github.com/monobyte/sero-kanban-plugin.git'
);
```

Or install from a local checkout:

```ts
await window.sero.plugins.install('/absolute/path/to/sero-kanban-plugin');
```

## Manifest + host contract

This package declares:

- `sero.app.runtime: ./runtime/index.ts`
- `sero.plugin.requiredHostCapabilities`:
  - `appRuntime.background`
  - `appAgent.invokeTool`
  - `tool.cli`
- `sero.plugin.bridgeTools: ["kanban"]`

That means the plugin owns the public `kanban` CLI bridge instead of relying on
`apps/desktop` to hardcode it.

## Runtime expectations

The plugin-owned runtime is the owner for workspace watching and state-driven
workflow orchestration.

Expected environment:

- workspace-scoped state at `<workspace>/.sero/apps/kanban/state.json`
- a normal git-backed workspace for branch/worktree flows
- `gh` authenticated if review/PR actions are used
- the usual Sero workspace runtime services available for command execution,
  dev-server checks, verification, and git helpers

At startup the runtime should:

1. watch the workspace board state file
2. recover stuck cards for the current workspace
3. react to subsequent state changes by running the Kanban orchestrator

## Development

From this plugin repo:

```bash
npm install
npm run typecheck
npm test
npm run build
```

`pnpm` works too if you prefer it.

## Local publish/export smoke test

```bash
node -e "const pkg=require('./package.json'); console.log(pkg.sero.app.runtime, pkg.sero.plugin.bridgeTools)"
```

Then verify the plugin builds and the UI/runtime artifacts exist:

```bash
npm run build
ls dist/ui/remoteEntry.js
```

## Runtime smoke test in Sero

1. Install the plugin from this repo (git or local path).
2. Open a workspace and the Kanban app.
3. Create or move a card into a runtime-driven state such as Planning.
4. Confirm `/tmp/sero-electron.log` shows `[kanban-runtime]` startup / transition logs.
5. Confirm `.sero/apps/kanban/state.json` updates and the UI stays in sync.
