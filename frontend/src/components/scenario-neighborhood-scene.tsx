"use client";

import type { CSSProperties } from "react";
import type { BrowserComplaint } from "@/domain/types";
import type { SimulationAssumptions } from "@/simulation/engine";
import type { ComparisonMode } from "@/state/url-state";
import {
  houseCategoryColor,
  houseCategoryKey,
} from "@/visualization/house-semantics";
import { schematicCoordinates } from "@/visualization/coordinates";
import { allocateScenarioHouses } from "@/visualization/scenario-allocation";

const VISUAL_LIMIT = 220;

function NeighborhoodPanel({
  title,
  complaints,
  assumptions,
  scenario,
}: {
  title: string;
  complaints: BrowserComplaint[];
  assumptions: SimulationAssumptions;
  scenario: boolean;
}) {
  const sample = [...complaints]
    .sort((left, right) => left.complaintId.localeCompare(right.complaintId))
    .slice(0, VISUAL_LIMIT);
  const allocation = allocateScenarioHouses(sample, assumptions);

  return (
    <figure className="scenario-neighborhood-panel">
      <div className="scenario-panel-heading">
        <div><span>{scenario ? "Illustrative scenario" : "Observed events"}</span><strong>{title}</strong></div>
        <small>{sample.length} of {complaints.length} complaint events shown</small>
      </div>
      <div
        className="isometric-viewport"
        role="img"
        aria-label={`${title}: ${sample.length} individual complaint-event houses shown in stable illustrative positions.`}
      >
        <div className="isometric-ground">
          <span className="iso-road road-a" />
          <span className="iso-road road-b" />
          {allocation.map(({ complaint, state }) => {
            const point = schematicCoordinates(complaint.complaintId, complaint.region);
            return (
              <span
                key={complaint.complaintId}
                className={`iso-house category-${houseCategoryKey(complaint.category)} ${scenario ? state : "observed"}`}
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                  "--house-color": houseCategoryColor(complaint.category),
                } as CSSProperties}
                title={`${complaint.complaintId} · ${scenario ? state : "observed"}`}
              >
                <i className="iso-roof" />
                <i className="iso-wall" />
              </span>
            );
          })}
        </div>
      </div>
    </figure>
  );
}

export default function ScenarioNeighborhoodScene({
  complaints,
  assumptions,
  mode,
}: {
  complaints: BrowserComplaint[];
  assumptions: SimulationAssumptions;
  mode: ComparisonMode;
}) {
  return (
    <div className={`scenario-neighborhood-grid mode-${mode}`}>
      {mode !== "scenario" ? (
        <NeighborhoodPanel
          title="Baseline"
          complaints={complaints}
          assumptions={assumptions}
          scenario={false}
        />
      ) : null}
      {mode !== "baseline" ? (
        <NeighborhoodPanel
          title="Scenario allocation"
          complaints={complaints}
          assumptions={assumptions}
          scenario
        />
      ) : null}
    </div>
  );
}
