import { Suspense, lazy } from "react";
import "../shaders/threeui-background.css";
import "./sylva-stage.css";

// The scene component imports 161KB of authored HTML and 608KB of the three.js
// r149 runtime as raw strings, because the scene runs inside a sandboxed
// iframe with no network of its own. Importing it eagerly would put ~770KB of
// string literal into the entry chunk and hold first paint behind it, so it is
// split out: the shell paints immediately, the scene chunk streams in behind.
const SylvaLivingWorldScene = lazy(async () => {
  const mod = await import("../shaders/sylva-living-world/SylvaLivingWorldScene");
  return { default: mod.SylvaLivingWorldScene };
});

export default function SylvaStage() {
  return (
    <div className="sylva-stage">
      {/* Painted before the chunk arrives and again before the iframe's first
          frame, so the sequence is ground colour -> scene, never a flash. */}
      <div className="sylva-stage__ground" aria-hidden="true" />
      <Suspense fallback={null}>
        <SylvaLivingWorldScene variant="living-green" />
      </Suspense>
    </div>
  );
}
