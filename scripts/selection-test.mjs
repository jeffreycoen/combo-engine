// COMBO-ENGINE — selection-test: the selection and feedback layer's gate.
// Ten checks: bracket geometry and the mothership squeeze, the health bar
// colour ramp, formation links, box select, the follow window and drag
// threshold, order-line dashes and verb colours, opacity and ring law by
// enemy and selected, twin-frame agreement, the dials contract, and the
// import fence.
import { SELECTION_DIALS, bracketLegs, barColor, dashes, makeSelection, SELECTION_CONTRACT, checkSelectionDials } from "../src/modules/selection/selection.js";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };

// the small seeded stream the other gates use
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const SEED = process.env.SEED ? (parseInt(process.env.SEED, 10) >>> 0) : ((Math.random() * 0xffffffff) >>> 0);
console.log(`seeds {"selection":${SEED}}`);
const rng = mulberry32(SEED);
const rollIn = (lo, hi) => lo + rng() * (hi - lo);

const CORNERS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

let uid = 0;
const rollUnit = (overrides = {}) => ({
  id: uid++,
  pos: [rollIn(-100, 100), rollIn(-100, 100), rollIn(-100, 100)],
  hp: rollIn(1, 100),
  maxHp: 100,
  scale: rollIn(0.5, 5),
  type: rng() < 0.15 ? "collector" : "fighter",
  isEnemy: rng() < 0.5,
  moveTarget: null, guardTarget: null, attackTarget: null,
  ...overrides,
});

{ // 1. bracket size and arm are exact at rolled scales, and the mothership's shape squeezes to 0.15
  let ok = true;
  for (let i = 0; i < 200 && ok; i++) {
    const scale = rollIn(0.2, 10);
    const size = scale * SELECTION_DIALS.bracket;
    const leg = size * SELECTION_DIALS.bracketArm;
    const segs = bracketLegs(size, leg);
    if (segs.length !== 8) { ok = false; break; }
    for (let c = 0; c < 4 && ok; c++) {
      const [cx, cy] = CORNERS[c];
      const vert = segs[2 * c], horiz = segs[2 * c + 1];
      const cornerX = cx * size, cornerY = cy * size;
      const okCorner = Math.abs(vert[0][0] - cornerX) < 1e-9 && Math.abs(vert[0][1] - cornerY) < 1e-9
        && Math.abs(horiz[0][0] - cornerX) < 1e-9 && Math.abs(horiz[0][1] - cornerY) < 1e-9;
      const okVertLeg = Math.abs(vert[1][0] - cornerX) < 1e-9 && Math.abs(vert[1][1] - cy * (size - leg)) < 1e-9;
      const okHorizLeg = Math.abs(horiz[1][1] - cornerY) < 1e-9 && Math.abs(horiz[1][0] - cx * (size - leg)) < 1e-9;
      ok = okCorner && okVertLeg && okHorizLeg;
    }
  }
  const ms = bracketLegs(28, 8.4, 0.15);
  let msOk = ms.length === 8;
  for (let c = 0; c < 4 && msOk; c++) {
    const [cx] = CORNERS[c];
    const vert = ms[2 * c], horiz = ms[2 * c + 1];
    msOk = vert[0][0] === cx * 4.2 && vert[1][0] === cx * 4.2 && horiz[0][0] === cx * 4.2;
  }
  check("selection: bracket size and arm are exact at rolled scales, and the mothership's shape squeezes to 0.15", ok && msOk);
}

{ // 2. the bar colour's two branches switch at 0.5 and each is monotone
  let ok = true;
  let prevRedUpper = null, prevGreenLower = null;
  for (let i = 0; i <= 100 && ok; i++) {
    const r = i / 100;
    const [red, green] = barColor(r);
    if (r > 0.5) {
      if (green !== 0.85) ok = false;
      if (prevRedUpper !== null && !(red < prevRedUpper)) ok = false;
      prevRedUpper = red;
    } else {
      if (red !== 0.85) ok = false;
      if (prevGreenLower !== null && !(green > prevGreenLower)) ok = false;
      prevGreenLower = green;
    }
  }
  const lower = barColor(0.5), upper = barColor(0.5000001);
  const lowerIsLower = lower[0] === 0.85 && lower[1] === 0.5 * 1.7 && lower[2] === 0.15;
  const upperIsUpper = upper[1] === 0.85 && upper[2] === 0.2;
  check("selection: the bar colour's two branches switch at 0.5 and each is monotone", ok && lowerIsLower && upperIsUpper);
}

