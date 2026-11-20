// Provenance gate for the Sylva scene.
//
// The scene is authored, not generated: a 161KB HTML document and the exact
// three.js r149 minified build it was written against. Nothing in this repo
// should ever edit either file, and a silent edit would be very hard to spot
// by eye in 161KB of shader source. So the bytes are pinned here and checked
// on every build.
//
// If a hash below fails, the correct move is almost never to update the hash.
// It is to work out what touched the file.

import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const PINNED = [
  {
    path: "src/shaders/sylva-living-world/sources/inner-green-3d.html",
    bytes: 161454,
    sha256:
      "740c91aee652fd08c527f9a87cf6569355214b776a1e385c461be02f7d8d62ee",
    note: "Authored Sylva scene document. Upstream: MengTo/threeui @ b8612b5, MIT.",
  },
  {
    path: "src/shaders/sylva-living-world/sources/inner-green-assets/three.min.js",
    bytes: 608081,
    sha256:
      "8a5f7249903b54d30f79f708699d2fed2d6a1d0741a4cd41377d1f01bb5a2271",
    note:
      "three@0.149.0 build/three.min.js, verbatim from npm. The scene is pinned " +
      "to r149 — a newer three changes colour management and tone mapping and " +
      "the scene will not look the same.",
  },
  {
    path: "src/shaders/sylva-living-world/SylvaLivingWorldScene.tsx",
    bytes: 4077,
    sha256:
      "26d13ce750c3bf8ec92955255d77c7b58acf12c709a5c88fb242081ac520aca8",
    note: "Upstream scene adapter, verbatim. Wrap it, do not edit it.",
  },
];

// The adapter isolates the scene by slicing the document at these two exact
// strings. If either one drifts, buildSceneDocument throws at runtime rather
// than at build time, which means a blank hero in production. Checking them
// here turns that into a failed build.
const REQUIRED_NEEDLES = [
  '<main class="hero" id="hero">',
  '<script src="inner-green-assets/three.min.js"></script>',
  "(function loop() { requestAnimationFrame(loop); tick(); })();",
  // The immersive adapter's camera patch targets this exact authored block.
  `    camera.position.x = -smooth.x * 26;
    camera.position.y =  smooth.y * 16;
    camera.lookAt(camera.position.x * 0.42, camera.position.y * 0.42, 0);`,
  // ...and its density and pause patches target these.
  "var q = /[?&]blades=(\\d+)/.exec(location.search);",
  "    if (renderer && clock) renderFrame();",
];

let failed = 0;

for (const file of PINNED) {
  const abs = join(root, file.path);
  let buf;
  try {
    buf = readFileSync(abs);
  } catch {
    console.error(`MISSING  ${file.path}`);
    failed++;
    continue;
  }
  const size = statSync(abs).size;
  const sha = createHash("sha256").update(buf).digest("hex");
  const ok = size === file.bytes && sha === file.sha256;
  if (!ok) {
    console.error(`DRIFTED  ${file.path}`);
    console.error(`         expected ${file.bytes} bytes / ${file.sha256}`);
    console.error(`         found    ${size} bytes / ${sha}`);
    console.error(`         ${file.note}`);
    failed++;
  } else {
    console.log(`ok       ${file.path}  (${size} bytes)`);
  }
}

const html = readFileSync(
  join(root, "src/shaders/sylva-living-world/sources/inner-green-3d.html"),
  "utf8",
);
for (const needle of REQUIRED_NEEDLES) {
  const count = html.split(needle).length - 1;
  if (count !== 1) {
    console.error(
      `NEEDLE   found ${count} times, expected exactly 1: ${JSON.stringify(needle)}`,
    );
    failed++;
  } else {
    console.log(`ok       needle present once: ${needle.slice(0, 48)}...`);
  }
}

if (failed) {
  console.error(`\n${failed} provenance check(s) failed. Build stopped.`);
  process.exit(1);
}
console.log("\nSylva sources verified.");
