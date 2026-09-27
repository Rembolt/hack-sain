"use client";

import dynamic from "next/dynamic";
import { Component, useMemo, useState, type ReactNode } from "react";
import { SearchIcon } from "@/components/icons";
import type { BrowserComplaint, Region } from "@/domain/types";
import { HOUSE_CATEGORY_LEGEND } from "@/visualization/house-semantics";

const SchematicMap = dynamic(() => import("@/components/schematic-map"), {
  ssr: false,
  loading: () => (
    <div className="map-loading" role="status">
      <span className="loading-pulse" />
      <strong>Loading schematic layer…</strong>
      <span>The evidence list remains available.</span>
    </div>
  ),
});

class MapErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="map-loading" role="status">
          <strong>Schematic layer unavailable</strong>
          <span>Use the complaint list to continue exploring evidence.</span>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ComplaintExplorer({
  complaints,
  region,
  selectedComplaintId,
  onSelect,
}: {
  complaints: BrowserComplaint[];
  region: Region | "All";
  selectedComplaintId: string | null;
  onSelect: (complaintId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const list = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const matches = normalized
      ? complaints.filter(
          (complaint) =>
            complaint.complaintId.toLowerCase().includes(normalized) ||
            complaint.category.toLowerCase().includes(normalized),
        )
      : complaints;
    return matches.slice(0, 40);
  }, [complaints, query]);

  return (
    <div className="complaint-explorer">
      <div className="map-shell">
        <div className="map-toolbar">
          <div><strong>{complaints.length.toLocaleString("en-CA")}</strong> complaint events · {region}</div>
          <div className="map-key"><span className="ring-key" /> SLA breach ring <span className="marker-key" /> Transfer marker</div>
        </div>
        {complaints.length ? (
          <MapErrorBoundary>
            <SchematicMap
              complaints={complaints}
              selectedComplaintId={selectedComplaintId}
              onSelect={onSelect}
            />
          </MapErrorBoundary>
        ) : (
          <div className="empty-state"><strong>No matching complaint records</strong><span>Choose another month or region to continue.</span></div>
        )}
        <div className="category-legend" aria-label="Complaint category colours">
          {HOUSE_CATEGORY_LEGEND.map((entry) => <span key={entry.key}><i style={{ background: entry.color }} />{entry.label}</span>)}
        </div>
        <p className="disclosure">Schematic customer homes. Operational values come from Northwind&apos;s data; locations are illustrative.</p>
      </div>
      <aside className="complaint-list-panel compact" aria-label="Keyboard-accessible complaint list">
        <div className="list-panel-title"><strong>Accessible complaint list</strong><span>Map alternative</span></div>
        <label className="search-field">
          <span className="sr-only">Search complaint ID or category</span>
          <SearchIcon />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find ID or category" />
        </label>
        <div className="complaint-list-meta">Showing {list.length} of {complaints.length}</div>
        <div className="complaint-list" role="list">
          {list.map((complaint) => (
            <button
              type="button"
              role="listitem"
              key={complaint.complaintId}
              className={`complaint-row ${selectedComplaintId === complaint.complaintId ? "selected" : ""}`}
              onClick={() => onSelect(complaint.complaintId)}
            >
              <span className={`status-mark ${complaint.slaBreach ? "risk" : "healthy"}`} />
              <span><strong>{complaint.complaintId}</strong><small>{complaint.category}</small></span>
              <span className="priority-chip">{complaint.priority}</span>
            </button>
          ))}
          {!list.length ? <div className="list-empty">No IDs or categories match “{query}”.</div> : null}
        </div>
      </aside>
    </div>
  );
}
