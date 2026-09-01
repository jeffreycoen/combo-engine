# FROSTLINE — the audit

The player's whole path, traced against the code. Every screen, button, spend, and displayed number carries one verdict:

- **TRUE** — the display has its mechanism and the mechanism does what the display says.
- **HOLLOW** — the display exists, the mechanism behind it does not, or does less than the words say.
- **MISSING** — the path calls for a thing that is not there at all.

Files read in full for this audit: every file in `src/games/frostline/`, `docs/frostline/` (both pages), `scripts/frostline-test.mjs`, `scripts/frostline-audit.mjs`, the whole depot (`src/depot/`), `src/engine/core.js`, `src/engine/mech.js`, `src/graphics/renderer.js`, `src/modules/orders/orders.js`, `src/modules/steering/steering.js`. Line anchors below name the live tree at commit 06bbf9f.

---

## Screen 1 — the board (`index.html?board=B`)

| Item | Verdict | The code fact |
|---|---|---|
| The address `?board=B` is the board | TRUE | `makeBoard(boardSeed)` is deterministic; a bare load rolls a seed and pins it in the address bar (main.js:29-33). |
| "the purse: N" | TRUE | Read from the saved purse (main.js:38). |
| "heat N" | HOLLOW | Heat is earned (contracts.js:131), saved, and displayed in three places. No line of code anywhere reads it back. Nothing hunts, prices, or refuses at any heat level. |
| "roster: 3 + N bought" | TRUE | `fieldedTypes`/`menOf` (purse.js:569-575). |
| The job's name ("ESCORT THE SURVEY", "HOLD FOR THE CONVOY", …) | HOLLOW | Every job boots `MISSION_R1` — REACH THE FAR SIDE — whatever its name (main.js:58). Only the valley seed and the pay differ. The names promise escorts and holds that no code builds. |
| "CLEAN / UNDERGROUND · pays N" | TRUE | `completionPay` pays exactly the posted price on a win (contracts.js:128-133); the pay bands hold on every fixture board (gate: board area). |
| "+1 heat" on underground jobs | HOLLOW | The number lands on the books (TRUE arithmetic) and then nothing ever reads it — same hollow as the heat display. |
| "HOT ROUTE" | HOLLOW | The button routes a hot job through `space.html` first (main.js:44-46) — but the route is a LINK, not a rule. Loading `index.html?board=B&job=K` directly boots the ground job with the ambush skipped. The ambush is enforced by nothing. |
| The board turning over | MISSING | A taken or completed job stays posted forever. Nothing consumes, refreshes, or retires a job; the debrief's THE BOARD button rolls a fresh random board instead of returning to the one the job came from (main.js:319-321). There is no persistent world of work. |

## Screen 2 — the route (`space.html`, hot jobs)

| Item | Verdict | The code fact |
|---|---|---|
| The battle is its seed | TRUE | `makeSpaceBattle(contract.spaceSeed)`, twin boots byte-identical (gate: space area). |
| Ship chips: name, hp, point pips | TRUE | Read live from the ships and the turn machine (space-main.js:54-64). |
| "TIME STOPS AT FIRST CONTACT" | TRUE | `contactMade` at 55 m freezes free time into orders (space-main.js:141-142). |
| MOVE — "burn to that point · cost 1 point" | HOLLOW | The point spends (TRUE), but there is no move cap: one point buys any distance on the map. The ground game's whole pricing law — a capped move, the cap displayed in the confirmation — has no space mirror. A point that buys anything prices nothing. |
| ATTACK — "close and engage · cost 1 point" | HOLLOW | The order fires (TRUE), but no chance-to-hit is shown. The mechanism exists (`HIT_NEAR`/`HIT_FAR` falloff, space.js:690) and the ground game displays its number; here the confirmation says nothing. |
| Your half ends when your ships are done | MISSING | `stepExec(ts, SPACE_STEP, false)` — the done-check is hard-wired false (space-main.js:145). The player half always runs its full 8 seconds. The ground game's own law (ends on done OR the cap) is absent. |
| END TURN | TRUE | Flips orders to exec (space-main.js:82). |
| Enemy turn | TRUE | `enemyOrders` re-aims every droid at the nearest hull at each half's start. |
| Ship kills pay the one purse | TRUE | Bounties drain into the same purse and save at the end (space-main.js:150-156). |
| Losing costs something | MISSING | A lost ambush loses the contract and nothing else. Ships are not men: the wing is fresh every battle, no casualty book, no replacement price. The ground game's FL-7 law (the dead stay dead, replacements cost) has no space mirror. |
| A space battle on the tape | MISSING | No order is recorded; no replay exists for the route. The ground game's FL-6 law stops at the atmosphere. |
| Camera | MISSING | Fixed window, no zoom, no pan, no desktop keys. |

