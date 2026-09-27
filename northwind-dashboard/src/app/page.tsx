"use client";

import Papa from "papaparse";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BarChart3,
  Building2,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileSpreadsheet,
  Headset,
  Layers3,
  RotateCcw,
  ShieldAlert,
  Upload,
  Wallet,
} from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";

type ComplaintRow = Record<string, string>;
type BreakdownItem = { label: string; count: number };

type DashboardData = {
  total: number;
  averageSla: number | null;
  averageClose: number | null;
  transferCount: number;
  reopenedCount: number;
  correctionTotal: number;
  categories: BreakdownItem[];
  regions: BreakdownItem[];
  systems: BreakdownItem[];
  actions: BreakdownItem[];
};

const requiredHeaders = [
  "complaint_id",
  "category",
  "region",
  "source_system",
  "transferred_between_systems",
  "sla_days",
  "days_to_close",
  "reopened",
  "resolution_action",
  "bill_correction_value",
];

const numberFrom = (value: string | undefined) => {
  if (!value?.trim()) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const isTrue = (value: string | undefined) =>
  ["1", "true", "yes", "y"].includes(value?.trim().toLowerCase() ?? "");

const breakdown = (rows: ComplaintRow[], field: string) => {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const value = row[field]?.trim() || "Unspecified";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((first, second) => second.count - first.count || first.label.localeCompare(second.label));
};

const averageFor = (rows: ComplaintRow[], field: string) => {
  const values = rows
    .map((row) => numberFrom(row[field]))
    .filter((value): value is number => value !== null);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
};

const summarize = (rows: ComplaintRow[]): DashboardData => ({
  total: rows.length,
  averageSla: averageFor(rows, "sla_days"),
  averageClose: averageFor(rows, "days_to_close"),
  transferCount: rows.filter((row) => isTrue(row.transferred_between_systems)).length,
  reopenedCount: rows.filter((row) => isTrue(row.reopened)).length,
  correctionTotal: rows.reduce((total, row) => total + (numberFrom(row.bill_correction_value) ?? 0), 0),
  categories: breakdown(rows, "category"),
  regions: breakdown(rows, "region"),
  systems: breakdown(rows, "source_system"),
  actions: breakdown(rows, "resolution_action"),
});

const countFormat = new Intl.NumberFormat("en-GB");
const moneyFormat = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  tone: string;
}) {
  return (
    <article className="metric-card">
      <div className="metric-topline">
        <span className="metric-label">{label}</span>
        <span className={`metric-icon ${tone}`}><Icon size={17} strokeWidth={1.8} /></span>
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-detail">{detail}</span>
    </article>
  );
}