{ // 3. links are exactly n minus 1 consecutive pairs
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const n = 2 + Math.floor(rng() * 8);
    const units = Array.from({ length: n }, () => rollUnit());
    const s = makeSelection();
    s.select(units);
    const f = s.frame(units, 0);
    ok = f.links.length === n - 1;
    for (let k = 0; k < n - 1 && ok; k++) {
      ok = f.links[k].a === units[k] && f.links[k].b === units[k + 1];
    }
  }
  check("selection: links are exactly n minus 1 consecutive pairs", ok);
}

{ // 4. box select keeps exactly the projected points inside a rolled rectangle
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const units = Array.from({ length: 12 }, () => rollUnit());
    const points = new Map(units.map((u) => [u, [rollIn(0, 800), rollIn(0, 600)]]));
    const project = (u) => points.get(u);
    const xa = rollIn(0, 800), xb = rollIn(0, 800), ya = rollIn(0, 600), yb = rollIn(0, 600);
    const rect = { x1: Math.min(xa, xb), y1: Math.min(ya, yb), x2: Math.max(xa, xb), y2: Math.max(ya, yb) };
    const insideExpected = units.filter((u) => { const [sx, sy] = points.get(u); return sx >= rect.x1 && sx <= rect.x2 && sy >= rect.y1 && sy <= rect.y2; });
    const s = makeSelection();
    const result = s.boxSelect(units, project, rect);
    ok = result.length === insideExpected.length && insideExpected.every((u) => result.includes(u));
  }
  check("selection: box select keeps exactly the projected points inside a rolled rectangle", ok);
}

{ // 5. the follow window and the drag threshold are the dials
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const u = rollUnit();
    const t0 = rollIn(0, 1e6);
    const s1 = makeSelection();
    s1.click(u, t0, false);
    const r1 = s1.click(u, t0 + 399, false);

    const s2 = makeSelection();
    s2.click(u, t0, false);
    const r2 = s2.click(u, t0 + 401, false);

    const s3 = makeSelection();
    const dragShort = s3.dragIs({ x: 0, y: 0 }, { x: 5, y: 0 });
    const dragLong = s3.dragIs({ x: 0, y: 0 }, { x: 6, y: 0 });

    const s4 = makeSelection();
    const other = rollUnit();
    s4.select([u]);
    s4.click(other, t0, true);
    const shiftToggled = s4.list.includes(u) && s4.list.includes(other) && s4.list.length === 2;

    ok = r1 === "follow" && r2 === "select" && dragShort === false && dragLong === true && shiftToggled;
  }
  check("selection: the follow window and the drag threshold are the dials", ok);
}

{ // 6. order lines dash by the law and pick the verb's colour in the demo's precedence
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const L = rollIn(1, 60);
    const t = rollIn(0, 100);

    const moveUnit = rollUnit({ pos: [0, 0, 0], moveTarget: [L, 0, 0] });
    const sMove = makeSelection();
    sMove.select([moveUnit]);
    const line = sMove.frame([moveUnit], t).orderLines[0];
    const expectedCount = Math.ceil(L / (SELECTION_DIALS.dash + SELECTION_DIALS.gap));
    const startsAtUnit = line.segments[0][0][0] === 0 && line.segments[0][0][1] === 0 && line.segments[0][0][2] === 0;
    const endsWithinOne = line.segments.every((seg) => seg[1][0] / L <= 1 + 1e-9);
    const moveOk = line.segments.length === expectedCount && startsAtUnit && endsWithinOne && line.color === SELECTION_DIALS.colors.move;

    const guardTargetUnit = rollUnit();
    const guardUnit = rollUnit({ pos: [0, 0, 0], moveTarget: null, guardTarget: guardTargetUnit });
    const sGuard = makeSelection();
    sGuard.select([guardUnit]);
    const guardOk = sGuard.frame([guardUnit], t).orderLines[0].color === SELECTION_DIALS.colors.guard;

    const attackTargetUnit = rollUnit();
    const attackUnit = rollUnit({ pos: [0, 0, 0], moveTarget: null, attackTarget: attackTargetUnit });
    const sAttack = makeSelection();
    sAttack.select([attackUnit]);
    const attackOk = sAttack.frame([attackUnit], t).orderLines[0].color === SELECTION_DIALS.colors.attack;

    const bothUnit = rollUnit({ pos: [0, 0, 0], moveTarget: [L, 0, 0], attackTarget: attackTargetUnit });
    const sBoth = makeSelection();
    sBoth.select([bothUnit]);
    const bothOk = sBoth.frame([bothUnit], t).orderLines[0].color === SELECTION_DIALS.colors.move;

    ok = moveOk && guardOk && attackOk && bothOk;
  }
  check("selection: order lines dash by the law and pick the verb's colour in the demo's precedence", ok);
}

