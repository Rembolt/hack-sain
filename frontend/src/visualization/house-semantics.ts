import type { BrowserComplaint } from "@/domain/types";

export const HOUSE_CATEGORY_LEGEND = [
  { key: "estimated", label: "Estimated read", color: "#1479a6" },
  { key: "billing", label: "Billing", color: "#6557a5" },
  { key: "metering", label: "Metering", color: "#2f8d83" },
  { key: "payment", label: "Payment", color: "#b07338" },
  { key: "service", label: "Service", color: "#a95d76" },
  { key: "supply", label: "Supply", color: "#507893" },
  { key: "water", label: "Water", color: "#2787a7" },
  { key: "other", label: "Other", color: "#77868e" },
] as const;

export type HouseCategoryKey = (typeof HOUSE_CATEGORY_LEGEND)[number]["key"];

export function houseCategoryKey(category: string): HouseCategoryKey {
  if (category === "Billing - estimated read") return "estimated";
  if (category.startsWith("Billing")) return "billing";
  if (category.startsWith("Metering")) return "metering";
  if (category.startsWith("Payment")) return "payment";
  if (category.startsWith("Service")) return "service";
  if (category.startsWith("Supply")) return "supply";
  if (category.startsWith("Water")) return "water";
  return "other";
}

export function houseCategoryColor(category: string) {
  const key = houseCategoryKey(category);
  return HOUSE_CATEGORY_LEGEND.find((entry) => entry.key === key)?.color ?? "#77868e";
}

export function houseEvidenceLabel(complaint: BrowserComplaint) {
  const markers = [
    complaint.slaBreach ? "SLA breach" : "within SLA",
    complaint.transferred ? "transferred" : null,
    complaint.reopened ? "reopened" : null,
    complaint.status === "Open" ? "open" : null,
  ].filter(Boolean);
  return `${complaint.complaintId}, ${complaint.region}, ${complaint.category}; ${markers.join(", ")}`;
}
