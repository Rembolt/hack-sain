/** Turns the contract schemas into form fields. Used by every /form page. */
import accountSchema from "./accountInfo.schema.json";
import billSchema from "./bill.schema.json";
import commonSchema from "./common.schema.json";
import complaintSchema from "./complaint.schema.json";
import fileRecordSchema from "./fileRecord.schema.json";
import serviceVisitSchema from "./serviceVisit.schema.json";

export type FormControl =
  | { kind: "text"; input: "text" | "email" | "tel" | "url" }
  | { kind: "date" }
  | { kind: "nullable-date" }
  | { kind: "time" }
  | { kind: "number"; integer: boolean }
  | { kind: "boolean" }
  | { kind: "select"; options: string[] }
  | { kind: "textarea" }
  | { kind: "const"; value: string };

export type FormField = {
  key: string;
  id: string;
  path: string[];
  label: string;
  wide: boolean;
  placeholder?: string;
  control: FormControl;
};

export type Schema = {
  title?: string;
  type?: string | string[];
  format?: string;
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, Schema>;
  items?: Schema;
  oneOf?: Schema[];
  readOnly?: boolean;
  examples?: unknown[];
  maxLength?: number;
  $ref?: string;
  "x-control"?: string;
};

export const schemaFiles: Record<string, Schema> = {
  "accountInfo.schema.json": accountSchema as Schema,
  "bill.schema.json": billSchema as Schema,
  "complaint.schema.json": complaintSchema as Schema,
  "common.schema.json": commonSchema as Schema,
  "fileRecord.schema.json": fileRecordSchema as Schema,
  "serviceVisit.schema.json": serviceVisitSchema as Schema,
};

