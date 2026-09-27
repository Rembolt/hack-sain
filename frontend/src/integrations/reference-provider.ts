import type { AnalyticsProvider } from "@/integrations/contracts";
import { simulate } from "@/simulation/engine";

export const referenceAnalyticsProvider: AnalyticsProvider = {
  provenance: {
    id: "northflow-reference-deterministic-v1",
    label: "NorthFlow deterministic reference engine",
    kind: "reference",
    schemaVersion: "1.0.0",
    description:
      "Local, transparent scenario arithmetic used by the prototype. It is not a trained or validated prediction model.",
  },
  runScenario(calibration, assumptions) {
    return simulate(calibration, assumptions);
  },
};
