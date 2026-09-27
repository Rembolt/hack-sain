import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SummaryData } from "../src/domain/types";
import {
  ASSUMPTION_LIMITS,
  DEFAULT_ASSUMPTIONS,
  ZERO_ASSUMPTIONS,
  simulate,
  type SimulationAssumptions,
} from "../src/simulation/engine";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const summary = JSON.parse(
  await readFile(path.resolve(scriptDir, "../public/data/summary.json"), "utf8"),
) as SummaryData;

const scenarios: Array<[string, SimulationAssumptions]> = [
  ["Observed baseline", ZERO_ASSUMPTIONS],
  ["Demo defaults", DEFAULT_ASSUMPTIONS],
];

for (const [key, limit] of Object.entries(ASSUMPTION_LIMITS) as Array<
  [keyof SimulationAssumptions, { min: number; max: number }]
>) {
  scenarios.push([
    `${key} minimum`,
    { ...DEFAULT_ASSUMPTIONS, [key]: limit.min },
  ]);
  scenarios.push([
    `${key} maximum`,
    { ...DEFAULT_ASSUMPTIONS, [key]: limit.max },
  ]);
}

for (const [name, assumptions] of scenarios) {
  const result = simulate(summary.calibration, assumptions);
  if (result.backlog.some((value) => value < 0)) {
    throw new Error(`${name} produced a negative backlog.`);
  }
  console.log(
    `${name}: prevented=${result.totalPrevented.toFixed(2)}, transfers=${result.remainingTransfers.toFixed(2)}, backlog12=${result.backlog[12].toFixed(2)}`,
  );
}
