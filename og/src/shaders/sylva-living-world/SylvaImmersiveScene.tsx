// The journey adapter. A sibling of the upstream SylvaLivingWorldScene, not an
// edit of it: that file stays byte-exact and hash-pinned, and this one applies
// the same isolation slices plus three patches of its own, using the upstream's
// own technique — exact-string replacement on the authored document, with a
// throw if any needle has drifted (and scripts/verify-sources.mjs pins the
// needles at build time, so drift fails the build rather than the visitor).
//
// The three patches:
//   1. A message bridge. The iframe is sandboxed with allow-scripts only — an
//      opaque origin the page cannot reach into. postMessage is the one legal
//      channel, so a small script inside the frame listens for travel and
//      pointer messages.
//   2. A camera dolly. The authored camera sits at z = DIST (1400) looking at
//      the roots around z = 0. The patch adds a travel term driven by the
//      bridge: scroll progress flies the camera from 1400 down to 620, in
//      under the arch, easing its gaze toward the far root at z = -260.
//      Pointer parallax shrinks as you go deeper, like focus narrowing.
//   3. Pointer forwarding. The iframe element itself is pointer-events:none so
//      the page can scroll over it — which means the scene would never see the
//      cursor. The bridge re-dispatches forwarded pointer events inside the
//      frame, so the moss still parts and the pollen still trails.

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MutableRefObject,
} from "react";
import innerGreenSource from "./sources/inner-green-3d.html?raw";
import threeRuntime from "./sources/inner-green-assets/three.min.js?raw";

export type SylvaSceneApi = {
  setTravel: (t: number) => void;
  pointer: (kind: string, x: number, y: number) => void;
  pause: (on: boolean) => void;
};

export type SylvaImmersiveSceneProps = {
  apiRef?: MutableRefObject<SylvaSceneApi | null>;
  onReady?: () => void;
  /** Fires once the scene has actually rendered frames, not merely loaded. */
  onPainted?: () => void;
  className?: string;
  style?: CSSProperties;
};

const SCENE_ONLY_MARKUP = `<main class="hero" id="hero"><canvas id="scene" role="img" aria-label="A living moss world"></canvas><div class="stage" id="stage" aria-hidden="true"></div></main>`;

const SCENE_ONLY_STYLE = `<style data-threeui-sylva-scene>html,body{width:100%!important;height:100%!important;min-height:0!important;margin:0!important;overflow:hidden!important}body{position:relative!important;background:#4a4d44!important}.hero{height:100%!important;min-height:0!important}#scene{pointer-events:auto!important}</style>`;

const BRIDGE_SCRIPT = `<script data-portfolio-bridge>
"use strict";
window.__journey = { t: 0, cur: 0 };
// Counted inside the render call itself, so "painted" means the scene really
// has put frames on the screen, not merely that the document loaded.
window.__painted = 0;
window.addEventListener("message", function (e) {
  var d = e.data;
  if (!d || typeof d !== "object") return;
  if (d.type === "sylva:travel" && typeof d.t === "number") {
    window.__journey.t = d.t < 0 ? 0 : d.t > 1 ? 1 : d.t;
  } else if (d.type === "sylva:pause") {
    window.__journey.pause = !!d.on;
  } else if (d.type === "sylva:pointer" && typeof d.kind === "string") {
    try {
      window.dispatchEvent(new PointerEvent(d.kind, {
        clientX: d.x, clientY: d.y, pointerType: "mouse", bubbles: true,
      }));
    } catch (err) { /* very old engines only; the scene just loses parallax */ }
  }
});
</scr` + `ipt>`;

// The authored per-frame camera block, verbatim. If upstream ever changes it,
// replaceRequired throws and the build (which smoke-loads this module) fails.
const CAMERA_NEEDLE = `    camera.position.x = -smooth.x * 26;
    camera.position.y =  smooth.y * 16;
    camera.lookAt(camera.position.x * 0.42, camera.position.y * 0.42, 0);`;

// End of the ride: z = 1400 - 780 = 620, nestled in under the arch with the
// limbs filling the frame. Deeper than ~600 the geometry grows past the
// frustum edges and the frame empties into fog — flown PAST the world, which
// reads as broken, not cinematic. Measured, not guessed: see shots/journey-*.
const CAMERA_PATCH = `    var __j = window.__journey || { t: 0, cur: 0 };
    __j.cur += (__j.t - __j.cur) * 0.22;
    if (Math.abs(__j.t - __j.cur) < 0.0005) __j.cur = __j.t;
    var __d = __j.cur, __par = 1 - __d * 0.4;
    camera.position.x = -smooth.x * 26 * __par;
    camera.position.y =  smooth.y * 16 * __par + __d * 18;
    camera.position.z = DIST - __d * 780;
    camera.lookAt(camera.position.x * 0.42, camera.position.y * 0.42, -__d * 380);`;

const LOOP_NEEDLE = "(function loop() { requestAnimationFrame(loop); tick(); })();";

