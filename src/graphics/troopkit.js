// Troop identity (DEPOT only) — "side by coat, role by tool, weight by size".
//
// PURE and DETERMINISTIC by contract: troopKit() reads nothing but a body's
// team / utype / tag / role / dress / alive / kneel flags. No rng, no world.t, no
// module state. That is what lets scripts/depot-test.mjs pin every unit
// type's look headlessly, and what keeps the renderer's instance writes
// frame-stable.
//
// GATING: the renderer calls this ONLY under world.depotCombat. Every other
// mode (frozen demo, sandbox, tower defense, campaign, mech range) takes the
// KIT_PLAIN path below, which is the pre-mk0.23 look exactly: con/gren
// palette by utype, unit body scale, rifle at scale 1, and every spare prop
// slot written at ZERO scale (a degenerate instance rasterizes nothing).
//
// Geometry note (the part table's three spare slots): INFANTRY.con carries
// prop/prop2/prop3, each a plain 0.1m cube with NO preRot. Because the
// instance matrix is T * R(q) * S, scale lands in the geometry's own frame
// and rotation is applied rigidly afterwards — so an un-preRot'd box can be
// stretched into any tube and THEN aimed without shearing. The rifle, by
// contrast, has its preRot baked into its vertices, so scaling it
// non-uniformly SHEARS it (a 2.6x-fat, 0.62x-short rifle does not read as a
// short thick gun — it reads as a rifle that has fallen over). Hence:
//   - the rifle only ever takes a UNIFORM scale factor here, and
//   - anything that must sit on / along the barrel is a prop with
//     aim: "barrel", which the renderer rotates by the rifle's real preRot
//     quaternion and positions along the real barrel axis (see barrelBasis).

// The rifle's baked preRot, mirrored from INFANTRY.con's rifle entry. The
// renderer asserts these agree at build time (see renderer.js).
export const RIFLE_PREROT = [0.9, 0.2, 0.25];
export const RIFLE_OFF = [-0.1, 0.19, -0.26];
export const RIFLE_LEN = 0.9;

// barrelBasis(preRot): the rifle geometry's local +Z (down the barrel) and
// +Y (up off the barrel) expressed in UNIT-LOCAL space, derived from the
// same Rz*Ry*Rx composition three.js bakes when the pool is built
// (g.rotateX then rotateY then rotateZ => v' = Rz Ry Rx v). Computed, not
// eyeballed — this is the "real preRot math".
export function barrelBasis(preRot = RIFLE_PREROT) {
  const [rx, ry, rz] = preRot;
  const ap = (v) => {
    let [x, y, z] = v;
    // Rx
    let c = Math.cos(rx), s = Math.sin(rx);
    [y, z] = [y * c - z * s, y * s + z * c];
    // Ry
    c = Math.cos(ry); s = Math.sin(ry);
    [x, z] = [x * c + z * s, -x * s + z * c];
    // Rz
    c = Math.cos(rz); s = Math.sin(rz);
    [x, y] = [x * c - y * s, x * s + y * c];
    return [x, y, z];
  };
  return { fwd: ap([0, 0, 1]), up: ap([0, 1, 0]) };
}

const B = barrelBasis();
// point on the barrel: rifle origin + t along the barrel axis + n off it
const onBarrel = (t, n = 0) => [
  RIFLE_OFF[0] + B.fwd[0] * t + B.up[0] * n,
  RIFLE_OFF[1] + B.fwd[1] * t + B.up[1] * n,
  RIFLE_OFF[2] + B.fwd[2] * t + B.up[2] * n,
];
// The barrel's +Z end points BEHIND the shooter (fwd has +z, and the rifle
// hangs at z = -0.26, i.e. in front), so the muzzle lies at NEGATIVE t.
const MUZZLE = -RIFLE_LEN / 2;

