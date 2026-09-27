import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REGIONS, type Calibration, type SummaryData } from "@/domain/types";
import { referenceAnalyticsProvider } from "@/integrations/reference-provider";
import {
  assertPlaybackTimeline,
  type PlaybackStep,
} from "@/integrations/playback-contracts";
import { createReferencePlaybackProvider } from "@/integrations/reference-playback-provider";
import { DEFAULT_ASSUMPTIONS, ZERO_ASSUMPTIONS, simulate } from "@/simulation/engine";
import {
  PLAYBACK_STAGES,
  activeStage,
  initialPlaybackState,
  playbackReducer,
  tickIntervalMs,
  ticksToComplete,
  type PlaybackAction,
  type PlaybackState,
} from "@/state/playback-reducer";

const calibration: Calibration = {
  totalComplaints: 25_416,
  estimatedReadComplaints: 4_833,
  informationOnlyComplaints: 5_865,
  overlapComplaints: 928,
  transferredComplaints: 8_870,
  transferredEstimatedRead: 1_702,
  transferredInformationOnly: 2_015,
  transferredOverlap: 328,
  nonTransferredAverageDays: 22.966,
  transferredAverageDays: 38.245,
  openingBacklog: 1_758,
  monthlyOpened: 1_139,
  monthlyClosed: 1_118,
  currentKpiCloseDays: 43.8,
  normalHandlingCost: 68,
  transferredCost: 121,
  transferPremium: 53,
};

