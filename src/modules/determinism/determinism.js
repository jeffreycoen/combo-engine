// MODULE: determinism — the harness's determinism kit. One seeded stream
// for the sim (the engine's own), a second for effects the sim never
// reads, and bit-exact hashing for state. The sim stream is re-exported
// from the engine so there is exactly one; the hash fold is lifted
// VERBATIM MATH from the deadweight demo (deadweight-hangar.html lines
// 134-153), its module-scope buffer and seed constant carried whole.
import { mulberry32, worldHash } from "../../engine/core.js";

export { mulberry32 as simStream, worldHash };

// fxStream(seed): the effects draw — its own stream, decoupled by a fixed
// fold so no page can accidentally hand the sim's sequence to sparks.
export const FX_SALT = 0x9e3779b9;
export function fxStream(seed) { return mulberry32((seed ^ FX_SALT) >>> 0); }

// the hash fold, the demo's own: doubles through one buffer, FNV-1a step
const _buf = new ArrayBuffer(8);
const _dv = new DataView(_buf);
export const FNV_SEED = 0x811c9dc5;
export function hashFloats(hash, ...vals) {
  let h = hash >>> 0;
  for (const v of vals) {
    _dv.setFloat64(0, +v || 0);
    for (let i = 0; i < 8; i++) { h ^= _dv.getUint8(i); h = Math.imul(h, 0x01000193) >>> 0; }
  }
  return h >>> 0;
}
// stateHash(seed, rows): a whole state as one number — rows of plain
// numbers folded in order from the FNV seed.
export function stateHash(rows) {
  let h = FNV_SEED;
  for (const r of rows) h = hashFloats(h, ...r);
  return h >>> 0;
}
