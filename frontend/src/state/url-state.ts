import { REGIONS, type Region } from "@/domain/types";
import {
  ASSUMPTION_LIMITS,
  DEFAULT_ASSUMPTIONS,
  type SimulationAssumptions,
} from "@/simulation/engine";

export const DEFAULT_MONTH = "2025-06";
export const DEFAULT_REGION: Region = "Barrowdale";
export const DEFAULT_COMPLAINT = "NW-108365";

export type ComparisonMode = "baseline" | "comparison" | "scenario";

export type NorthFlowUrlState = {
  month: string;
  region: Region | "All";
  complaintId: string | null;
  assumptions: SimulationAssumptions;
  mode: ComparisonMode;
};

export const DEFAULT_URL_STATE: NorthFlowUrlState = {
  month: DEFAULT_MONTH,
  region: DEFAULT_REGION,
  complaintId: DEFAULT_COMPLAINT,
  assumptions: { ...DEFAULT_ASSUMPTIONS },
  mode: "comparison",
};

const assumptionKeys: Record<keyof SimulationAssumptions, string> = {
  estimationPreventionRate: "estimate",
  informationDeflectionRate: "inform",
  transferReductionRate: "transfer",
  capacityRecoveryRate: "capacity",
};

function parseRate(
  params: URLSearchParams,
  key: keyof SimulationAssumptions,
) {
  const raw = params.get(assumptionKeys[key]);
  if (raw === null || raw.trim() === "") return DEFAULT_ASSUMPTIONS[key];
  const value = Number(raw);
  const limits = ASSUMPTION_LIMITS[key];
  return Number.isFinite(value) && value >= limits.min && value <= limits.max
    ? value
    : DEFAULT_ASSUMPTIONS[key];
}

export function parseNorthFlowUrlState(search: string): NorthFlowUrlState {
  const params = new URLSearchParams(search);
  const monthValue = params.get("month");
  const regionValue = params.get("region");
  const complaintValue = params.get("complaint");
  const modeValue = params.get("view");
  const region =
    regionValue === "All" ||
    (REGIONS as readonly string[]).includes(regionValue ?? "")
      ? (regionValue as Region | "All")
      : DEFAULT_REGION;
  const mode = (["baseline", "comparison", "scenario"] as const).includes(
    modeValue as ComparisonMode,
  )
    ? (modeValue as ComparisonMode)
    : "comparison";

  return {
    month:
      monthValue && /^\d{4}-\d{2}$/.test(monthValue)
        ? monthValue
        : DEFAULT_MONTH,
    region,
    complaintId:
      complaintValue === "none"
        ? null
        : complaintValue && /^NW-\d{6}$/.test(complaintValue)
          ? complaintValue
          : DEFAULT_COMPLAINT,
    assumptions: {
      estimationPreventionRate: parseRate(params, "estimationPreventionRate"),
      informationDeflectionRate: parseRate(params, "informationDeflectionRate"),
      transferReductionRate: parseRate(params, "transferReductionRate"),
      capacityRecoveryRate: parseRate(params, "capacityRecoveryRate"),
    },
    mode,
  };
}

export function northFlowSearchParams(state: NorthFlowUrlState) {
  const params = new URLSearchParams({
    month: state.month,
    region: state.region,
    complaint: state.complaintId ?? "none",
    view: state.mode,
  });
  (Object.keys(assumptionKeys) as Array<keyof SimulationAssumptions>).forEach(
    (key) => params.set(assumptionKeys[key], String(state.assumptions[key])),
  );
  return params;
}

export function buildNorthFlowHref(
  pathname: "/" | "/dashboard",
  state: NorthFlowUrlState,
) {
  return `${pathname}?${northFlowSearchParams(state).toString()}`;
}
