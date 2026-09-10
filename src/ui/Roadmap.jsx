// THE ROAD AHEAD (mk0.59) — the project at a glance, reached by opening the
// page with ?roadmap=1. It mounts INSTEAD of the game: no world, no physics,
// no renderer, no sound. It is a page of text and nothing else.
//
// PHASES below is the whole page. When a phase finishes, one line changes in
// that array — flip the finished phase to "DONE" and the next one to
// "IN PROGRESS". Exactly one phase is IN PROGRESS at a time; STATUS_ORDER's
// rendering assumes nothing else, but a second bright card would defeat the
// point of the page, which is that the eye lands on the work in hand.
import React from "react";
import { COLORS, FONT } from "./theme.js";
import { MK } from "../version.js";

export const PHASES = [
  { name: "Cleanup", status: "DONE", desc: "Test purge, cohesion fix, permanent smears, the Pi performance baseline." },
  { name: "The Bell", status: "DONE", desc: "The 90-second muster bell: income, intel, reinforcement picks, saves at every toll." },
  { name: "Polish I", status: "DONE", desc: "Playtest fixes: tuning, wall masonry, weapon voices, soundboard, engineers." },
  { name: "Vision", status: "DONE", desc: "You only shoot what your side sees — shipped, playtested." },
  { name: "Command", status: "DONE", desc: "One ring of orders around every squad and tower — shipped." },
  { name: "Possession", status: "DONE", desc: "Take direct control of any squad or tower and drive it yourself." },
  { name: "The Front", status: "DONE", desc: "A square map twice the ground, wilder seeds, hills, forests, a stream to cross." },
  { name: "Troops & Physics", status: "DONE", desc: "Squads that walk around things, an economy that breathes, a lighter engine." },
  { name: "Armor & Demolition", status: "IN PROGRESS", desc: "A tank and a transport for each side, one driver seat for every hull, mines under the snow." },
  { name: "Engineers & Arms", status: "AHEAD", desc: "The full engineer and sapper split, richer building, rocket teams." },
  { name: "Water", status: "AHEAD", desc: "Streams, basins, ice you can fall through, bridges built and blown." },
  { name: "The Dam", status: "AHEAD", desc: "Some maps hold a lake behind a dam. Dams can be blown. Floods take everything downstream." },
  { name: "The Enemy Front", status: "AHEAD", desc: "The enemy gets its own depth: a build brain and a real rear." },
  { name: "Heroes", status: "AHEAD", desc: "Late-bell arrivals: tanks, ace snipers, the mech as the crown." },
  { name: "Balance", status: "AHEAD", desc: "The mercenary market: one shared economy both armies buy from, prices that breathe." },
];

// Three looks, one per status. DONE is spent: dim ink, a rule through the
// name. IN PROGRESS is the only lit card on the page — gold, full contrast,
// a gold edge down its left side. AHEAD is muted: present, legible, quiet.
const LOOK = {
  DONE:          { accent: COLORS.dim,  ink: COLORS.dim,    body: 0.45, edge: COLORS.btnBorder, strike: true,  bg: "rgba(0,0,0,0.22)" },
  "IN PROGRESS": { accent: COLORS.gold, ink: COLORS.gold,   body: 0.95, edge: COLORS.gold,      strike: false, bg: "rgba(44,38,24,0.85)" },
  AHEAD:         { accent: COLORS.dim,  ink: COLORS.bright, body: 0.6,  edge: COLORS.btnBorder, strike: false, bg: COLORS.btnBg },
};

export default function Roadmap() {
  const done = PHASES.filter((p) => p.status === "DONE").length;
  const here = PHASES.findIndex((p) => p.status === "IN PROGRESS");

  return (
    <div data-roadmap style={{ position: "fixed", inset: 0, overflow: "auto", background: COLORS.bg, color: COLORS.text, fontFamily: FONT, userSelect: "none", WebkitUserSelect: "none" }}>
      <div style={{ width: "min(460px, 94vw)", margin: "0 auto", padding: "22px 0 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 20, color: COLORS.red, letterSpacing: 5, lineHeight: 1.4 }}>WINTER FRONT</div>
          <div style={{ fontSize: 14, color: COLORS.red, letterSpacing: 4, opacity: 0.85 }}>THE ROAD AHEAD</div>
          <div data-mk style={{ opacity: 0.5, letterSpacing: 2, fontSize: 10, marginTop: 6 }}>{MK}</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8, letterSpacing: 1 }}>
            {done} of {PHASES.length} phases behind us{here >= 0 ? ` — now on ${PHASES[here].name}` : ""}.
          </div>
        </div>

        {PHASES.map((p, i) => {
          const look = LOOK[p.status] || LOOK.AHEAD;
          return (
            <div
              key={p.name}
              data-phase={p.name}
              data-status={p.status}
              style={{
                background: look.bg,
                border: `2px solid ${look.edge}`,
                borderLeftWidth: 6,
                padding: "12px 14px",
                marginTop: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ color: look.accent, fontSize: 12, opacity: 0.8, minWidth: 22 }}>{String(i + 1).padStart(2, "0")}</div>
                <div style={{ flex: 1, color: look.ink, fontSize: 15, letterSpacing: 2, textDecoration: look.strike ? "line-through" : "none" }}>
                  {p.name.toUpperCase()}
                </div>
              </div>
              <div style={{ fontSize: 12, opacity: look.body, marginTop: 6, marginLeft: 30, lineHeight: 1.45 }}>{p.desc}</div>
              <div style={{ marginTop: 8, marginLeft: 30 }}>
                <span style={{ display: "inline-block", border: `1px solid ${look.accent}`, color: look.accent, fontSize: 10, letterSpacing: 3, padding: "3px 8px", opacity: p.status === "IN PROGRESS" ? 1 : 0.7 }}>
                  {p.status}
                </span>
              </div>
            </div>
          );
        })}

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 11, opacity: 0.5, lineHeight: 1.5 }}>
          Order is the plan, not a promise of dates.
          <br />Drop the ?roadmap=1 from the address to go back to the game.
        </div>
      </div>
    </div>
  );
}
