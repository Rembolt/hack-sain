"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import {
  CITY_PALETTE,
  environmentTrees,
  GROUND,
  ROADS,
} from "@/components/city-3d/scene-model";

const SHADOW_EXTENT = 13;

function Road({ road }: { road: (typeof ROADS)[number] }) {
  const dx = road.to[0] - road.from[0];
  const dz = road.to[1] - road.from[1];
  return (
    <mesh
      position={[(road.from[0] + road.to[0]) / 2, 0.01, (road.from[1] + road.to[1]) / 2]}
      rotation-y={Math.atan2(dx, dz)}
      receiveShadow
    >
      <boxGeometry args={[road.width, 0.02, Math.hypot(dx, dz)]} />
      <meshStandardMaterial color={road.color} roughness={0.9} />
    </mesh>
  );
}

export function CityEnvironment() {
  const trees = useMemo(() => environmentTrees(), []);

  return (
    <>
      <hemisphereLight args={[CITY_PALETTE.sky, CITY_PALETTE.groundBounce, 1.4]} />
      <directionalLight
        position={[9, 18, 11]}
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-SHADOW_EXTENT}
        shadow-camera-right={SHADOW_EXTENT}
        shadow-camera-top={SHADOW_EXTENT}
        shadow-camera-bottom={-SHADOW_EXTENT}
        shadow-camera-near={1}
        shadow-camera-far={48}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />

      <RoundedBox
        args={[GROUND.width, GROUND.thickness, GROUND.depth]}
        radius={GROUND.thickness / 3}
        smoothness={3}
        position={[0, -GROUND.thickness / 2, GROUND.centerZ]}
        receiveShadow
      >
        <meshStandardMaterial color={CITY_PALETTE.ground} roughness={0.95} />
      </RoundedBox>

      <gridHelper
        args={[20, 26, CITY_PALETTE.grid, CITY_PALETTE.grid]}
        position={[0, 0.004, GROUND.centerZ]}
        scale={[(GROUND.width - 0.8) / 20, 1, (GROUND.depth - 0.8) / 20]}
        material-transparent
        material-opacity={0.22}
        material-depthWrite={false}
      />

      {ROADS.map((road) => (
        <Road key={road.key} road={road} />
      ))}

      {trees.map((tree) => (
        <group key={tree.key} position={tree.position} scale={tree.scale}>
          <mesh position-y={0.12} castShadow>
            <cylinderGeometry args={[0.05, 0.06, 0.24, 6]} />
            <meshStandardMaterial color={CITY_PALETTE.trunk} roughness={1} />
          </mesh>
          <mesh position-y={0.5} castShadow>
            <coneGeometry args={[0.28, 0.62, 7]} />
            <meshStandardMaterial color={tree.canopy} roughness={0.85} flatShading />
          </mesh>
        </group>
      ))}
    </>
  );
}
