import {
  DEFAULT_ASSUMPTIONS,
  ZERO_ASSUMPTIONS,
  type SimulationAssumptions,
} from "@/simulation/engine";

export type ScenarioAction =
  | {
      type: "set";
      key: keyof SimulationAssumptions;
      value: number;
    }
  | { type: "reset-baseline" }
  | { type: "reset-defaults" };

export function scenarioReducer(
  state: SimulationAssumptions,
  action: ScenarioAction,
): SimulationAssumptions {
  switch (action.type) {
    case "set":
      return { ...state, [action.key]: action.value };
    case "reset-baseline":
      return { ...ZERO_ASSUMPTIONS };
    case "reset-defaults":
      return { ...DEFAULT_ASSUMPTIONS };
    default:
      return state;
  }
}
