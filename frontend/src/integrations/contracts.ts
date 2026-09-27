import type { Calibration } from "@/domain/types";
import type {
  SimulationAssumptions,
  SimulationResult,
} from "@/simulation/engine";

export type ProviderProvenance = {
  id: string;
  label: string;
  kind: "reference" | "integrated";
  schemaVersion: string;
  description: string;
};

/**
 * Internal UI contract for a future teammate-owned model result.
 * External transports and payloads stay behind a ModelAdapter.
 */
export type NormalizedModelResult = {
  caseIdentifier: string;
  riskScore: number;
  confidence: number;
  reasonCodes: string[];
  recommendedAction: "proceed" | "review";
  modelVersion: string;
  provenance: ProviderProvenance;
};

export type VerifiedFeedbackRecord = {
  caseIdentifier: string;
  confirmedOutcome: string;
  verifiedCorrection: number | null;
  verificationSource: string;
  verificationTimestamp: string;
};

export interface ModelAdapter<ExternalPayload = unknown> {
  readonly provenance: ProviderProvenance;
  normalize(payload: ExternalPayload): NormalizedModelResult;
}

export interface AnalyticsProvider {
  readonly provenance: ProviderProvenance;
  runScenario(
    calibration: Calibration,
    assumptions: SimulationAssumptions,
  ): SimulationResult;
}

export function assertAnalyticsProvider(
  provider: AnalyticsProvider,
): AnalyticsProvider {
  if (!provider.provenance.id || !provider.provenance.schemaVersion) {
    throw new Error("Analytics provider provenance is incomplete.");
  }
  if (typeof provider.runScenario !== "function") {
    throw new Error("Analytics provider must expose runScenario().");
  }
  return provider;
}

export function assertNormalizedModelResult(
  result: NormalizedModelResult,
): NormalizedModelResult {
  if (!result.caseIdentifier || !result.modelVersion) {
    throw new Error("Model result identity and version are required.");
  }
  if (
    !Number.isFinite(result.riskScore) ||
    result.riskScore < 0 ||
    result.riskScore > 1 ||
    !Number.isFinite(result.confidence) ||
    result.confidence < 0 ||
    result.confidence > 1
  ) {
    throw new RangeError("Risk score and confidence must be between 0 and 1.");
  }
  if (!result.reasonCodes.length) {
    throw new Error("At least one reason code is required.");
  }
  return result;
}
