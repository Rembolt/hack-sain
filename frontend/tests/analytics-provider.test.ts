import { describe, expect, it } from "vitest";
import type { Calibration } from "@/domain/types";
import { analyticsProvider } from "@/integrations/analytics-provider";
import {
  assertNormalizedModelResult,
  type NormalizedModelResult,
} from "@/integrations/contracts";
import { simulate, ZERO_ASSUMPTIONS } from "@/simulation/engine";

const calibration: Calibration = {
  totalComplaints: 100,
  estimatedReadComplaints: 20,
  informationOnlyComplaints: 25,
  overlapComplaints: 5,
  transferredComplaints: 30,
  transferredEstimatedRead: 6,
  transferredInformationOnly: 8,
  transferredOverlap: 2,
  nonTransferredAverageDays: 20,
  transferredAverageDays: 40,
  openingBacklog: 50,
  monthlyOpened: 100,
  monthlyClosed: 95,
  currentKpiCloseDays: 43.8,
  normalHandlingCost: 68,
  transferredCost: 121,
  transferPremium: 53,
};

describe("analytics integration contract", () => {
  it("identifies the active engine as a reference provider", () => {
    expect(analyticsProvider.provenance.kind).toBe("reference");
    expect(analyticsProvider.provenance.id).toContain("deterministic");
    expect(analyticsProvider.provenance.description).toContain("not a trained");
  });

  it("preserves the deterministic engine result behind the provider seam", () => {
    expect(analyticsProvider.runScenario(calibration, ZERO_ASSUMPTIONS)).toEqual(
      simulate(calibration, ZERO_ASSUMPTIONS),
    );
  });
});

describe("future model adapter contract", () => {
  const result: NormalizedModelResult = {
    caseIdentifier: "NW-108365",
    riskScore: 0.72,
    confidence: 0.81,
    reasonCodes: ["estimated-read-context"],
    recommendedAction: "review",
    modelVersion: "teammate-model-version",
    provenance: {
      id: "teammate-adapter",
      label: "Teammate model adapter",
      kind: "integrated",
      schemaVersion: "1.0.0",
      description: "Normalized only at the frontend boundary.",
    },
  };

  it("accepts a normalized, evidence-carrying result", () => {
    expect(assertNormalizedModelResult(result)).toBe(result);
  });

  it("rejects out-of-range scores before they reach UI components", () => {
    expect(() =>
      assertNormalizedModelResult({ ...result, confidence: 1.01 }),
    ).toThrow(RangeError);
  });
});