// ---- the props ------------------------------------------------------
// s[] is a multiplier on the 0.1m prop cube. aim:"barrel" => the renderer
// composes the body quaternion with the rifle's preRot quaternion; tilt =>
// [axis(0=x,1=y,2=z), radians] applied about a unit-local axis.
const SCOPE = { off: onBarrel(-0.10, 0.055), s: [0.75, 0.75, 2.6], aim: "barrel" };
// the long rifle: the stock rifle stays scale 1 (no shear) and the extra
// reach is a second barrel segment butted onto its muzzle
const LONGBARREL = { off: onBarrel(MUZZLE - 0.22), s: [0.4, 0.4, 4.4], aim: "barrel" };
const SATCHEL = { off: [0, 0.10, -0.22], s: [2.2, 1.6, 0.8] };
// P7.2 T6 (owner): the medic's dress — white uniform, red cross front and
// back, black bag. The two cross bars pass THROUGH the torso and protrude
// on both faces, so one pair of props reads as a cross from either side.
// role is the COLOR key (the renderer and portrait honor it over the part
// slot's own): "gun" paints the bag black, "acc" paints the bars red off
// the medic palette below. Offsets are look dials — the owner's eye rules.
const MEDIC_BAG = { off: [0.17, 0.02, 0.0], s: [1.4, 1.8, 1.1], role: "gun" };
const CROSS_V = { off: [0, 0.32, 0], s: [0.7, 2.6, 2.9], role: "acc" };
const CROSS_H = { off: [0, 0.32, 0], s: [2.2, 0.7, 2.9], role: "acc" };
const TOOLBOX = { off: [0.17, 0.0, 0.05], s: [1.6, 1.2, 1.0], role: "gun" }; // P7.2 T7: the mechanic's black box — side coats stay, the tool is the identity
// mk2.12 (owner): THE ATOMIC CREW'S DRESS — orange jumpsuits, the radiation
// mark. The mark is a yellow chest placard with a black center (box props
// cannot draw lobes; the owner's eye rules the placard live). The tube is
// the mortar's carried-prop idiom, fatter. // provisional (F5), every hex
export const DAVY_HEX = { dom: 0xe8791e, sec: 0xb45510, acc: 0xf5d020, gun: 0x141414 };
const DAVY_TUBE = { off: [0.26, 0.28, 0.06], s: [2.2, 12, 2.2], tilt: [0, 0.42] };
const DAVY_PLATE = { off: [0, 0.28, 0.17], s: [1.8, 1.8, 0.5], role: "acc" };
const DAVY_MARK = { off: [0, 0.28, 0.21], s: [0.9, 0.9, 0.3], role: "gun" };
// The medic palette, plain hexes, one home — the renderer's mkPal and the
// portrait's material pick both consume it (spread over the con palette, so
// skin and any unnamed role inherit). // provisional (F5) — the owner's eye
export const MEDIC_HEX = { dom: 0xf4f6f8, sec: 0xe2e7ec, acc: 0xd0342c, gun: 0x1a1c1f };
const MORTAR_TUBE = { off: [0.26, 0.30, 0.06], s: [1.6, 11, 1.6], tilt: [0, 0.42] };
// MG: a SHORT gun (uniform 0.8 on the rifle) with a thick receiver sleeved
// over it, standing on a real two-leg bipod — two separate legs splayed
// +/-0.45 rad about unit-local Z under the muzzle, not one flat slab.
const MG_RECEIVER = { off: onBarrel(0.02), s: [1.6, 1.6, 3.2], aim: "barrel" };
const MG_MUZZLE = onBarrel(MUZZLE * 0.8);
const LEG_A = 0.45, LEG_L = 0.34;
const legOff = (sign) => [
  MG_MUZZLE[0] + sign * Math.sin(LEG_A) * (LEG_L / 2),
  MG_MUZZLE[1] - Math.cos(LEG_A) * (LEG_L / 2),
  MG_MUZZLE[2],
];
const MG_LEG_L = { off: legOff(-1), s: [0.3, 3.4, 0.3], tilt: [2, -LEG_A] };
const MG_LEG_R = { off: legOff(1), s: [0.3, 3.4, 0.3], tilt: [2, LEG_A] };

