// COMBO-ENGINE — greybox-test. A rolled stair, a rolled building and door, the
// figure's fixed head height, a rolled human table moving the stair/building/
// door, buildSolids over a rolled part list, twin calls, the contracts, the
// import fence.
import fs from "node:fs";
import {
  HUMAN, ngon, partColumn, partPipe, partRailing, partStair, partDrum,
  partFacade, partDoor, partWheel, partCarBody, partFigure, partWall,
  partBuilding, makeGreybox, buildSolids, HUMAN_CONTRACT, PART_CONTRACT,
  checkHuman, checkPart,
} from "../src/modules/greybox/greybox.js";

let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
const SEED = process.env.SEED ? +process.env.SEED : Math.floor(Math.random() * 1e9);
console.log("seeds " + JSON.stringify({ greybox: SEED }));
let a = SEED >>> 0;
const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

{ // 1. a stair of rolled steps rises steps times step and runs steps times tread
  let ok = true;
  for (let i = 0; i < 200 && ok; i++) {
    const steps = 1 + Math.floor(rnd() * 30); // 1..30
    const width = 0.5 + rnd() * 3.5; // 0.5..4
    const base = rnd() * 10 - 5;
    const list = partStair('s', 0, 0, base, steps, width, 'concrete', 0);
    const last = list[list.length - 1];
    const topY = last.c[1] + last.s[1] / 2;
    const expectTop = base + steps * HUMAN.step;
    const farEdge = last.c[2] - last.s[2] / 2;
    const expectFarDist = steps * HUMAN.tread;
    ok = Math.abs(topY - expectTop) < 1e-9
      && Math.abs(Math.abs(farEdge - 0) - expectFarDist) < 1e-9
      && list.length === steps;
  }
  check("greybox: a stair of rolled steps rises steps times step and runs steps times tread", ok);
}

{ // 2. a building of rolled floors stands floors times floor tall, and a door is door tall
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const floors = 1 + Math.floor(rnd() * 8); // 1..8
    const width = 4 + rnd() * 16; // 4..20
    const depth = 4 + rnd() * 16; // 4..20
    const list = partBuilding('b', 0, 0, width, depth, floors, 0);
    const sideL = list.find((p) => p.id === 'bsideL');
    const sideR = list.find((p) => p.id === 'bsideR');
    const doorList = partDoor('d', 0, 0, 'wood', 0);
    const frame = doorList[0], leaf = doorList[1];
    ok = sideL.s[1] === floors * HUMAN.floor && sideR.s[1] === floors * HUMAN.floor
      && frame.s[1] === HUMAN.door && leaf.s[1] === HUMAN.door - 0.10;
  }
  check("greybox: a building of rolled floors stands floors times floor tall, and a door is door tall", ok);
}

{ // 3. the figure's head top sits at 1.84 at the default scale
  const list = partFigure('f', 0, 0, 0, 'skin', 0);
  const head = list.find((p) => p.id === 'fh');
  const torso = list[0];
  const headTop = head.c[1] + head.s[1] / 2;
  const ok = Math.abs(headTop - 1.84) < 1e-9 && torso.c[1] === 1.16 && list.length === 8;
  check("greybox: the figure's head top sits at 1.84 at the default scale", ok);
}

{ // 4. a rolled human table moves the stair, the building, and the door exactly
  const rr = () => 0.05 + rnd() * 4.95; // 0.05..5
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const human = { eye: rr(), door: rr(), rail: rr(), step: rr(), tread: rr(), floor: rr(), sill: rr() };
    const g = makeGreybox({ human });
    const steps = 1 + Math.floor(rnd() * 30);
    const floors = 1 + Math.floor(rnd() * 8);
    const stairList = g.partStair('s', 0, 0, 0, steps, 1, 'concrete', 0);
    const stairTop = stairList[stairList.length - 1];
    const stairTopY = stairTop.c[1] + stairTop.s[1] / 2;
    const buildingList = g.partBuilding('b', 0, 0, 10, 10, floors, 0);
    const sideL = buildingList.find((p) => p.id === 'bsideL');
    const doorList = g.partDoor('d', 0, 0, 'wood', 0);
    const frame = doorList[0];
    ok = Math.abs(stairTopY - steps * human.step) < 1e-9
      && sideL.s[1] === floors * human.floor
      && frame.s[1] === human.door;
  }
  const defaultsOk = HUMAN.eye === 1.72 && HUMAN.door === 2.05 && HUMAN.rail === 1.06
    && HUMAN.step === 0.175 && HUMAN.tread === 0.29 && HUMAN.floor === 3.30 && HUMAN.sill === 0.95;
  check("greybox: a rolled human table moves the stair, the building, and the door exactly", ok && defaultsOk);
}

