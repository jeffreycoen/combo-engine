// COMBO-ENGINE — pages-test: laws over the two games served whole (phase 0.1.4).
// Coldsnap's page is built here from its own files by its own page maker and
// served from docs/coldsnap; every one of its page files stands at its own path.
// Seedless arithmetic.
import fs from "node:fs";
let pass = 0, fail = 0;
const check = (n, ok) => { if (ok) { pass++; console.log("PASS " + n); } else { fail++; console.log("FAIL " + n); } };
console.log("seeds {} — seedless arithmetic");
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "");
const PAGE_FILES = ["src/main.jsx", "src/ui/App.jsx", "src/ui/StartScreen.jsx", "src/ui/Controls.jsx", "src/depot/DepotGame.jsx", "src/depot/DraftScreen.jsx", "src/depot/Dispatch.jsx", "src/depot/InfoCard.jsx", "src/depot/Crate.jsx", "src/depot/RadialMenu.jsx", "src/depot/pies.jsx", "src/game/ColdsnapTD.jsx", "src/game/MechRange.jsx", "src/game/scenario.js", "src/render/renderer.js"];
check("pages: coldsnap's page files stand at their own paths, the war page and its panels among them", PAGE_FILES.every((p) => fs.existsSync(p)));
const shell = read("app/coldsnap/index.html"), cfg = read("vite.config.js");
check("pages: the page's shell loads coldsnap's own entry and the page maker builds it under the site's path into docs/coldsnap",
  shell.includes('src="../../src/main.jsx"') && cfg.includes('root: "app/coldsnap"') && cfg.includes('base: "/combo-engine/docs/coldsnap/"') && cfg.includes('outDir: "../../docs/coldsnap"'));
const built = read("docs/coldsnap/index.html");
const scripts = [...built.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
check("pages: the built page exists and loads its built script from the site's path", built.length > 0 && scripts.length > 0 && scripts.every((s) => s.startsWith("/combo-engine/docs/coldsnap/assets/") && fs.existsSync("docs/coldsnap/assets/" + s.split("/assets/")[1])));
console.log(`pages-test: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
console.log("pages-test PASS");
