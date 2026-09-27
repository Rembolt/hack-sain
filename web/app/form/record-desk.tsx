"use client";

import { Button } from "@mantine/core";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { indexIssues } from "@/lib/contract/issue-index";
import {
  buildRecord,
  emptyRecordDraft,
  recordForms,
  type RecordDraft,
  type RecordList,
  type RecordSlug,
} from "@/lib/contract/record-form";
import { issuesFor, type SchemaIssue } from "@/lib/contract/validate";
import sheet from "../search/search.module.css";
import classes from "./form.module.css";
import { FieldCells } from "./control";
import { IssueSummary } from "./issue-summary";

const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

function endpointUrl(endpoint: string) {
  return apiBase ? `${apiBase}${endpoint}` : `/api${endpoint}`;
}

function readIssues(body: unknown): SchemaIssue[] | null {
  if (!body || typeof body !== "object" || !("errors" in body)) return null;
  const errors = body.errors;
  if (!Array.isArray(errors)) return null;
  return errors.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const path = "path" in item && typeof item.path === "string" ? item.path : "";
    const message = "message" in item && typeof item.message === "string" ? item.message : "";
    if (!message) return [];
    return [{ path, message }];
  });
}

export function RecordDesk({ slug }: { slug: RecordSlug }) {
  const form = recordForms[slug];
  const { shape } = form;
  const [draft, setDraft] = useState<RecordDraft>(() => emptyRecordDraft(shape));
  const [sent, setSent] = useState<SchemaIssue[]>([]);
  const [touched, setTouched] = useState<Record<string, true>>({});
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const body = useMemo(() => buildRecord(shape, draft), [shape, draft]);
  const slots = useMemo(() => {
    const keys = new Set<string>();
    for (const field of shape.lead) keys.add(field.id);
    for (const group of shape.groups) for (const field of group.fields) keys.add(field.id);
    for (const list of shape.lists) {
      (draft.rows[list.key] ?? []).forEach((_, index) => {
        for (const field of list.fields) keys.add(`${list.key}.${index}.${field.id}`);
      });
    }
    return keys;
  }, [shape, draft.rows]);

  // The route checks the same schema, so its answer replaces the live read until the next edit.
  const issues = sent.length > 0 ? sent : issuesFor(slug, body);
  const index = useMemo(() => indexIssues(issues, slots), [issues, slots]);

  useEffect(() => {
    if (revealed && index.count > 0) summaryRef.current?.scrollIntoView({ block: "nearest" });
  }, [revealed, index.count]);

  useEffect(() => {
    if (error || accepted) resultRef.current?.scrollIntoView({ block: "nearest" });
  }, [error, accepted]);

  function messagesFor(slot: string) {
    if (!revealed && !touched[slot]) return [];
    return index.bySlot[slot] ?? [];
  }

  function touch(slot: string) {
    setTouched((previous) => (previous[slot] ? previous : { ...previous, [slot]: true }));
  }

  function edit(next: RecordDraft) {
    setDraft(next);
    setSent([]);
    setError("");
    setAccepted(false);
  }

  function setValue(id: string, value: string) {
    edit({ ...draft, values: { ...draft.values, [id]: value } });
  }

  function setRow(list: RecordList, index: number, id: string, value: string) {
    const rows = (draft.rows[list.key] ?? []).map((row, rowIndex) =>
      rowIndex === index ? { ...row, [id]: value } : row,
    );
    edit({ ...draft, rows: { ...draft.rows, [list.key]: rows } });
  }

  function addRow(list: RecordList) {
    edit({ ...draft, rows: { ...draft.rows, [list.key]: [...(draft.rows[list.key] ?? []), {}] } });
  }

  function removeRow(list: RecordList, index: number) {
    const rows = (draft.rows[list.key] ?? []).filter((_, rowIndex) => rowIndex !== index);
    edit({ ...draft, rows: { ...draft.rows, [list.key]: rows } });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRevealed(true);
    setPending(true);
    setError("");
    setAccepted(false);
    setSent([]);

    try {
      const response = await fetch(endpointUrl(form.endpoint), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      });
      let payload: unknown = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const found = readIssues(payload);
        if (found && found.length > 0) setSent(found);
        else setError(`The ${form.title.toLowerCase()} was not accepted.`);
        return;
      }

      setAccepted(true);
    } catch {
      setError("Could not reach the service.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={sheet.page}>
      <div className={sheet.column}>
        <p className={classes.back}>
          <Link href="/form">All forms</Link>
        </p>
        <form aria-label={shape.title} autoComplete="off" noValidate onSubmit={onSubmit}>
          {pending ? (
            <div className={sheet.pending} role="status" aria-label="Saving record" />
          ) : null}
          <article className={sheet.sheet}>
            <IssueSummary index={index} shown={revealed} ref={summaryRef} />
            <h1 className={sheet.bandTitle}>{shape.title}</h1>
            {shape.lead.length > 0 ? (
              <div className={sheet.cells}>
                <FieldCells
                  fields={shape.lead}
                  values={draft.values}
                  prefix="lead"
                  messagesFor={messagesFor}
                  onTouch={touch}
                  onChange={setValue}
                />
              </div>
            ) : null}
            {shape.groups.map((group) => (
              <section className={sheet.band} key={group.key}>
                <h2 className={sheet.bandTitle}>{group.title}</h2>
                <div className={sheet.cells}>
                  <FieldCells
                    fields={group.fields}
                    values={draft.values}
                    prefix={group.key}
                    messagesFor={messagesFor}
                    onTouch={touch}
                    onChange={setValue}
                  />
                </div>
              </section>
            ))}
            {shape.lists.map((list) => (
              <section className={sheet.band} key={list.key}>
                <h2 className={sheet.bandTitle}>{list.title}</h2>
                {(draft.rows[list.key] ?? []).length === 0 ? (
                  <p className={sheet.empty}>None</p>
                ) : null}
                {(draft.rows[list.key] ?? []).map((row, rowIndex) => (
                  <div className={classes.record} key={rowIndex}>
                    <div className={sheet.cells}>
                      <FieldCells
                        fields={list.fields}
                        values={row}
                        prefix={`${list.key}-${rowIndex}`}
                        slotPrefix={`${list.key}.${rowIndex}`}
                        messagesFor={messagesFor}
                        onTouch={touch}
                        onChange={(id, value) => setRow(list, rowIndex, id, value)}
                      />
                    </div>
                    <div className={classes.recordBar}>
                      <button
                        type="button"
                        className={classes.remove}
                        onClick={() => removeRow(list, rowIndex)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button type="button" className={classes.add} onClick={() => addRow(list)}>
                  {list.addLabel}
                </button>
              </section>
            ))}
          </article>
          <div aria-live="polite" ref={resultRef}>
            {error ? <p className={sheet.notice}>{error}</p> : null}
            {accepted ? <p className={sheet.notice}>{shape.title} accepted.</p> : null}
          </div>
          <div className={classes.actions}>
            <Button type="submit" loading={pending}>
              Submit {shape.title.toLowerCase()}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
