export const PLAYBACK_STAGES = [
  "enter",
  "assess",
  "route",
  "verify",
  "feedback",
  "update",
] as const;

export type PlaybackStage = (typeof PLAYBACK_STAGES)[number];
export type PlaybackStatus = "idle" | "running" | "paused" | "completed";
export type PlaybackSpeed = 1 | 2;

export const PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = [1, 2];
export const BASE_TICK_MS = 400;

export type PlaybackState = {
  status: PlaybackStatus;
  totalSteps: number;
  /** Zero-based month currently being processed. */
  stepIndex: number;
  stageIndex: number;
  /** Months whose counters have been updated. */
  completedSteps: number;
  speed: PlaybackSpeed;
  region: Region;
};

export type PlaybackAction =
  | { type: "start" }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "tick" }
  | { type: "set-speed"; speed: PlaybackSpeed }
  | { type: "set-region"; region: Region }
  | { type: "reset" }
  | { type: "set-total"; totalSteps: number };

const UPDATE_STAGE = PLAYBACK_STAGES.indexOf("update");

export function initialPlaybackState(
  totalSteps: number,
  speed: PlaybackSpeed = 1,
  region: Region = "Barrowdale",
): PlaybackState {
  return {
    status: "idle",
    totalSteps,
    stepIndex: 0,
    stageIndex: 0,
    completedSteps: 0,
    speed,
    region,
  };
}

/** Speed only changes wall-clock timing; the sequence of ticks is identical. */
export function tickIntervalMs(speed: PlaybackSpeed) {
  return BASE_TICK_MS / speed;
}

export function ticksToComplete(totalSteps: number) {
  return totalSteps * PLAYBACK_STAGES.length;
}

function advance(state: PlaybackState): PlaybackState {
  if (state.stageIndex < UPDATE_STAGE) {
    const stageIndex = state.stageIndex + 1;
    return {
      ...state,
      stageIndex,
      completedSteps:
        stageIndex === UPDATE_STAGE ? state.stepIndex + 1 : state.completedSteps,
    };
  }
  if (state.stepIndex + 1 >= state.totalSteps) {
    return { ...state, status: "completed", completedSteps: state.totalSteps };
  }
  return { ...state, stepIndex: state.stepIndex + 1, stageIndex: 0 };
}

export function playbackReducer(
  state: PlaybackState,
  action: PlaybackAction,
): PlaybackState {
  switch (action.type) {
    case "start":
      if (state.totalSteps === 0) return state;
      if (state.status === "idle" || state.status === "completed") {
        return { ...initialPlaybackState(state.totalSteps, state.speed, state.region), status: "running" };
      }
      return { ...state, status: "running" };
    case "pause":
      return state.status === "running" ? { ...state, status: "paused" } : state;
    case "resume":
      return state.status === "paused" ? { ...state, status: "running" } : state;
    case "tick":
      return state.status === "running" ? advance(state) : state;
    case "set-speed":
      return { ...state, speed: action.speed };
    case "set-region":
      return action.region === state.region
        ? state
        : initialPlaybackState(state.totalSteps, state.speed, action.region);
    case "reset":
      return initialPlaybackState(state.totalSteps, state.speed, state.region);
    case "set-total":
      return action.totalSteps === state.totalSteps
        ? state
        : initialPlaybackState(action.totalSteps, state.speed, state.region);
  }
}

export function activeStage(state: PlaybackState): PlaybackStage | null {
  if (state.status === "idle") return null;
  if (state.status === "completed") return "update";
  return PLAYBACK_STAGES[state.stageIndex];
}
import type { Region } from "@/domain/types";
