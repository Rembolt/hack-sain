/** Single-record forms: one contract schema in, one form out. The account file has its own layout in account-form.ts. */
import complaintSchema from "./complaint.schema.json";
import fileRecordSchema from "./fileRecord.schema.json";
import serviceVisitSchema from "./serviceVisit.schema.json";
import {
  apply,
  fieldsOf,
  humanize,
  itemFields,
  labelFor,
  targetOf,
  toField,
  type FormField,
  type Schema,
} from "./schema-fields";

export type RecordGroup = {
  key: string;
  title: string;
  fields: FormField[];
};

export type RecordList = {
  key: string;
  title: string;
  addLabel: string;
  fields: FormField[];
};

export type RecordShape = {
  title: string;
  lead: FormField[];
  groups: RecordGroup[];
  lists: RecordList[];
};

export type RecordDraft = {
  values: Record<string, string>;
  rows: Record<string, Record<string, string>[]>;
};

export type RecordSlug = "service-visit" | "complaint" | "file";

function shapeOf(schema: Schema): RecordShape {
  const props = schema.properties ?? {};
  const lead: FormField[] = [];
  const groups: RecordGroup[] = [];
  const lists: RecordList[] = [];

  for (const [key, prop] of Object.entries(props)) {
    const child = targetOf(prop, schema);
    if (prop.readOnly || child.schema.readOnly) continue;

    if (child.schema.type === "array") {
      const items = child.schema.items ? targetOf(child.schema.items, child.base).schema : {};
      const singular = items.title || humanize(key);
      lists.push({
        key,
        title: labelFor(prop, child.schema, key),
        addLabel: `Add ${singular.toLowerCase()}`,
        fields: itemFields(prop, schema),
      });
      continue;
    }

    if (child.schema.properties) {
      groups.push({
        key,
        title: labelFor(prop, child.schema, key),
        fields: fieldsOf(child.schema, child.base, [key]),
      });
      continue;
    }

    lead.push(toField(key, prop, schema, [key]));
  }

  return { title: schema.title || "Record", lead, groups, lists };
}

export function emptyRecordDraft(shape: RecordShape): RecordDraft {
  const rows: Record<string, Record<string, string>[]> = {};
  for (const list of shape.lists) rows[list.key] = [];
  return { values: {}, rows };
}

export function buildRecord(shape: RecordShape, draft: RecordDraft) {
  const fields = [...shape.lead, ...shape.groups.flatMap((group) => group.fields)];
  const body = apply(fields, draft.values);
  for (const list of shape.lists) {
    body[list.key] = (draft.rows[list.key] ?? []).map((row) => apply(list.fields, row));
  }
  return body;
}

export type RecordForm = {
  slug: RecordSlug;
  title: string;
  blurb: string;
  endpoint: string;
  shape: RecordShape;
};

export const recordForms: Record<RecordSlug, RecordForm> = {
  "service-visit": {
    slug: "service-visit",
    title: "Service visit",
    blurb: "A contractor writes up the visit they made: appointment, work done, meter read, parts, and what they are charging.",
    endpoint: "/service-visits",
    shape: shapeOf(serviceVisitSchema as Schema),
  },
  complaint: {
    slug: "complaint",
    title: "Complaint",
    blurb: "One complaint on its own. Nothing about the account is entered here.",
    endpoint: "/complaints",
    shape: shapeOf(complaintSchema as Schema),
  },
  file: {
    slug: "file",
    title: "File record",
    blurb: "A stored document: the handle it is fetched with, who owns it, how it is encrypted, and who may read it.",
    endpoint: "/files",
    shape: shapeOf(fileRecordSchema as Schema),
  },
};

export const formCatalog = [
  {
    href: "/form/account",
    title: "Account file",
    blurb: "A whole account file, laid out like the account sheet, with its bills and complaints.",
  },
  ...(["service-visit", "complaint", "file"] as const).map((slug) => ({
    href: `/form/${slug}`,
    title: recordForms[slug].title,
    blurb: recordForms[slug].blurb,
  })),
];