{ // 7. bar and bracket opacities and the ring follow enemy and selected
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const t = rollIn(0, 1000);

    const enemyUnit = rollUnit({ isEnemy: true });
    const sEnemy = makeSelection();
    const fEnemy = sEnemy.frame([enemyUnit], t);
    const enemyBracketExpected = 0.5 + Math.sin(t * 3) * 0.15;
    const enemyOk = fEnemy.bars[0].opacityBg === 0.25 && fEnemy.bars[0].opacityBar === 0.55
      && Math.abs(fEnemy.brackets[0].opacity - enemyBracketExpected) < 1e-12;

    const friendSel = rollUnit({ isEnemy: false });
    const sSel = makeSelection();
    sSel.select([friendSel]);
    const fSel = sSel.frame([friendSel], t);
    const selFriendOk = fSel.bars[0].opacityBg === 0.35 && fSel.bars[0].opacityBar === 0.65
      && fSel.brackets[0].opacity === 0.55 && fSel.rings[0].opacity === 0.45;

    const friendUnsel = rollUnit({ isEnemy: false });
    const sUnsel = makeSelection();
    const fUnsel = sUnsel.frame([friendUnsel], t);
    const unselFriendOk = fUnsel.bars[0].opacityBg === 0.2 && fUnsel.bars[0].opacityBar === 0.35
      && fUnsel.brackets[0].opacity === 0.25 && fUnsel.rings[0].opacity === 0;

    const collector = rollUnit({ isEnemy: false, type: "collector" });
    const sCol = makeSelection();
    const collectorOk = sCol.frame([collector], t).brackets[0].color === SELECTION_DIALS.colors.collectorBracket;

    ok = enemyOk && selFriendOk && unselFriendOk && collectorOk;
  }
  check("selection: bar and bracket opacities and the ring follow enemy and selected", ok);
}

{ // 8. twin frames agree
  let ok = true;
  for (let i = 0; i < 50 && ok; i++) {
    const n = 2 + Math.floor(rng() * 6);
    const baseUnits = Array.from({ length: n }, () => rollUnit({ moveTarget: rng() < 0.5 ? [rollIn(-50, 50), rollIn(-50, 50), rollIn(-50, 50)] : null }));
    const cloneUnits = baseUnits.map((u) => JSON.parse(JSON.stringify(u)));
    const idxSubset = baseUnits.map((_, idx) => idx).filter(() => rng() < 0.6);

    const sA = makeSelection();
    sA.select(idxSubset.map((idx) => baseUnits[idx]));
    const sB = makeSelection();
    sB.select(idxSubset.map((idx) => cloneUnits[idx]));

    const t = rollIn(0, 100);
    const fA = sA.frame(baseUnits, t);
    const fB = sB.frame(cloneUnits, t);
    ok = JSON.stringify(fA) === JSON.stringify(fB);
  }
  check("selection: twin frames agree", ok);
}

{ // 9. the contract counts every problem
  const dialNames = Object.keys(SELECTION_CONTRACT).filter((k) => k !== "colors");
  const brokenInput = { bracket: 0, colors: { move: "x" } };
  const missing = dialNames.filter((name) => name !== "bracket" && brokenInput[name] === undefined).length;
  const expected = missing + 2;
  const broken = checkSelectionDials(brokenInput);
  const clean = checkSelectionDials(SELECTION_DIALS);
  const notObject = checkSelectionDials(null);
  check("selection: the contract counts every problem", broken.length === expected && clean.length === 0 && notObject.length === 1);
}

{ // 10. the module imports only from its own folder or a sibling module
  const src = readFileSync(new URL("../src/modules/selection/selection.js", import.meta.url), "utf8");
  const specifiers = [...src.matchAll(/^import\s+.*?\bfrom\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  const ok = specifiers.every((spec) => /^\.\.\/[a-z0-9-]+\//.test(spec) || /^\.\//.test(spec));
  check("selection: the module imports only from its own folder or a sibling module", ok);
}

console.log(`selection-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("selection-test PASS");
