/** Account-file shapes. Field rules: lib/contract/. */
export type ServiceAddress = {
  houseNumber: string;
  street: string;
  city: string;
  province: string;
  postalCode: string;
};

export type Bill = {
  billingId: string;
  billingPeriod: {
    startDate: string;
    endDate: string;
  };
  usage: {
    waterM3: number;
    electricityKWh: number;
  };
  priceBreakdown: {
    waterCharge: number;
    electricityCharge: number;
    serviceFee: number;
    adjustments: number;
    tax: number;
  };
  totalPrice: number;
  currency: string;
  status: string;
  issuedDate: string;
  dueDate: string;
  paymentDate: string | null;
};

export type Complaint = {
  complaintId: string;
  ticketNumber: string;
  reason: string;
  category: string;
  description: string;
  priority: string;
  status: string;
  assignedTo: {
    employeeId: string;
    employeeName: string;
  };
  createdDate: string;
  lastUpdatedDate: string;
  closedDate: string | null;
  resolution: {
    resolutionCode: string;
    resolutionDescription: string;
  };
};

export type Account = {
  accountId: string;
  accountName: string;
  clientInfo: {
    customerName: string;
    email: string;
    phoneNumber: string;
    serviceAddress: ServiceAddress;
    accountStatus: string;
  };
  resources: {
    billing: Bill[];
    complaints: Complaint[];
  };
  summary: {
    outstandingBalance: number;
    totalBills: number;
    unpaidBills: number;
    totalComplaints: number;
    openComplaints: number;
  };
};

export function formatMoney(amount: number, currency: string) {
  const code = currency || "CAD";
  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: code,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

export function formatDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function show(value: string | null | undefined) {
  if (value == null || value.trim() === "") return "—";
  return value;
}

export function formatAddress(address: ServiceAddress) {
  return `${address.houseNumber} ${address.street}, ${address.city}, ${address.province} ${address.postalCode}`;
}

export function localISODate(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
