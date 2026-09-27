import { describe, expect, it } from "vitest";
import type { Calibration } from "@/domain/types";
import {
  ASSUMPTION_LIMITS,
  DEFAULT_ASSUMPTIONS,
  ZERO_ASSUMPTIONS,
  simulate,
} from "@/simulation/engine";
import { scenarioReducer } from "@/state/scenario-reducer";

export const calibration: Calibration = {
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

describe("simulation engine", () => {
  it("reproduces the observed baseline at zero", () => {
    const result = simulate(calibration, ZERO_ASSUMPTIONS);
    expect(result.totalPrevented).toBe(0);
    expect(result.remainingComplaints).toBe(25_416);
    expect(result.remainingTransfers).toBe(8_870);
    expect(result.backlog[12]).toBe(2_010);
  });

  it("reproduces the contracted default result", () => {
    const result = simulate(calibration, DEFAULT_ASSUMPTIONS);
    expect(result.preventedByEstimation).toBeCloseTo(1_449.9, 6);
    expect(result.preventedByInformation).toBeCloseTo(1_396.65, 6);
    expect(result.totalPrevented).toBeCloseTo(2_846.55, 6);
    expect(result.remainingComplaints).toBeCloseTo(22_569.45, 6);
    expect(result.remainingTransfers).toBeCloseTo(3_940.125, 6);
    expect(result.handlingCostAvoided).toBeCloseTo(454_848.775, 6);
    expect(
      result.savingsFromPreventedBaseCost +
        result.savingsFromPreventedTransferPremium +
        result.savingsFromBridgeTransferPremium,
    ).toBeCloseTo(result.handlingCostAvoided, 6);
    expect(result.projectedAverageDays).toBeCloseTo(25.6334, 3);
    expect(result.backlog[12]).toBeCloseTo(479.2066, 3);
  });

  it("counts the overlapping category only once", () => {
    const result = simulate(calibration, {
      ...ZERO_ASSUMPTIONS,
      estimationPreventionRate: 0.6,
      informationDeflectionRate: 0.6,
    });
    expect(result.totalPrevented).toBeCloseTo(
      4_833 * 0.6 + (5_865 - 928 * 0.6) * 0.6,
    );
  });

  it("keeps transfer reduction independent from complaint volume", () => {
    const low = simulate(calibration, {
      ...DEFAULT_ASSUMPTIONS,
      transferReductionRate: 0,
    });
    const high = simulate(calibration, {
      ...DEFAULT_ASSUMPTIONS,
      transferReductionRate: 1,
    });
    expect(high.totalPrevented).toBe(low.totalPrevented);
    expect(high.projectedMonthlyOpened).toBe(low.projectedMonthlyOpened);
    expect(high.remainingTransfers).toBe(0);
  });

  it("keeps capacity independent from complaints and transfers", () => {
    const low = simulate(calibration, DEFAULT_ASSUMPTIONS);
    const high = simulate(calibration, {
      ...DEFAULT_ASSUMPTIONS,
      capacityRecoveryRate: 0.15,
    });
    expect(high.totalPrevented).toBe(low.totalPrevented);
    expect(high.remainingComplaints).toBe(low.remainingComplaints);
    expect(high.remainingTransfers).toBe(low.remainingTransfers);
    expect(high.backlog[12]).toBeLessThanOrEqual(low.backlog[12]);
  });

  it("is monotonic for both prevention controls", () => {
    const base = simulate(calibration, ZERO_ASSUMPTIONS);
    const estimation = simulate(calibration, {
      ...ZERO_ASSUMPTIONS,
      estimationPreventionRate: 0.6,
    });
    const information = simulate(calibration, {
      ...ZERO_ASSUMPTIONS,
      informationDeflectionRate: 0.6,
    });
    expect(estimation.remainingComplaints).toBeLessThan(base.remainingComplaints);
    expect(information.remainingComplaints).toBeLessThan(base.remainingComplaints);
  });

  it("never produces negative backlog", () => {
    const result = simulate(calibration, {
      estimationPreventionRate: 0.6,
      informationDeflectionRate: 0.6,
      transferReductionRate: 1,
      capacityRecoveryRate: 0.15,
    });
    expect(result.backlog.every((value) => value >= 0)).toBe(true);
  });

  it("rejects every out-of-range assumption", () => {
    for (const [key, limit] of Object.entries(ASSUMPTION_LIMITS)) {
      expect(() =>
        simulate(calibration, {
          ...DEFAULT_ASSUMPTIONS,
          [key]: limit.max + 0.01,
        }),
      ).toThrow(RangeError);
    }
  });

  it("supports both reset actions", () => {
    expect(scenarioReducer(DEFAULT_ASSUMPTIONS, { type: "reset-baseline" })).toEqual(
      ZERO_ASSUMPTIONS,
    );
    expect(scenarioReducer(ZERO_ASSUMPTIONS, { type: "reset-defaults" })).toEqual(
      DEFAULT_ASSUMPTIONS,
    );
  });
});
