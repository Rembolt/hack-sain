import type { AnalyticsProvider } from "@/integrations/contracts";
import type {
  PlaybackInput,
  PlaybackProvider,
  PlaybackStep,
  RegionalImpactResult,
} from "@/integrations/playback-contracts";
import type { Calibration, RegionalComplaintSummary } from "@/domain/types";
import type { SimulationAssumptions } from "@/simulation/engine";

const REFERENCE_EXPLANATION =
  "Reference simulation: scenario totals are spread across the months in proportion to observed complaint volume. No model decision is made.";

type ImpactCounts = Pick<
  Calibration,
  | "totalComplaints"
  | "estimatedReadComplaints"
  | "informationOnlyComplaints"
  | "overlapComplaints"
  | "transferredComplaints"
  | "transferredEstimatedRead"
  | "transferredInformationOnly"
  | "transferredOverlap"
>;

/** Contract-backed complaint, transfer, and handling-cost calculation without backlog fields. */
export function calculateRegionalImpact(
  counts: ImpactCounts | RegionalComplaintSummary,
  assumptions: SimulationAssumptions,
  normalHandlingCost: number,
  transferPremium: number,
  region: RegionalImpactResult["region"] = null,
): RegionalImpactResult {
  const preventedByEstimation =
    counts.estimatedReadComplaints * assumptions.estimationPreventionRate;
  const remainingInformationCases =
    counts.informationOnlyComplaints -
    counts.overlapComplaints * assumptions.estimationPreventionRate;
  const preventedByInformation =
    remainingInformationCases * assumptions.informationDeflectionRate;
  const eligibleComplaintsPrevented = preventedByEstimation + preventedByInformation;
  const remainingComplaints = counts.totalComplaints - eligibleComplaintsPrevented;
  const transfersBeforeBridge =
    counts.transferredComplaints -
    counts.transferredEstimatedRead * assumptions.estimationPreventionRate -
    (counts.transferredInformationOnly -
      counts.transferredOverlap * assumptions.estimationPreventionRate) *
      assumptions.informationDeflectionRate;
  const remainingTransfers =
    transfersBeforeBridge * (1 - assumptions.transferReductionRate);
  const grossHandlingExposure =
    counts.totalComplaints * normalHandlingCost +
    counts.transferredComplaints * transferPremium;
  const projectedHandlingExposure =
    remainingComplaints * normalHandlingCost + remainingTransfers * transferPremium;

  return {
    region,
    observedComplaints: counts.totalComplaints,
    eligibleComplaintsPrevented,
    remainingComplaints,
    observedTransfers: counts.transferredComplaints,
    transfersAvoided: counts.transferredComplaints - remainingTransfers,
    remainingTransfers,
    grossHandlingExposure,
    grossHandlingExposureAvoided: grossHandlingExposure - projectedHandlingExposure,
  };
}

/**
 * Interpolates the deterministic scenario result over the observed months.
 * It is a reference simulation, not model output: reward, policy version,
 * selected action, and verified feedback remain null.
 */
export function createReferencePlaybackProvider(
  analytics: AnalyticsProvider,
): PlaybackProvider {
  const provenance = {
    id: "northflow-reference-playback-v1",
    label: "Reference learning-loop simulation",
    kind: "reference" as const,
    schemaVersion: "1.0.0",
    description:
      "Interpolates the deterministic scenario engine over the observed 24-month complaint population. It is not a trained or reinforcement-learning model.",
  };
  return {
    provenance,
    buildTimeline({
      calibration,
      assumptions,
      monthlyComplaints,
      region = undefined,
      regionalCalibration,
    }: PlaybackInput) {
      const months = [...monthlyComplaints].sort((left, right) =>
        left.month.localeCompare(right.month),
      );
      const observedTotal = months.reduce((sum, entry) => sum + entry.complaints, 0);
      const impactCounts = regionalCalibration ?? calibration;
      if (observedTotal !== impactCounts.totalComplaints) {
        throw new Error(
          `Monthly complaint records (${observedTotal}) do not reconcile to ${impactCounts.totalComplaints}.`,
        );
      }

      const impact = regionalCalibration
        ? calculateRegionalImpact(
            regionalCalibration,
            assumptions,
            calibration.normalHandlingCost,
            calibration.transferPremium,
            region ?? regionalCalibration.region,
          )
        : (() => {
            const result = analytics.runScenario(calibration, assumptions);
            return {
              region: null,
              observedComplaints: calibration.totalComplaints,
              eligibleComplaintsPrevented: result.totalPrevented,
              remainingComplaints: result.remainingComplaints,
              observedTransfers: calibration.transferredComplaints,
              transfersAvoided: calibration.transferredComplaints - result.remainingTransfers,
              remainingTransfers: result.remainingTransfers,
              grossHandlingExposure: result.baselineHandlingCost,
              grossHandlingExposureAvoided: result.handlingCostAvoided,
            } satisfies RegionalImpactResult;
          })();
      let cumulativeObserved = 0;

      const steps: PlaybackStep[] = months.map((entry, index) => {
        cumulativeObserved += entry.complaints;
        const share = cumulativeObserved / observedTotal;
        return {
          step: index + 1,
          month: entry.month,
          observedComplaints: entry.complaints,
          cumulativeObservedComplaints: cumulativeObserved,
          cumulativeObservedTransfers: impact.observedTransfers * share,
          actionSelected: null,
          explanation: REFERENCE_EXPLANATION,
          reward: null,
          cumulativeReward: null,
          policyVersion: null,
          cumulativeComplaintsAvoided: impact.eligibleComplaintsPrevented * share,
          cumulativeTransfersAvoided: impact.transfersAvoided * share,
          cumulativeCostAvoided: impact.grossHandlingExposureAvoided * share,
          verifiedFeedback: null,
        };
      });

      return { provenance, impact, steps };
    },
  };
}
