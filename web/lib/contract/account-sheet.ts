import { formatDate, formatMoney } from "@/lib/account";
import accountSchema from "./accountInfo.schema.json";
import billSchema from "./bill.schema.json";
import commonSchema from "./common.schema.json";
import complaintSchema from "./complaint.schema.json";

export type SheetCell = {
  key: string;
  label: string;
  text: string;
  wide: boolean;
  iso?: string;
};

export type AccountSheetModel = {
  name: SheetCell;
  status: SheetCell;
  statusTone: "ok" | "alert";
  id: SheetCell;
  contact: SheetCell[];
  address: SheetCell[];
  metrics: SheetCell[];
  billsTitle: string;
  bills: SheetCell[][];
  complaintsTitle: string;
  complaints: SheetCell[][];
};

type Schema = {
  title?: string;
  type?: string | string[];
  format?: string;
  properties?: Record<string, Schema>;
  items?: Schema;
  oneOf?: Schema[];
  $ref?: string;
};

const files: Record<string, Schema> = {
  "accountInfo.schema.json": accountSchema as Schema,
  "bill.schema.json": billSchema as Schema,
  "complaint.schema.json": complaintSchema as Schema,
  "common.schema.json": commonSchema as Schema,
};

const statusTone = (
  accountSchema as { "x-frontend"?: { statusTone?: Record<string, string> } }
)["x-frontend"]?.statusTone;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function pointer(root: Schema, hash: string): Schema | null {
  let node: unknown = root;
  for (const part of hash.split("/").filter(Boolean)) {
    if (!isRecord(node)) return null;
    node = node[decodeURIComponent(part).replaceAll("~1", "/").replaceAll("~0", "~")];
  }
  return isRecord(node) ? (node as Schema) : null;
}

function targetOf(schema: Schema, base: Schema): { schema: Schema; base: Schema } {
  if (!schema.$ref) return { schema, base };
  const [file, hash = ""] = schema.$ref.split("#");
  const nextBase = file ? files[file] : base;
  if (!nextBase) return { schema, base };
  const pointed = hash ? pointer(nextBase, hash) : nextBase;
  return { schema: pointed ?? schema, base: nextBase };
}

function looksLikeDate(schema: Schema, base: Schema, depth = 0): boolean {
  if (depth > 6) return false;
  const target = targetOf(schema, base);
  if (target.schema.format === "date") return true;
  return (target.schema.oneOf ?? []).some((part) => looksLikeDate(part, target.base, depth + 1));
}

function isMoney(schema: Schema): boolean {
  return /money amount/i.test(schema.title ?? "");
}

function humanize(key: string) {
  const spaced = key
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll(/[_-]+/g, " ")
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function labelFor(prop: Schema, target: Schema, key: string) {
  return prop.title || target.title || humanize(key);
}

function disambiguate(cells: SheetCell[]) {
  const counts = new Map<string, number>();
  for (const cell of cells) counts.set(cell.label, (counts.get(cell.label) ?? 0) + 1);
  return cells.map((cell) =>
    (counts.get(cell.label) ?? 0) > 1 ? { ...cell, label: humanize(cell.key) } : cell,
  );
}

function trimNum(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString("en-CA", { maximumFractionDigits: 2 });
}

function formatScalar(key: string, value: unknown, target: Schema, base: Schema) {
  if (value == null || value === "") return "—";
  if (typeof value === "number") {
    if (isMoney(target)) return formatMoney(value, "CAD");
    if (key === "waterM3") return `${trimNum(value)} m³`;
    if (key === "electricityKWh") return `${trimNum(value)} kWh`;
    return trimNum(value);
  }
  if (typeof value === "string" && looksLikeDate(target, base)) return formatDate(value);
  return String(value);
}

function cell(key: string, value: unknown, prop: Schema, base: Schema): SheetCell {
  const resolved = targetOf(prop, base);
  const target = resolved.schema;
  const text = formatScalar(key, value, target, resolved.base);
  const iso = typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : undefined;
  return {
    key,
    label: labelFor(prop, target, key),
    text,
    wide: key === "description" || key === "resolutionDescription" || text.length > 72,
    iso,
  };
}

function flatten(schema: Schema, data: unknown, base: Schema): SheetCell[] {
  const resolved = targetOf(schema, base);
  const props = resolved.schema.properties;
  if (!props) return [];
  const record = isRecord(data) ? data : {};
  const cells: SheetCell[] = [];
  for (const [key, prop] of Object.entries(props)) {
    const child = targetOf(prop, resolved.base);
    if (child.schema.properties) {
      cells.push(...flatten(child.schema, record[key], child.base));
      continue;
    }
    cells.push(cell(key, record[key], prop, resolved.base));
  }
  return disambiguate(cells);
}

function recordsOf(prop: Schema, data: unknown, base: Schema) {
  const resolved = targetOf(prop, base);
  const itemSchema = resolved.schema.items;
  const rows = Array.isArray(data) ? data : [];
  if (!itemSchema) return rows.map(() => [] as SheetCell[]);
  const item = targetOf(itemSchema, resolved.base);
  return rows.map((row) => flatten(item.schema, row, item.base));
}

function scalar(key: string, value: unknown, prop: Schema | undefined, base: Schema): SheetCell {
  if (!prop) return { key, label: key, text: value == null ? "—" : String(value), wide: false };
  return cell(key, value, prop, base);
}

export function toAccountSheet(data: unknown): AccountSheetModel | null {
  if (!isRecord(data)) return null;
  const root = accountSchema as Schema;
  const props = root.properties ?? {};
  const clientSchema = targetOf(props.clientInfo ?? {}, root);
  const clientProps = clientSchema.schema.properties ?? {};
  const client = isRecord(data.clientInfo) ? data.clientInfo : {};

  const contact: SheetCell[] = [];
  const address: SheetCell[] = [];
  let status = scalar("accountStatus", client.accountStatus, clientProps.accountStatus, clientSchema.base);

  for (const [key, prop] of Object.entries(clientProps)) {
    if (key === "accountStatus") {
      status = cell(key, client[key], prop, clientSchema.base);
      continue;
    }
    const child = targetOf(prop, clientSchema.base);
    if (child.schema.properties) {
      address.push(...flatten(child.schema, client[key], child.base));
      continue;
    }
    contact.push(cell(key, client[key], prop, clientSchema.base));
  }

  const summaryProp = props.summary ?? {};
  const summary = targetOf(summaryProp, root);
  const resourcesProp = props.resources ?? {};
  const resources = targetOf(resourcesProp, root);
  const resourceProps = resources.schema.properties ?? {};
  const resourceData = isRecord(data.resources) ? data.resources : {};
  const billingProp = resourceProps.billing ?? {};
  const complaintProp = resourceProps.complaints ?? {};

  return {
    name: scalar("accountName", data.accountName, props.accountName, root),
    status,
    statusTone: statusTone?.[status.text] === "alert" ? "alert" : "ok",
    id: scalar("accountId", data.accountId, props.accountId, root),
    contact,
    address,
    metrics: flatten(summary.schema, data.summary, summary.base),
    billsTitle: billingProp.title || "Bills",
    bills: recordsOf(billingProp, resourceData.billing, resources.base),
    complaintsTitle: complaintProp.title || "Complaints",
    complaints: recordsOf(complaintProp, resourceData.complaints, resources.base),
  };
}
