"use client";

import { Button, TextInput } from "@mantine/core";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { accountIssues, type SchemaIssue } from "@/lib/contract/validate";
import { toAccountSheet, type AccountSheetModel, type SheetCell } from "@/lib/contract/account-sheet";
import { matchesList, yearsIn } from "@/lib/list-filter";
import { ListTools } from "./list-tools";
import classes from "./search.module.css";

const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

function accountUrl(id: string) {
  const path = `/accounts/${encodeURIComponent(id)}`;
  return apiBase ? `${apiBase}${path}` : `/api${path}`;
}

export function SearchDesk({ initialId = "" }: { initialId?: string }) {
  const startId = initialId.trim();
  const [accountId, setAccountId] = useState(startId);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [issues, setIssues] = useState<SchemaIssue[]>([]);
  const [sheet, setSheet] = useState<AccountSheetModel | null>(null);
  const [sheetKey, setSheetKey] = useState(0);

  async function loadAccount(id: string) {
    setPending(true);
    setError("");
    setIssues([]);
    setSheet(null);

    try {
      const response = await fetch(accountUrl(id), {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      let body: unknown = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }

      if (!response.ok) {
        const message =
          body &&
          typeof body === "object" &&
          "message" in body &&
          typeof body.message === "string"
            ? body.message
            : "No account file was returned.";
        setError(message);
        return;
      }

      const model = toAccountSheet(body);
      if (!model) {
        setError("The account response was not an account file.");
        return;
      }

      setIssues(accountIssues(body));
      setSheet(model);
      setSheetKey((key) => key + 1);
    } catch {
      setError("Could not reach the account service.");
    } finally {
      setPending(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = accountId.trim().replace(/^acc-/i, "ACC-");
    if (!id) {
      setError("Enter an account id.");
      setSheet(null);
      setIssues([]);
      return;
    }
    void loadAccount(id);
  }

  const requested = useRef(initialId);

  useEffect(() => {
    const id = requested.current.trim().replace(/^acc-/i, "ACC-");
    if (!id) return;
    void loadAccount(id);
  }, []);

  return (
    <main className={classes.page}>
      <div className={classes.column}>
        <p className={classes.back}>
          <Link href="/home">Home</Link>
        </p>
        <form className={classes.bar} aria-label="Find an account" onSubmit={onSubmit}>
          <TextInput
            className={classes.input}
            label="Account ID"
            name="accountId"
            placeholder="ACC-100001"
            autoComplete="off"
            value={accountId}
            onChange={(event) => setAccountId(event.currentTarget.value)}
          />
          <Button type="submit" loading={pending}>
            Search
          </Button>
        </form>

        <div aria-live="polite">
          {pending ? <div className={classes.pending} role="status" aria-label="Loading account" /> : null}
          {error ? <p className={classes.notice}>{error}</p> : null}
          {sheet ? <AccountSheet key={sheetKey} sheet={sheet} issues={issues} /> : null}
        </div>
      </div>
    </main>
  );
}

function AccountSheet({ sheet, issues }: { sheet: AccountSheetModel; issues: SchemaIssue[] }) {
  return (
    <article className={classes.sheet}>
      {issues.length > 0 ? (
        <ul className={classes.issues}>
          {issues.map((issue, index) => (
            <li key={`${issue.path}-${index}`}>
              {issue.path ? `${issue.path}: ` : null}
              {issue.message}
            </li>
          ))}
        </ul>
      ) : null}
      <div className={classes.head}>
        <Chip cell={sheet.name} name />
        <Chip cell={sheet.status} tone={sheet.statusTone} />
        <Chip cell={sheet.id} />
      </div>
      <div className={sheet.address.length > 0 ? classes.split : classes.pane}>
        <CellList cells={sheet.contact} />
        {sheet.address.length > 0 ? <CellList cells={sheet.address} /> : null}
      </div>
      <div className={classes.metrics}>
        {sheet.metrics.map((cell) => (
          <div className={classes.metric} key={cell.key}>
            <p className={classes.kicker}>{cell.label}</p>
            <p className={classes.metricValue}>{cell.text}</p>
          </div>
        ))}
      </div>
      <RecordBand title={sheet.billsTitle} rows={sheet.bills} />
      <RecordBand title={sheet.complaintsTitle} rows={sheet.complaints} />
    </article>
  );
}

function Chip({
  cell,
  name = false,
  tone,
}: {
  cell: SheetCell;
  name?: boolean;
  tone?: "ok" | "alert";
}) {
  return (
    <div className={classes.chip} data-tone={tone}>
      <p className={classes.kicker}>{cell.label}</p>
      <p className={name ? `${classes.value} ${classes.name}` : classes.value}>{cell.text}</p>
    </div>
  );
}

function CellList({ cells }: { cells: SheetCell[] }) {
  return (
    <div className={classes.pane}>
      {cells.map((cell) => (
        <div className={classes.cell} key={cell.key}>
          <p className={classes.kicker}>{cell.label}</p>
          <p className={classes.value}>{cell.text}</p>
        </div>
      ))}
    </div>
  );
}

function RecordBand({ title, rows }: { title: string; rows: SheetCell[][] }) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const dates = rows.flatMap((row) => row.flatMap((cell) => (cell.iso ? [cell.iso] : [])));
  const visible = rows.filter((row) =>
    matchesList(
      row.map((cell) => cell.text),
      row.flatMap((cell) => (cell.iso ? [{ key: cell.key, iso: cell.iso }] : [])),
      query,
      year,
      month,
    ),
  );
  const narrowed = Boolean(query.trim() || year || month);

  return (
    <section className={classes.band}>
      <h2 className={classes.bandTitle}>{title}</h2>
      {rows.length > 1 ? (
        <ListTools
          label={title}
          query={query}
          year={year}
          month={month}
          years={yearsIn(dates)}
          onQuery={setQuery}
          onYear={setYear}
          onMonth={setMonth}
        />
      ) : null}
      {rows.length === 0 ? (
        <p className={classes.empty}>None</p>
      ) : visible.length === 0 ? (
        <p className={classes.empty}>{narrowed ? "Nothing in this view." : "None"}</p>
      ) : (
        visible.map((row, index) => (
          <div className={classes.cells} key={row[0]?.text ?? index}>
            {row.map((cell) => (
              <div className={classes.cell} data-wide={cell.wide} key={cell.key}>
                <p className={classes.kicker}>{cell.label}</p>
                <p className={classes.value}>{cell.text}</p>
              </div>
            ))}
          </div>
        ))
      )}
    </section>
  );
}
