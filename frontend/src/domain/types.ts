export const REGIONS = [
  "Ashford",
  "Barrowdale",
  "Calderfield",
  "Dunmoor",
  "Eastmarch",
  "Fenwick",
] as const;

export type Region = (typeof REGIONS)[number];

export type ComplaintStatus = "Closed" | "Closed - reopened" | "Open";
export type Priority = "P1" | "P2" | "P3";

export type BrowserComplaint = {
  complaintId: string;
  accountId: string;
  month: string;
  dateOpened: string;
  dateClosed: string | null;
  status: ComplaintStatus;
  channel: string;
  category: string;
  priority: Priority;
  region: Region;
  sourceSystem: string;
  transferred: boolean;
  slaDays: number;
  daysToClose: number | null;
  slaBreach: boolean;
  reopened: boolean;
  informationOnly: boolean | null;
  resolutionAction: string | null;
  billCorrectionValue: number | null;
};

export type SystemRecord = {
  systemId: string;
  systemName: string;
  purpose: string;
  yearInstalled: number;
  integrationMethod: string;
};

export type RegionalContext = {
  month: string;
  region: Region;
  accounts: number;
  estimatedReadRate: number;
  smartMeterPenetration: number;
  billingExceptionsRaised: number;
  systemsServingRegion: string[];
  agentFte: number;
  openVacancies: number;
  attritionRate12m: number;
  complaintsOpenedPerAgent: number;
};

export type Calibration = {
  totalComplaints: number;
  estimatedReadComplaints: number;
  informationOnlyComplaints: number;
  overlapComplaints: number;
  transferredComplaints: number;
  transferredEstimatedRead: number;
  transferredInformationOnly: number;
  transferredOverlap: number;
  nonTransferredAverageDays: number;
  transferredAverageDays: number;
  openingBacklog: number;
  monthlyOpened: number;
  monthlyClosed: number;
  currentKpiCloseDays: number;
  normalHandlingCost: number;
  transferredCost: number;
  transferPremium: number;
};

export type RegionalComplaintSummary = {
  region: Region;
  totalComplaints: number;
  estimatedReadComplaints: number;
  informationOnlyComplaints: number;
  overlapComplaints: number;
  transferredComplaints: number;
  transferredEstimatedRead: number;
  transferredInformationOnly: number;
  transferredOverlap: number;
  monthlyComplaints: Array<{ month: string; complaints: number }>;
};

export type MonthlyKpi = {
  month: string;
  complaintsOpened: number;
  complaintsClosed: number;
  averageDaysToClose: number;
  firstContactResolutionRate: number;
};

export type SummaryData = {
  schemaVersion: string;
  calibration: Calibration;
  reconciliation: {
    complaintRecords: number;
    kpiComplaintsOpened: number;
    complaintDifference: number;
    complaintRecordsOpen: number;
    kpiDerivedBacklog: number;
    backlogDifference: number;
    meterContextMatches: number;
    staffingContextMatches: number;
    sourceSystemMatches: number;
    regionalSystemReferences: number;
  };
  categoryCounts: Record<string, number>;
  regionCounts: Record<Region, number>;
  regionalComplaints: Record<Region, RegionalComplaintSummary>;
  monthlyKpis: MonthlyKpi[];
  regulatoryPenaltyPerQuarter: number;
};

export type LookupData = {
  months: string[];
  regions: Region[];
  systems: SystemRecord[];
  contexts: Record<string, RegionalContext>;
};

export type MonthData = {
  month: string;
  complaints: BrowserComplaint[];
};

export type DataManifest = {
  schemaVersion: string;
  generatedAt: string;
  sources: Array<{ file: string; rows: number }>;
  months: Array<{ month: string; complaints: number; file: string }>;
};
