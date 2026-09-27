"use client";

import { Button } from "@mantine/core";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  accountForm,
  buildAccount,
  draftMetrics,
  emptyDraft,
  statusTone,
  type AccountDraft,
} from "@/lib/contract/account-form";
import { indexIssues } from "@/lib/contract/issue-index";
import type { FormField } from "@/lib/contract/schema-fields";
import { accountIssues, type SchemaIssue } from "@/lib/contract/validate";
import sheet from "../../search/search.module.css";
import classes from "../form.module.css";
import { Control, FieldCells } from "../control";
import { IssueSummary } from "../issue-summary";

const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
const postUrl = apiBase ? `${apiBase}/accounts` : "/api/accounts";

const bandPaths = {
  bills: "resources.billing",
  complaints: "resources.complaints",
} as const;

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

export function FormDesk({
  backHref = "/form",
  backLabel = "All forms",
}: {
  backHref?: string;
  backLabel?: string;
}) {
  const [draft, setDraft] = useState<AccountDraft>(emptyDraft);
  const [sent, setSent] = useState<SchemaIssue[]>([]);
  const [touched, setTouched] = useState<Record<string, true>>({});
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const metrics = draftMetrics(draft);

  const body = useMemo(() => buildAccount(draft), [draft]);
  const slots = useMemo(() => {
    const keys = new Set<string>();
    for (const field of [
      accountForm.name,
      accountForm.status,
      accountForm.accountId,
      ...accountForm.contact,
      ...accountForm.address,
    ]) {
      keys.add(field.id);
    }
    draft.bills.forEach((_, index) => {
      for (const field of accountForm.billFields) {
        keys.add(`${bandPaths.bills}.${index}.${field.id}`);
      }
    });
    draft.complaints.forEach((_, index) => {
      for (const field of accountForm.complaintFields) {
        keys.add(`${bandPaths.complaints}.${index}.${field.id}`);
      }
    });
    return keys;
  }, [draft.bills, draft.complaints]);

  // The route checks the same schema, so its answer replaces the live read until the next edit.
  const issues = sent.length > 0 ? sent : accountIssues(body);
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

  function edit(next: AccountDraft) {
    setDraft(next);
    setSent([]);
    setError("");
    setAccepted(false);
  }

  function setValue(id: string, value: string) {
    edit({ ...draft, values: { ...draft.values, [id]: value } });
  }

  function setRow(key: "bills" | "complaints", index: number, id: string, value: string) {
    edit({
      ...draft,
      [key]: draft[key].map((row, rowIndex) => (rowIndex === index ? { ...row, [id]: value } : row)),
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRevealed(true);
    setPending(true);
    setError("");
    setAccepted(false);
    setSent([]);

    try {
      const response = await fetch(postUrl, {
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
        else {
          const message =
            payload &&
            typeof payload === "object" &&
            "message" in payload &&
            typeof payload.message === "string"
              ? payload.message
              : "The account file was not accepted.";
          setError(message);
        }
        return;
      }

      setAccepted(true);
    } catch {
      setError("Could not reach the account service.");
    } finally {
      setPending(false);
    }
  }

  const status = draft.values[accountForm.status.id] ?? "";

  return (
    <main className={sheet.page}>
      <div className={sheet.column}>
        <p className={classes.back}>
          <Link href={backHref}>{backLabel}</Link>
        </p>
        <form aria-label={accountForm.title} autoComplete="off" noValidate onSubmit={onSubmit}>
          {pending ? (
            <div className={sheet.pending} role="status" aria-label="Saving account" />
          ) : null}
          <article className={sheet.sheet}>
            <IssueSummary index={index} shown={revealed} ref={summaryRef} />
            <h1 className={sheet.bandTitle}>{accountForm.title}</h1>
            <div className={sheet.head}>
              <div className={sheet.chip}>
                <Control
                  field={accountForm.name}
                  id={accountForm.name.id}
                  value={draft.values[accountForm.name.id] ?? ""}
                  messages={messagesFor(accountForm.name.id)}
                  onTouch={() => touch(accountForm.name.id)}
                  onChange={(value) => setValue(accountForm.name.id, value)}
                  prominent
                />
              </div>
              <div
                className={`${sheet.chip} ${statusTone(status) === "alert" ? classes.alert : ""}`}
                data-tone={statusTone(status)}
              >
                <Control
                  field={accountForm.status}
                  id={accountForm.status.id}
                  value={status}
                  messages={messagesFor(accountForm.status.id)}
                  onTouch={() => touch(accountForm.status.id)}
                  onChange={(value) => setValue(accountForm.status.id, value)}
                />
              </div>
              <div className={sheet.chip}>
                <Control
                  field={accountForm.accountId}
                  id={accountForm.accountId.id}
                  value={draft.values[accountForm.accountId.id] ?? ""}
                  messages={messagesFor(accountForm.accountId.id)}
                  onTouch={() => touch(accountForm.accountId.id)}
                  onChange={(value) => setValue(accountForm.accountId.id, value)}
                />
              </div>
            </div>
            <div className={accountForm.address.length > 0 ? sheet.split : sheet.pane}>
              <FieldPane
                fields={accountForm.contact}
                values={draft.values}
                messagesFor={messagesFor}
                onTouch={touch}
                onChange={setValue}
              />
              {accountForm.address.length > 0 ? (
                <FieldPane
                  fields={accountForm.address}
                  values={draft.values}
                  messagesFor={messagesFor}
                  onTouch={touch}
                  onChange={setValue}
                />
              ) : null}
            </div>
            <div className={sheet.metrics}>
              {metrics.map((metric) => (
                <div className={sheet.metric} key={metric.key}>
                  <p className={sheet.kicker}>{metric.label}</p>
                  <p className={sheet.metricValue}>{metric.text}</p>
                </div>
              ))}
            </div>
            <RecordBand
              title={accountForm.billsTitle}
              addLabel="Add bill"
              slotPrefix={bandPaths.bills}
              fields={accountForm.billFields}
              rows={draft.bills}
              messagesFor={messagesFor}
              onTouch={touch}
              onAdd={() => edit({ ...draft, bills: [...draft.bills, {}] })}
              onRemove={(index) =>
                edit({ ...draft, bills: draft.bills.filter((_, rowIndex) => rowIndex !== index) })
              }
              onChange={(index, id, value) => setRow("bills", index, id, value)}
            />
            <RecordBand
              title={accountForm.complaintsTitle}
              addLabel="Add complaint"
              slotPrefix={bandPaths.complaints}
              fields={accountForm.complaintFields}
              rows={draft.complaints}
              messagesFor={messagesFor}
              onTouch={touch}
              onAdd={() => edit({ ...draft, complaints: [...draft.complaints, {}] })}
              onRemove={(index) =>
                edit({
                  ...draft,
                  complaints: draft.complaints.filter((_, rowIndex) => rowIndex !== index),
                })
              }
              onChange={(index, id, value) => setRow("complaints", index, id, value)}
            />
          </article>
          <div aria-live="polite" ref={resultRef}>
            {error ? <p className={sheet.notice}>{error}</p> : null}
            {accepted ? <p className={sheet.notice}>Account file accepted.</p> : null}
          </div>
          <div className={classes.actions}>
            <Button type="submit" loading={pending}>
              Create account
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}

function FieldPane({
  fields,
  values,
  messagesFor,
  onTouch,
  onChange,
}: {
  fields: FormField[];
  values: Record<string, string>;
  messagesFor: (slot: string) => string[];
  onTouch: (slot: string) => void;
  onChange: (id: string, value: string) => void;
}) {
  return (
    <div className={sheet.pane}>
      <FieldCells
        fields={fields}
        values={values}
        prefix="account"
        messagesFor={messagesFor}
        onTouch={onTouch}
        onChange={onChange}
      />
    </div>
  );
}

function RecordBand({
  title,
  addLabel,
  slotPrefix,
  fields,
  rows,
  messagesFor,
  onTouch,
  onAdd,
  onRemove,
  onChange,
}: {
  title: string;
  addLabel: string;
  slotPrefix: string;
  fields: FormField[];
  rows: Record<string, string>[];
  messagesFor: (slot: string) => string[];
  onTouch: (slot: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (index: number, id: string, value: string) => void;
}) {
  return (
    <section className={sheet.band}>
      <h2 className={sheet.bandTitle}>{title}</h2>
      {rows.length === 0 ? <p className={sheet.empty}>None</p> : null}
      {rows.map((row, index) => (
        <div className={classes.record} key={index}>
          <div className={sheet.cells}>
            <FieldCells
              fields={fields}
              values={row}
              prefix={`${title}-${index}`}
              slotPrefix={`${slotPrefix}.${index}`}
              messagesFor={messagesFor}
              onTouch={onTouch}
              onChange={(id, value) => onChange(index, id, value)}
            />
          </div>
          <div className={classes.recordBar}>
            <button type="button" className={classes.remove} onClick={() => onRemove(index)}>
              Remove
            </button>
          </div>
        </div>
      ))}
      <button type="button" className={classes.add} onClick={onAdd}>
        {addLabel}
      </button>
    </section>
  );
}
