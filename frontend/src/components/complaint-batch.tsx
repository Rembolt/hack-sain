import type { CSSProperties } from "react";
import { whole } from "@/presentation/formatters";
import { monthLabel } from "@/presentation/playback-copy";
import {
  countHouseTones,
  type PlaybackHouse,
} from "@/visualization/playback-houses";

const LEGEND = [
  { tone: "observed", label: "Complaint received" },
  { tone: "risk", label: "Risk found · review" },
  { tone: "handled", label: "Rerouted or resolved" },
  { tone: "prevented", label: "Prevented" },
  { tone: "feedback", label: "Feedback returned" },
] as const;

export function ComplaintBatch({
  month,
  houses,
  observedComplaints,
  status,
}: {
  month: string;
  houses: PlaybackHouse[];
  observedComplaints: number;
  status: "loading" | "ready" | "error";
}) {
  const counts = countHouseTones(houses);
  return (
    <figure className="pb-batch">
      <figcaption className="pb-batch-head">
        <span>Complaints this month</span>
        <strong>{monthLabel(month)}</strong>
      </figcaption>
      {status === "error" ? (
        <div className="pb-batch-empty">Complaint events for this month could not be loaded. Counters continue from the scenario totals.</div>
      ) : houses.length === 0 ? (
        <div className="pb-batch-empty">{status === "loading" ? "Loading complaint events…" : "No complaint records for this month."}</div>
      ) : (
        <div
          key={month}
          className="pb-houses"
          role="img"
          aria-label={`${houses.length} complaint-event houses: ${counts.observed} received, ${counts.risk} flagged, ${counts.handled} rerouted or resolved, ${counts.prevented} prevented.`}
        >
          {houses.map((house, index) => (
            <span
              key={house.key}
              className={`pb-house tone-${house.tone}${house.feedback ? " is-feedback" : ""}`}
              style={{ "--i": index } as CSSProperties}
            >
              <i className="pb-roof" />
              <i className="pb-wall" />
            </span>
          ))}
        </div>
      )}
      <ul className="pb-legend" aria-label="House colours">
        {LEGEND.map((item) => (
          <li key={item.tone}><i className={`pb-swatch tone-${item.tone}`} />{item.label}</li>
        ))}
      </ul>
      <p className="pb-batch-note">
        One house is one complaint event. Showing {houses.length} of {whole.format(observedComplaints)} this month. Outcome colours are illustrative, not predictions for specific complaints.
      </p>
      <p className="pb-batch-note">Schematic customer homes. Operational values come from Northwind&apos;s data; locations are illustrative.</p>
    </figure>
  );
}