function BreakdownPanel({
  title,
  eyebrow,
  items,
  icon: Icon,
  emptyText,
}: {
  title: string;
  eyebrow: string;
  items: BreakdownItem[];
  icon: typeof Activity;
  emptyText: string;
}) {
  const maxCount = items[0]?.count ?? 1;

  return (
    <section className="panel breakdown-panel">
      <div className="panel-heading">
        <div className="panel-title-wrap">
          <span className="panel-icon"><Icon size={17} strokeWidth={1.8} /></span>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
        </div>
        <span className="unit-label">COMPLAINTS</span>
      </div>
      {items.length ? (
        <div className="bar-list">
          {items.map((item) => (
            <div className="bar-row" key={item.label}>
              <div className="bar-label-line">
                <span className="bar-label" title={item.label}>{item.label}</span>
                <span className="bar-count">{countFormat.format(item.count)}</span>
              </div>
              <div className="bar-track" aria-label={`${item.label}: ${item.count}`}>
                <span className="bar-fill" style={{ width: `${(item.count / maxCount) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="chart-empty"><span>{emptyText}</span></div>
      )}
    </section>
  );
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setIsLoading(true);
    Papa.parse<ComplaintRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        const missing = requiredHeaders.filter((header) => !headers.includes(header));
        const rows = result.data.filter((row) => row.complaint_id?.trim());

        if (result.errors.length) {
          setError(`Could not read the CSV cleanly: ${result.errors[0].message}`);
        } else if (missing.length) {
          setError(`Missing required columns: ${missing.join(", ")}`);
        } else if (!rows.length) {
          setError("No complaint rows were found in this file.");
        } else {
          setData(summarize(rows));
          setFileName(file.name);
        }
        setIsLoading(false);
        event.target.value = "";
      },
      error: (parseError) => {
        setError(`Could not open this file: ${parseError.message}`);
        setIsLoading(false);
        event.target.value = "";
      },
    });
  };

  const chooseFile = () => inputRef.current?.click();
  const shown = (value: number | null, digits = 1) => value === null ? "—" : value.toFixed(digits);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Northwind overview">
          <span className="brand-mark"><span /></span>
          <span className="brand-copy"><strong>northwind</strong><small>UTILITY SERVICES</small></span>
        </a>
        <div className="workspace-label">SERVICE OPERATIONS</div>
        <nav className="side-nav" aria-label="Dashboard sections">
          <a className="nav-item is-active" href="#overview"><BarChart3 size={17} />Overview</a>
          <a className="nav-item" href="#breakdowns"><FileSpreadsheet size={17} />Complaint mix</a>
          <a className="nav-item" href="#systems"><Layers3 size={17} />Source systems</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon"><ShieldAlert size={17} /></span>
            <p><strong>Evidence first</strong><br />No sample totals are shown. Upload a file to calculate metrics.</p>
          </div>
          <div className="profile-row">
            <span className="profile-avatar">NW</span>
            <span><strong>Northwind Utilities</strong><small>Executive view</small></span>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumb"><span>Operations</span><ArrowRight size={13} /><strong>Complaints overview</strong></div>
          <div className="topbar-actions">
            <span className="privacy-tag"><span /> LOCAL FILE</span>
            <button className="icon-button" aria-label="About this dashboard" title="About this dashboard"><CircleHelp size={18} /></button>
            <button className="avatar-button" aria-label="Northwind profile">NW</button>
          </div>
        </header>

        <div className="content-wrap">
          <section className="page-heading">
            <div>
              <p className="eyebrow page-eyebrow">CUSTOMER SERVICE / COMPLAINTS</p>
              <h1>Complaint performance</h1>
              <p className="page-subtitle">A working view of volume, resolution and service pressure.</p>
            </div>
            <div className="heading-actions">
              <input ref={inputRef} className="visually-hidden" type="file" accept=".csv,text/csv" onChange={handleFile} />
              <button className="upload-button" onClick={chooseFile} disabled={isLoading}>
                <Upload size={16} />{isLoading ? "Reading file..." : data ? "Replace CSV" : "Upload complaints CSV"}
              </button>
            </div>
          </section>

          {error && <div className="error-banner" role="alert"><ShieldAlert size={17} /><span>{error}</span></div>}

          <section className="dataset-strip" aria-live="polite">
            <span className={`dataset-indicator ${data ? "loaded" : ""}`} />
            <span>{data ? <><strong>{fileName}</strong><span className="dataset-separator">·</span>{countFormat.format(data.total)} complaint records loaded</> : "No complaint file loaded"}</span>
            {data && <span className="dataset-state">CSV READY</span>}
            {!data && <button className="text-action" onClick={chooseFile}>Select file <ArrowRight size={14} /></button>}
          </section>

          <section className="metric-grid" aria-label="Complaint performance metrics">
            <MetricCard label="Complaints analyzed" value={data ? countFormat.format(data.total) : "—"} detail="Rows in uploaded file" icon={Headset} tone="mint" />
            <MetricCard label="Avg. days to close" value={shown(data?.averageClose ?? null)} detail="Across records with a value" icon={Clock3} tone="coral" />
            <MetricCard label="Average SLA target" value={shown(data?.averageSla ?? null)} detail="Days allowed to resolve" icon={Activity} tone="gold" />
            <MetricCard label="Transferred" value={data ? countFormat.format(data.transferCount) : "—"} detail={data ? `${((data.transferCount / data.total) * 100).toFixed(1)}% of complaints` : "Between systems"} icon={ArrowDownToLine} tone="blue" />
            <MetricCard label="Reopened" value={data ? countFormat.format(data.reopenedCount) : "—"} detail={data ? `${((data.reopenedCount / data.total) * 100).toFixed(1)}% of complaints` : "Complaints returned to queue"} icon={RotateCcw} tone="violet" />
            <MetricCard label="Bill correction value" value={data ? moneyFormat.format(data.correctionTotal) : "—"} detail="Recorded value in CSV · GBP" icon={Wallet} tone="green" />
          </section>

          <section className="section-heading" id="breakdowns">
            <div><p className="eyebrow">CASE DISTRIBUTION</p><h2>Where complaints come from</h2></div>
            <span className="section-meta">{data ? `${data.categories.length + data.regions.length + data.systems.length} dimensions` : "Awaiting data"}</span>
          </section>

          <div className="primary-grid">
            <BreakdownPanel title="By category" eyebrow="COMPLAINT REASONS" items={data?.categories ?? []} icon={BarChart3} emptyText="Category counts appear when a CSV is loaded." />
            <BreakdownPanel title="By region" eyebrow="SERVICE FOOTPRINT" items={data?.regions ?? []} icon={Building2} emptyText="Regional counts appear when a CSV is loaded." />
          </div>

          <section className="section-heading lower-heading" id="systems">
            <div><p className="eyebrow">HANDLING & ROUTING</p><h2>How cases move through the estate</h2></div>
          </section>

          <div className="secondary-grid">
            <BreakdownPanel title="Source system" eyebrow="ORIGINATING APPLICATION" items={data?.systems ?? []} icon={Layers3} emptyText="System counts appear when a CSV is loaded." />
            <BreakdownPanel title="Resolution action" eyebrow="CLOSING OUTCOMES" items={data?.actions ?? []} icon={RotateCcw} emptyText="Resolution counts appear when a CSV is loaded." />
          </div>

          <footer className="dashboard-footer">
            <span><span className="footer-dot" />Values are calculated from the uploaded file in this browser.</span>
            <span>Bill correction value is the recorded CSV total; payment is not independently verified.</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
