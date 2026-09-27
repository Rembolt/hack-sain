import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  REGIONS,
  type BrowserComplaint,
  type Calibration,
  type ComplaintStatus,
  type DataManifest,
  type LookupData,
  type Priority,
  type Region,
  type RegionalContext,
  type SummaryData,
  type SystemRecord,
} from "../src/domain/types";
import { parseCsv } from "./csv";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(SCRIPT_DIR, "..");
const DATA_DIR = path.resolve(FRONTEND_DIR, "../resources_final");
const OUTPUT_DIR = path.resolve(FRONTEND_DIR, "public/data");
const SCHEMA_VERSION = "1.0.0";
const COMPLAINT_STATUSES = ["Closed", "Closed - reopened", "Open"] as const;
const PRIORITIES = ["P1", "P2", "P3"] as const;
const CHANNELS = [
  "Email",
  "Phone",
  "Post",
  "Regulator referral",
  "Social",
  "Web form",
] as const;
const CATEGORIES = [
  "Billing - disputed amount",
  "Billing - estimated read",
  "Metering - no read taken",
  "Other",
  "Payment - plan or arrears",
  "Service - missed appointment",
  "Service - poor communication",
  "Supply - interruption",
  "Water - pressure or quality",
] as const;

const SOURCE_FILES = [
  "northwind_complaints.csv",
  "northwind_meter_reads.csv",
  "northwind_contact_centre_staffing.csv",
  "northwind_monthly_kpis.csv",
  "northwind_systems.csv",
  "northwind_unit_costs.csv",
  "northwind_ai_pilot_2025.csv",
] as const;

