import { describe, expect, it } from "vitest";
import {
  buildCityScene,
  CAMERA,
  cameraPose,
  CITY_PALETTE,
  environmentTrees,
  flowSpeed,
  GROUND,
  HUB_CLEARANCE,
  HUB_CORE,
  linkArc,
  pulsePeriodSeconds,
  ROADS,
  sceneHouse,
  sceneLink,
  transitionLambda,
  worldPosition,
} from "@/components/city-3d/scene-model";
import type { Region } from "@/domain/types";
import { tickIntervalMs } from "@/state/playback-reducer";
import { schematicCoordinates } from "@/visualization/coordinates";
import type {
  PlaybackConnectionState,
  PlaybackHouse,
} from "@/visualization/playback-houses";

function house(overrides: Partial<PlaybackHouse> = {}): PlaybackHouse {
  return {
    key: "NW-100001",
    tone: "observed",
    feedback: false,
    connection: "hidden",
    emphasis: "standard",
    position: { x: 20, y: 30 },
    open: false,
    featured: false,
    ...overrides,
  };
}

const withConnection = (connection: PlaybackConnectionState, extra: Partial<PlaybackHouse> = {}) =>
  sceneLink(house({ connection, ...extra }), false);

describe("city scene positions", () => {
  it("derives stable world positions from schematic coordinates", () => {
    const point = schematicCoordinates("NW-108365", "Barrowdale");
    expect(worldPosition(point)).toEqual(worldPosition({ ...point }));
    expect(worldPosition(point)[1]).toBe(0);
  });

  it("keeps every house on the ground and outside the hub footprint", () => {
    const regions: Region[] = ["Ashford", "Barrowdale", "Calderfield", "Dunmoor", "Eastmarch", "Fenwick"];
    regions.forEach((region) => {
      for (let index = 0; index < 400; index += 1) {
        const [x, , z] = worldPosition(schematicCoordinates(`NW-${100000 + index}`, region));
        expect(Math.hypot(x, z)).toBeGreaterThanOrEqual(HUB_CLEARANCE - 1e-9);
        expect(Math.abs(x)).toBeLessThan(GROUND.width / 2);
        expect(Math.abs(z - GROUND.centerZ)).toBeLessThan(GROUND.depth / 2);
      }
    });
  });

  it("pushes near-hub points outward without reordering them along a ray", () => {
    const near = worldPosition({ x: 51, y: 46 });
    const further = worldPosition({ x: 55, y: 46 });
    expect(near[0]).toBeGreaterThanOrEqual(HUB_CLEARANCE);
    expect(further[0]).toBeGreaterThan(near[0]);
    expect(worldPosition({ x: 50, y: 46 })).toEqual([HUB_CLEARANCE, 0, 0]);
  });
});

describe("city scene houses", () => {
  it("preserves house order and keys from the playback view model", () => {
    const houses = [house({ key: "NW-3" }), house({ key: "NW-1" }), house({ key: "NW-2" })];
    expect(buildCityScene(houses, false).houses.map((item) => item.key)).toEqual(["NW-3", "NW-1", "NW-2"]);
  });

  it("fades and shrinks prevented houses without casting shadows", () => {
    const prevented = sceneHouse(house({ tone: "prevented" }), false);
    expect(prevented.opacity).toBeLessThan(0.5);
    expect(prevented.scale).toBeLessThan(1);
    expect(prevented.castShadow).toBe(false);
    expect(sceneHouse(house(), false).opacity).toBe(1);
  });

  it("uses the tone palette and flags open complaints with a ring", () => {
    expect(sceneHouse(house({ tone: "risk" }), false).color).toBe(CITY_PALETTE.house.risk);
    expect(sceneHouse(house({ tone: "handled" }), false).color).toBe(CITY_PALETTE.house.handled);
    expect(sceneHouse(house({ open: true }), false).openRing).toBe(true);
    expect(sceneHouse(house(), false).openRing).toBe(false);
  });

  it("highlights the featured complaint only in its featured month", () => {
    const featured = house({ key: "NW-108365", featured: true });
    expect(sceneHouse(featured, true).featured).toBe(true);
    expect(sceneHouse(featured, true).scale).toBeGreaterThan(1);
    expect(sceneHouse(featured, false).featured).toBe(false);
    expect(buildCityScene([featured], true).featuredPosition).toEqual(worldPosition(featured.position));
    expect(buildCityScene([featured], false).featuredPosition).toBeNull();
  });

  it("glows only for returned feedback or the featured complaint", () => {
    expect(sceneHouse(house(), false).glowColor).toBeNull();
    expect(sceneHouse(house({ feedback: true, tone: "handled" }), false).glowColor).toBe(CITY_PALETTE.feedbackGlow);
  });
});