const P = (a, b, c) => [a || null, b || null, c || null];
const KIT_PLAIN = { rifle: 1, props: P() };
const KIT_NONE = { rifle: 0, props: P() };
const KIT_SNIPER = { rifle: 1, props: P(SCOPE, LONGBARREL) };
const KIT_SAPPER = { rifle: 0, props: P(SATCHEL) };
const KIT_MORTAR = { rifle: 0, props: P(MORTAR_TUBE) };
const KIT_MG = { rifle: 0.8, props: P(MG_RECEIVER, MG_LEG_L, MG_LEG_R) };
const KIT_MEDIC = { rifle: 0, props: P(MEDIC_BAG, CROSS_V, CROSS_H) };
const KIT_MECHANIC = { rifle: 0, props: P(TOOLBOX) };
const KIT_DAVY = { rifle: 0, props: P(DAVY_TUBE, DAVY_PLATE, DAVY_MARK) };

// ---- bulk -----------------------------------------------------------
// mk2.02: the heavy and fast frames died with their troops — one 2m frame,
// kit palettes carry identity.
const BULK = {};

/**
 * troopKit(b, depot) -> { pal, bw, bh, rifle, props }
 *   pal   "con" | "gren" | null (null = the body's android dress wins)
 *   bw/bh body-width / body-height multipliers (offsets and part scales)
 *   rifle uniform scale factor on the rifle part (0 hides it)
 *   props [propA, propB, propC], each null or {off,s,aim?,tilt?}
 *
 * @param b     a kind:"unit" body
 * @param depot true only under world.depotCombat
 * @param sil   true in the fog seam: generic shape, bulk only
 */
export function troopKit(b, depot, sil = false) {
  const gren = b.utype === "gren" || b.utype === "grenadiers";
  const base = gren ? "gren" : "con";
  if (!depot) return { pal: base, bw: 1, bh: 1, rifle: 1, props: KIT_PLAIN.props };
  // COAT = SIDE (DEPOT only): the player's infantry keep the warm rust coat,
  // the enemy's wear the cold slate one. The enemy grenadier already wore
  // slate, so he is unchanged; androids ignore both and keep their silver.
  const pal = (b.utype === "medics" || b.tag === "medic") ? "medic"
    : (b.utype === "davy" || b.tag === "davy") ? "davy" // mk2.12: the orange outranks the coat — both sides' atomic crews
    : gren || b.team === 2 ? "gren" : "con"; // P7.2 T6 (owner): the cross outranks the coat — both sides' medics wear the white
  const bulk = BULK[b.tag] || null;
  let bw = bulk ? bulk[0] : 1, bh = bulk ? bulk[1] : 1;
  // P7.2 T6/T7: the kneel — the medic and the mechanic drop low while
  // working. One flag, read here only; render-only theater.
  if (b.kneel && (b.utype === "medics" || b.tag === "medic" || b.utype === "mechanics" || b.tag === "mechanic")) bh *= 0.72;
  if (sil) return { pal, bw, bh, rifle: 1, props: KIT_PLAIN.props }; // fog: bulk only
  let k = KIT_PLAIN;
  if (gren) k = KIT_PLAIN;                                    // grenadier: own table, own tube
  else if (b.role === "spotter") k = KIT_PLAIN;               // spotter: the pair look owns him
  else if (b.utype && b.utype !== "gren") {
    // player squads (utype = squad type)
    k = b.utype === "sniper" ? KIT_SNIPER
      : b.utype === "mg" ? (b.role === "loader" ? KIT_NONE : KIT_MG)
      : b.utype === "sappers" ? KIT_SAPPER
      : b.utype === "mortars" ? KIT_MORTAR
      : b.utype === "medics" ? KIT_MEDIC
      : b.utype === "mechanics" ? KIT_MECHANIC
      : b.utype === "davy" ? KIT_DAVY
      : KIT_PLAIN;                                            // rifles
  } else {
    // enemy waves (tag)
    k = b.tag === "sniper" ? KIT_SNIPER                       // marksman
      : b.tag === "sapper" ? KIT_SAPPER
      : b.tag === "medic" ? KIT_MEDIC
      : b.tag === "mechanic" ? KIT_MECHANIC
      : b.tag === "davy" ? KIT_DAVY
      : KIT_PLAIN;                                            // conscript, rocket, mortar
  }
  return { pal, bw, bh, rifle: k.rifle, props: k.props };
}
