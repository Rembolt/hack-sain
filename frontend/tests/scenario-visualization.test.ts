import { describe, expect, it } from "vitest";
import type { BrowserComplaint } from "@/domain/types";
import { ZERO_ASSUMPTIONS, type SimulationAssumptions } from "@/simulation/engine";
import {
  allocateScenarioHouses,
  scenarioHouseState,
} from "@/visualization/scenario-allocation";

function complaint(overrides: Partial<BrowserComplaint> = {}): BrowserComplaint {
  return {
    complaintId: "NW-100001",
    accountId: "A-anonymized",
    month: "2025-06",
    dateOpened: "2025-06-01",
    dateClosed: "2025-06-08",
    status: "Closed",
    channel: "Web form",
    category: "Other",
    priority: "P2",
    region: "Barrowdale",
    sourceSystem: "SYS-01",
    transferred: false,
    slaDays: 10,
    daysToClose: 7,
    slaBreach: false,
    reopened: false,
    informationOnly: false,
    resolutionAction: "Explained",
    billCorrectionValue: null,
    ...overrides,
  };
}

describe("illustrative scenario allocation", () => {
  it("is stable for the same complaint ID, region, and assumptions", () => {
    const assumptions: SimulationAssumptions = {
      estimationPreventionRate: 0.6,
      informationDeflectionRate: 0.6,
      transferReductionRate: 1,
      capacityRecoveryRate: 0.15,
    };
    const rows = [
      complaint({ complaintId: "NW-100002", category: "Billing - estimated read" }),
      complaint({ complaintId: "NW-100003", informationOnly: true }),
      complaint({ complaintId: "NW-100004", transferred: true }),
    ];
    expect(allocateScenarioHouses(rows, assumptions)).toEqual(
      allocateScenarioHouses(rows, assumptions),
    );
  });

  it("never visually prevents an ineligible complaint", () => {
    const assumptions: SimulationAssumptions = {
      estimationPreventionRate: 0.6,
      informationDeflectionRate: 0.6,
      transferReductionRate: 0,
      capacityRecoveryRate: 0,
    };
    expect(scenarioHouseState(complaint(), assumptions)).toBe("unchanged");
  });

  it("uses routing only for remaining transferred complaints", () => {
    const assumptions: SimulationAssumptions = {
      ...ZERO_ASSUMPTIONS,
      transferReductionRate: 1,
    };
    expect(scenarioHouseState(complaint({ transferred: true }), assumptions)).toBe("rerouted");
    expect(scenarioHouseState(complaint({ transferred: false }), assumptions)).toBe("unchanged");
  });

  it("does not change house allocation when capacity alone changes", () => {
    const row = complaint({ transferred: true });
    expect(scenarioHouseState(row, ZERO_ASSUMPTIONS)).toBe(
      scenarioHouseState(row, { ...ZERO_ASSUMPTIONS, capacityRecoveryRate: 0.15 }),
    );
  });
});