{ // 5. buildSolids turns a rolled part list into as many solids as parts, with matching bounds, skipping decoration
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const plainCount = 1 + Math.floor(rnd() * 12); // 1..12
    const decoCount = Math.floor(rnd() * 4); // 0..3
    const level = [];
    for (let j = 0; j < plainCount; j++) {
      level.push({
        id: 'p' + j,
        c: [rnd() * 20 - 10, rnd() * 20 - 10, rnd() * 20 - 10],
        s: [0.1 + rnd() * 5, 0.1 + rnd() * 5, 0.1 + rnd() * 5],
        m: Math.floor(rnd() * 8),
      });
    }
    for (let j = 0; j < decoCount; j++) {
      level.push({
        id: 'd' + j,
        c: [rnd() * 20 - 10, rnd() * 20 - 10, rnd() * 20 - 10],
        s: [0.1 + rnd() * 5, 0.1 + rnd() * 5, 0.1 + rnd() * 5],
        m: Math.floor(rnd() * 8),
        deco: 1,
      });
    }
    const { solids, map } = buildSolids(level);
    ok = solids.length === plainCount && map.length === plainCount;
    for (let k = 0; k < solids.length && ok; k++) {
      const src = level[map[k]];
      const sol = solids[k];
      const okMin = Math.abs(sol.min[0] - (src.c[0] - src.s[0] / 2)) < 1e-9
        && Math.abs(sol.min[1] - (src.c[1] - src.s[1] / 2)) < 1e-9
        && Math.abs(sol.min[2] - (src.c[2] - src.s[2] / 2)) < 1e-9;
      const okMax = Math.abs(sol.max[0] - (src.c[0] + src.s[0] / 2)) < 1e-9
        && Math.abs(sol.max[1] - (src.c[1] + src.s[1] / 2)) < 1e-9
        && Math.abs(sol.max[2] - (src.c[2] + src.s[2] / 2)) < 1e-9;
      ok = okMin && okMax && sol.mat === src.m && map[k] === k;
    }
  }
  check("greybox: buildSolids turns a rolled part list into as many solids as parts, with matching bounds, skipping decoration", ok);
}

{ // 6. twin calls give identical descriptor lists
  let ok = true;
  for (let i = 0; i < 100 && ok; i++) {
    const cx = rnd() * 20 - 10, cy = rnd() * 3, cz = rnd() * 20 - 10, m = Math.floor(rnd() * 8);
    const a1 = partCarBody(cx, cy, cz, m);
    const a2 = partCarBody(cx, cy, cz, m);
    const width = 4 + rnd() * 16, floors = 1 + Math.floor(rnd() * 8), front = rnd() * 10;
    const b1 = partWall('w', cx, front, width, floors, m);
    const b2 = partWall('w', cx, front, width, floors, m);
    ok = JSON.stringify(a1) === JSON.stringify(a2) && JSON.stringify(b1) === JSON.stringify(b2);
  }
  check("greybox: twin calls give identical descriptor lists", ok);
}

{ // 7. the contracts count every problem
  const p1 = checkHuman({ eye: 0, door: "x" });
  const p2 = checkHuman(HUMAN);
  const p3 = checkPart({ id: 3, c: [0], s: "s", p: 4, m: 1.5 });
  const p4 = checkPart(partColumn("c", 0, 0, 0, 3, 0.2, "concrete", 1)[0]);
  const p5 = checkPart(null);
  const ok = p1.length === 7 && p2.length === 0 && p3.length === 5 && p4.length === 0 && p5.length === 1;
  check("greybox: the contracts count every problem", ok);
}

{ // 8. the module imports only from its own folder or a sibling module
  const src = fs.readFileSync(new URL("../src/modules/greybox/greybox.js", import.meta.url), "utf8");
  const specs = [...src.matchAll(/import[^\n]*from\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const ok = specs.every((s) => /^\.\.\/[a-z0-9-]+\//.test(s) || /^\.\//.test(s));
  check("greybox: the module imports only from its own folder or a sibling module", ok);
}

console.log(`greybox-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("greybox-test PASS");
