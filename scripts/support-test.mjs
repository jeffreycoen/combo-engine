// COMBO-ENGINE — support-test: the support propagation module's gate.
// Twelve checks. Seed 9 drives the one falling cluster; no seed is special.
// The fixture is a post carrying a deck, a rust streak painted on the post,
// a flag hung near the deck, and a floater with nothing under it.
import fs from "node:fs";
import { M, mulberry32 } from "../src/modules/ballistics/ballistics.js";
import { makeVoxWorld } from "../src/modules/voxel/voxel.js";
import { primBox, restsOn, linkDeco, findUnsupported, sweepDeco, primSupported, settleWorld, SUPPORT_TOLERANCES, checkPrim, checkTolerances } from "../src/modules/support/support.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };
const near = (a, b, e) => Math.abs(a - b) < (e || 1e-9);

const mkLevel = () => [
  { id: 'post', c: [0, 0.5, 0], s: [0.2, 1, 0.2], p: 'strut', m: M.steel_thin },
  { id: 'deck', c: [0, 1.1, 0], s: [1, 0.2, 1], p: 'wood', m: M.wood },
  { id: 'rust', c: [0.1, 0.5, 0], s: [0.05, 0.6, 0.05], p: 'strut', m: M.steel_thin, deco: 1 },
  { id: 'flag', c: [0.8, 1.1, 0], s: [0.3, 0.1, 0.02], p: 'wood', m: M.wood, deco: 1 },
  { id: 'floater', c: [5, 3, 0], s: [0.5, 0.5, 0.5], p: 'concrete', m: M.concrete },
  { id: 'ghostwater', c: [0, 0.01, 5], s: [10, 0.02, 1], p: 'chop', m: M.water, ghost: 1 },
];

const SEED = process.env.SEED ? Number(process.env.SEED) : Math.floor(Math.random() * 0x100000000);
console.log(`seeds ${JSON.stringify({ support: SEED })}`);
const rng = mulberry32(SEED);
const roll = (lo, hi) => lo + rng() * (hi - lo);

check("primBox: centre plus and minus half size, both corners",
  (() => { const b = primBox({ c: [1, 2, 3], s: [2, 4, 6] });
    return near(b[0], 0) && near(b[1], 0) && near(b[2], 0) && near(b[3], 2) && near(b[4], 4) && near(b[5], 6); })());

check("restsOn: the deck rests on the post; a box beside it does not; a spanning wall bears too",
  restsOn(primBox({ c: [0, 1.1, 0], s: [1, 0.2, 1] }), primBox({ c: [0, 0.5, 0], s: [0.2, 1, 0.2] })) === true
  && restsOn(primBox({ c: [3, 1.1, 0], s: [1, 0.2, 1] }), primBox({ c: [0, 0.5, 0], s: [0.2, 1, 0.2] })) === false
  && restsOn(primBox({ c: [0, 1.1, 0], s: [1, 0.2, 1] }), primBox({ c: [0, 1.1, 0], s: [0.1, 2, 0.1] })) === true);

{ const L = mkLevel();
  linkDeco(L);
  check("linkDeco: the rust streak hosts on the post it overlaps, the flag on the deck it hangs near",
    L[2].host === 0 && L[3].host === 1);
  check("linkDeco: a far-off decoration gets no host",
    (() => { const L2 = [{ id: 'lone', c: [50, 1, 0], s: [0.1, 0.1, 0.1], deco: 1 }, ...mkLevel()];
      linkDeco(L2); return L2[0].host === -1; })()); }

{ const L = mkLevel();
  check("findUnsupported: only the floater floats — grounded, chained, deco, and ghost prims all stand",
    (() => { const u = findUnsupported(L); return u.length === 1 && L[u[0]].id === 'floater'; })()); }

{ const L = mkLevel();
  L[0].dead = 1;
  const u = findUnsupported(L);
  check("the chain breaks: kill the post and the deck floats",
    u.some((i) => L[i].id === 'deck')); }

{ const a = { id: 'a', c: [10, 2, 0], s: [1, 0.2, 1] };
  const b = { id: 'b', c: [10, 2.2, 0], s: [1, 0.2, 1] };
  const u = findUnsupported([a, b]);
  check("no mutual holding: two stacked floating slabs both fall — support comes from the ground only",
    u.length === 2); }

{ const L = mkLevel();
  linkDeco(L);
  L[0].dead = 1;
  const goneIds = [];
  const n = sweepDeco(L, (pr) => goneIds.push(pr.id));
  check("sweepDeco: the rust goes with its dead post, the flag stays with the living deck",
    n === 1 && goneIds.length === 1 && goneIds[0] === 'rust' && !L[3].dead); }

