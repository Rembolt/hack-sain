/** Account-file form, laid out like the account sheet. Fields come from accountInfo.schema.json. */
import { formatMoney } from "@/lib/account";
import accountSchema from "./accountInfo.schema.json";
import {
  disambiguate,
  fieldsOf,
  isRecord,
  itemFields,
  labelFor,
  targetOf,
  toField,
  apply,
  type FormField,
  type Schema,
} from "./schema-fields";

export type AccountFormShape = {
  title: string;
  name: FormField;
  status: FormField;
  accountId: FormField;
  contact: FormField[];
  address: FormField[];
  metrics: { key: string; label: string }[];
  billsTitle: string;
  billFields: FormField[];
  complaintsTitle: string;
  complaintFields: FormField[];
};

export type AccountDraft = {
  values: Record<string, string>;
  bills: Record<string, string>[];
  complaints: Record<string, string>[];
};

export type DraftMetric = {
  key: string;
  label: string;
  text: string;
};

const statusToneMap = (
  accountSchema as { "x-frontend"?: { statusTone?: Record<string, string> } }
)["x-frontend"]?.statusTone;

function metricFields(prop: Schema, base: Schema) {
  const resolved = targetOf(prop, base);
  const props = resolved.schema.properties ?? {};
  return Object.entries(props).map(([key, child]) => {
    const target = targetOf(child, resolved.base);
    return { key, label: labelFor(child, target.schema, key) };
  });
}

function shapeFromSchema(): AccountFormShape {
  const root = accountSchema as Schema;
  const props = root.properties ?? {};
  const client = targetOf(props.clientInfo ?? {}, root);
  const clientProps = client.schema.properties ?? {};
  const contact: FormField[] = [];
  const address: FormField[] = [];
  let status = toField("accountStatus", clientProps.accountStatus ?? {}, client.base, [
    "clientInfo",
    "accountStatus",
  ]);

  for (const [key, prop] of Object.entries(clientProps)) {
    if (key === "accountStatus") {
      status = toField(key, prop, client.base, ["clientInfo", key]);
      continue;
    }
    const child = targetOf(prop, client.base);
    if (child.schema.properties) {
      address.push(...fieldsOf(child.schema, child.base, ["clientInfo", key]));
      continue;
    }
    contact.push(toField(key, prop, client.base, ["clientInfo", key]));
  }

  const resources = targetOf(props.resources ?? {}, root);
  const resourceProps = resources.schema.properties ?? {};
  const billingProp = resourceProps.billing ?? {};
  const complaintProp = resourceProps.complaints ?? {};

  return {
    title: root.title || "Account file",
    name: toField("accountName", props.accountName ?? {}, root, ["accountName"]),
    status,
    accountId: toField("accountId", props.accountId ?? {}, root, ["accountId"]),
    contact: disambiguate(contact),
    address: disambiguate(address),
    metrics: metricFields(props.summary ?? {}, root),
    billsTitle: billingProp.title || "Bills",
    billFields: itemFields(billingProp, resources.base),
    complaintsTitle: complaintProp.title || "Complaints",
    complaintFields: itemFields(complaintProp, resources.base),
  };
}

export const accountForm = shapeFromSchema();

export function statusTone(value: string): "ok" | "alert" {
  return statusToneMap?.[value] === "alert" ? "alert" : "ok";
}

export function emptyDraft(): AccountDraft {
  return { values: {}, bills: [], complaints: [] };
}

function summarize(billing: Record<string, unknown>[], complaints: Record<string, unknown>[]) {
  let owed = 0;
  let unpaid = 0;
  for (const bill of billing) {
    if (bill.status === "Paid") continue;
    unpaid += 1;
    if (typeof bill.totalPrice === "number" && Number.isFinite(bill.totalPrice)) owed += bill.totalPrice;
  }
  return {
    outstandingBalance: Math.max(0, Math.round(owed * 100) / 100),
    totalBills: billing.length,
    unpaidBills: unpaid,
    totalComplaints: complaints.length,
    openComplaints: complaints.filter((item) => item.status === "Open").length,
  };
}

export function buildAccount(draft: AccountDraft) {
  const header = [
    accountForm.name,
    accountForm.status,
    accountForm.accountId,
    ...accountForm.contact,
    ...accountForm.address,
  ];
  const billing = draft.bills.map((row) => apply(accountForm.billFields, row));
  const complaints = draft.complaints.map((row) => apply(accountForm.complaintFields, row));
  const body = apply(header, draft.values);
  body.resources = { billing, complaints };
  body.summary = summarize(billing, complaints);
  return body;
}

export function draftMetrics(draft: AccountDraft): DraftMetric[] {
  const body = buildAccount(draft);
  const summary = isRecord(body.summary) ? body.summary : {};
  return accountForm.metrics.map((metric) => {
    const value = summary[metric.key];
    const text =
      metric.key === "outstandingBalance" && typeof value === "number"
        ? formatMoney(value, "CAD")
        : value == null
          ? "—"
          : String(value);
    return { key: metric.key, label: metric.label, text };
  });
}
