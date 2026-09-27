"use client";

import type { LookupData, Region } from "@/domain/types";

export function EvidenceFilters({
  lookups,
  month,
  region,
  onMonthChange,
  onRegionChange,
}: {
  lookups: LookupData;
  month: string;
  region: Region | "All";
  onMonthChange: (month: string) => void;
  onRegionChange: (region: Region | "All") => void;
}) {
  return (
    <div className="filter-row">
      <label>
        <span>Month</span>
        <select value={month} onChange={(event) => onMonthChange(event.target.value)} aria-label="Complaint month">
          {lookups.months.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
      <label>
        <span>Region</span>
        <select value={region} onChange={(event) => onRegionChange(event.target.value as Region | "All")} aria-label="Complaint region">
          <option value="All">All regions</option>
          {lookups.regions.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </label>
    </div>
  );
}
