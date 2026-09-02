// games/frostline/contracts.js — FL-5, the contract board. A contract is
// DATA: a name, a battle seed, a posted completion price, and a legitimacy
// tag — clean jobs pay less; underground jobs pay more and raise the heat.
// The board is deterministic from its own seed, so a posted job can be
// named, shared, and replayed by two numbers (board seed, job index).
// Pure state; a tiny local draw stream keeps the board independent of the
// sim's rng. No globals, no clocks.

// The same 32-bit stream shape the engine's own maps grow from — local,
// seeded, and free of Math.random.
export function stream(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const BOARD_JOBS = 3;
// Posted completion pay by legitimacy — the ruled trade: clean pays less,
// underground pays more and heats the hunter. All provisional (F5).
export const CLEAN_PAY = [15, 25];
export const UNDER_PAY = [35, 60];
export const UNDER_HEAT = 1;
// The route: some jobs fly through an ambush — the space fight comes first,
// then the ground job. Underground routes run hotter. Provisional (F5).
export const HOT_CLEAN = 0.2, HOT_UNDER = 0.55;

const CLEAN_NAMES = ["ESCORT THE SURVEY", "CLEAR THE PASS", "HOLD FOR THE CONVOY"];
const UNDER_NAMES = ["NO QUESTIONS ASKED", "THE QUIET JOB", "CARGO UNDECLARED"];

// makeBoard(boardSeed) -> BOARD_JOBS contracts, deterministic. Each carries
// its own battle seed derived from the board's stream, so one address
// (board, job) names one exact battle.
export function makeBoard(boardSeed) {
  const r = stream(boardSeed);
  const jobs = [];
  for (let i = 0; i < BOARD_JOBS; i++) {
    const under = r() < 0.5;
    const payLo = under ? UNDER_PAY[0] : CLEAN_PAY[0];
    const payHi = under ? UNDER_PAY[1] : CLEAN_PAY[1];
    const price = payLo + Math.floor(r() * (payHi - payLo + 1));
    const names = under ? UNDER_NAMES : CLEAN_NAMES;
    const seed = Math.floor(r() * 1e9);
    const name = names[Math.floor(r() * names.length)];
    // two draws ride at the end of each job so every earlier draw keeps its
    // place: is the route hot, and the ambush's own battle seed
    const hot = r() < (under ? HOT_UNDER : HOT_CLEAN);
    const spaceSeed = Math.floor(r() * 1e9);
    jobs.push({
      job: i,
      boardSeed,
      seed,
      name,
      legit: under ? "underground" : "clean",
      price,
      heat: under ? UNDER_HEAT : 0,
      hot,
      spaceSeed,
    });
  }
  return jobs;
}

// nextBoardSeed(boardSeed) -> the seed the emptied board refreshes to.
// Deterministic: the chain of boards is part of the address law.
export function nextBoardSeed(boardSeed) {
  return Math.floor(stream((boardSeed ^ 0x9e3779b9) >>> 0)() * 1e9);
}

// doneOf(purse, boardSeed) -> the completed job indexes on this board; a
// board the purse has never seen starts clean.
export function doneOf(purse, boardSeed) {
  return purse.board && purse.board.seed === boardSeed ? purse.board.done : [];
}

// markJobDone(purse, boardSeed, jobIx): the won job leaves the board; an
// emptied board rolls the next one. Returns the board seed now current.
export function markJobDone(purse, boardSeed, jobIx) {
  if (!purse.board || purse.board.seed !== boardSeed) purse.board = { seed: boardSeed, done: [] };
  if (!purse.board.done.includes(jobIx)) purse.board.done.push(jobIx);
  if (purse.board.done.length >= BOARD_JOBS) purse.board = { seed: nextBoardSeed(boardSeed), done: [] };
  return purse.board.seed;
}

// completionPay(purse, contract) -> the posted price into the purse, plus
// the job's heat onto the books. The caller owns the once.
export function completionPay(purse, contract) {
  purse.scrap += contract.price;
  purse.earned += contract.price;
  purse.heat = (purse.heat || 0) + (contract.heat || 0);
  return contract.price;
}