// The scene's own authored density override reads location.search — which is
// empty inside a srcDoc frame, always. Threading the page's ?blades= through
// restores it: a test harness on a software rasteriser needs it to run at all,
// and a visitor on weak hardware gets a working dial for free.
// Lets the page stop the render loop when the scene is fully covered by the
// second act — no reason to draw 190k blades under an opaque section.
const RENDER_NEEDLE = "    if (renderer && clock) renderFrame();";
const RENDER_PATCH = [
  "    if (renderer && clock && !(window.__journey && window.__journey.pause)) {",
  "      renderFrame();",
  "      if (window.__painted !== undefined && ++window.__painted === 80) {",
  "        try { parent.postMessage({ type: 'sylva:painted' }, '*'); } catch (e) {}",
  "      }",
  "    }",
].join("\n");

const BLADES_NEEDLE = "var q = /[?&]blades=(\\d+)/.exec(location.search);";
const BLADES_PATCH =
  "var q = /[?&]blades=(\\d+)/.exec(window.__blades ? \"?blades=\" + window.__blades : location.search);";

function replaceRequired(source: string, needle: string, replacement: string) {
  if (!source.includes(needle)) {
    throw new Error(
      `Sylva immersive adapter: authored source drifted, needle missing: ${needle.slice(0, 64)}`,
    );
  }
  return source.replace(needle, replacement);
}

function buildImmersiveDocument(reducedMotion: boolean) {
  const presentationStart = innerGreenSource.indexOf('<main class="hero" id="hero">');
  const runtimeStart = innerGreenSource.indexOf(
    '<script src="inner-green-assets/three.min.js"></script>',
  );
  if (presentationStart < 0 || runtimeStart < 0 || runtimeStart <= presentationStart) {
    throw new Error("Sylva immersive adapter could not isolate the authored scene.");
  }
  let source = `${innerGreenSource.slice(0, presentationStart)}${SCENE_ONLY_MARKUP}\n\n${innerGreenSource.slice(runtimeStart)}`;
  source = replaceRequired(source, "</head>", `${SCENE_ONLY_STYLE}</head>`);
  source = replaceRequired(
    source,
    '<script src="inner-green-assets/three.min.js"></script>',
    `${BRIDGE_SCRIPT}\n<script data-threeui-three-runtime>${threeRuntime}</script>`,
  );
  source = replaceRequired(source, CAMERA_NEEDLE, CAMERA_PATCH);
  source = replaceRequired(source, BLADES_NEEDLE, BLADES_PATCH);
  source = replaceRequired(source, RENDER_NEEDLE, RENDER_PATCH);
  const blades =
    typeof window !== "undefined"
      ? /[?&]blades=(\d+)/.exec(window.location.search)?.[1]
      : undefined;
  if (blades) {
    // Injected after the painted counter, which is a single unique line.
    source = replaceRequired(
      source,
      "window.__painted = 0;",
      `window.__painted = 0;\nwindow.__blades = ${JSON.stringify(blades)};`,
    );
  }

  if (reducedMotion) {
    // Upstream's own reduced-motion patch: the loop never re-arms, so the
    // authored still frame is the scene. Travel simply doesn't happen, which
    // is the correct reading of prefers-reduced-motion for a camera flight.
    source = replaceRequired(
      source,
      LOOP_NEEDLE,
      "(function loop() { if (!REDUCED) requestAnimationFrame(loop); tick(); })();",
    );
  }
  return source;
}

export function SylvaImmersiveScene({
  apiRef,
  onReady,
  onPainted,
  className = "",
  style,
}: SylvaImmersiveSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Resent on load so a rebuild (reduced-motion flip is the only one left)
  // resumes at the same depth. The scene is NOT unmounted on tab hide: a
  // hidden tab pauses requestAnimationFrame by itself, so tearing down only
  // forced the whole 190k-blade rebuild — and the entrance scan — on return.
  const lastTravel = useRef(0);
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!onPainted) return;
    const onMsg = (e: MessageEvent) => {
      if (e.source === iframeRef.current?.contentWindow && e.data?.type === "sylva:painted") {
        onPainted();
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [onPainted]);

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = {
      setTravel(t) {
        lastTravel.current = t;
        iframeRef.current?.contentWindow?.postMessage({ type: "sylva:travel", t }, "*");
      },
      pointer(kind, x, y) {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "sylva:pointer", kind, x, y },
          "*",
        );
      },
      pause(on) {
        iframeRef.current?.contentWindow?.postMessage({ type: "sylva:pause", on }, "*");
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef]);

  const source = useMemo(() => buildImmersiveDocument(reducedMotion), [reducedMotion]);

  return (
    <div
      ref={hostRef}
      className={`threeui-background sylva-living-world-scene${className ? ` ${className}` : ""}`}
      style={{ background: "#4a4d44", ...style }}
    >
      <iframe
          ref={iframeRef}
          key={reducedMotion ? "reduced" : "motion"}
          title="A living moss world"
          srcDoc={source}
          sandbox="allow-scripts"
          loading="eager"
          onLoad={() => {
            iframeRef.current?.contentWindow?.postMessage(
              { type: "sylva:travel", t: lastTravel.current },
              "*",
            );
            onReady?.();
          }}
          style={{
            position: "absolute",
            inset: 0,
            display: "block",
            width: "100%",
            height: "100%",
            border: 0,
            background: "#4a4d44",
            pointerEvents: "none",
          }}
      />
    </div>
  );
}
