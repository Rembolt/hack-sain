"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { RegionalScene } from "@/components/city-3d/regional-scene";
import { CAMERA } from "@/components/city-3d/scene-model";
import type { RegionalCityCanvasProps } from "@/components/city-3d/scene-types";

/**
 * Browser-only WebGL renderer for the regional complaint city. Rendering is
 * continuous only while playback runs with motion allowed; otherwise frames
 * are drawn on demand until transitions settle.
 */
export function RegionalCityCanvas({ onContextLost, ...scene }: RegionalCityCanvasProps) {
  const contextLost = useRef(onContextLost);
  useEffect(() => {
    contextLost.current = onContextLost;
  }, [onContextLost]);
  const hubLabel = useRef<HTMLDivElement>(null);
  const featuredTag = useRef<HTMLSpanElement>(null);
  const labels = useMemo(() => ({ hub: hubLabel, featured: featuredTag }), []);
  const featuredKey = scene.featuredContext
    ? scene.houses.find((house) => house.featured)?.key
    : undefined;
  const animate = scene.motion.running && !scene.motion.reducedMotion;

  return (
    <>
      <Canvas
        shadows="percentage"
        flat
        dpr={[1, 1.75]}
        frameloop={animate ? "always" : "demand"}
        camera={{ fov: CAMERA.fov, near: 0.5, far: 160, position: [0, 20, 22] }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener(
            "webglcontextlost",
            (event) => {
              event.preventDefault();
              contextLost.current?.();
            },
            { once: true },
          );
        }}
      >
        <RegionalScene {...scene} labels={labels} />
      </Canvas>
      <div ref={hubLabel} className="city3d-label city3d-hub-label" aria-hidden="true">
        <strong>Regional Resolution Hub</strong>
        <small>Illustrative operational layer</small>
      </div>
      <span ref={featuredTag} className="city3d-label city3d-featured-tag" aria-hidden="true">
        {featuredKey}
      </span>
    </>
  );
}
