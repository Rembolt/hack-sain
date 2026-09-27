import type { RefObject } from "react";
import type {
  PlaybackConnectionState,
  PlaybackHouse,
  PlaybackHouseTone,
  PlaybackView,
} from "@/visualization/playback-houses";

export type Vec3 = readonly [number, number, number];

export type LinkPattern = "solid" | "dashed" | "dotted";

export type VisibleConnection = Exclude<PlaybackConnectionState, "hidden">;

export type SceneHouseModel = {
  key: string;
  position: Vec3;
  tone: PlaybackHouseTone;
  color: string;
  roofColor: string;
  opacity: number;
  scale: number;
  sink: number;
  castShadow: boolean;
  glowColor: string | null;
  glowIntensity: number;
  openRing: boolean;
  featured: boolean;
};

export type SceneLinkModel = {
  key: string;
  from: Vec3;
  connection: VisibleConnection;
  color: string;
  /** Screen-space width in CSS pixels. */
  width: number;
  opacity: number;
  pattern: LinkPattern;
  /** Dash and gap lengths in world units; ignored for solid links. */
  dashes: readonly [number, number];
  flowing: boolean;
  glowColor: string | null;
  featured: boolean;
};

export type CitySceneModel = {
  houses: SceneHouseModel[];
  links: SceneLinkModel[];
  featuredPosition: Vec3 | null;
};

export type CameraPose = {
  position: Vec3;
  target: Vec3;
};

export type SceneRoad = {
  key: string;
  from: readonly [number, number];
  to: readonly [number, number];
  width: number;
  color: string;
};

export type SceneTree = {
  key: string;
  position: Vec3;
  scale: number;
  canopy: string;
};

export type SceneMotion = {
  reducedMotion: boolean;
  running: boolean;
  /** Wall-clock duration of one playback tick. */
  tickMs: number;
};

export type SceneLabelAnchor = {
  element: RefObject<HTMLElement | null>;
  position: Vec3 | null;
};

export type SceneLabelRefs = {
  hub: RefObject<HTMLElement | null>;
  featured: RefObject<HTMLElement | null>;
};

export type RegionalCitySceneProps = {
  houses: readonly PlaybackHouse[];
  featuredContext: boolean;
  focusFeatured: boolean;
  feedbackActive: boolean;
  view: PlaybackView;
  motion: SceneMotion;
};

export type RegionalCityCanvasProps = RegionalCitySceneProps & {
  onContextLost?: () => void;
};
