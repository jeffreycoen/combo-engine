# The module pattern

Every module in `src/modules/` has the same five parts. The market module
(`src/modules/market/`) is the minted example; copy its shape.

1. **One surface.** One folder, one entry file, exporting plain functions or
   one maker that takes a single options object and returns a single surface
   object. Nothing global; nothing reached for outside the folder.
2. **A declared seam.** If the module runs against the live world it says
   which hook it implements: `tick(world, dt)`, `consume(events)`,
   `draw(scene, flags)`, or `sample()`. A module of pure functions (like the
   market) declares none.
3. **A contract.** The shape of its inputs written as data, with a `check*`
   function returning every problem at once. Callers check at the door.
4. **A gate.** One headless script in `scripts/` that runs the module a fixed
   distance from a seed and prints PASS/FAIL lines, a count line, and a final
   verdict line, exit 0 on green. The gate is registered in
   `scripts/gate.mjs` and is the module's acceptance forever after.
5. **A clean manifest.** The module imports only from the engine's surfaces
   and its own folder. `src/depot/api.js manifest` maps the wiring.

A module lands when its gate is green and registered. Numbers ratify the
landing; nothing else does.
