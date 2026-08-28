# Task 0.0.1-2 — the scaffolding

One job: give the copied engine the node footing it needs to run headless. Two new files' worth of work, nothing else.

Suggested model: Sonnet 5 — mechanical.

Required reading, in order (confirm at the top of your report):
1. This file, whole.
2. `docs/plans/phase-0.0.1-coldsnap-migration.md`, whole.

Precondition: task 0.0.1-1 landed — `src/` holds the 42-file copy. Assert before starting:

```sh
sha256sum -c docs/plans/task-0.0.1-1-inventory.txt --quiet && echo COPY-OK
```

Must print `COPY-OK`. Anything else stops the task.

## Steps

1. Write `package.json` at the repo root, exactly this content (the engine's modules are ES modules; three.js is the graphics module's one dependency, pinned to coldsnap's version):

```json
{
  "name": "combo-engine",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "dependencies": {
    "three": "0.128.0"
  }
}
```

2. Install. Must exit 0.

```sh
npm install
```

3. The proof: the engine imports and answers in plain node. Must print `engine-ok` followed by a number.

```sh
node --input-type=module -e "const m = await import('./src/engine/core.js'); console.log('engine-ok', typeof m.worldHash === 'function' ? 1 : 0)"
```

## Acceptance

- Step 2 exits 0.
- Step 3 prints `engine-ok 1`.

## Landing

Do NOT commit; the commit rides with task 0.0.1-3. Report the two results and stop. `node_modules/` and `package-lock.json` will exist untracked — leave them; 0.13 handles ignore rules.
