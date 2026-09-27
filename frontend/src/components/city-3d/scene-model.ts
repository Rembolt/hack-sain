import { BASE_TICK_MS } from "@/state/playback-reducer";
import { stableHash, type SchematicPoint } from "@/visualization/coordinates";
import type { PlaybackHouse } from "@/visualization/playback-houses";
import type {
  CameraPose,
  CitySceneModel,
  LinkPattern,
  SceneHouseModel,
  SceneLinkModel,
  SceneRoad,
  SceneTree,
  Vec3,
  VisibleConnection,
} from "@/components/city-3d/scene-types";

export const CITY_PALETTE = {
  sky: "#eef6f8",
  groundBounce: "#a9c4bb",
  ground: "#d3e5dc",
  grid: "#8aa8a8",
  road: "#f6f9f5",
  roadMinor: "#e6eee9",
  canopy: "#93c2a8",
  canopyAlt: "#7fb39a",
  trunk: "#8a7560",
  hubPlinth: "#c6d9d8",
  hubBody: "#245f78",
  hubRoof: "#174861",
  coreActive: "#5de1b5",
  coreBaseline: "#91a8b1",
  feedbackGlow: "#72dfbd",
  featuredGlow: "#ef8a70",
  featuredRing: "#f07a68",
  openRing: "#d98e26",
  roofShade: "#081e2c",
  house: {
    observed: "#294f68",
    risk: "#e1a64b",
    handled: "#37b58c",
    prevented: "#9eacb1",
  },
  link: {
    base: "#436d82",
    risk: "#dea044",
    escalated: "#e87062",
    routing: "#e6ad55",
    resolved: "#24aa7d",
    featuredResolved: "#20ad79",
    open: "#df9d38",
  },
} as const;

/** Schematic percent coordinates share their centre with the resolution hub. */
const SCHEMATIC_HUB = { x: 50, y: 46 };
export const WORLD_SCALE = 0.2;
export const HUB_CLEARANCE = 2.2;
export const HUB_CORE: Vec3 = [0, 2.75, 0];
export const LINK_START_HEIGHT = 0.46;
export const HUB_LABEL_ANCHOR: Vec3 = [0, HUB_CORE[1] + 0.85, 0];
export const FEATURED_TAG_HEIGHT = 1.7;

export const GROUND = {
  width: 20.6,
  depth: 18,
  thickness: 0.36,
  centerZ: -0.2,
} as const;

export const HOUSE_DIMENSIONS = {
  width: 0.52,
  depth: 0.5,
  bodyHeight: 0.4,
  roofHeight: 0.28,
  roofWidth: 0.66,
  roofDepth: 0.6,
} as const;

export const CAMERA = {
  fov: 36,
  elevationDeg: 50,
  azimuthDeg: -4,
  center: [0, 0, 0.4] as Vec3,
  halfWidth: 9.4,
  halfHeight: 7.6,
  focusBlend: 0.5,
  focusMargin: 3.6,
  focusMinRatio: 0.58,
  focusMaxRatio: 0.8,
  driftAzimuthDeg: 3.5,
  driftElevationDeg: 1,
} as const;

const PATTERN_DASHES: Record<LinkPattern, readonly [number, number]> = {
  solid: [1, 0],
  dashed: [0.34, 0.4],
  dotted: [0.1, 0.5],
};

type LinkStyle = Pick<
  SceneLinkModel,
  "color" | "width" | "opacity" | "pattern" | "flowing" | "glowColor"
>;

const LINK_STYLES: Record<VisibleConnection, LinkStyle> = {
  forming: { color: CITY_PALETTE.link.base, width: 1.8, opacity: 0.32, pattern: "dashed", flowing: false, glowColor: null },
  risk: { color: CITY_PALETTE.link.risk, width: 2.4, opacity: 0.75, pattern: "solid", flowing: false, glowColor: null },
  routing: { color: CITY_PALETTE.link.routing, width: 3.2, opacity: 0.9, pattern: "dotted", flowing: true, glowColor: null },
  resolved: { color: CITY_PALETTE.link.resolved, width: 3, opacity: 0.88, pattern: "solid", flowing: false, glowColor: null },
  feedback: { color: CITY_PALETTE.link.resolved, width: 3.4, opacity: 0.88, pattern: "dotted", flowing: true, glowColor: null },
  open: { color: CITY_PALETTE.link.open, width: 2.4, opacity: 0.86, pattern: "dashed", flowing: false, glowColor: null },
};

const ESCALATED_RISK: Partial<LinkStyle> = {
  color: CITY_PALETTE.link.escalated,
  width: 2.9,
  opacity: 0.92,
};

const FEATURED_LINK_WIDTH = 4.6;
const FEATURED_DASHES: readonly [number, number] = [0.22, 0.2];

