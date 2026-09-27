import { REGIONS, type DataManifest, type LookupData, type MonthData, type SummaryData } from "@/domain/types";

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function finiteNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number.`);
  }
}

export function validateManifest(value: unknown): DataManifest {
  const payload = record(value, "Manifest");
  nonEmptyString(payload.schemaVersion, "Manifest schemaVersion");
  nonEmptyString(payload.generatedAt, "Manifest generatedAt");
  if (!Array.isArray(payload.sources) || !Array.isArray(payload.months)) {
    throw new Error("Manifest source and month indexes are required.");
  }
  return value as DataManifest;
}

export function validateSummary(value: unknown): SummaryData {
  const payload = record(value, "Summary");
  nonEmptyString(payload.schemaVersion, "Summary schemaVersion");
  const calibration = record(payload.calibration, "Summary calibration");
  finiteNumber(calibration.totalComplaints, "Calibration totalComplaints");
  finiteNumber(calibration.currentKpiCloseDays, "Calibration currentKpiCloseDays");
  if (!Array.isArray(payload.monthlyKpis) || payload.monthlyKpis.length === 0) {
    throw new Error("Summary monthly KPIs are required.");
  }
  record(payload.reconciliation, "Summary reconciliation");
  return value as SummaryData;
}

export function validateLookups(value: unknown): LookupData {
  const payload = record(value, "Lookups");
  if (!Array.isArray(payload.months) || !payload.months.every((item) => typeof item === "string")) {
    throw new Error("Lookup months are invalid.");
  }
  if (
    !Array.isArray(payload.regions) ||
    !payload.regions.every((item) => (REGIONS as readonly unknown[]).includes(item))
  ) {
    throw new Error("Lookup regions are invalid.");
  }
  if (!Array.isArray(payload.systems)) {
    throw new Error("Lookup systems are required.");
  }
  record(payload.contexts, "Lookup contexts");
  return value as LookupData;
}

export function validateMonthData(value: unknown, expectedMonth: string): MonthData {
  const payload = record(value, "Month data");
  if (payload.month !== expectedMonth || !Array.isArray(payload.complaints)) {
    throw new Error(`Month data does not match ${expectedMonth}.`);
  }
  for (const [index, item] of payload.complaints.entries()) {
    const complaint = record(item, `Complaint ${index}`);
    nonEmptyString(complaint.complaintId, `Complaint ${index} ID`);
    if (complaint.month !== expectedMonth || !(REGIONS as readonly unknown[]).includes(complaint.region)) {
      throw new Error(`Complaint ${complaint.complaintId} has an invalid month or region.`);
    }
  }
  return value as MonthData;
}

export function validateSharedPayloads(
  summaryValue: unknown,
  lookupsValue: unknown,
  manifestValue: unknown,
) {
  const summary = validateSummary(summaryValue);
  const lookups = validateLookups(lookupsValue);
  const manifest = validateManifest(manifestValue);
  if (summary.schemaVersion !== manifest.schemaVersion) {
    throw new Error("Generated data versions do not match.");
  }
  return { summary, lookups, manifest };
}