type CsvRow = Record<string, string>;

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Data contract violation: ${message}`);
}

function numberValue(row: CsvRow, key: string) {
  const value = Number(row[key]);
  invariant(Number.isFinite(value), `${key} must be numeric; received "${row[key]}".`);
  return value;
}

function nullableNumber(row: CsvRow, key: string) {
  if (row[key] === "") return null;
  return numberValue(row, key);
}

function booleanValue(row: CsvRow, key: string) {
  invariant(row[key] === "0" || row[key] === "1", `${key} must be 0 or 1.`);
  return row[key] === "1";
}

function nullableBoolean(row: CsvRow, key: string) {
  if (row[key] === "") return null;
  return booleanValue(row, key);
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function regionValue(value: string): Region {
  invariant((REGIONS as readonly string[]).includes(value), `Unknown region "${value}".`);
  return value as Region;
}

async function loadSources() {
  const entries = await Promise.all(
    SOURCE_FILES.map(async (file) => {
      const text = await readFile(path.join(DATA_DIR, file), "utf8");
      return [file, parseCsv(text)] as const;
    }),
  );
  return Object.fromEntries(entries) as Record<(typeof SOURCE_FILES)[number], CsvRow[]>;
}

export async function prepareData() {
  const sources = await loadSources();
  const complaintRows = sources["northwind_complaints.csv"];
  const meterRows = sources["northwind_meter_reads.csv"];
  const staffingRows = sources["northwind_contact_centre_staffing.csv"];
  const kpiRows = sources["northwind_monthly_kpis.csv"];
  const systemRows = sources["northwind_systems.csv"];
  const costRows = sources["northwind_unit_costs.csv"];

  invariant(complaintRows.length === 25_416, "expected 25,416 complaint rows.");
  invariant(meterRows.length === 144, "expected 144 meter rows.");
  invariant(staffingRows.length === 144, "expected 144 staffing rows.");
  invariant(kpiRows.length === 24, "expected 24 KPI months.");

  const systems: SystemRecord[] = systemRows.map((row) => {
    invariant(/^SYS-\d{2}$/.test(row.system_id), `invalid system ID ${row.system_id}.`);
    return {
      systemId: row.system_id,
      systemName: row.system_name,
      purpose: row.purpose,
      yearInstalled: numberValue(row, "year_installed"),
      integrationMethod: row.integration_method,
    };
  });
  const systemIds = new Set(systems.map((system) => system.systemId));
  invariant(systemIds.size === systems.length, "system IDs must be unique.");

  const meterByKey = new Map(meterRows.map((row) => [`${row.month}|${row.region}`, row]));
  const staffingByKey = new Map(
    staffingRows.map((row) => [`${row.month}|${row.region}`, row]),
  );
  invariant(meterByKey.size === meterRows.length, "meter region-month keys must be unique.");
  invariant(
    staffingByKey.size === staffingRows.length,
    "staffing region-month keys must be unique.",
  );

  const contexts: Record<string, RegionalContext> = {};
  let regionalSystemReferences = 0;
  meterRows.forEach((meter) => {
    const key = `${meter.month}|${meter.region}`;
    const staffing = staffingByKey.get(key);
    invariant(staffing, `missing staffing context for ${key}.`);
    const systemReferences = meter.systems_serving_region.split("/");
    systemReferences.forEach((systemId) => {
      invariant(systemIds.has(systemId), `${key} references unknown system ${systemId}.`);
      regionalSystemReferences += 1;
    });
    contexts[key] = {
      month: meter.month,
      region: regionValue(meter.region),
      accounts: numberValue(meter, "accounts"),
      estimatedReadRate: numberValue(meter, "estimated_read_rate"),
      smartMeterPenetration: numberValue(meter, "smart_meter_penetration"),
      billingExceptionsRaised: numberValue(meter, "billing_exceptions_raised"),
      systemsServingRegion: systemReferences,
      agentFte: numberValue(staffing, "agent_fte"),
      openVacancies: numberValue(staffing, "open_vacancies"),
      attritionRate12m: numberValue(staffing, "attrition_rate_12m"),
      complaintsOpenedPerAgent: numberValue(staffing, "complaints_opened_per_agent"),
    };
  });
  invariant(meterByKey.size === staffingByKey.size, "meter/staffing key counts differ.");
  staffingByKey.forEach((_, key) => invariant(meterByKey.has(key), `missing meter row for ${key}.`));

  const complaintIds = new Set<string>();
  let meterContextMatches = 0;
  let staffingContextMatches = 0;
  let sourceSystemMatches = 0;
  const complaints: BrowserComplaint[] = complaintRows.map((row) => {
    invariant(/^NW-\d{6}$/.test(row.complaint_id), `invalid complaint ID ${row.complaint_id}.`);
    invariant(!complaintIds.has(row.complaint_id), `duplicate complaint ID ${row.complaint_id}.`);
    complaintIds.add(row.complaint_id);
    invariant(isIsoDate(row.date_opened), `${row.complaint_id} has invalid date_opened.`);
    invariant(row.date_closed === "" || isIsoDate(row.date_closed), `${row.complaint_id} has invalid date_closed.`);
    const month = row.date_opened.slice(0, 7);
    const region = regionValue(row.region);
    const contextKey = `${month}|${region}`;
    if (meterByKey.has(contextKey)) meterContextMatches += 1;
    if (staffingByKey.has(contextKey)) staffingContextMatches += 1;
    if (systemIds.has(row.source_system)) sourceSystemMatches += 1;
    invariant(meterByKey.has(contextKey), `${row.complaint_id} lacks meter context ${contextKey}.`);
    invariant(staffingByKey.has(contextKey), `${row.complaint_id} lacks staffing context ${contextKey}.`);
    invariant(systemIds.has(row.source_system), `${row.complaint_id} has unknown source system.`);
    invariant(COMPLAINT_STATUSES.includes(row.status as (typeof COMPLAINT_STATUSES)[number]), `${row.complaint_id} has invalid status.`);
    invariant(PRIORITIES.includes(row.priority as (typeof PRIORITIES)[number]), `${row.complaint_id} has invalid priority.`);
    invariant(CHANNELS.includes(row.channel as (typeof CHANNELS)[number]), `${row.complaint_id} has invalid channel.`);
    invariant(CATEGORIES.includes(row.category as (typeof CATEGORIES)[number]), `${row.complaint_id} has invalid category.`);
    const dateClosed = row.date_closed || null;
    const daysToClose = nullableNumber(row, "days_to_close");
    const resolutionAction = row.resolution_action || null;
    if (row.status === "Open") {
      invariant(dateClosed === null, `${row.complaint_id} is open but has a closure date.`);
      invariant(daysToClose === null, `${row.complaint_id} is open but has closure duration.`);
      invariant(resolutionAction === null, `${row.complaint_id} is open but has a resolution.`);
    }
    return {
      complaintId: row.complaint_id,
      accountId: row.account_id,
      month,
      dateOpened: row.date_opened,
      dateClosed,
      status: row.status as ComplaintStatus,
      channel: row.channel,
      category: row.category,
      priority: row.priority as Priority,
      region,
      sourceSystem: row.source_system,
      transferred: booleanValue(row, "transferred_between_systems"),
      slaDays: numberValue(row, "sla_days"),
      daysToClose,
      slaBreach: booleanValue(row, "sla_breach"),
      reopened: booleanValue(row, "reopened"),
      informationOnly: nullableBoolean(row, "resolvable_by_information_only"),
      resolutionAction,
      billCorrectionValue: nullableNumber(row, "bill_correction_value"),
    };
  });

  invariant(complaintIds.size === 25_416, "expected 25,416 unique complaint IDs.");
  invariant(meterContextMatches === 25_416, "expected 25,416 meter matches.");
  invariant(staffingContextMatches === 25_416, "expected 25,416 staffing matches.");
  invariant(sourceSystemMatches === 25_416, "expected 25,416 source-system matches.");
  invariant(regionalSystemReferences === 288, "expected 288 regional system references.");

  const months = [...new Set(complaints.map((complaint) => complaint.month))].sort();
  const regions = [...new Set(complaints.map((complaint) => complaint.region))].sort();
  invariant(months.length === 24, "expected 24 complaint months.");
  invariant(
    regions.length === REGIONS.length && REGIONS.every((region) => regions.includes(region)),
    "expected exactly the six contracted regions.",
  );

  const estimated = complaints.filter(
    (complaint) => complaint.category === "Billing - estimated read",
  );
  const information = complaints.filter((complaint) => complaint.informationOnly === true);
  const overlap = estimated.filter((complaint) => complaint.informationOnly === true);
  const transferred = complaints.filter((complaint) => complaint.transferred);
  const transferredEstimated = estimated.filter((complaint) => complaint.transferred);
  const transferredInformation = information.filter((complaint) => complaint.transferred);
  const transferredOverlap = overlap.filter((complaint) => complaint.transferred);
  invariant(estimated.length === 4_833, "estimated-read calibration must equal 4,833.");
  invariant(information.length === 5_865, "information-only calibration must equal 5,865.");
  invariant(overlap.length === 928, "category overlap must equal 928.");
  invariant(transferred.length === 8_870, "transferred calibration must equal 8,870.");
  invariant(transferredEstimated.length === 1_702, "transferred-estimated calibration must equal 1,702.");
  invariant(transferredInformation.length === 2_015, "transferred-information calibration must equal 2,015.");
  invariant(transferredOverlap.length === 328, "transferred overlap must equal 328.");

  const closedTransferred = transferred.filter((complaint) => complaint.daysToClose !== null);
  const closedNonTransferred = complaints.filter(
    (complaint) => !complaint.transferred && complaint.daysToClose !== null,
  );
  const average = (values: BrowserComplaint[]) =>
    values.reduce((sum, complaint) => sum + (complaint.daysToClose ?? 0), 0) /
    values.length;
  const nonTransferredAverageDays = average(closedNonTransferred);
  const transferredAverageDays = average(closedTransferred);
  invariant(Math.abs(nonTransferredAverageDays - 22.966) < 0.001, "non-transfer average drifted.");
  invariant(Math.abs(transferredAverageDays - 38.245) < 0.001, "transfer average drifted.");

  const costByItem = new Map(costRows.map((row) => [row.item, numberValue(row, "unit_cost")]));
  const normalHandlingCost = costByItem.get("Complaint handled end to end (average)");
  const transferredCost = costByItem.get(
    "Complaint handled end to end (transferred between systems)",
  );
  invariant(normalHandlingCost === 68, "normal complaint cost must be $68.");
  invariant(transferredCost === 121, "transferred complaint cost must be $121.");

  const monthlyKpis = kpiRows.map((row) => ({
    month: row.month,
    complaintsOpened: numberValue(row, "complaints_opened"),
    complaintsClosed: numberValue(row, "complaints_closed"),
    averageDaysToClose: numberValue(row, "avg_days_to_close"),
    firstContactResolutionRate: numberValue(row, "first_contact_resolution_rate"),
  }));
  const latestKpi = monthlyKpis.at(-1);
  invariant(latestKpi?.month === "2026-09", "latest KPI month must be September 2026.");
  invariant(latestKpi.averageDaysToClose === 43.8, "latest close-time KPI must be 43.8 days.");
  const kpiComplaintsOpened = monthlyKpis.reduce((sum, row) => sum + row.complaintsOpened, 0);
  const kpiComplaintsClosed = monthlyKpis.reduce((sum, row) => sum + row.complaintsClosed, 0);
  const openComplaintRecords = complaints.filter((complaint) => complaint.status === "Open").length;

  const calibration: Calibration = {
    totalComplaints: complaints.length,
    estimatedReadComplaints: estimated.length,
    informationOnlyComplaints: information.length,
    overlapComplaints: overlap.length,
    transferredComplaints: transferred.length,
    transferredEstimatedRead: transferredEstimated.length,
    transferredInformationOnly: transferredInformation.length,
    transferredOverlap: transferredOverlap.length,
    nonTransferredAverageDays,
    transferredAverageDays,
    openingBacklog: kpiComplaintsOpened - kpiComplaintsClosed,
    monthlyOpened: latestKpi.complaintsOpened,
    monthlyClosed: latestKpi.complaintsClosed,
    currentKpiCloseDays: latestKpi.averageDaysToClose,
    normalHandlingCost,
    transferredCost,
    transferPremium: transferredCost - normalHandlingCost,
  };

  const categoryCounts = Object.fromEntries(
    [...new Set(complaints.map((complaint) => complaint.category))]
      .sort()
      .map((category) => [
        category,
        complaints.filter((complaint) => complaint.category === category).length,
      ]),
  );
  const regionCounts = Object.fromEntries(
    REGIONS.map((region) => [
      region,
      complaints.filter((complaint) => complaint.region === region).length,
    ]),
  ) as Record<Region, number>;
  const regionalComplaints = Object.fromEntries(
    REGIONS.map((region) => {
      const rows = complaints.filter((complaint) => complaint.region === region);
      const estimatedRows = rows.filter(
        (complaint) => complaint.category === "Billing - estimated read",
      );
      const informationRows = rows.filter((complaint) => complaint.informationOnly === true);
      const overlapRows = estimatedRows.filter((complaint) => complaint.informationOnly === true);
      const transferredRows = rows.filter((complaint) => complaint.transferred);
      return [
        region,
        {
          region,
          totalComplaints: rows.length,
          estimatedReadComplaints: estimatedRows.length,
          informationOnlyComplaints: informationRows.length,
          overlapComplaints: overlapRows.length,
          transferredComplaints: transferredRows.length,
          transferredEstimatedRead: estimatedRows.filter((complaint) => complaint.transferred).length,
          transferredInformationOnly: informationRows.filter((complaint) => complaint.transferred).length,
          transferredOverlap: overlapRows.filter((complaint) => complaint.transferred).length,
          monthlyComplaints: months.map((month) => ({
            month,
            complaints: rows.filter((complaint) => complaint.month === month).length,
          })),
        },
      ];
    }),
  ) as SummaryData["regionalComplaints"];

  const regionalSum = (key: keyof Omit<SummaryData["regionalComplaints"][Region], "region" | "monthlyComplaints">) =>
    REGIONS.reduce((sum, region) => sum + regionalComplaints[region][key], 0);
  invariant(regionalSum("totalComplaints") === complaints.length, "regional complaint totals must reconcile.");
  invariant(regionalSum("estimatedReadComplaints") === estimated.length, "regional estimated-read totals must reconcile.");
  invariant(regionalSum("informationOnlyComplaints") === information.length, "regional information-only totals must reconcile.");
  invariant(regionalSum("overlapComplaints") === overlap.length, "regional overlap totals must reconcile.");
  invariant(regionalSum("transferredComplaints") === transferred.length, "regional transfer totals must reconcile.");
  invariant(regionalSum("transferredEstimatedRead") === transferredEstimated.length, "regional transferred estimated-read totals must reconcile.");
  invariant(regionalSum("transferredInformationOnly") === transferredInformation.length, "regional transferred information-only totals must reconcile.");
  invariant(regionalSum("transferredOverlap") === transferredOverlap.length, "regional transferred overlap totals must reconcile.");

  const summary: SummaryData = {
    schemaVersion: SCHEMA_VERSION,
    calibration,
    reconciliation: {
      complaintRecords: complaints.length,
      kpiComplaintsOpened,
      complaintDifference: kpiComplaintsOpened - complaints.length,
      complaintRecordsOpen: openComplaintRecords,
      kpiDerivedBacklog: kpiComplaintsOpened - kpiComplaintsClosed,
      backlogDifference:
        kpiComplaintsOpened - kpiComplaintsClosed - openComplaintRecords,
      meterContextMatches,
      staffingContextMatches,
      sourceSystemMatches,
      regionalSystemReferences,
    },
    categoryCounts,
    regionCounts,
    regionalComplaints,
    monthlyKpis,
    regulatoryPenaltyPerQuarter:
      costByItem.get("Regulator penalty, enhanced monitoring") ?? 0,
  };

  const lookups: LookupData = {
    months,
    regions: [...REGIONS],
    systems,
    contexts,
  };

  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(path.join(OUTPUT_DIR, "months"), { recursive: true });
  const monthEntries: DataManifest["months"] = [];
  for (const month of months) {
    const monthComplaints = complaints.filter((complaint) => complaint.month === month);
    const file = `months/${month}.json`;
    await writeFile(
      path.join(OUTPUT_DIR, file),
      JSON.stringify({ month, complaints: monthComplaints }),
    );
    monthEntries.push({ month, complaints: monthComplaints.length, file });
  }
  const manifest: DataManifest = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    sources: SOURCE_FILES.map((file) => ({ file, rows: sources[file].length })),
    months: monthEntries,
  };
  await Promise.all([
    writeFile(path.join(OUTPUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2)),
    writeFile(path.join(OUTPUT_DIR, "summary.json"), JSON.stringify(summary, null, 2)),
    writeFile(path.join(OUTPUT_DIR, "lookups.json"), JSON.stringify(lookups)),
    writeFile(
      path.join(OUTPUT_DIR, "reconciliation.json"),
      JSON.stringify(summary.reconciliation, null, 2),
    ),
  ]);
  return { manifest, summary, lookups, complaints };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepareData()
    .then(({ summary }) => {
      console.log("NorthFlow data preparation complete.");
      console.table(summary.reconciliation);
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