function mixHex(base: string, other: string, weight: number) {
  const parse = (hex: string) => {
    const value = Number.parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  };
  const left = parse(base);
  const right = parse(other);
  const mixed = left.map((channel, index) =>
    Math.round(channel * (1 - weight) + right[index] * weight),
  );
  return `#${mixed.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Maps a schematic percent point to world units around the hub. Points that
 * would sit inside the hub footprint are pushed outward monotonically so
 * relative order along each ray is preserved.
 */
export function worldPosition(point: SchematicPoint): Vec3 {
  const x = (point.x - SCHEMATIC_HUB.x) * WORLD_SCALE;
  const z = (point.y - SCHEMATIC_HUB.y) * WORLD_SCALE;
  const radius = Math.hypot(x, z);
  const outer = HUB_CLEARANCE * 2;
  if (radius >= outer) return [x, 0, z];
  if (radius === 0) return [HUB_CLEARANCE, 0, 0];
  const remapped = HUB_CLEARANCE + radius / 2;
  return [(x / radius) * remapped, 0, (z / radius) * remapped];
}

export function sceneHouse(house: PlaybackHouse, featuredContext: boolean): SceneHouseModel {
  const featured = house.featured && featuredContext;
  const prevented = house.tone === "prevented";
  const color = CITY_PALETTE.house[house.tone];
  return {
    key: house.key,
    position: worldPosition(house.position),
    tone: house.tone,
    color,
    roofColor: mixHex(color, CITY_PALETTE.roofShade, 0.24),
    opacity: prevented ? 0.2 : 1,
    scale: featured ? 1.5 : prevented ? 0.7 : 1,
    sink: prevented ? -0.06 : 0,
    castShadow: !prevented,
    glowColor: featured
      ? CITY_PALETTE.featuredGlow
      : house.feedback
        ? CITY_PALETTE.feedbackGlow
        : null,
    glowIntensity: featured ? 0.12 : house.feedback ? 0.35 : 0,
    openRing: house.open,
    featured,
  };
}

export function sceneLink(house: PlaybackHouse, featuredContext: boolean): SceneLinkModel | null {
  if (house.connection === "hidden") return null;
  const featured = house.featured && featuredContext;
  const connection = house.connection;
  let style: LinkStyle = LINK_STYLES[connection];
  if (connection === "risk" && house.emphasis === "escalated") {
    style = { ...style, ...ESCALATED_RISK };
  }
  if (featured) {
    const green = connection === "resolved" || connection === "feedback";
    style = {
      ...style,
      width: FEATURED_LINK_WIDTH,
      opacity: 1,
      color: green ? CITY_PALETTE.link.featuredResolved : style.color,
      glowColor: green ? CITY_PALETTE.feedbackGlow : CITY_PALETTE.featuredGlow,
    };
  }
  return {
    key: house.key,
    from: worldPosition(house.position),
    connection,
    featured,
    dashes: featured && style.pattern !== "solid" ? FEATURED_DASHES : PATTERN_DASHES[style.pattern],
    ...style,
  };
}

export function buildCityScene(
  houses: readonly PlaybackHouse[],
  featuredContext: boolean,
): CitySceneModel {
  const sceneHouses = houses.map((house) => sceneHouse(house, featuredContext));
  const links = houses.flatMap((house) => {
    const link = sceneLink(house, featuredContext);
    return link ? [link] : [];
  });
  return {
    houses: sceneHouses,
    links,
    featuredPosition: sceneHouses.find((house) => house.featured)?.position ?? null,
  };
}

/** Quadratic arc from a house roof to the hub core, lifted with distance. */
export function linkArc(from: Vec3, to: Vec3, segments = 24): Vec3[] {
  const span = Math.hypot(to[0] - from[0], to[2] - from[2]);
  const control: Vec3 = [
    (from[0] + to[0]) / 2,
    Math.max(from[1], to[1]) + 0.35 + span * 0.12,
    (from[2] + to[2]) / 2,
  ];
  return Array.from({ length: segments + 1 }, (_, index) => {
    const t = index / segments;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    return [
      a * from[0] + b * control[0] + c * to[0],
      a * from[1] + b * control[1] + c * to[1],
      a * from[2] + b * control[2] + c * to[2],
    ] as const;
  });
}

export function ringPoints(radius: number, segments = 40): Vec3[] {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    return [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as const;
  });
}

const degrees = (value: number) => (value * Math.PI) / 180;

function fitDistance(halfWidth: number, halfHeight: number, aspect: number) {
  const tanHalf = Math.tan(degrees(CAMERA.fov / 2));
  return Math.max(halfHeight / tanHalf, halfWidth / (tanHalf * aspect));
}

/**
 * Camera framing for a viewport aspect ratio. `drift` in [-1, 1] adds a slow
 * orbit offset; `focus` frames the featured complaint together with the hub.
 */
export function cameraPose({
  aspect,
  focus,
  drift = 0,
}: {
  aspect: number;
  focus: Vec3 | null;
  drift?: number;
}): CameraPose {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1.6;
  const overview = fitDistance(CAMERA.halfWidth, CAMERA.halfHeight, safeAspect);
  let distance = overview;
  let target: Vec3 = CAMERA.center;
  if (focus) {
    const dx = focus[0] - CAMERA.center[0];
    const dz = focus[2] - CAMERA.center[2];
    target = [
      CAMERA.center[0] + dx * CAMERA.focusBlend,
      CAMERA.center[1],
      CAMERA.center[2] + dz * CAMERA.focusBlend,
    ];
    const framed = fitDistance(
      Math.abs(dx) / 2 + CAMERA.focusMargin,
      (Math.abs(dz) / 2) * 0.8 + CAMERA.focusMargin * 0.6,
      safeAspect,
    );
    distance = Math.min(
      overview * CAMERA.focusMaxRatio,
      Math.max(overview * CAMERA.focusMinRatio, framed),
    );
  }
  const clampedDrift = Math.max(-1, Math.min(1, drift));
  const azimuth = degrees(CAMERA.azimuthDeg + clampedDrift * CAMERA.driftAzimuthDeg);
  const elevation = degrees(CAMERA.elevationDeg + clampedDrift * CAMERA.driftElevationDeg);
  return {
    target,
    position: [
      target[0] + distance * Math.cos(elevation) * Math.sin(azimuth),
      target[1] + distance * Math.sin(elevation),
      target[2] + distance * Math.cos(elevation) * Math.cos(azimuth),
    ],
  };
}

function safeTick(tickMs: number) {
  return Number.isFinite(tickMs) && tickMs > 0 ? tickMs : BASE_TICK_MS;
}

/** Transitions settle within roughly one playback tick at any speed. */
export function transitionLambda(tickMs: number) {
  return 4000 / safeTick(tickMs);
}

export function cameraLambda(tickMs: number) {
  return 1400 / safeTick(tickMs);
}

/** Dash travel in world units per second along a flowing link. */
export function flowSpeed(tickMs: number) {
  return 480 / safeTick(tickMs);
}

export function pulsePeriodSeconds(tickMs: number) {
  return (safeTick(tickMs) * 2.5) / 1000;
}

export function driftPeriodSeconds(tickMs: number) {
  return (safeTick(tickMs) * 44) / 1000;
}

/** Frame-rate independent interpolation weight. */
export function dampFactor(lambda: number, deltaSeconds: number) {
  return 1 - Math.exp(-lambda * Math.max(0, deltaSeconds));
}

export const ROADS: readonly SceneRoad[] = [
  { key: "road-one", from: [-5.1, -8.8], to: [-2.7, 8.4], width: 0.55, color: CITY_PALETTE.road },
  { key: "road-two", from: [-10, 2.85], to: [10, 1.1], width: 0.5, color: CITY_PALETTE.road },
  { key: "road-three", from: [9.1, -8.8], to: [3.2, 8.4], width: 0.38, color: CITY_PALETTE.roadMinor },
];

function distanceToSegment(
  x: number,
  z: number,
  from: readonly [number, number],
  to: readonly [number, number],
) {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  const lengthSquared = dx * dx + dz * dz;
  const t = Math.max(0, Math.min(1, ((x - from[0]) * dx + (z - from[1]) * dz) / lengthSquared));
  return Math.hypot(x - (from[0] + t * dx), z - (from[1] + t * dz));
}

/** Deterministic perimeter trees that avoid roads and each other. */
export function environmentTrees(count = 22): SceneTree[] {
  const halfWidth = GROUND.width / 2 - 0.65;
  const halfDepth = GROUND.depth / 2 - 0.65;
  const edges = [2 * halfWidth, 2 * halfDepth, 2 * halfWidth, 2 * halfDepth];
  const perimeter = edges.reduce((sum, length) => sum + length, 0);
  const trees: SceneTree[] = [];
  for (let index = 0; index < count * 4 && trees.length < count; index += 1) {
    const hash = stableHash(`northflow-tree-${index}`);
    let along = ((hash % 100000) / 100000) * perimeter;
    const inset = ((hash >>> 17) % 60) / 100;
    let edge = 0;
    while (along > edges[edge]) {
      along -= edges[edge];
      edge += 1;
    }
    const top = GROUND.centerZ - halfDepth;
    const bottom = GROUND.centerZ + halfDepth;
    const [x, z] =
      edge === 0
        ? [-halfWidth + along, top + inset]
        : edge === 1
          ? [halfWidth - inset, top + along]
          : edge === 2
            ? [halfWidth - along, bottom - inset]
            : [-halfWidth + inset, bottom - along];
    const onRoad = ROADS.some(
      (road) => distanceToSegment(x, z, road.from, road.to) < road.width / 2 + 0.45,
    );
    const crowded = trees.some(
      (tree) => Math.hypot(tree.position[0] - x, tree.position[2] - z) < 0.8,
    );
    if (onRoad || crowded) continue;
    trees.push({
      key: `tree-${index}`,
      position: [x, 0, z],
      scale: 0.8 + ((hash >>> 9) % 40) / 100,
      canopy: hash % 2 === 0 ? CITY_PALETTE.canopy : CITY_PALETTE.canopyAlt,
    });
  }
  return trees;
}
