"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Vector3 } from "three";
import {
  cameraLambda,
  cameraPose,
  dampFactor,
  driftPeriodSeconds,
} from "@/components/city-3d/scene-model";
import type { SceneMotion, Vec3 } from "@/components/city-3d/scene-types";

/** Frames the city, drifts gently while running, and eases toward the featured complaint. */
export function CameraDirector({ focus, motion }: { focus: Vec3 | null; motion: SceneMotion }) {
  const lookAt = useMemo(() => new Vector3(), []);
  const goalPosition = useMemo(() => new Vector3(), []);
  const goalTarget = useMemo(() => new Vector3(), []);
  const placed = useRef(false);

  useFrame((state, delta) => {
    const { camera, size, clock } = state;
    const drifting = motion.running && !motion.reducedMotion && !focus;
    const drift = drifting
      ? Math.sin((clock.elapsedTime / driftPeriodSeconds(motion.tickMs)) * Math.PI * 2)
      : 0;
    const pose = cameraPose({
      aspect: size.width / Math.max(size.height, 1),
      focus,
      drift,
    });
    goalPosition.set(...pose.position);
    goalTarget.set(...pose.target);

    if (!placed.current || motion.reducedMotion) {
      camera.position.copy(goalPosition);
      lookAt.copy(goalTarget);
      placed.current = true;
    } else {
      const weight = dampFactor(cameraLambda(motion.tickMs), delta);
      camera.position.lerp(goalPosition, weight);
      lookAt.lerp(goalTarget, weight);
    }
    camera.lookAt(lookAt);

    const settled =
      camera.position.distanceToSquared(goalPosition) < 1e-4 &&
      lookAt.distanceToSquared(goalTarget) < 1e-4;
    if (!settled) state.invalidate();
  });

  return null;
}
