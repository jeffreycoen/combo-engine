// modules/tape — the input tape, shaped from the deadweight demo
// (deadweight-hangar.html lines 446-447 recAction, 2589-2626 the headless
// driver: "the replay IS the save"). A tape is a recording of commands, each
// stamped with the tick it happened on; a seed plus the tape replays a run
// exactly. The law carried: actions are applied IN RECORDED ORDER, all of a
// tick's actions BEFORE that tick's step, and the tape only ever moves
// forward in time. The code around the law is new and game-free: the game
// supplies apply(action) and step(tick); the tape supplies order and time.

export const ACTION_CONTRACT = { t: "integer >= 0, never decreasing", k: "non-empty string" };

// checkAction(a) -> problem strings, empty when clean. Pure.
export function checkAction(a) {
  if (!a || typeof a !== "object") return ["action: not an object"];
  const problems = [];
  if (!Number.isInteger(a.t) || a.t < 0) problems.push("action.t: integer >= 0 required");
  if (typeof a.k !== "string" || !a.k.length) problems.push("action.k: non-empty string required");
  return problems;
}

// makeTape() -> the recorder. record(tick, kind, data) stamps and stores;
// time never runs backward. toJSON/fromJSON carry a tape between sessions.
export function makeTape(actions = []) {
  const tape = actions.slice();
  return {
    record(tick, kind, data) {
      const a = Object.assign({ t: tick, k: kind }, data || {});
      const problems = checkAction(a);
      if (problems.length) throw new Error("tape: " + problems.join("; "));
      if (tape.length && a.t < tape[tape.length - 1].t) throw new Error("tape: time ran backward");
      tape.push(a);
      return a;
    },
    get actions() { return tape.slice(); },
    get length() { return tape.length; },
    toJSON() { return JSON.stringify(tape); },
  };
}

export function tapeFromJSON(text) {
  const raw = JSON.parse(text);
  if (!Array.isArray(raw)) throw new Error("tape: not an array");
  for (const a of raw) {
    const problems = checkAction(a);
    if (problems.length) throw new Error("tape: " + problems.join("; "));
  }
  return makeTape(raw);
}

// replayTape(actions, {apply, step}, ticks) — the demo's driver loop, made
// generic: for every tick, apply that tick's actions in recorded order, then
// step. Returns how many actions were consumed; actions stamped past `ticks`
// are left unconsumed, never dropped silently.
export function replayTape(actions, hooks, ticks) {
  let i = 0;
  for (let t = 0; t < ticks; t++) {
    while (i < actions.length && actions[i].t === t) { hooks.apply(actions[i]); i++; }
    hooks.step(t);
  }
  return { consumed: i, remaining: actions.length - i };
}
