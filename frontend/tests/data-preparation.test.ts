import { beforeAll, describe, expect, it } from "vitest";
import type { BrowserComplaint, SummaryData } from "@/domain/types";
import { prepareData } from "../scripts/prepare-data";

let summary: SummaryData;
let complaints: BrowserComplaint[];

beforeAll(async () => {
  ({ summary, complaints } = await prepareData());
}, 30_000);

describe("authoritative data preparation", () => {
  it("reconciles source counts, keys, and joins", () => {
    expect(complaints).toHaveLength(25_416);
    expect(new Set(complaints.map((row) => row.complaintId)).size).toBe(25_416);
    expect(new Set(complaints.map((row) => row.region)).size).toBe(6);
    expect(new Set(complaints.map((row) => row.month)).size).toBe(24);
    expect(summary.reconciliation.meterContextMatches).toBe(25_416);
    expect(summary.reconciliation.staffingContextMatches).toBe(25_416);
    expect(summary.reconciliation.sourceSystemMatches).toBe(25_416);
    expect(summary.reconciliation.regionalSystemReferences).toBe(288);
  });

  it("reconciles complaint categories and simulator calibration", () => {
    expect(summary.calibration.estimatedReadComplaints).toBe(4_833);
    expect(summary.calibration.informationOnlyComplaints).toBe(5_865);
    expect(summary.calibration.overlapComplaints).toBe(928);
    expect(summary.calibration.transferredComplaints).toBe(8_870);
    expect(summary.reconciliation.complaintDifference).toBe(88);
    expect(summary.reconciliation.backlogDifference).toBe(159);
  });

  it("preserves missing values for open complaints", () => {
    const open = complaints.find((complaint) => complaint.status === "Open");
    expect(open).toBeDefined();
    expect(open?.dateClosed).toBeNull();
    expect(open?.daysToClose).toBeNull();
    expect(open?.resolutionAction).toBeNull();
  });
});