## Screen 3 — the ground battle (`index.html?board=B&job=K` or `?seed=N`)

### The boot and the address

| Item | Verdict | The code fact |
|---|---|---|
| The contract's seed boots its exact battle | TRUE | `bootMission(MISSION_R1, contract.seed, roster, men)`; refused valleys step deterministically; the taken seed is the battle (gate: mission area). |
| A battered roster fields what it has | TRUE | `menOf` heads per slot; a wiped slot fields no squad (gate: mission area). |
| The address stays honest | HOLLOW | main.js:66 rewrites the address to `?seed=N` unconditionally — even for a contract battle, one line after line 59 correctly guarded the same rewrite with `!contract`. Reloading mid-contract loses the contract: the battle comes back as a free skirmish, the posted price and the heat gone. And a finished free skirmish's `?seed=` address has no path back to any board. |
| A wiped, broke campaign has an ending | MISSING | Zero men everywhere and no scrap for replacements: the next boot filters every slot out, `placeMission` gets an empty squad list, and `connected(war, squadAt[0], exit)` reads `.x` of `undefined` — a crash, not a card. The only exit is RESET PURSE, which wipes without confirmation. |

### The fight

| Item | Verdict | The code fact |
|---|---|---|
| "TIME STOPS AT FIRST CONTACT" | TRUE | Contact trigger through the sight map (pause.js:460-483); the exact tick is pinned in the gate. |
| Squad chips: label, heads, C/F, point pips | TRUE | All read live (main.js:112-117). |
| Three points a squad, one point per order | HOLLOW | The arithmetic is TRUE (`spend`, the pips, the refusals all correct) — but the economy underneath is fiction. A squad carries ONE order: the slots are exclusive by engine law, so a second move overwrites the first and only the last order before END TURN ever plays. Three points buy three overwrites. The lone real multi-spend is overwatch's second point (the wider cone). |
| MOVE — "cover there: X · distance N m (cap 22)" | TRUE | The shield is real geometry against known threats (`destShield`, cover.js:223-234); the cap clamps along the line (turns.js:887-894); free time is uncapped and says so. |
| ATTACK — "chance to hit: N%" | TRUE | The estimate is the engine's own scatter arithmetic, audited against live fire at three ranges and pinned (cover.js:246-259, frostline-audit.mjs). |
| The sniper's long chance-to-hit | HOLLOW | The display prices a shot the trigger will not take: past the lone pair's own sight field the doctrine never fires, so the number stands for a shot that cannot happen (the FL-3 audit's own recorded finding — the 18+ m sniper scenario had zero rounds to measure). |
| HOLD — "cover here: X · cost 1 point" | TRUE | Defend order, shield shown from real geometry. |
| OVERWATCH — cone, width by points, "enemy half only", re-aim | TRUE | `setOverwatch`/`applyFireControl`/`inArc`; the cone binds the trigger in the engine's own fire scan (state.js:621-625); the drawn cone rides the overlay (gate: fire area). |
| MARK — "the mark is the whole side's" | HOLLOW | The mark sets a shared id and draws a ring (verbs.js:952-958, main.js:280-284) — and no rule reads it. `squadFire` honors `focusId` (the ATTACK order), never `_markId`. The mark is a drawn ring with no mechanism behind it. |
| DISCIPLINE — CAREFUL / FREE | TRUE | Careful holds fire on the enemy half unless a cone covers it; free fires any half (verbs.js:980-991; gate: fire area). |
| END TURN | TRUE | Orders → exec; exec ends on all-done or the 8-second cap; enemy half is a fixed window (turns.js). |
| The enemy held on your half | TRUE | The engine's own dummy switch, flipped by phase (turns.js:923, sim.js:534). |
| The exit, visible | MISSING | The marker draws (`setObjective`) but sits off-screen at boot with no edge pointer. The mission opens with no visible goal. |
| Man-down and orders-done pauses | MISSING | `checkTriggers` computes both (pause.js:470-482) and the page consumes only `contact` (tape.js:766-767). Two built triggers fire into nothing. |
| Every kill pays its bounty | TRUE | The engine's kill events through `earnFromEvents`; world and friendly fire pay nobody (gate: purse area). |
| The medics tend | TRUE | The depot's own tend machinery runs for a defending medic squad inside the battle step (sim.js:622). |
| THE HUNTER — one man, twin sidearms, 35 m jetpack line | HOLLOW | The row, the burst, and the 35 m cap are TRUE (gate: hunter area). The jetpack is not: he walks the same movement grid as every squad — no crossing of walls or drops, no flight, and he draws as an ordinary trooper. The name and the number outrun the code. |
| Win and loss cards | TRUE | `missionState`: anyone alive through the exit ring wins; the side wiped loses. |

## Screen 4 — the debrief

| Item | Verdict | The code fact |
|---|---|---|
| Bounties, posted price, purse, roster, the fallen | TRUE | All real arithmetic (`completionPay`/`winBonus`/`recordCasualties`); survivors per slot recorded in boot order (main.js:349-356). |
| "heat +1 (now N)" | HOLLOW | Same hollow number, third appearance. |
| "the tape: N orders, saved" | HOLLOW | Saved is TRUE (`localStorage`, seed + board + roster + men + tape — everything a replay needs). Played back is MISSING: no page loads a tape; `replay()` exists only headless. The words promise a record the player can never watch. |
| REPLACEMENTS — the whole bill or nothing | TRUE | `refillCost`/`buyRefill`, refuse short, refill as a class (gate: purse area). |
| BUY buttons at table prices | TRUE | Prices from `SQUAD_SPECS`, dry purse refuses. |
| THE HUNTER — one of a kind | HOLLOW | The purchase law is TRUE (`buyTeam` refuses a second hunter). The button is not: main.js:312 disables the owned hunter's button and main.js:313 immediately overwrites that with the affordability check — an owned hunter's button lights up again when the purse can pay, and the tap silently does nothing. |
| THE BOARD | HOLLOW | Goes to a fresh random board, not back to the board the job came from — the campaign's spine has no continuity through it. |
| RESET PURSE | HOLLOW | Wipes the whole campaign in one tap, no confirmation — the only irreversible button on any screen, and the only one without a confirm. |

---

## The roll-up

Confirms every finding in the game plan's repair record, and adds four not yet written there:

1. **The contract's address is destroyed mid-battle** — main.js:66 rewrites `?board&job` to `?seed` unconditionally; a reload loses the contract (line 59 already has the correct guard, one line up).
2. **A wiped, broke campaign crashes instead of ending** — empty squad list reaches `connected(war, undefined, exit)` in mission.js:395.
3. **The owned hunter's buy button re-enables** — main.js:313 overwrites main.js:312's disable; the button lights and the tap is dead.
4. **The hot route is a link, not a rule** — the ambush is skippable by typing the ground address directly.

Also for the record: the mark draws a ring no rule reads; man-down and orders-done triggers are computed and consumed by nothing; and the two other pages of the plan's record (point economy, one mission, heat, no replay door, exit pointer, hunter silhouette, sniper's priced shot, thin space, RESET PURSE) are all confirmed in the code exactly as the playtest found them.