const MONTHS = Array.from({ length: 24 }, (_, index) => {
  const date = new Date(Date.UTC(2024, 9 + index, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
});

// 25,416 complaints spread unevenly over the 24 observed months.
const monthlyComplaints = MONTHS.map((month, index) => ({
  month,
  complaints: index < 23 ? 1_000 + index * 3 : 25_416 - (23 * 1_000 + 3 * (22 * 23) / 2),
}));

const provider = createReferencePlaybackProvider(referenceAnalyticsProvider);

function builtTimeline(assumptions = DEFAULT_ASSUMPTIONS) {
  return assertPlaybackTimeline(
    provider.buildTimeline({ calibration, assumptions, monthlyComplaints }),
  );
}

function timeline(assumptions = DEFAULT_ASSUMPTIONS) {
  return builtTimeline(assumptions).steps;
}

function run(state: PlaybackState, actions: PlaybackAction[]) {
  return actions.reduce(playbackReducer, state);
}

function ticks(count: number): PlaybackAction[] {
  return Array.from({ length: count }, () => ({ type: "tick" }) as const);
}

function counterStep(steps: PlaybackStep[], state: PlaybackState) {
  return state.completedSteps > 0 ? steps[state.completedSteps - 1] : null;
}

describe("playback state machine", () => {
  const idle = initialPlaybackState(24);

  it("starts idle at the observed starting state", () => {
    expect(idle.status).toBe("idle");
    expect(idle.completedSteps).toBe(0);
    expect(activeStage(idle)).toBeNull();
    expect(playbackReducer(idle, { type: "tick" })).toBe(idle);
    expect(idle.region).toBe("Barrowdale");
  });

  it("runs and advances through each workflow stage", () => {
    const running = playbackReducer(idle, { type: "start" });
    expect(running.status).toBe("running");
    expect(activeStage(running)).toBe("enter");
    const stages = PLAYBACK_STAGES.map((_, index) =>
      activeStage(run(running, ticks(index))),
    );
    expect(stages).toEqual([...PLAYBACK_STAGES]);
    const afterMonth = run(running, ticks(PLAYBACK_STAGES.length));
    expect(afterMonth.stepIndex).toBe(1);
    expect(afterMonth.completedSteps).toBe(1);
  });

  it("pauses at the current step and resumes from it", () => {
    const running = run(idle, [{ type: "start" }, ...ticks(9)]);
    const paused = playbackReducer(running, { type: "pause" });
    expect(paused.status).toBe("paused");
    const stillPaused = run(paused, ticks(20));
    expect(stillPaused.stepIndex).toBe(running.stepIndex);
    expect(stillPaused.stageIndex).toBe(running.stageIndex);
    expect(stillPaused.completedSteps).toBe(running.completedSteps);
    const resumed = playbackReducer(stillPaused, { type: "resume" });
    expect(resumed.status).toBe("running");
    expect(playbackReducer(resumed, { type: "tick" }).stageIndex).toBe(running.stageIndex + 1);
  });

  it("completes after every month and ignores further ticks", () => {
    const completed = run(idle, [{ type: "start" }, ...ticks(ticksToComplete(24))]);
    expect(completed.status).toBe("completed");
    expect(completed.completedSteps).toBe(24);
    expect(run(completed, ticks(10))).toEqual(completed);
    const oneShort = run(idle, [{ type: "start" }, ...ticks(ticksToComplete(24) - 1)]);
    expect(oneShort.status).toBe("running");
  });

  it("restarts from the beginning when started after completion", () => {
    const completed = run(idle, [{ type: "start" }, ...ticks(ticksToComplete(24))]);
    const replay = playbackReducer(completed, { type: "start" });
    expect(replay.status).toBe("running");
    expect(replay.completedSteps).toBe(0);
    expect(replay.stepIndex).toBe(0);
  });

  it("changes only timing when the speed changes", () => {
    const running = run(idle, [{ type: "start" }, ...ticks(13)]);
    const faster = playbackReducer(running, { type: "set-speed", speed: 2 });
    expect({ ...faster, speed: running.speed }).toEqual(running);
    expect(tickIntervalMs(2)).toBe(tickIntervalMs(1) / 2);
  });

  it("produces identical final results at 1x and 2x", () => {
    const steps = timeline();
    const atOne = run(initialPlaybackState(24, 1), [{ type: "start" }, ...ticks(ticksToComplete(24))]);
    const atTwo = run(initialPlaybackState(24, 2), [{ type: "start" }, ...ticks(ticksToComplete(24))]);
    const mixed = run(initialPlaybackState(24, 1), [
      { type: "start" },
      ...ticks(40),
      { type: "set-speed", speed: 2 },
      ...ticks(50),
      { type: "set-speed", speed: 1 },
      ...ticks(ticksToComplete(24) - 90),
    ]);
    expect(atOne.status).toBe("completed");
    expect(atTwo.status).toBe("completed");
    expect(mixed.status).toBe("completed");
    expect(counterStep(steps, atTwo)).toEqual(counterStep(steps, atOne));
    expect(counterStep(steps, mixed)).toEqual(counterStep(steps, atOne));
  });

  it("resets to the observed starting state and keeps the chosen speed", () => {
    const busy = run(initialPlaybackState(24, 2), [{ type: "start" }, ...ticks(30), { type: "pause" }]);
    const reset = playbackReducer(busy, { type: "reset" });
    expect(reset).toEqual(initialPlaybackState(24, 2));
    expect(counterStep(timeline(), reset)).toBeNull();
  });

  it("supports all six regions and resets when the region changes", () => {
    for (const region of REGIONS) {
      const busy = run(initialPlaybackState(24), [{ type: "start" }, ...ticks(17)]);
      const changed = playbackReducer(busy, { type: "set-region", region });
      expect(changed.region).toBe(region);
      if (region === "Barrowdale") {
        expect(changed).toBe(busy);
      } else {
        expect(changed.status).toBe("idle");
        expect(changed.completedSteps).toBe(0);
        expect(changed.stepIndex).toBe(0);
      }
    }
  });
});

describe("reference playback provider", () => {
  it("replays October 2024 through September 2026", () => {
    const steps = timeline();
    expect(steps).toHaveLength(24);
    expect(steps[0].month).toBe("2024-10");
    expect(steps[23].month).toBe("2026-09");
    expect(steps[23].cumulativeObservedComplaints).toBe(25_416);
  });

  it("ends exactly on the deterministic scenario result", () => {
    const final = timeline().at(-1)!;
    const result = simulate(calibration, DEFAULT_ASSUMPTIONS);
    expect(final.cumulativeComplaintsAvoided).toBeCloseTo(2_846.55, 6);
    expect(final.cumulativeCostAvoided).toBeCloseTo(454_848.775, 6);
    expect(final.cumulativeTransfersAvoided).toBeCloseTo(8_870 - result.remainingTransfers, 6);
    expect(final.cumulativeObservedTransfers).toBeCloseTo(8_870, 6);
  });

  it("does not invent model outputs", () => {
    for (const step of timeline()) {
      expect(step.reward).toBeNull();
      expect(step.cumulativeReward).toBeNull();
      expect(step.policyVersion).toBeNull();
      expect(step.actionSelected).toBeNull();
      expect(step.verifiedFeedback).toBeNull();
    }
    expect(provider.provenance.kind).toBe("reference");
  });

  it("avoids nothing under the observed baseline assumptions", () => {
    const final = timeline(ZERO_ASSUMPTIONS).at(-1)!;
    expect(final.cumulativeComplaintsAvoided).toBe(0);
    expect(final.cumulativeTransfersAvoided).toBe(0);
    expect(final.cumulativeCostAvoided).toBe(0);
  });

  it("fails clearly when monthly records do not reconcile", () => {
    expect(() =>
      provider.buildTimeline({
        calibration,
        assumptions: DEFAULT_ASSUMPTIONS,
        monthlyComplaints: monthlyComplaints.slice(1),
      }),
    ).toThrow(/do not reconcile/);
  });

  it("rejects timelines whose cumulative totals decrease", () => {
    const timelineResult = builtTimeline();
    const broken = timelineResult.steps.map((step, index) =>
      index === 5 ? { ...step, cumulativeComplaintsAvoided: 0 } : step,
    );
    expect(() =>
      assertPlaybackTimeline({ ...timelineResult, steps: broken }),
    ).toThrow(/must not decrease/);
  });

  it("reconciles the six generated regional totals to the global complaint and transfer totals", () => {
    const summary = JSON.parse(
      readFileSync(new URL("../public/data/summary.json", import.meta.url), "utf8"),
    ) as SummaryData;
    const regional = REGIONS.map((region) => summary.regionalComplaints[region]);
    expect(regional.reduce((sum, item) => sum + item.totalComplaints, 0)).toBe(
      summary.calibration.totalComplaints,
    );
    expect(regional.reduce((sum, item) => sum + item.transferredComplaints, 0)).toBe(
      summary.calibration.transferredComplaints,
    );
  });

  it("builds a region-scoped result without inventing a backlog", () => {
    const regionalCalibration = {
      region: "Barrowdale" as const,
      totalComplaints: 100,
      estimatedReadComplaints: 20,
      informationOnlyComplaints: 30,
      overlapComplaints: 5,
      transferredComplaints: 40,
      transferredEstimatedRead: 8,
      transferredInformationOnly: 12,
      transferredOverlap: 2,
      monthlyComplaints: MONTHS.map((month, index) => ({
        month,
        complaints: index < 23 ? 4 : 8,
      })),
    };
    const regionalTimeline = assertPlaybackTimeline(
      provider.buildTimeline({
        calibration,
        assumptions: DEFAULT_ASSUMPTIONS,
        monthlyComplaints: regionalCalibration.monthlyComplaints,
        region: "Barrowdale",
        regionalCalibration,
      }),
    );
    expect(regionalTimeline.impact.region).toBe("Barrowdale");
    expect(regionalTimeline.impact.observedComplaints).toBe(100);
    expect(regionalTimeline.impact.observedTransfers).toBe(40);
    expect(regionalTimeline.impact).not.toHaveProperty("backlog");
    expect(regionalTimeline.steps.at(-1)?.cumulativeComplaintsAvoided).toBeCloseTo(
      regionalTimeline.impact.eligibleComplaintsPrevented,
    );
  });
});
