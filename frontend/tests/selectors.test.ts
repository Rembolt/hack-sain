import { describe, expect, it } from "vitest";
import type { BrowserComplaint } from "@/domain/types";
import {
  findComplaint,
  reconcileSelection,
  selectComplaints,
} from "@/selectors/complaints";

const complaint: BrowserComplaint = {
  complaintId: "NW-108365",
  accountId: "ACC-992258",
  month: "2025-06",
  dateOpened: "2025-06-27",
  dateClosed: "2025-07-28",
  status: "Closed",
  channel: "Email",
  category: "Billing - estimated read",
  priority: "P2",
  region: "Barrowdale",
  sourceSystem: "SYS-01",
  transferred: true,
  slaDays: 10,
  daysToClose: 31,
  slaBreach: true,
  reopened: false,
  informationOnly: false,
  resolutionAction: "Bill corrected and re-issued",
  billCorrectionValue: 217.52,
};

describe("complaint selectors", () => {
  it("filters by region and finds a selected complaint", () => {
    expect(selectComplaints([complaint], "Barrowdale")).toEqual([complaint]);
    expect(selectComplaints([complaint], "Ashford")).toEqual([]);
    expect(findComplaint([complaint], complaint.complaintId)).toEqual(complaint);
  });

  it("clears a selection excluded by filters", () => {
    expect(reconcileSelection([], complaint.complaintId)).toBeNull();
    expect(reconcileSelection([complaint], complaint.complaintId)).toBe(
      complaint.complaintId,
    );
  });

  it("renders open complaint durations as unresolved data", () => {
    const open = {
      ...complaint,
      status: "Open" as const,
      dateClosed: null,
      daysToClose: null,
      resolutionAction: null,
    };
    expect(open.daysToClose).toBeNull();
    expect(open.dateClosed).toBeNull();
  });
});
