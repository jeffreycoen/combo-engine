import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

// Shader chunks three r128 ships that no material in this repo reaches.
// Blanked at build time; the guard below keeps the miss loud if a new
// material joins. Un-blank by deleting the entry.
const BLANK = [
  "lightmap_fragment", "lights_lambert_vertex", "envmap_physical_pars_fragment",
  "lights_phong_fragment", "lights_phong_pars_fragment", "lights_physical_fragment",
  "lights_physical_pars_fragment", "map_particle_fragment", "map_particle_pars_fragment",
  "metalnessmap_fragment", "metalnessmap_pars_fragment", "clearcoat_normal_fragment_begin",
  "clearcoat_normal_fragment_maps", "clearcoat_pars_fragment", "roughnessmap_fragment",
  "roughnessmap_pars_fragment", "shadowmask_pars_fragment", "transmissionmap_fragment",
  "transmissionmap_pars_fragment", "meshlambert_frag", "meshlambert_vert", "meshmatcap_frag",
  "meshmatcap_vert", "meshphong_frag", "meshphong_vert", "meshphysical_frag", "meshphysical_vert",
  "vsm_frag", "vsm_vert", "points_vert", "points_frag", "sprite_vert", "sprite_frag",
  "background_vert", "background_frag", "cube_vert", "cube_frag", "equirect_vert",
  "equirect_frag", "shadow_vert", "shadow_frag", "distanceRGBA_vert", "distanceRGBA_frag",
];

// Classes whose shaders are blanked above. One of these in src/ stops the
// build with the fix named, instead of shipping a black render.
const FORBIDDEN = /THREE\.(MeshStandardMaterial|MeshPhysicalMaterial|MeshLambertMaterial|MeshPhongMaterial|MeshMatcapMaterial|PointsMaterial|SpriteMaterial|ShadowMaterial|Points|Sprite|PointLight|VSMShadowMap|CubeTextureLoader|WebGLCubeRenderTarget|EquirectangularReflectionMapping|EquirectangularRefractionMapping)\b/;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(js|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const threeTrim = {
  name: "three-trim",
  enforce: "pre",
  buildStart() {
    for (const f of walk(path.resolve("src"))) {
      const hit = fs.readFileSync(f, "utf8").match(FORBIDDEN);
      if (hit) throw new Error(
        `three-trim: ${hit[0]} appears in ${f}, but its shaders are blanked. ` +
        `Remove its chunks from BLANK in vite.config.js before using it.`);
    }
  },
  transform(code, id) {
    if (!id.includes("three.module.js")) return null;
    for (const u of BLANK) {
      code = code.replace(new RegExp(`^var ${u} = "(?:[^"\\\\]|\\\\.)*";`, "m"), `var ${u} = "";`);
    }
    code = code.replace(/console\.(warn|error)\(/g, "(void 0)&&(");
    return { code, map: null };
  },
};

// Served at https://jeffreycoen.github.io/combo-engine/docs/coldsnap/ (phase 0.1.4: the page whole, built here; root, base, and the output are the substitutions)
export default defineConfig({
  root: "app/coldsnap",
  base: "/combo-engine/docs/coldsnap/",
  plugins: [threeTrim, react()],
  build: {
    outDir: "../../docs/coldsnap",
    emptyOutDir: true,
    minify: "terser",
    terserOptions: { compress: { passes: 2 }, format: { comments: false } },
    modulePreload: { polyfill: false },
  },
});
