import type { Calibration } from "@/domain/types";

export type SimulationAssumptions = {
  estimationPreventionRate: number;
  informationDeflectionRate: number;
  transferReductionRate: number;
  capacityRecoveryRate: number;
};

export const ZERO_ASSUMPTIONS: SimulationAssumptions = {
  estimationPreventionRate: 0,
  informationDeflectionRate: 0,
  transferReductionRate: 0,
  capacityRecoveryRate: 0,
};

export const DEFAULT_ASSUMPTIONS: SimulationAssumptions = {
  estimationPreventionRate: 0.3,
  informationDeflectionRate: 0.25,
  transferReductionRate: 0.5,
  capacityRecoveryRate: 0,
};

export const ASSUMPTION_LIMITS: Record<
  keyof SimulationAssumptions,
  { min: number; max: number }
> = {
  estimationPreventionRate: { min: 0, max: 0.6 },
  informationDeflectionRate: { min: 0, max: 0.6 },
  transferReductionRate: { min: 0, max: 1 },
  capacityRecoveryRate: { min: 0, max: 0.15 },
};

export type SimulationResult = {
  assumptions: SimulationAssumptions;
  preventedByEstimation: number;
  remainingInformationCases: number;
  preventedByInformation: number;
  totalPrevented: number;
  complaintReductionRate: number;
  remainingComplaints: number;
  transfersBeforeBridge: number;
  transfersRemovedByBridge: number;
  remainingTransfers: number;
  remainingNonTransfers: number;
  baselineHandlingCost: number;
  projectedHandlingCost: number;
  handlingCostAvoided: number;
  savingsFromPreventedBaseCost: number;
  savingsFromPreventedTransferPremium: number;
  savingsFromBridgeTransferPremium: number;
  baselineCaseMixDays: number;
  projectedAverageDays: number;
  projectedMonthlyOpened: number;
  projectedMonthlyClosed: number;
  backlog: number[];
  unchangedBacklog: number[];
};

function assertRate(name: keyof SimulationAssumptions, value: number) {
  const limit = ASSUMPTION_LIMITS[name];
  if (!Number.isFinite(value) || value < limit.min || value > limit.max) {
    throw new RangeError(`${name} must be between ${limit.min} and ${limit.max}.`);
  }
}

function trajectory(opening: number, opened: number, closed: number, months = 12) {
  const values = [opening];
  for (let month = 0; month < months; month += 1) {
    values.push(Math.max(0, values[values.length - 1] + opened - closed));
  }
  return values;
}

export function simulate(
  calibration: Calibration,
  assumptions: SimulationAssumptions,
): SimulationResult {
  (Object.keys(assumptions) as Array<keyof SimulationAssumptions>).forEach((key) =>
    assertRate(key, assumptions[key]),
  );

  const {
    totalComplaints: n,
    estimatedReadComplaints: e,
    informationOnlyComplaints: i,
    overlapComplaints: ei,
    transferredComplaints: t,
    transferredEstimatedRead: te,
    transferredInformationOnly: ti,
    transferredOverlap: tei,
  } = calibration;

  const preventedByEstimation = e * assumptions.estimationPreventionRate;
  const remainingInformationCases = i - ei * assumptions.estimationPreventionRate;
  const preventedByInformation =
    remainingInformationCases * assumptions.informationDeflectionRate;
  const totalPrevented = preventedByEstimation + preventedByInformation;
  const remainingComplaints = n - totalPrevented;
  const transfersBeforeBridge =
    t -
    te * assumptions.estimationPreventionRate -
    (ti - tei * assumptions.estimationPreventionRate) *
      assumptions.informationDeflectionRate;
  const remainingTransfers =
    transfersBeforeBridge * (1 - assumptions.transferReductionRate);
  const transfersRemovedByBridge = transfersBeforeBridge - remainingTransfers;
  const remainingNonTransfers = remainingComplaints - remainingTransfers;

  const baselineHandlingCost =
    n * calibration.normalHandlingCost + t * calibration.transferPremium;
  const projectedHandlingCost =
    remainingComplaints * calibration.normalHandlingCost +
    remainingTransfers * calibration.transferPremium;
  const handlingCostAvoided = baselineHandlingCost - projectedHandlingCost;
  const savingsFromPreventedBaseCost =
    totalPrevented * calibration.normalHandlingCost;
  const savingsFromPreventedTransferPremium =
    (t - transfersBeforeBridge) * calibration.transferPremium;
  const savingsFromBridgeTransferPremium =
    transfersRemovedByBridge * calibration.transferPremium;
  const baselineCaseMixDays =
    ((n - t) * calibration.nonTransferredAverageDays +
      t * calibration.transferredAverageDays) /
    n;
  const projectedAverageDays =
    remainingComplaints === 0
      ? 0
      : (remainingNonTransfers * calibration.nonTransferredAverageDays +
          remainingTransfers * calibration.transferredAverageDays) /
        remainingComplaints;
  const projectedMonthlyOpened =
    calibration.monthlyOpened * (remainingComplaints / n);
  const projectedMonthlyClosed =
    calibration.monthlyClosed * (1 + assumptions.capacityRecoveryRate);

  return {
    assumptions: { ...assumptions },
    preventedByEstimation,
    remainingInformationCases,
    preventedByInformation,
    totalPrevented,
    complaintReductionRate: totalPrevented / n,
    remainingComplaints,
    transfersBeforeBridge,
    transfersRemovedByBridge,
    remainingTransfers,
    remainingNonTransfers,
    baselineHandlingCost,
    projectedHandlingCost,
    handlingCostAvoided,
    savingsFromPreventedBaseCost,
    savingsFromPreventedTransferPremium,
    savingsFromBridgeTransferPremium,
    baselineCaseMixDays,
    projectedAverageDays,
    projectedMonthlyOpened,
    projectedMonthlyClosed,
    backlog: trajectory(
      calibration.openingBacklog,
      projectedMonthlyOpened,
      projectedMonthlyClosed,
    ),
    unchangedBacklog: trajectory(
      calibration.openingBacklog,
      calibration.monthlyOpened,
      calibration.monthlyClosed,
    ),
  };
}
