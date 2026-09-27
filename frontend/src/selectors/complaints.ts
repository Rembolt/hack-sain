import type { BrowserComplaint, Region } from "@/domain/types";

export function selectComplaints(
  complaints: readonly BrowserComplaint[],
  region: Region | "All",
) {
  return region === "All"
    ? [...complaints]
    : complaints.filter((complaint) => complaint.region === region);
}

export function reconcileSelection(
  complaints: readonly BrowserComplaint[],
  selectedComplaintId: string | null,
) {
  if (!selectedComplaintId) return null;
  return complaints.some(
    (complaint) => complaint.complaintId === selectedComplaintId,
  )
    ? selectedComplaintId
    : null;
}

export function findComplaint(
  complaints: readonly BrowserComplaint[],
  selectedComplaintId: string | null,
) {
  if (!selectedComplaintId) return null;
  return (
    complaints.find(
      (complaint) => complaint.complaintId === selectedComplaintId,
    ) ?? null
  );
}