export function isRecord(value: unknown): value is Record<string, unknown> {
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

export function targetOf(schema: Schema, base: Schema): { schema: Schema; base: Schema } {
  if (!schema.$ref) return { schema, base };
  const [file, hash = ""] = schema.$ref.split("#");
  const nextBase = file ? schemaFiles[file] : base;
  if (!nextBase) return { schema, base };
  const pointed = hash ? pointer(nextBase, hash) : nextBase;
  return { schema: pointed ?? schema, base: nextBase };
}

export function humanize(key: string) {
  const spaced = key
    .replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll(/[_-]+/g, " ")
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function labelFor(prop: Schema, target: Schema, key: string) {
  return prop.title || target.title || humanize(key);
}

export function disambiguate(fields: FormField[]) {
  const counts = new Map<string, number>();
  for (const field of fields) counts.set(field.label, (counts.get(field.label) ?? 0) + 1);
  return fields.map((field) =>
    (counts.get(field.label) ?? 0) > 1 ? { ...field, label: humanize(field.key) } : field,
  );
}

function scalarType(schema: Schema) {
  return typeof schema.type === "string" ? schema.type : undefined;
}

function isNullSchema(schema: Schema, base: Schema) {
  return scalarType(targetOf(schema, base).schema) === "null";
}

function isNullableDate(schema: Schema, base: Schema) {
  const resolved = targetOf(schema, base);
  const parts = resolved.schema.oneOf;
  if (!parts) return false;
  const hasNull = parts.some((part) => isNullSchema(part, resolved.base));
  const hasDate = parts.some((part) => targetOf(part, resolved.base).schema.format === "date");
  return hasNull && hasDate;
}

function constsOf(schema: Schema, base: Schema, depth = 0): string[] | null {
  if (depth > 8) return null;
  const resolved = targetOf(schema, base);
  const node = resolved.schema;
  if (typeof node.const === "string") return [node.const];
  if (Array.isArray(node.enum) && node.enum.every((item) => typeof item === "string")) return node.enum;
  if (!node.oneOf) return null;
  const lists: string[][] = [];
  for (const part of node.oneOf) {
    const found = constsOf(part, resolved.base, depth + 1);
    if (!found) return null;
    lists.push(found);
  }
  return lists.flat();
}

function exampleText(prop: Schema, target: Schema) {
  const list = [...(prop.examples ?? []), ...(target.examples ?? [])];
  const picked = list.find((item) => item !== 0 && item !== "" && item != null) ?? list[0];
  if (typeof picked === "string" || typeof picked === "number") return String(picked);
  return undefined;
}

function controlFor(key: string, prop: Schema, target: Schema, base: Schema): FormControl {
  const override = prop["x-control"] ?? target["x-control"];
  if (override === "time") return { kind: "time" };
  if (override === "textarea") return { kind: "textarea" };
  if (isNullableDate(target, base)) return { kind: "nullable-date" };
  if (typeof target.const === "string") return { kind: "const", value: target.const };
  const choices = (constsOf(target, base) ?? []).filter((item) => item !== "");
  if (choices.length > 0) return { kind: "select", options: choices };
  const format = target.format ?? prop.format;
  if (format === "date") return { kind: "date" };
  if (format === "email") return { kind: "text", input: "email" };
  if (format === "uri") return { kind: "text", input: "url" };
  if (key === "phoneNumber") return { kind: "text", input: "tel" };
  const type = scalarType(target) ?? scalarType(prop) ?? "string";
  if (type === "boolean") return { kind: "boolean" };
  if (type === "integer") return { kind: "number", integer: true };
  if (type === "number") return { kind: "number", integer: false };
  const max = prop.maxLength ?? target.maxLength ?? 0;
  if (max > 200) return { kind: "textarea" };
  return { kind: "text", input: "text" };
}

export function toField(key: string, prop: Schema, base: Schema, path: string[]): FormField {
  const resolved = targetOf(prop, base);
  const target = resolved.schema;
  const control = controlFor(key, prop, target, resolved.base);
  const typed = control.kind !== "const" && control.kind !== "select" && control.kind !== "boolean";
  return {
    key,
    id: path.join("."),
    path,
    label: labelFor(prop, target, key),
    wide: control.kind === "textarea",
    placeholder: typed ? exampleText(prop, target) : undefined,
    control,
  };
}

/** Scalar fields of an object schema, with nested objects flattened into the same list. */
export function fieldsOf(schema: Schema, base: Schema, prefix: string[], depth = 0): FormField[] {
  if (depth > 8) return [];
  const resolved = targetOf(schema, base);
  const props = resolved.schema.properties;
  if (!props) return [];
  const fields: FormField[] = [];
  for (const [key, prop] of Object.entries(props)) {
    const child = targetOf(prop, resolved.base);
    if (prop.readOnly || child.schema.readOnly) continue;
    if (child.schema.properties) {
      fields.push(...fieldsOf(child.schema, child.base, [...prefix, key], depth + 1));
      continue;
    }
    fields.push(toField(key, prop, resolved.base, [...prefix, key]));
  }
  return disambiguate(fields);
}

/** Fields of one row of an array property. */
export function itemFields(prop: Schema, base: Schema) {
  const resolved = targetOf(prop, base);
  const items = resolved.schema.items;
  if (!items) return [];
  const item = targetOf(items, resolved.base);
  return fieldsOf(item.schema, item.base, []);
}

function write(target: Record<string, unknown>, path: string[], value: unknown) {
  let node = target;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index];
    if (!isRecord(node[key])) node[key] = {};
    node = node[key] as Record<string, unknown>;
  }
  node[path[path.length - 1]] = value;
}

function coerce(field: FormField, raw: string): unknown {
  if (field.control.kind === "const") return field.control.value;
  if (field.control.kind === "boolean") return raw === "true";
  if (field.control.kind === "nullable-date") return raw.trim() === "" ? null : raw.trim();
  if (field.control.kind === "number") {
    const text = raw.trim();
    if (text === "") return text;
    const value = Number(text);
    return Number.isFinite(value) ? value : text;
  }
  return raw.trim();
}

/** Writes one row of entered text back into the shape the schema describes. */
export function apply(fields: FormField[], row: Record<string, string>) {
  const record: Record<string, unknown> = {};
  for (const field of fields) write(record, field.path, coerce(field, row[field.id] ?? ""));
  return record;
}