describe("city scene links", () => {
  it("omits hidden connections", () => {
    expect(withConnection("hidden")).toBeNull();
    const scene = buildCityScene([house(), house({ key: "NW-2", connection: "risk" })], false);
    expect(scene.links.map((link) => link.key)).toEqual(["NW-2"]);
  });

  it("keeps the schematic line semantics", () => {
    expect(withConnection("forming")).toMatchObject({ pattern: "dashed", flowing: false });
    expect(withConnection("risk")).toMatchObject({ pattern: "solid", color: CITY_PALETTE.link.risk });
    expect(withConnection("risk", { emphasis: "escalated" })).toMatchObject({ color: CITY_PALETTE.link.escalated });
    expect(withConnection("routing")).toMatchObject({ pattern: "dotted", flowing: true });
    expect(withConnection("resolved")).toMatchObject({ pattern: "solid", color: CITY_PALETTE.link.resolved, flowing: false });
    expect(withConnection("feedback")).toMatchObject({ pattern: "dotted", color: CITY_PALETTE.link.resolved, flowing: true });
    expect(withConnection("open")).toMatchObject({ pattern: "dashed", color: CITY_PALETTE.link.open });
  });

  it("emphasises the featured link and keeps resolved routes green", () => {
    const featured = house({ featured: true, connection: "feedback" });
    const link = sceneLink(featured, true)!;
    expect(link.featured).toBe(true);
    expect(link.width).toBeGreaterThan(withConnection("feedback")!.width);
    expect(link.color).toBe(CITY_PALETTE.link.featuredResolved);
    expect(link.glowColor).not.toBeNull();
    expect(link.dashes[1]).toBeLessThan(withConnection("feedback")!.dashes[1]);
    expect(sceneLink(featured, false)!.featured).toBe(false);
  });

  it("arcs from the house to the hub core above both endpoints", () => {
    const from = [4, 0.46, 3] as const;
    const points = linkArc(from, HUB_CORE, 20);
    expect(points).toHaveLength(21);
    expect(points[0]).toEqual(from);
    expect(points.at(-1)).toEqual(HUB_CORE);
    expect(Math.max(...points.map((point) => point[1]))).toBeGreaterThan(HUB_CORE[1]);
  });
});

describe("city camera and motion", () => {
  it("pulls back on narrow viewports so the city still fits", () => {
    const distance = (aspect: number) => {
      const pose = cameraPose({ aspect, focus: null });
      return Math.hypot(...pose.position.map((value, index) => value - pose.target[index]));
    };
    expect(distance(0.8)).toBeGreaterThan(distance(2));
    expect(Number.isFinite(distance(Number.NaN))).toBe(true);
  });

  it("moves closer to the featured complaint when focused", () => {
    const focus = [6, 0, -4] as const;
    const wide = cameraPose({ aspect: 1.8, focus: null });
    const focused = cameraPose({ aspect: 1.8, focus });
    expect(focused.target[0]).toBeGreaterThan(wide.target[0]);
    expect(focused.position[1]).toBeLessThan(wide.position[1]);
  });

  it("keeps both the hub and the featured complaint in view on narrow screens", () => {
    const focus = [-7, 0, -3] as const;
    const aspect = 0.9;
    const pose = cameraPose({ aspect, focus });
    const distance = Math.hypot(...pose.position.map((value, index) => value - pose.target[index]));
    const visibleHalfWidth = distance * Math.tan(((CAMERA.fov / 2) * Math.PI) / 180) * aspect;
    expect(Math.abs(focus[0] - pose.target[0])).toBeLessThan(visibleHalfWidth - 1);
    expect(Math.abs(CAMERA.center[0] - pose.target[0])).toBeLessThan(visibleHalfWidth - 1);
  });

  it("is static without drift", () => {
    expect(cameraPose({ aspect: 1.6, focus: null, drift: 0 })).toEqual(cameraPose({ aspect: 1.6, focus: null }));
  });

  it("scales transition timing with playback speed only", () => {
    expect(transitionLambda(tickIntervalMs(2))).toBeCloseTo(transitionLambda(tickIntervalMs(1)) * 2);
    expect(flowSpeed(tickIntervalMs(2))).toBeCloseTo(flowSpeed(tickIntervalMs(1)) * 2);
    expect(pulsePeriodSeconds(tickIntervalMs(2))).toBeCloseTo(pulsePeriodSeconds(tickIntervalMs(1)) / 2);
    expect(transitionLambda(0)).toBe(transitionLambda(tickIntervalMs(1)));
  });
});

describe("city environment", () => {
  it("places deterministic trees on the ground and off the roads", () => {
    const trees = environmentTrees();
    expect(trees.length).toBeGreaterThan(10);
    expect(environmentTrees()).toEqual(trees);
    trees.forEach(({ position: [x, , z] }) => {
      expect(Math.abs(x)).toBeLessThan(GROUND.width / 2);
      expect(Math.abs(z - GROUND.centerZ)).toBeLessThan(GROUND.depth / 2);
    });
    expect(ROADS).toHaveLength(3);
  });
});
