// MODULE: telemetry — per-joint load telemetry as an engine output. The
// engine's welds and hinges already measure force, torque, the four load
// components, utilization, peak, damage, and saturation every substep;
// this module shapes those fields into one flags-socket row per mount, so
// a page, a log, or a gate reads the machine's own numbers without
// touching the physics. SHAPED, riding the landed physics module. Pure
// reads; nothing here writes a joint.
import { vlen } from "../physics-pb/physics.js";

// jointLoads(joints) -> one row per mount, the fields the solver wrote.
export function jointLoads(joints) {
  const rows = [];
  for (const name in joints) {
    const j = joints[name];
    rows.push({
      name,
      broken: !!j.broken,
      util: j.util || 0,
      peakUtil: j.peakUtil || 0,
      damage: j.damage || 0,
      force: j.F ? vlen(j.F) : 0,
      torque: j.T ? vlen(j.T) : 0,
      axial: j.Fax || 0, shear: j.Fsh || 0, bend: j.Mb || 0, torsion: j.Mt || 0,
      angle: j.angle !== undefined ? j.angle : null,
      saturated: j.saturated !== undefined ? !!j.saturated : null,
    });
  }
  return rows;
}

// worstMount(rows) -> the row nearest its tear line, broken rows first.
export function worstMount(rows) {
  let worst = null;
  for (const r of rows) {
    if (worst === null) { worst = r; continue; }
    if (r.broken !== worst.broken) { if (r.broken) worst = r; continue; }
    if (r.util > worst.util) worst = r;
  }
  return worst;
}
