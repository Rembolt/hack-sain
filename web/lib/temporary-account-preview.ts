/**
 * Temporary account files so /search can show the sheet.
 * Delete this module, its import in app/api/accounts/[accountId]/route.ts,
 * and the mount load in app/search/search-desk.tsx when the account API is live.
 */
import type { Account, Bill, Complaint } from "./account";
import { exampleAccounts } from "./example-accounts";

export const TEMPORARY_PREVIEW_ID = "ACC-100001";

const unpaidBill: Bill = {
  billingId: "BILL-100001",
  billingPeriod: { startDate: "2024-10-01", endDate: "2024-10-31" },
  usage: { waterM3: 12.4, electricityKWh: 640.5 },
  priceBreakdown: {
    waterCharge: 28.5,
    electricityCharge: 86.4,
    serviceFee: 15,
    adjustments: 0,
    tax: 16.92,
  },
  totalPrice: 146.82,
  currency: "CAD",
  status: "Unpaid",
  issuedDate: "2024-11-02",
  dueDate: "2024-11-23",
  paymentDate: null,
};

const paidBill: Bill = {
  billingId: "BILL-100011",
  billingPeriod: { startDate: "2024-09-01", endDate: "2024-09-30" },
  usage: { waterM3: 10.2, electricityKWh: 510 },
  priceBreakdown: {
    waterCharge: 22,
    electricityCharge: 71.5,
    serviceFee: 15,
    adjustments: -5,
    tax: 13.46,
  },
  totalPrice: 116.96,
  currency: "CAD",
  status: "Paid",
  issuedDate: "2024-10-02",
  dueDate: "2024-10-23",
  paymentDate: "2024-10-18",
};

const openComplaint: Complaint = {
  complaintId: "NW-100001",
  ticketNumber: "TKT-100001",
  reason: "Amount on the October bill is higher than expected",
  category: "Billing - disputed amount",
  description:
    "Customer disputes the October electricity charge and wants the estimated read checked.",
  priority: "Medium",
  status: "Open",
  assignedTo: { employeeId: "EMP-10042", employeeName: "Amina Rahman" },
  createdDate: "2024-11-03",
  lastUpdatedDate: "2024-11-03",
  closedDate: null,
  resolution: { resolutionCode: "", resolutionDescription: "" },
};

const closedComplaint: Complaint = {
  complaintId: "NW-100011",
  ticketNumber: "TKT-100011",
  reason: "September water read looked low",
  category: "Billing - estimated read",
  description: "Customer asked for the September water estimate to be replaced with an actual read.",
  priority: "Low",
  status: "Closed",
  assignedTo: { employeeId: "EMP-10042", employeeName: "Amina Rahman" },
  createdDate: "2024-10-12",
  lastUpdatedDate: "2024-10-18",
  closedDate: "2024-10-18",
  resolution: {
    resolutionCode: "INFORMATION_PROVIDED",
    resolutionDescription: "Explained the September estimate and the following actual read.",
  },
};

function tagged<T extends { billingId: string } | { complaintId: string }>(
  record: T,
  id: string,
): T {
  if ("billingId" in record) return { ...record, billingId: id };
  return { ...record, complaintId: id, ticketNumber: id.replace("NW-", "TKT-") };
}

export function temporaryAccountPreview(accountId: string): Account | null {
  const account = exampleAccounts().find((item) => item.accountId === accountId);
  if (!account) return null;
  const slot = Number(accountId.slice(-6));
  const billA = String(slot).padStart(6, "0");
  const billB = String(slot + 10).padStart(6, "0");

  return {
    ...account,
    resources: {
      billing: [tagged(unpaidBill, `BILL-${billA}`), tagged(paidBill, `BILL-${billB}`)],
      complaints: [tagged(openComplaint, `NW-${billA}`), tagged(closedComplaint, `NW-${billB}`)],
    },
    summary: {
      outstandingBalance: unpaidBill.totalPrice,
      totalBills: 2,
      unpaidBills: 1,
      totalComplaints: 2,
      openComplaints: 1,
    },
  };
}
