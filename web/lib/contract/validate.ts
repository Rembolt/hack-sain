import Ajv2020, { type AnySchemaObject, type ErrorObject, type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import accountSchema from "./accountInfo.schema.json";
import billSchema from "./bill.schema.json";
import commonSchema from "./common.schema.json";
import complaintSchema from "./complaint.schema.json";
import fileRecordSchema from "./fileRecord.schema.json";
import serviceVisitSchema from "./serviceVisit.schema.json";

export type SchemaIssue = {
  path: string;
  message: string;
  /** The ajv keyword that failed, kept so the form can group and reword. */
  keyword?: string;
};

export type ContractKind = "account" | "service-visit" | "complaint" | "file";

const ajv = new Ajv2020({
  allErrors: true,
  strict: false,
});
addFormats(ajv);

for (const schema of [commonSchema, billSchema, complaintSchema]) {
  const document = schema as AnySchemaObject;
  if (document.$id && !ajv.getSchema(document.$id)) {
    ajv.addSchema(document);
  }
}

function validatorFor(schema: AnySchemaObject): ValidateFunction {
  const id = schema.$id as string | undefined;
  if (!id) return ajv.compile(schema);
  if (!ajv.getSchema(id)) ajv.addSchema(schema);
  return ajv.getSchema(id) as ValidateFunction;
}

const validators: Record<ContractKind, ValidateFunction> = {
  account: validatorFor(accountSchema as AnySchemaObject),
  "service-visit": validatorFor(serviceVisitSchema as AnySchemaObject),
  complaint: validatorFor(complaintSchema as AnySchemaObject),
  file: validatorFor(fileRecordSchema as AnySchemaObject),
};

export function issuesFor(kind: ContractKind, data: unknown): SchemaIssue[] {
  const validate = validators[kind];
  if (validate(data)) return [];
  return toIssues(validate.errors ?? []).slice(0, 60);
}

export function accountIssues(data: unknown): SchemaIssue[] {
  return issuesFor("account", data);
}

/** Message used for a pattern or format miss. The form pairs it with the field's own example. */
export const patternMessage = "must match the expected form";

/** Message for a field that has to be left empty. The form drops it when a better one exists. */
export const emptyMessage = "must be empty";

const vagueMessages = new Set([patternMessage, "must be one of the allowed forms"]);

function toIssues(errors: ErrorObject[]): SchemaIssue[] {
  const issues: SchemaIssue[] = [];
  for (const error of errors) {
    // ajv reports the failing branch as well as this wrapper, so the wrapper adds nothing.
    if (error.keyword === "if") continue;
    issues.push({ path: pathOf(error), message: messageOf(error), keyword: error.keyword });
  }
  return prune(collapseChoices(issues));
}

/** A one-of-many list arrives as one rejected constant per branch. Says it once instead. */
function collapseChoices(issues: SchemaIssue[]): SchemaIssue[] {
  const choices = new Map<string, string[]>();
  for (const issue of issues) {
    if (issue.keyword !== "const") continue;
    const values = choices.get(issue.path) ?? [];
    values.push(issue.message.replace(/^must be /, ""));
    choices.set(issue.path, values);
  }

  const written = new Set<string>();
  const kept: SchemaIssue[] = [];
  for (const issue of issues) {
    const values = issue.keyword === "const" ? choices.get(issue.path) : undefined;
    if (!values || values.length < 2) {
      kept.push(issue);
      continue;
    }
    if (written.has(issue.path)) continue;
    written.add(issue.path);
    kept.push({
      path: issue.path,
      message: `must be one of ${values.join(", ")}`,
      keyword: "enum",
    });
  }
  return kept;
}

/** Drops repeats, and drops a vague message from a field that already has a precise one. */
function prune(issues: SchemaIssue[]): SchemaIssue[] {
  const precise = new Set(
    issues.filter((issue) => !vagueMessages.has(issue.message)).map((issue) => issue.path),
  );
  const seen = new Set<string>();
  return issues.filter((issue) => {
    if (vagueMessages.has(issue.message) && precise.has(issue.path)) return false;
    const key = `${issue.path}\u0000${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function pathOf(error: ErrorObject): string {
  const parts = error.instancePath
    .split("/")
    .slice(1)
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"));
  const missing = error.params?.missingProperty;
  if (error.keyword === "required" && typeof missing === "string") parts.push(missing);
  return parts.join(".");
}

function messageOf(error: ErrorObject): string {
  const params = (error.params ?? {}) as Record<string, unknown>;
  switch (error.keyword) {
    case "required":
      return "is required";
    case "pattern":
    case "format":
      return patternMessage;
    case "type":
      // A form field is always a string, so these only fire where a value is owed or must go.
      if (params.type === "null") return emptyMessage;
      if (params.type === "string") return "must be filled in";
      return error.message ?? "is invalid";
    case "oneOf":
      return "must be one of the allowed forms";
    case "const":
      return `must be ${valueText(params.allowedValue)}`;
    case "enum":
      return Array.isArray(params.allowedValues)
        ? `must be one of ${params.allowedValues.map(valueText).join(", ")}`
        : "must be one of the allowed values";
    case "additionalProperties":
      return typeof params.additionalProperty === "string"
        ? `${params.additionalProperty} is not part of this record`
        : "has a property that does not belong here";
    default:
      return error.message ?? "is invalid";
  }
}

function valueText(value: unknown) {
  if (value === "") return "empty";
  if (value === null) return "empty";
  return String(value);
}
