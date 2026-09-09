// mechReadout.js — the mech readout: a drawn silhouette with one dot per
// joint, colored green through red by servo effort, refreshed every frame;
// tapping it (or B) opens the full numeric table. Stop impacts flash their
// joint and hold the number until the table is opened. Reads engine state,
// writes nothing.
import { FONT } from "../ui/theme.js";

const W = 108, H = 156;
// silhouette anchor per joint name, canvas pixels (machine faces the viewer:
// its left side draws on the right, matching the bench camera)
const P = {
  waist: [54, 30],
  LarmSwing: [92, 38], RarmSwing: [16, 38],
  LhipYaw: [68, 60], RhipYaw: [40, 60],
  LhipRoll: [68, 72], RhipRoll: [40, 72],
  LhipPitch: [68, 84], RhipPitch: [40, 84],
  Lknee: [68, 110], Rknee: [40, 110],
  LanklePitch: [68, 134], RanklePitch: [40, 134],
  LankleRoll: [68, 146], RankleRoll: [40, 146],
};
const wrapPi = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

export function makeMechReadout() {
  const box = document.createElement("div");
  box.style.cssText = "position:absolute;left:12px;top:108px;width:" + W + "px;height:" + H + "px;background:rgba(16,20,26,0.55);border:1px solid #5f6e80;touch-action:none;cursor:pointer;";
  const cv = document.createElement("canvas");
  cv.width = W * 2; cv.height = H * 2; // crisp on phone screens
  cv.style.cssText = "width:100%;height:100%;display:block;";
  box.appendChild(cv);
  const g = cv.getContext("2d");
  g.scale(2, 2);
  const table = document.createElement("div");
  table.style.cssText = "position:absolute;inset:0;background:rgba(8,10,14,0.92);color:#c7d0dc;font-family:" + FONT + ";font-size:12px;letter-spacing:1px;padding:14px;overflow:auto;display:none;z-index:20;";
  const pre = document.createElement("pre");
  pre.style.cssText = "margin:0;font-family:inherit;white-space:pre;";
  table.appendChild(pre);
  document.body.appendChild(box);
  document.body.appendChild(table);
  let open = false;
  const spikes = {}; // joint name -> { v: worst stop impact seen unread, t: flash clock }
  const seen = {};   // joint name -> stopImp already accounted for
  const toggle = () => {
    open = !open;
    table.style.display = open ? "block" : "none";
    if (open) for (const k of Object.keys(spikes)) delete spikes[k]; // looked at
  };
  const onDown = (e) => { e.stopPropagation(); toggle(); };
  box.addEventListener("pointerdown", onDown);
  table.addEventListener("pointerdown", onDown);
  const eff = (j) => Math.min(1, Math.abs(j._mAcc || 0) / Math.max(1e-9, j._mBudget || 1e-9));
  function update(world, mech, dt) {
    const dtw = world.dt;
    // spikes: a stop impact grows stopImp — hold the new worst until looked at
    for (const j of mech.joints) {
      const prev = seen[j.name] || 0;
      if (j.stopImp > prev + 1) {
        spikes[j.name] = { v: j.stopImp, t: 1 };
        seen[j.name] = j.stopImp;
      }
    }
    // the head weld: the machine's one breakable — flash on break, hold
    // until looked at, stay red after
    const hb = mech.headWeld && mech.headWeld.broken;
    if (hb && !seen.head) { spikes.head = { v: 0, t: 1 }; seen.head = 1; }
    if (!hb) seen.head = 0;
    // silhouette
    g.clearRect(0, 0, W, H);
    g.strokeStyle = "#44505f";
    g.strokeRect(34, 16, 40, 28);          // torso slab
    g.beginPath();                          // leg lines
    g.moveTo(68, 60); g.lineTo(68, 146);
    g.moveTo(40, 60); g.lineTo(40, 146);
    g.moveTo(34, 44); g.lineTo(16, 38);    // arms
    g.moveTo(74, 44); g.lineTo(92, 38);
    g.stroke();
    const spH = spikes.head;
    if (spH) spH.t = spH.t > 0.5 ? spH.t - 0.04 : 1;
    g.strokeStyle = hb ? (spH && spH.t > 0.75 ? "#ffffff" : "#e06a5e") : "#44505f";
    g.strokeRect(46, 4, 16, 10); // the head, red once its weld is broken
    for (const j of mech.joints) {
      const p = P[j.name];
      if (!p) continue;
      const r = eff(j);
      const sp = spikes[j.name];
      if (sp) sp.t = sp.t > 0.5 ? sp.t - 0.04 : 1; // pulse
      g.fillStyle = sp && sp.t > 0.75 ? "#ffffff" : "hsl(" + Math.round(120 * (1 - r)) + ",70%,50%)";
      g.beginPath();
      g.arc(p[0], p[1], sp ? 5 : 3.5, 0, Math.PI * 2);
      g.fill();
      if (sp) {
        g.fillStyle = "#e8d9b8";
        g.font = "8px " + FONT;
        g.fillText((sp.v / 1000).toFixed(0) + "k", p[0] + 7, p[1] + 3);
      }
    }
    if (!open) return;
    // the table, rebuilt as one text block each frame
    const st = mech.state, hull = mech.hull;
    const Wt = mech.mass * world.gravity;
    let m = 0, cx = 0, cy = 0, cz = 0, vx = 0, vz = 0;
    for (const b of mech.links) { m += b.mass; cx += b.mass * b.pos.x; cy += b.mass * b.pos.y; cz += b.mass * b.pos.z; vx += b.mass * b.v.x; vz += b.mass * b.v.z; }
    cx /= m; cy /= m; cz /= m; vx /= m; vz /= m;
    const gy = world.field.heightAt(hull.pos.x, hull.pos.z);
    const om = Math.sqrt(world.gravity / Math.max(0.5, cy - gy));
    const fmx = (st.prints.L.x + st.prints.R.x) / 2, fmz = (st.prints.L.z + st.prints.R.z) / 2;
    const exi = Math.hypot(cx + vx / om - fmx, cz + vz / om - fmz);
    const D = 180 / Math.PI;
    const pad = (s, n) => String(s).padStart(n);
    let out = "JOINT         ANG    RATE     TQ  CEIL   STOP  SHEAR\n";
    out += "            (deg)  (d/s)  (kNm)   (%)  (kNm)   (kN)\n";
    for (const j of mech.joints) {
      out += j.name.padEnd(11)
        + pad((j.angle * D).toFixed(1), 7)
        + pad((j.wRel * D).toFixed(0), 7)
        + pad(((j._mAcc || 0) / dtw / 1000).toFixed(1), 7)
        + pad((eff(j) * 100).toFixed(0), 6)
        + pad((j.stopImp / 1000).toFixed(1), 7)
        + pad(((j.shearPk || 0) / 1000).toFixed(0), 7) + "\n";
    }
    out += "\nLEG      LOAD(%W)  STATE\n";
    for (const sd of ["L", "R"]) {
      const lg = mech.legs[sd];
      out += (sd + " foot").padEnd(9) + pad((lg.load / Wt * 100).toFixed(0), 8)
        + "  " + (lg.load > 0.04 * Wt ? "loaded" : "airborne") + "\n";
    }
    out += "\nNOZZLE   CMD   BURN   AIM(deg)\n";
    for (let i = 0; i < (mech.thrusters || []).length; i++) {
      const th = mech.thrusters[i];
      const ec = th.eC || th.e;
      const da = Math.acos(Math.max(-1, Math.min(1, ec.x * th.e.x + ec.y * th.e.y + ec.z * th.e.z))) * D;
      out += ("#" + (i + 1)).padEnd(9) + pad(th.cmd.toFixed(2), 4) + pad(th.cur.toFixed(2), 7) + pad(da.toFixed(0), 10) + "\n";
    }
    out += "\nFRAME\n";
    out += "mode " + st.mode + (st.phases && st.phases[st.pi] ? " / " + st.phases[st.pi].kind : "") + "\n";
    out += "upright " + hull.R[4].toFixed(3) + "   balance excursion " + exi.toFixed(2) + " m\n";
    out += "head weld " + (hb ? "BROKEN" : "holding") + "\n";
    out += "heading error " + (wrapPi(st.headingT - st.heading) * D).toFixed(1) + " deg\n";
    out += "stabilizer " + (st._thrA ? "TROUBLE" : "calm") + "   jet heat " + ((mech.jetHeat || 0) * 100).toFixed(0) + "%\n";
    out += "governor " + (st.govF != null ? st.govF.toFixed(2) : "off") + "   cadence " + (st.cadence || 1).toFixed(2) + "\n";
    out += "steps " + mech.telem.steps + "   catches " + mech.telem.catches + "   falls " + mech.telem.falls + "\n";
    void dt;
    pre.textContent = out;
  }
  function dispose() {
    box.removeEventListener("pointerdown", onDown);
    table.removeEventListener("pointerdown", onDown);
    box.remove(); table.remove();
  }
  return { update, toggle, dispose };
}
