"use client";

import type { CSSProperties } from "react";
import type { BrowserComplaint } from "@/domain/types";
import { schematicCoordinates } from "@/visualization/coordinates";
import {
  houseCategoryColor,
  houseCategoryKey,
  houseEvidenceLabel,
} from "@/visualization/house-semantics";

export default function SchematicMap({
  complaints,
  selectedComplaintId,
  onSelect,
}: {
  complaints: BrowserComplaint[];
  selectedComplaintId: string | null;
  onSelect: (complaintId: string) => void;
}) {
  return (
    <div className="schematic-map" aria-label="Illustrative distribution of complaint events">
      <div className="schematic-river" />
      <div className="schematic-road road-one" />
      <div className="schematic-road road-two" />
      {complaints.map((complaint) => {
        const point = schematicCoordinates(complaint.complaintId, complaint.region);
        const selected = selectedComplaintId === complaint.complaintId;
        return (
          <button
            key={complaint.complaintId}
            type="button"
            className={`house-point category-${houseCategoryKey(complaint.category)} ${complaint.slaBreach ? "sla-breach" : "within-sla"} ${complaint.transferred ? "transferred" : ""} ${complaint.reopened ? "reopened" : ""} ${complaint.status === "Open" ? "open" : ""} ${selected ? "selected" : ""}`}
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              "--house-color": houseCategoryColor(complaint.category),
            } as CSSProperties}
            onClick={() => onSelect(complaint.complaintId)}
            aria-label={`Select complaint ${houseEvidenceLabel(complaint)}`}
            aria-pressed={selected}
            title={houseEvidenceLabel(complaint)}
          >
            <span className="house-roof" />
            <span className="house-body" />
            {complaint.transferred ? <span className="house-transfer" aria-hidden="true" /> : null}
            {complaint.reopened ? <span className="house-reopen" aria-hidden="true">↺</span> : null}
          </button>
        );
      })}
      <div className="map-label label-north">Illustrative north district</div>
      <div className="map-label label-centre">Service centre</div>
      <div className="map-scale">Schematic · not geographic</div>
    </div>
  );
}