{ const L = mkLevel();
  linkDeco(L);
  check("primSupported: the deck says yes, the floater says no",
    primSupported(L, L[1]) === true && primSupported(L, L[4]) === false); }

{ const L = mkLevel();
  linkDeco(L);
  const fell = [];
  const n = settleWorld(L, (pr) => fell.push(pr.id));
  check("settleWorld: the floater falls as a body, one piece total, and is dead and gone",
    n === 1 && fell.length === 1 && fell[0] === 'floater' && L[4].dead === 1 && L[4].gone === 1);
  L[0].dead = 1;
  const fell2 = [];
  const n2 = settleWorld(L, (pr) => fell2.push(pr.id));
  check("cascade: with the post dead the deck falls, then the rust and the deck's flag sweep in the same settle",
    n2 === 3 && fell2.length === 1 && fell2[0] === 'deck' && L[2].dead === 1 && L[3].dead === 1); }

{ const SIZES = { concrete: 0.115 };
  const w = makeVoxWorld({ rng: mulberry32(9), sizes: SIZES });
  const L = mkLevel();
  linkDeco(L);
  settleWorld(L, (pr) => w.dropPrimAsCluster(pr));
  const C = w.clusters[0];
  check("composition: the fallen floater leaves as one voxel cluster — 4 x 4 x 4 cells at concrete density",
    w.clusters.length === 1 && C.nc === 64 && near(C.mass, 2400 * (0.5 / 4) ** 3 * 64, 1e-9) && C.x === 5 && C.y === 3); }

{ let ok13 = true;
  for (let i = 0; i < 200; i++) {
    const tol = { ...SUPPORT_TOLERANCES, restBelow: roll(0.05, 0.5), overlap: roll(0.01, 0.3) };
    const post = { c: [0, 0.5, 0], s: [0.2, 1, 0.2] };
    let g; do { g = roll(0, tol.restBelow + 0.3); } while (Math.abs(g - tol.restBelow) < 1e-6);
    const slab = { c: [0, 1 + g + 0.1, 0], s: [1, 0.2, 1] };
    const u = findUnsupported([post, slab], tol);
    const supported = u.indexOf(1) < 0;
    if (supported !== (g <= tol.restBelow)) { ok13 = false; break; }

    let o; do { o = roll(0, 1.2); } while (Math.abs(o - (0.6 + tol.overlap)) < 1e-6);
    const slabO = { c: [o, 1.1, 0], s: [1, 0.2, 1] };
    const u2 = findUnsupported([post, slabO], tol);
    const supported2 = u2.indexOf(1) < 0;
    if (supported2 !== (o <= 0.6 + tol.overlap)) { ok13 = false; break; }
  }
  check("support: at rolled tolerances the rest gap and the footprint overlap decide support exactly", ok13); }

{ const base = { id: 'base', c: [0, 0.1, 0], s: [1, 0.2, 1] };
  const mkSlab = (k) => ({ id: 's' + k, c: [0, 0.2 + 0.5 * k - 0.25, 0], s: [1, 0.5, 1] });
  const s1 = mkSlab(1), s2 = mkSlab(2), s3 = mkSlab(3), s4 = mkSlab(4);
  const level = [s4, s3, s2, s1, base];
  const n1 = findUnsupported(level, { ...SUPPORT_TOLERANCES, passes: 1 }).length;
  const n2 = findUnsupported(level, { ...SUPPORT_TOLERANCES, passes: 2 }).length;
  const n3 = findUnsupported(level, { ...SUPPORT_TOLERANCES, passes: 3 }).length;
  const n4 = findUnsupported(level, SUPPORT_TOLERANCES).length;
  check("support: passes 1 leaves the top of a tall stack floating where the default finds it",
    n1 === 3 && n2 === 2 && n3 === 1 && n4 === 0); }

check("support: the contracts count every problem",
  checkPrim({ c: [0, 0], s: "x", deco: "yes", host: 1.5 }).length === 4 &&
  checkPrim(mkLevel()[0]).length === 0 &&
  checkPrim(null).length === 1 &&
  checkTolerances({ ...SUPPORT_TOLERANCES, overlap: -1, passes: 0 }).length === 2 &&
  checkTolerances(SUPPORT_TOLERANCES).length === 0);

{ const src = fs.readFileSync(new URL("../src/modules/support/support.js", import.meta.url), "utf8");
  const specifiers = [...src.matchAll(/^import\s.*?\sfrom\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  const ok = specifiers.every((s) => /^\.\.\/[a-z0-9-]+\//.test(s) || /^\.\//.test(s));
  check("support: the module imports only from its own folder or a sibling module", ok); }

console.log(`support-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("support-test PASS");
