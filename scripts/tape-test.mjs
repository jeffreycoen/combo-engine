// COMBO-ENGINE — tape-test: the input-tape module's gate. Nine checks. The
// replay proof drives the market module as the toy world: a wallet trading a
// pool on taped commands, one credit of income per tick. Seedless — the tape
// itself is the only source of events, which is the point.
import { checkAction, makeTape, tapeFromJSON, replayTape } from "../src/modules/tape/tape.js";
import { poolBuy, poolSell } from "../src/modules/market/market.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };

check("contract accepts {t:0, k:'fire'}", checkAction({ t: 0, k: "fire" }).length === 0);
check("contract rejects junk (2 problems named)", checkAction({ t: -1, k: "" }).length === 2);
check("recording stamps and keeps order; time never runs backward",
  (() => { const T = makeTape(); T.record(3, "a"); T.record(3, "b"); T.record(7, "c");
    try { T.record(5, "late"); return false; } catch (e) { return T.length === 3 && T.actions[1].k === "b"; } })());

// the toy world: wallet + pool on the market module, one credit income per tick
const world = () => ({ wallet: 10000, held: 0, pool: { q: 14, c: 44800 } });
const hooks = (s) => ({
  apply(a) {
    if (a.k === "buy") { const c2 = poolBuy(s.pool, 1); if (c2 !== null) { s.wallet -= c2; s.held += 1; } }
    if (a.k === "sell" && s.held > 0) { s.wallet += poolSell(s.pool, 1); s.held -= 1; }
  },
  step() { s.wallet += 1; },
});
const play = (actions, ticks) => { const s = world(); replayTape(actions, hooks(s), ticks); return s; };
const flat = (s) => s.wallet + "/" + s.held + "/" + s.pool.q + "/" + s.pool.c;

// the tape under test: buy at 5, buy at 5 again, sell at 40, buy at 99
const T = makeTape();
T.record(5, "buy"); T.record(5, "buy"); T.record(40, "sell"); T.record(99, "buy");

check("replaying the same tape twice lands the identical state",
  flat(play(T.actions, 100)) === flat(play(T.actions, 100)));
check("the end state is the tape's own known number: 2631/2/12/52269",
  flat(play(T.actions, 100)) === "2631/2/12/52269");
check("one altered action changes the outcome (the tape is load-bearing)",
  (() => { const a2 = T.actions; a2[2] = { t: 40, k: "buy" }; return flat(play(a2, 100)) !== "2631/2/12/52269"; })());
check("a tape survives its own serialization: JSON round trip replays identical",
  flat(play(tapeFromJSON(T.toJSON()).actions, 100)) === "2631/2/12/52269");
check("an empty tape is pure stepping: 100 ticks of income, nothing else",
  flat(play([], 100)) === "10100/0/14/44800");
check("actions past the horizon are reported unconsumed, never silently dropped",
  (() => { const r = replayTape(T.actions, hooks(world()), 50); return r.consumed === 3 && r.remaining === 1; })());

console.log(`tape-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("tape-test PASS");
