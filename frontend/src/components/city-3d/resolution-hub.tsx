"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
  Color,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
  type PointLight,
} from "three";
import {
  CITY_PALETTE,
  dampFactor,
  HUB_CORE,
  pulsePeriodSeconds,
  transitionLambda,
} from "@/components/city-3d/scene-model";
import type { SceneMotion } from "@/components/city-3d/scene-types";
import type { PlaybackView } from "@/visualization/playback-houses";

const PLINTH_HEIGHT = 0.16;
const BODY_HEIGHT = 1.3;
const ROOF_HEIGHT = 0.8;

type HubTarget = {
  glow: number;
  halo: number;
  haloOpacity: number;
  light: number;
};

function hubTarget(baseline: boolean, feedbackActive: boolean): HubTarget {
  if (baseline) return { glow: 0.15, halo: 1, haloOpacity: 0.16, light: 0 };
  if (feedbackActive) return { glow: 1.4, halo: 1.9, haloOpacity: 0.42, light: 7 };
  return { glow: 0.9, halo: 1.3, haloOpacity: 0.26, light: 3 };
}

export function ResolutionHub({
  view,
  feedbackActive,
  motion,
}: {
  view: PlaybackView;
  feedbackActive: boolean;
  motion: SceneMotion;
}) {
  const baseline = view === "baseline";
  const core = useRef<MeshStandardMaterial>(null);
  const band = useRef<MeshStandardMaterial>(null);
  const halo = useRef<Mesh>(null);
  const haloMaterial = useRef<MeshBasicMaterial>(null);
  const light = useRef<PointLight>(null);
  const coreColor = useMemo(
    () => new Color(baseline ? CITY_PALETTE.coreBaseline : CITY_PALETTE.coreActive),
    [baseline],
  );
  const target = hubTarget(baseline, feedbackActive);

  useFrame((state, delta) => {
    if (!core.current || !band.current || !halo.current || !haloMaterial.current || !light.current) return;
    const weight = motion.reducedMotion ? 1 : dampFactor(transitionLambda(motion.tickMs), delta);
    core.current.color.lerp(coreColor, weight);
    core.current.emissive.lerp(coreColor, weight);
    band.current.emissive.lerp(coreColor, weight);
    core.current.emissiveIntensity += (target.glow - core.current.emissiveIntensity) * weight;
    band.current.emissiveIntensity = core.current.emissiveIntensity * 0.45;
    light.current.intensity += (target.light - light.current.intensity) * weight;
    haloMaterial.current.color.lerp(coreColor, weight);
    haloMaterial.current.opacity += (target.haloOpacity - haloMaterial.current.opacity) * weight;

    const pulsing = feedbackActive && !baseline && !motion.reducedMotion;
    const period = pulsePeriodSeconds(motion.tickMs) * 0.6;
    const pulse = pulsing ? 1 + 0.18 * Math.sin((state.clock.elapsedTime / period) * Math.PI * 2) : 1;
    const current = halo.current.scale.x;
    const next = pulsing ? target.halo * pulse : current + (target.halo - current) * weight;
    halo.current.scale.setScalar(next);

    const settled =
      Math.abs(core.current.emissiveIntensity - target.glow) < 0.01 &&
      Math.abs(light.current.intensity - target.light) < 0.01 &&
      Math.abs(next - target.halo) < 0.005;
    if (!settled && !pulsing) state.invalidate();
  });

  return (
    <group>
      <mesh position-y={PLINTH_HEIGHT / 2} receiveShadow>
        <cylinderGeometry args={[1.55, 1.7, PLINTH_HEIGHT, 48]} />
        <meshStandardMaterial color={CITY_PALETTE.hubPlinth} roughness={0.85} />
      </mesh>
      <mesh position-y={PLINTH_HEIGHT + BODY_HEIGHT / 2} castShadow receiveShadow>
        <boxGeometry args={[1.7, BODY_HEIGHT, 1.7]} />
        <meshStandardMaterial color={CITY_PALETTE.hubBody} roughness={0.55} />
      </mesh>
      <mesh position-y={PLINTH_HEIGHT + BODY_HEIGHT * 0.7}>
        <boxGeometry args={[1.74, 0.12, 1.74]} />
        <meshStandardMaterial ref={band} color={CITY_PALETTE.hubBody} roughness={0.4} />
      </mesh>
      <mesh
        position-y={PLINTH_HEIGHT + BODY_HEIGHT + ROOF_HEIGHT / 2}
        rotation-y={Math.PI / 4}
        castShadow
      >
        <coneGeometry args={[1.35, ROOF_HEIGHT, 4]} />
        <meshStandardMaterial color={CITY_PALETTE.hubRoof} roughness={0.6} flatShading />
      </mesh>

      <mesh position={HUB_CORE}>
        <sphereGeometry args={[0.3, 32, 16]} />
        <meshStandardMaterial ref={core} roughness={0.25} emissiveIntensity={0} />
      </mesh>
      <mesh ref={halo} position={HUB_CORE} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[0.55, 0.035, 12, 64]} />
        <meshBasicMaterial ref={haloMaterial} transparent opacity={0} depthWrite={false} />
      </mesh>
      <pointLight
        ref={light}
        position={HUB_CORE}
        color={CITY_PALETTE.coreActive}
        intensity={0}
        distance={9}
        decay={2}
      />
    </group>
  );
}
