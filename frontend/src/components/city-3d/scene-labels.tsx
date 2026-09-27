"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo } from "react";
import { Vector3 } from "three";
import type { SceneLabelAnchor } from "@/components/city-3d/scene-types";

/**
 * Positions DOM labels over the canvas at projected world anchors. Must mount
 * after the camera director so labels use the camera pose of the same frame.
 */
export function SceneLabelProjector({ anchors }: { anchors: readonly SceneLabelAnchor[] }) {
  const point = useMemo(() => new Vector3(), []);

  useFrame(({ camera, size }) => {
    camera.updateMatrixWorld();
    anchors.forEach(({ element, position }) => {
      const node = element.current;
      if (!node) return;
      if (!position) {
        node.style.visibility = "hidden";
        return;
      }
      point.set(position[0], position[1], position[2]).project(camera);
      const onScreen = point.z < 1 && Math.abs(point.x) <= 1.05 && Math.abs(point.y) <= 1.05;
      node.style.visibility = onScreen ? "visible" : "hidden";
      node.style.transform = `translate3d(${((point.x + 1) / 2) * size.width}px, ${((1 - point.y) / 2) * size.height}px, 0) translate(-50%, -50%)`;
    });
  });

  return null;
}
