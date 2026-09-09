// GRAVITY'S ARK — seed.js: the seed export, one button on every screen. The
// button copies the page's own address with the seed in it, so a bug report
// starts as one paste. The page's main file takes only the hookup line.
export function seedAddress(seed) {
  return location.origin + location.pathname + "?seed=" + seed;
}
// wireSeed(seed, opts): opts.buttons names the button ids to wire; opts.log
// takes one line to show. Copies through the clipboard when the browser
// allows it, and falls back to a prompt the player can copy from.
export function wireSeed(seed, opts) {
  const address = seedAddress(seed);
  const say = (line) => { if (opts && opts.log) opts.log(line); };
  const copy = async () => {
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(address); say("seed " + seed + " copied: " + address); return true; } } catch (e) { /* fall through to the prompt */ }
    prompt("Copy the address with the seed:", address);
    say("seed " + seed + ": " + address);
    return false;
  };
  for (const id of (opts && opts.buttons) || []) { const b = document.getElementById(id); if (b) b.onclick = (e) => { e.preventDefault(); copy(); }; }
  return { address, copy };
}
