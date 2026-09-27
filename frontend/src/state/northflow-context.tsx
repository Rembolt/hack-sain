"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import {
  loadMonthBrowserData,
  loadSharedBrowserData,
} from "@/data/browser-data-provider";
import type {
  BrowserComplaint,
  DataManifest,
  LookupData,
  Region,
  RegionalContext,
  SummaryData,
} from "@/domain/types";
import { analyticsProvider } from "@/integrations/analytics-provider";
import type { ProviderProvenance } from "@/integrations/contracts";
import { findComplaint, reconcileSelection, selectComplaints } from "@/selectors/complaints";
import type { SimulationAssumptions, SimulationResult } from "@/simulation/engine";
import { scenarioReducer, type ScenarioAction } from "@/state/scenario-reducer";
import {
  buildNorthFlowHref,
  DEFAULT_URL_STATE,
  northFlowSearchParams,
  parseNorthFlowUrlState,
  type ComparisonMode,
  type NorthFlowUrlState,
} from "@/state/url-state";

type SharedLoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      summary: SummaryData;
      lookups: LookupData;
      manifest: DataManifest;
    };

type MonthLoadState =
  | { status: "loading"; complaints: BrowserComplaint[] }
  | { status: "error"; message: string; complaints: BrowserComplaint[] }
  | { status: "ready"; complaints: BrowserComplaint[] };

export type NorthFlowContextValue = {
  shared: SharedLoadState;
  monthState: MonthLoadState;
  month: string;
  region: Region | "All";
  selectedComplaintId: string | null;
  assumptions: SimulationAssumptions;
  mode: ComparisonMode;
  filteredComplaints: BrowserComplaint[];
  selectedComplaint: BrowserComplaint | null;
  selectedContext: RegionalContext | null;
  result: SimulationResult | null;
  providerProvenance: ProviderProvenance;
  landingHref: string;
  dashboardHref: string;
  setMonth: (month: string) => void;
  setRegion: (region: Region | "All") => void;
  setSelectedComplaintId: (complaintId: string | null) => void;
  setMode: (mode: ComparisonMode) => void;
  dispatch: Dispatch<ScenarioAction>;
};

const NorthFlowContext = createContext<NorthFlowContextValue | null>(null);

export function NorthFlowProvider({ children }: { children: ReactNode }) {
  const [shared, setShared] = useState<SharedLoadState>({ status: "loading" });
  const [monthState, setMonthState] = useState<MonthLoadState>({
    status: "loading",
    complaints: [],
  });
  const [month, setMonthValue] = useState(DEFAULT_URL_STATE.month);
  const [region, setRegion] = useState<Region | "All">(
    DEFAULT_URL_STATE.region,
  );
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(
    DEFAULT_URL_STATE.complaintId,
  );
  const [mode, setMode] = useState<ComparisonMode>(DEFAULT_URL_STATE.mode);
  const [assumptions, dispatch] = useReducer(
    scenarioReducer,
    DEFAULT_URL_STATE.assumptions,
  );
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    const initial = parseNorthFlowUrlState(window.location.search);
    setMonthValue(initial.month);
    setRegion(initial.region);
    setSelectedComplaintId(initial.complaintId);
    setMode(initial.mode);
    (Object.keys(initial.assumptions) as Array<keyof SimulationAssumptions>).forEach(
      (key) => dispatch({ type: "set", key, value: initial.assumptions[key] }),
    );
    setUrlReady(true);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadSharedBrowserData(controller.signal)
      .then((payload) => setShared({ status: "ready", ...payload }))
      .catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") {
          setShared({
            status: "error",
            message: error instanceof Error ? error.message : "Unknown data error",
          });
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (shared.status === "ready" && !shared.lookups.months.includes(month)) {
      setMonthValue(DEFAULT_URL_STATE.month);
      setSelectedComplaintId(null);
    }
  }, [month, shared]);

  useEffect(() => {
    const controller = new AbortController();
    setMonthState((current) => ({
      status: "loading",
      complaints: current.complaints,
    }));
    loadMonthBrowserData(month, controller.signal)
      .then((payload) =>
        setMonthState({ status: "ready", complaints: payload.complaints }),
      )
      .catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") {
          setMonthState({
            status: "error",
            complaints: [],
            message: error instanceof Error ? error.message : "Unknown month error",
          });
        }
      });
    return () => controller.abort();
  }, [month]);

  const filteredComplaints = useMemo(
    () => selectComplaints(monthState.complaints, region),
    [monthState.complaints, region],
  );

  useEffect(() => {
    if (monthState.status === "ready") {
      setSelectedComplaintId((current) =>
        reconcileSelection(filteredComplaints, current),
      );
    }
  }, [filteredComplaints, monthState.status]);

  const state: NorthFlowUrlState = useMemo(
    () => ({ month, region, complaintId: selectedComplaintId, assumptions, mode }),
    [assumptions, mode, month, region, selectedComplaintId],
  );

  useEffect(() => {
    if (!urlReady) return;
    const search = northFlowSearchParams(state).toString();
    const next = `${window.location.pathname}?${search}${window.location.hash}`;
    window.history.replaceState(window.history.state, "", next);
  }, [state, urlReady]);

  const setMonth = useCallback((value: string) => {
    setMonthValue(value);
    setSelectedComplaintId(null);
  }, []);

  const selectedComplaint = findComplaint(
    filteredComplaints,
    selectedComplaintId,
  );
  const selectedContext =
    selectedComplaint && shared.status === "ready"
      ? shared.lookups.contexts[
          `${selectedComplaint.month}|${selectedComplaint.region}`
        ] ?? null
      : null;
  const result =
    shared.status === "ready"
      ? analyticsProvider.runScenario(shared.summary.calibration, assumptions)
      : null;

  const value = useMemo<NorthFlowContextValue>(
    () => ({
      shared,
      monthState,
      month,
      region,
      selectedComplaintId,
      assumptions,
      mode,
      filteredComplaints,
      selectedComplaint,
      selectedContext,
      result,
      providerProvenance: analyticsProvider.provenance,
      landingHref: buildNorthFlowHref("/", state),
      dashboardHref: buildNorthFlowHref("/dashboard", state),
      setMonth,
      setRegion,
      setSelectedComplaintId,
      setMode,
      dispatch,
    }),
    [
      assumptions,
      filteredComplaints,
      mode,
      month,
      monthState,
      region,
      result,
      selectedComplaint,
      selectedComplaintId,
      selectedContext,
      setMonth,
      shared,
      state,
    ],
  );

  return (
    <NorthFlowContext.Provider value={value}>
      {children}
    </NorthFlowContext.Provider>
  );
}

export function useNorthFlow() {
  const context = useContext(NorthFlowContext);
  if (!context) {
    throw new Error("useNorthFlow must be used inside NorthFlowProvider.");
  }
  return context;
}
