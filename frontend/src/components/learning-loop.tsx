import type { CSSProperties } from "react";
import type { ProviderProvenance } from "@/integrations/contracts";
import type { PlaybackStep } from "@/integrations/playback-contracts";
import { oneDecimal, whole } from "@/presentation/formatters";
import { STAGE_LABELS } from "@/presentation/playback-copy";
import {
  PLAYBACK_STAGES,
  type PlaybackState,
} from "@/state/playback-reducer";
import type { PlaybackView } from "@/visualization/playback-houses";

const RING_RADIUS = 38;

function stagePoint(index: number) {
  const angle = ((-90 + index * (360 / PLAYBACK_STAGES.length)) * Math.PI) / 180;
  return { x: 50 + RING_RADIUS * Math.cos(angle), y: 50 + RING_RADIUS * Math.sin(angle) };
}

const VERIFY_POINT = stagePoint(PLAYBACK_STAGES.indexOf("verify"));
const FEEDBACK_POINT = stagePoint(PLAYBACK_STAGES.indexOf("feedback"));
const FEEDBACK_PATH = `M ${VERIFY_POINT.x} ${VERIFY_POINT.y} A ${RING_RADIUS} ${RING_RADIUS} 0 0 1 ${FEEDBACK_POINT.x} ${FEEDBACK_POINT.y} L 50 50`;

function ModelOutput({ step, provenance }: { step: PlaybackStep | null; provenance: ProviderProvenance }) {
  const hasModelFields =
    step && (step.policyVersion !== null || step.reward !== null || step.actionSelected !== null);
  if (!hasModelFields) {
    return (
      <p className="pb-model-status">
        <strong>{provenance.kind === "reference" ? "Reference simulation" : provenance.label}</strong>
        The learning model is not connected yet, so no model decisions, rewards, or accuracy are shown.
      </p>
    );
  }
  return (
    <dl className="pb-model-output">
      {step.policyVersion !== null ? <div><dt>Model version</dt><dd>{step.policyVersion}</dd></div> : null}
      {step.actionSelected !== null ? <div><dt>Action</dt><dd>{step.actionSelected}</dd></div> : null}
      {step.reward !== null ? <div><dt>Reward</dt><dd>{oneDecimal.format(step.reward)}</dd></div> : null}
      {step.cumulativeReward !== null ? <div><dt>Cumulative reward</dt><dd>{oneDecimal.format(step.cumulativeReward)}</dd></div> : null}
      {step.verifiedFeedback ? <div><dt>Verified feedback</dt><dd>{whole.format(step.verifiedFeedback.verifiedEvents)}</dd></div> : null}
      <p>{step.explanation}</p>
    </dl>
  );
}

export function LearningLoop({
  state,
  view,
  step,
  provenance,
}: {
  state: PlaybackState;
  view: PlaybackView;
  step: PlaybackStep | null;
  provenance: ProviderProvenance;
}) {
  const inactive = view === "baseline";
  const running = state.status !== "idle";
  const currentStage = running ? state.stageIndex : -1;
  const feedbackActive =
    !inactive &&
    (state.status === "running" || state.status === "paused") &&
    PLAYBACK_STAGES[currentStage] === "feedback";
  const turns = state.stepIndex * PLAYBACK_STAGES.length + Math.max(currentStage, 0);

  return (
    <figure className={`pb-loop${inactive ? " is-inactive" : ""}${feedbackActive ? " is-feedback" : ""}`} aria-labelledby="pb-loop-title">
      <div className="pb-loop-diagram">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r={RING_RADIUS} className="pb-ring" />
          <path d={FEEDBACK_PATH} className="pb-feedback-path" />
          {running && !inactive ? (
            <g
              className="pb-orbit"
              style={{ transform: `rotate(${turns * (360 / PLAYBACK_STAGES.length)}deg)` } as CSSProperties}
            >
              <circle cx="50" cy={50 - RING_RADIUS} r="2.6" />
            </g>
          ) : null}
        </svg>
        <ol className="pb-stages">
          {PLAYBACK_STAGES.map((stage, index) => {
            const point = stagePoint(index);
            const status =
              !running || inactive
                ? ""
                : state.status === "completed" || index < currentStage
                  ? " is-done"
                  : index === currentStage
                    ? " is-active"
                    : "";
            return (
              <li
                key={stage}
                className={`pb-stage stage-${stage}${status}`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
                aria-current={status === " is-active" ? "step" : undefined}
              >
                <span>{index + 1}</span>
                {STAGE_LABELS[stage].short}
              </li>
            );
          })}
        </ol>
        <div className="pb-core">
          <strong id="pb-loop-title">NorthFlow</strong>
          <span>{inactive ? "Not active in baseline" : feedbackActive ? "receiving verified feedback" : "learning loop"}</span>
          {!inactive ? <small>{state.completedSteps} of {state.totalSteps} feedback cycles</small> : null}
        </div>
      </div>
      <figcaption>
        {inactive
          ? "In the baseline, resolved complaints are not fed back, so the same problems keep arriving."
          : "In the proposed design, verified resolutions return to NorthFlow to inform later decisions."}
      </figcaption>
      <ModelOutput step={step} provenance={provenance} />
    </figure>
  );
}