Repair order stays as ruled: the point economy made real; the path closed (board door, exit pointer, replay door); words squared with code (job names to real missions, heat priced or removed, the mark given a rule or removed); space to the ground's standard.

---

## The second pass — found after the first roll-up

5. **Overwatch's widen price breaks across turns** — main.js:244 prices the cone by whether the squad already has one (`selected._ow ? 2 : 1`), not by points sunk this turn. Nothing clears the cone at turn end (refill touches only points; only a move, attack, or hold clears it). After the first cone, every later overwatch costs 1 point and delivers the 180° width. The first roll-up marked overwatch TRUE.

6. **"ENEMY TURN" never holds your side** — turns.js states the law: the enemy runs while the player holds. No code holds the player. `heldInput(ctx.input, ts.phase === "exec")` (tape.js:35) freezes only the enemy on your half; through the enemy's 6 seconds your squads keep marching and firing their standing orders. Space is the same. The banner says one side moves; the code runs both.

7. **The version line reads from outside the served pages** — both pages fetch `../../package.json` (main.js:83, space-main.js:39). A deploy that serves only `docs/` fails the fetch and shows "mk ?" forever. Unverified against the live deploy.

8. **The board is unreachable from any played address** — a consequence of finding 1, stated in full: every battle rewrites the address to `?seed=N`, and a `?seed=` address boots a free skirmish (main.js:29). After one battle, reload, bookmark, back, and tab restore all skip the board forever; only a hand-stripped address or a finished battle's debrief button reaches it.

Smaller, for the record: a won free skirmish's card reads "THE FAR SIDE — CONTRACT COMPLETE" with no contract in play (main.js:292); a lost hot route says "the contract is lost" (space-main.js:119) while nothing consumes the job — the same ambush can be re-flown at once; a squad on hold or overwatch counts as done instantly (`orderDone`: defend with no destination), so a turn of only holds skips your execute half whole and hands the enemy its window at once.

**The goal, ruled:** the finished repair is a fully playable demo — the whole path from a bare load through board, route, battle, and debrief, with no dead door, no hollow number, and no crash ending. The repair order's rungs are measured against that bar. Board turnover (a job taken is a job gone) is load-bearing for it and rides the closed-path rung.
