import type { BrowserComplaint } from "@/domain/types";
import type { SimulationAssumptions } from "@/simulation/engine";

export type ScenarioHouseState =
  | "unchanged"
  | "prevented-estimation"
  | "prevented-information"
  | "rerouted";

function seededFraction(seed: string) {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

export function scenarioHouseState(
  complaint: BrowserComplaint,
  assumptions: SimulationAssumptions,
): ScenarioHouseState {
  const seed = `${complaint.complaintId}|${complaint.region}`;
  if (
    complaint.category === "Billing - estimated read" &&
    seededFraction(`${seed}|estimate`) < assumptions.estimationPreventionRate
  ) {
    return "prevented-estimation";
  }
  if (
    complaint.informationOnly === true &&
    seededFraction(`${seed}|information`) < assumptions.informationDeflectionRate
  ) {
    return "prevented-information";
  }
  if (
    complaint.transferred &&
    seededFraction(`${seed}|transfer`) < assumptions.transferReductionRate
  ) {
    return "rerouted";
  }
  return "unchanged";
}

export function allocateScenarioHouses(
  complaints: readonly BrowserComplaint[],
  assumptions: SimulationAssumptions,
) {
  return complaints.map((complaint) => ({
    complaint,
    state: scenarioHouseState(complaint, assumptions),
  }));
}
