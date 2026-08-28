// COMBO-ENGINE — market-test: the market module's gate. Eight checks, all
// arithmetic. Fixture seed: 7 (no seed is special).
import { POOL_CONTRACT, checkPool, poolBuy, poolSell, price1 } from "../src/modules/market/market.js";
import { mulberry32 } from "../src/engine/core.js";

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log("PASS " + name); } else { fail++; console.log("FAIL " + name); } };

// the known pool: the deadweight demo's cloister pods at genesis
const known = () => ({ q: 14, c: 44800 });

check("contract accepts the known pool", checkPool(known()).length === 0);
check("contract rejects junk (3 problems named)",
  checkPool(null).length === 1 && checkPool({ q: 0, c: -1 }).length === 2 && checkPool({ q: 1.5, c: 10 }).length === 1);
check("price1 of the known pool is 3447", price1(known()) === 3447);
{ const p = known(); const cost = poolBuy(p, 1);
  check("buying 1 costs 3447 and leaves {13, 48247}", cost === 3447 && p.q === 13 && p.c === 48247); }
{ const p = known(); poolBuy(p, 1); const out = poolSell(p, 1);
  check("selling it back returns 3446 and leaves {14, 44801}", out === 3446 && p.q === 14 && p.c === 44801); }
{ const p = known(); const cost = poolBuy(p, 1); const out = poolSell(p, 1);
  check("round trip never mints money", out <= cost); }
check("a pool of 1 refuses to sell its last unit", poolBuy({ q: 1, c: 100 }, 1) === null);
{ const r = mulberry32(7); let bad = 0;
  for (let trial = 0; trial < 200; trial++) {
    const pool = { q: 2 + Math.floor(r() * 60), c: Math.floor(r() * 90000) };
    let wallet = 1e9, held = 0;
    const total0 = wallet + pool.c, units0 = pool.q + held;
    for (let i = 0; i < 50; i++) {
      if (r() < 0.5) { const c2 = poolBuy(pool, 1); if (c2 !== null) { wallet -= c2; held += 1; } }
      else if (held > 0) { const o2 = poolSell(pool, 1); wallet += o2; held -= 1; }
      if (wallet + pool.c !== total0 || pool.q + held !== units0 || pool.q < 1 || pool.c < 0 || !Number.isInteger(pool.c)) bad++;
    }
  }
  check("10,000 seeded trades conserve credits and units exactly", bad === 0); }

console.log(`market-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("market-test PASS");
