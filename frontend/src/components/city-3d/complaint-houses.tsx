"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  Color,
  ExtrudeGeometry,
  Shape,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshStandardMaterial,
} from "three";
import {
  CITY_PALETTE,
  dampFactor,
  HOUSE_DIMENSIONS,
  pulsePeriodSeconds,
  ringPoints,
  transitionLambda,
} from "@/components/city-3d/scene-model";
import type { SceneHouseModel, SceneMotion } from "@/components/city-3d/scene-types";

type HouseGeometry = { body: BoxGeometry; roof: ExtrudeGeometry };

const SETTLED = 0.002;
const OPEN_RING = ringPoints(0.46);

function createHouseGeometry(): HouseGeometry {
  const { width, depth, bodyHeight, roofHeight, roofWidth, roofDepth } = HOUSE_DIMENSIONS;
  const body = new BoxGeometry(width, bodyHeight, depth);
  body.translate(0, bodyHeight / 2, 0);
  const outline = new Shape();
  outline.moveTo(-roofWidth / 2, 0);
  outline.lineTo(roofWidth / 2, 0);
  outline.lineTo(0, roofHeight);
  outline.closePath();
  const roof = new ExtrudeGeometry(outline, { depth: roofDepth, bevelEnabled: false });
  roof.translate(0, bodyHeight, -roofDepth / 2);
  return { body, roof };
}

function colorGap(left: Color, right: Color) {
  return Math.abs(left.r - right.r) + Math.abs(left.g - right.g) + Math.abs(left.b - right.b);
}

function ComplaintHouse({
  house,
  geometry,
  motion,
}: {
  house: SceneHouseModel;
  geometry: HouseGeometry;
  motion: SceneMotion;
}) {
  const group = useRef<Group>(null);
  const body = useRef<MeshStandardMaterial>(null);
  const roof = useRef<MeshStandardMaterial>(null);
  const pulse = useRef<Mesh>(null);
  const pulseMaterial = useRef<MeshBasicMaterial>(null);
  const targets = useMemo(
    () => ({
      body: new Color(house.color),
      roof: new Color(house.roofColor),
      glow: new Color(house.glowColor ?? "#000000"),
    }),
    [house.color, house.roofColor, house.glowColor],
  );
  const mountedReduced = useRef(motion.reducedMotion);

  useLayoutEffect(() => {
    if (!group.current || !body.current || !roof.current) return;
    body.current.color.copy(targets.body);
    roof.current.color.copy(targets.roof);
    body.current.emissive.copy(targets.glow);
    body.current.emissiveIntensity = house.glowIntensity;
    body.current.opacity = roof.current.opacity = house.opacity;
    group.current.position.y = house.sink;
    group.current.scale.setScalar(mountedReduced.current ? house.scale : 0.001);
    // Initial state only; later changes are interpolated in the frame loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state, delta) => {
    const node = group.current;
    const bodyMaterial = body.current;
    const roofMaterial = roof.current;
    if (!node || !bodyMaterial || !roofMaterial) return;
    const weight = motion.reducedMotion ? 1 : dampFactor(transitionLambda(motion.tickMs), delta);

    bodyMaterial.color.lerp(targets.body, weight);
    roofMaterial.color.lerp(targets.roof, weight);
    bodyMaterial.emissive.lerp(targets.glow, weight);
    bodyMaterial.emissiveIntensity += (house.glowIntensity - bodyMaterial.emissiveIntensity) * weight;
    const opacity = bodyMaterial.opacity + (house.opacity - bodyMaterial.opacity) * weight;
    bodyMaterial.opacity = roofMaterial.opacity = opacity;
    bodyMaterial.depthWrite = roofMaterial.depthWrite = opacity > 0.9;
    node.scale.setScalar(node.scale.x + (house.scale - node.scale.x) * weight);
    node.position.y += (house.sink - node.position.y) * weight;

    if (pulse.current && pulseMaterial.current) {
      if (motion.reducedMotion) {
        pulse.current.scale.setScalar(1.1);
        pulseMaterial.current.opacity = 0.85;
      } else {
        const period = pulsePeriodSeconds(motion.tickMs);
        const phase = (state.clock.elapsedTime % period) / period;
        pulse.current.scale.setScalar(0.8 + phase * 1.4);
        pulseMaterial.current.opacity = 0.9 * (1 - phase);
      }
    }

    const settled =
      Math.abs(node.scale.x - house.scale) < SETTLED &&
      Math.abs(opacity - house.opacity) < SETTLED &&
      Math.abs(node.position.y - house.sink) < SETTLED &&
      colorGap(bodyMaterial.color, targets.body) < SETTLED &&
      colorGap(bodyMaterial.emissive, targets.glow) < SETTLED;
    if (!settled) state.invalidate();
  });

  return (
    <group ref={group} position-x={house.position[0]} position-z={house.position[2]}>
      <mesh geometry={geometry.body} castShadow={house.castShadow} receiveShadow>
        <meshStandardMaterial ref={body} roughness={0.72} transparent />
      </mesh>
      <mesh geometry={geometry.roof} castShadow={house.castShadow}>
        <meshStandardMaterial ref={roof} roughness={0.8} transparent flatShading />
      </mesh>
      {house.openRing ? (
        <Line
          points={OPEN_RING}
          position-y={0.03}
          color={CITY_PALETTE.openRing}
          lineWidth={1.8}
          dashed
          dashSize={0.12}
          gapSize={0.09}
        />
      ) : null}
      {house.featured ? (
        <mesh ref={pulse} rotation-x={-Math.PI / 2} position-y={0.03}>
          <ringGeometry args={[0.5, 0.58, 48]} />
          <meshBasicMaterial
            ref={pulseMaterial}
            color={CITY_PALETTE.featuredRing}
            transparent
            depthWrite={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}

export function ComplaintHouses({
  houses,
  motion,
}: {
  houses: readonly SceneHouseModel[];
  motion: SceneMotion;
}) {
  const geometry = useMemo(createHouseGeometry, []);
  useEffect(
    () => () => {
      geometry.body.dispose();
      geometry.roof.dispose();
    },
    [geometry],
  );

  return (
    <>
      {houses.map((house) => (
        <ComplaintHouse key={house.key} house={house} geometry={geometry} motion={motion} />
      ))}
    </>
  );
}
