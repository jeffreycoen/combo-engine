// MODULE: registry — the module registry and the standard sockets. One
// table naming every landed module, its seam, and its gate; three socket
// shapes said once instead of by convention. SHAPED: the law is the
// checklist's words; the table is the tree's own truth, proven by its gate
// against the filesystem and the gate table. Pure data plus lookups.

// The seams, per the module pattern: tick (steps state), consume (pure
// calls on demand), draw (renders), sample (answers queries).
export const REGISTRY = {
  market: { seam: "consume", gate: "market" },
  builder: { seam: "consume", gate: "builder" },
  ledger: { seam: "consume", gate: "ledger" },
  weldstress: { seam: "tick", gate: "weldstress" },
  tape: { seam: "consume", gate: "tape" },
  "physics-pb": { seam: "tick", gate: "physics-pb", file: "physics.js" },
  rig: { seam: "consume", gate: "rig" },
  solids: { seam: "sample", gate: "solids" },
  ballistics: { seam: "tick", gate: "ballistics" },
  orders: { seam: "consume", gate: "orders" },
  steering: { seam: "tick", gate: "steering" },
  voxel: { seam: "tick", gate: "voxel" },
  support: { seam: "tick", gate: "support" },
  grapple: { seam: "tick", gate: "grapple" },
  escrow: { seam: "consume", gate: "escrow" },
  wells: { seam: "sample", gate: "wells" },
  determinism: { seam: "consume", gate: "determinism" },
  contract: { seam: "consume", gate: "contract" },
  receipts: { seam: "consume", gate: "receipts" },
  pagekit: { seam: "draw", gate: "pagekit" },
  registry: { seam: "consume", gate: "registry" },
  describe: { seam: "consume", gate: "describe" },
  // carved depot organs, behind their front doors
  sight: { seam: "sample", gate: null },
  wind: { seam: "sample", gate: null },
  lists: { seam: "consume", gate: null },
  orient: { seam: "sample", gate: null },
  route: { seam: "sample", gate: null },
  territory: { seam: "tick", gate: null },
  intel: { seam: "consume", gate: null },
  fog: { seam: "tick", gate: null },
  mines: { seam: "tick", gate: null },
  economy: { seam: "consume", gate: null },
  cards: { seam: "consume", gate: null },
  transports: { seam: "tick", gate: null },
  specs: { seam: "consume", gate: null },
  ai: { seam: "consume", gate: null },
  save: { seam: "consume", gate: null },
  accuracy: { seam: "sample", gate: null },
  mapgen: { seam: "consume", gate: null },
};
export const SEAMS = ["tick", "consume", "draw", "sample"];

// The three standard sockets, stated once. Shapes only — the law each
// socket obeys is its owner's gate.
export const SOCKETS = {
  tickInput: "one command object per tick; defaultTickInput() in the depot api is the template",
  rendererFlags: "the tick's returned flags object; a renderer reads, never writes",
  soundEvents: "the tick's returned events list; consumed once per tick, receipts.receiptLog reads the same list",
};

export function moduleOf(name) { return REGISTRY[name] || null; }
export function modulesBySeam(seam) { return Object.keys(REGISTRY).filter((k) => REGISTRY[k].seam === seam); }
