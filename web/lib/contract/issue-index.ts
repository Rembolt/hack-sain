/** Sorts schema issues onto the fields that show them. */
import type { SchemaIssue } from "./validate";

export type IssueIndex = {
  /** Messages keyed by the slot they belong to: a field id, or listKey.index.fieldId for a row. */
  bySlot: Record<string, string[]>;
  /** Issues that belong to the record as a whole rather than to one field. */
  general: string[];
  count: number;
};

export const emptyIssueIndex: IssueIndex = { bySlot: {}, general: [], count: 0 };

function slotFor(path: string, slots: Set<string>) {
  if (slots.has(path)) return path;
  const parts = path.split(".");
  while (parts.length > 1) {
    parts.pop();
    const candidate = parts.join(".");
    if (slots.has(candidate)) return candidate;
  }
  return null;
}

export function indexIssues(issues: SchemaIssue[], slots: Set<string>): IssueIndex {
  const bySlot: Record<string, string[]> = {};
  const general: string[] = [];

  for (const issue of issues) {
    const slot = slotFor(issue.path, slots);
    if (!slot) {
      general.push(issue.path ? `${issue.path}: ${issue.message}` : issue.message);
      continue;
    }
    const messages = (bySlot[slot] ??= []);
    if (!messages.includes(issue.message)) messages.push(issue.message);
  }

  return { bySlot, general, count: issues.length };
}
