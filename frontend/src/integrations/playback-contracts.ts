import type { Calibration, Region, RegionalComplaintSummary } from "@/domain/types";
import type { ProviderProvenance } from "@/integrations/contracts";
import type { SimulationAssumptions } from "@/simulation/engine";

export type PlaybackAction = "proceed" | "review" | "reroute" | "prevent";

export type VerifiedFeedbackEvent = {
  verifiedEvents: number;
  verificationSource: string;
};

/**
 * One month of the 24-month replay. Cumulative values are unrounded.
 * Model-only fields stay null until a teammate learning model supplies them.
 */
export type PlaybackStep = {
  step: number;
  month: string;
  observedComplaints: number;
  cumulativeObservedComplaints: number;
  cumulativeObservedTransfers: number;
  actionSelected: PlaybackAction | null;
  explanation: string;
  reward: number | null;
  cumulativeReward: number | null;
  policyVersion: string | null;
  cumulativeComplaintsAvoided: number;
  cumulativeTransfersAvoided: number;
  cumulativeCostAvoided: number;
  verifiedFeedback: VerifiedFeedbackEvent | null;
};

export type PlaybackTimeline = {
  provenance: ProviderProvenance;
  impact: RegionalImpactResult;
  steps: PlaybackStep[];
};

export type RegionalImpactResult = {
  region: Region | null;
  observedComplaints: number;
  eligibleComplaintsPrevented: number;
  remainingComplaints: number;
  observedTransfers: number;
  transfersAvoided: number;
  remainingTransfers: number;
  grossHandlingExposure: number;
  grossHandlingExposureAvoided: number;
};

export type PlaybackInput = {
  calibration: Calibration;
  assumptions: SimulationAssumptions;
  monthlyComplaints: ReadonlyArray<{ month: string; complaints: number }>;
  region?: Region;
  regionalCalibration?: RegionalComplaintSummary;
};

export interface PlaybackProvider {
  readonly provenance: ProviderProvenance;
  buildTimeline(input: PlaybackInput): PlaybackTimeline;
}

function nonDecreasing(steps: PlaybackStep[], key: keyof PlaybackStep) {
  return steps.every(
    (step, index) =>
      index === 0 || (step[key] as number) >= (steps[index - 1][key] as number),
  );
}

export function assertPlaybackTimeline(timeline: PlaybackTimeline): PlaybackTimeline {
  if (!timeline.provenance.id || !timeline.provenance.schemaVersion) {
    throw new Error("Playback provenance is incomplete.");
  }
  if (!timeline.steps.length) {
    throw new Error("Playback timeline must contain at least one step.");
  }
  timeline.steps.forEach((step, index) => {
    if (step.step !== index + 1) {
      throw new Error(`Playback step ${index + 1} is out of order.`);
    }
    if (!/^\d{4}-\d{2}$/.test(step.month)) {
      throw new Error(`Playback step ${step.step} has an invalid month.`);
    }
    for (const key of [
      "observedComplaints",
      "cumulativeObservedComplaints",
      "cumulativeObservedTransfers",
      "cumulativeComplaintsAvoided",
      "cumulativeTransfersAvoided",
      "cumulativeCostAvoided",
    ] as const) {
      if (!Number.isFinite(step[key]) || step[key] < 0) {
        throw new RangeError(`Playback step ${step.step} ${key} must be a non-negative number.`);
      }
    }
  });
  for (const key of [
    "cumulativeObservedComplaints",
    "cumulativeComplaintsAvoided",
    "cumulativeTransfersAvoided",
    "cumulativeCostAvoided",
  ] as const) {
    if (!nonDecreasing(timeline.steps, key)) {
      throw new Error(`Playback ${key} must not decrease.`);
    }
  }
  return timeline;
}
