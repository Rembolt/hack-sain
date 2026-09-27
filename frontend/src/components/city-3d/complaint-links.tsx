"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type ComponentRef } from "react";
import {
  dampFactor,
  flowSpeed,
  HUB_CORE,
  LINK_START_HEIGHT,
  linkArc,
  transitionLambda,
} from "@/components/city-3d/scene-model";
import type { SceneLinkModel, SceneMotion } from "@/components/city-3d/scene-types";

type LineRef = ComponentRef<typeof Line>;

const GLOW_OPACITY = 0.22;
const GLOW_WIDTH = 2.6;

function ComplaintLink({ link, motion }: { link: SceneLinkModel; motion: SceneMotion }) {
  const line = useRef<LineRef>(null);
  const glow = useRef<LineRef>(null);
  const [x, , z] = link.from;
  const points = useMemo(() => linkArc([x, LINK_START_HEIGHT, z], HUB_CORE), [x, z]);
  const dashed = link.pattern !== "solid";
  const [dashSize, gapSize] = link.dashes;
  const mountedReduced = useRef(motion.reducedMotion);

  useLayoutEffect(() => {
    if (line.current) line.current.material.opacity = mountedReduced.current ? link.opacity : 0;
    // Links fade in from zero once; later opacity changes are interpolated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state, delta) => {
    const material = line.current?.material;
    if (!material) return;
    const weight = motion.reducedMotion ? 1 : dampFactor(transitionLambda(motion.tickMs), delta);
    material.opacity += (link.opacity - material.opacity) * weight;
    const flowing = link.flowing && !motion.reducedMotion;
    if (flowing) material.dashOffset -= delta * flowSpeed(motion.tickMs);
    const glowMaterial = glow.current?.material;
    if (glowMaterial) glowMaterial.opacity = material.opacity * GLOW_OPACITY;
    if (Math.abs(material.opacity - link.opacity) > 0.004) state.invalidate();
  });

  return (
    <>
      {link.glowColor ? (
        <Line
          ref={glow}
          points={points}
          color={link.glowColor}
          lineWidth={link.width * GLOW_WIDTH}
          transparent
          depthWrite={false}
        />
      ) : null}
      <Line
        ref={line}
        points={points}
        color={link.color}
        lineWidth={link.width}
        dashed={dashed}
        dashSize={dashSize}
        gapSize={gapSize}
        transparent
        depthWrite={false}
      />
    </>
  );
}

export function ComplaintLinks({
  links,
  motion,
}: {
  links: readonly SceneLinkModel[];
  motion: SceneMotion;
}) {
  return (
    <>
      {links.map((link) => (
        <ComplaintLink key={link.key} link={link} motion={motion} />
      ))}
    </>
  );
}
