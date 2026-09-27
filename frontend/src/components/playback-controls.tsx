import type { Dispatch } from "react";
import { shortMonthLabel } from "@/presentation/playback-copy";
import {
  PLAYBACK_SPEEDS,
  type PlaybackAction,
  type PlaybackState,
} from "@/state/playback-reducer";
import type { PlaybackView } from "@/visualization/playback-houses";

function primaryControl(state: PlaybackState): { label: string; action: PlaybackAction } {
  switch (state.status) {
    case "running":
      return { label: "Pause", action: { type: "pause" } };
    case "paused":
      return { label: "Resume", action: { type: "resume" } };
    case "completed":
      return { label: "Replay simulation", action: { type: "start" } };
    default:
      return { label: "Start simulation", action: { type: "start" } };
  }
}

export function PlaybackControls({
  state,
  dispatch,
  view,
  onViewChange,
  firstMonth,
  lastMonth,
}: {
  state: PlaybackState;
  dispatch: Dispatch<PlaybackAction>;
  view: PlaybackView;
  onViewChange: (view: PlaybackView) => void;
  firstMonth: string;
  lastMonth: string;
}) {
  const primary = primaryControl(state);
  return (
    <section className="pb-controls" aria-label="Simulation playback controls">
      <div className="pb-controls-main">
        <button
          type="button"
          className={`button-primary pb-primary status-${state.status}`}
          onClick={() => dispatch(primary.action)}
        >
          {primary.label}
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={() => dispatch({ type: "reset" })}
          disabled={state.status === "idle"}
        >
          Reset
        </button>
        <div className="pb-toggle" role="group" aria-label="Playback speed">
          {PLAYBACK_SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              aria-pressed={state.speed === speed}
              onClick={() => dispatch({ type: "set-speed", speed })}
            >
              {speed}×
            </button>
          ))}
        </div>
        <div className="pb-toggle" role="group" aria-label="Compare with baseline">
          <button type="button" aria-pressed={view === "northflow"} onClick={() => onViewChange("northflow")}>
            With NorthFlow
          </button>
          <button type="button" aria-pressed={view === "baseline"} onClick={() => onViewChange("baseline")}>
            Baseline
          </button>
        </div>
      </div>
      <div className="pb-progress">
        <label htmlFor="pb-progress-bar">
          {state.completedSteps} of {state.totalSteps} months processed
        </label>
        <progress id="pb-progress-bar" max={state.totalSteps} value={state.completedSteps} />
        <span className="pb-progress-ends">
          <span>{shortMonthLabel(firstMonth)}</span>
          <span>{shortMonthLabel(lastMonth)}</span>
        </span>
      </div>
    </section>
  );
}
