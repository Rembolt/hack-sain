"use client";

import dynamic from "next/dynamic";
import type { BrowserComplaint } from "@/domain/types";
import type { SimulationAssumptions } from "@/simulation/engine";
import type { ComparisonMode } from "@/state/url-state";

const ScenarioNeighborhoodScene = dynamic(
  () => import("@/components/scenario-neighborhood-scene"),
  {
    ssr: false,
    loading: () => <div className="scenario-visual-loading">Loading illustrative neighborhood…</div>,
  },
);

export function ScenarioNeighborhood({
  complaints,
  assumptions,
  mode,
  compact = false,
}: {
  complaints: BrowserComplaint[];
  assumptions: SimulationAssumptions;
  mode: ComparisonMode;
  compact?: boolean;
}) {
  return (
    <section className={`scenario-neighborhood-card ${compact ? "compact-neighborhood" : ""}`} aria-labelledby="scenario-neighborhood-title">
      <div className="chart-title-row">
        <div>
          <p className="eyebrow">Illustrative allocation</p>
          <h3 id="scenario-neighborhood-title">{compact ? "3D complaint map" : "Complaint-event neighborhood"}</h3>
        </div>
        <span className="scenario-label">Scenario, not forecast.</span>
      </div>
      {complaints.length ? (
        <ScenarioNeighborhoodScene
          complaints={complaints}
          assumptions={assumptions}
          mode={mode}
        />
      ) : (
        <div className="empty-state"><strong>No matching complaint records</strong><span>Choose another month or region.</span></div>
      )}
      <div className="scenario-visual-legend">
        <span><i className="sample-house observed" /> Observed complaint event</span>
        <span><i className="sample-house prevented" /> Illustratively prevented / deflected</span>
        <span><i className="sample-house rerouted" /> Illustratively rerouted</span>
      </div>
      <p className="disclosure">Schematic customer homes. Operational values come from Northwind&apos;s data; locations are illustrative.</p>
      <p className="allocation-boundary">Illustrative allocation only. Complaint ID + region keeps placement stable; numeric scenario totals are authoritative, not household predictions.</p>
    </section>
  );
}
