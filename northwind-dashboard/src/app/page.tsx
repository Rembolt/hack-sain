"use client";

import Papa from "papaparse";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CircleHelp,
  Clock3,
  FileSpreadsheet,
  Headset,
  Layers3,
  RotateCcw,
  ShieldAlert,
  TrendingUp,
  Upload,
  Wallet,
} from "lucide-react";
import { ChangeEvent, useRef, useState } from "react";

type ComplaintRow = Record<string, string>;
type BreakdownItem = { label: string; count: number };
type MonthlyKpiRow = Record<string, string>;

type DashboardData = {
  total: number;
  openCount: number;
  averageSla: number | null;
  averageClose: number | null;
  slaBreachCount: number;
  transferCount: number;
  reopenedCount: number;
  informationOnlyCount: number;
  correctionTotal: number;
  categories: BreakdownItem[];
  regions: BreakdownItem[];
  systems: BreakdownItem[];
  channels: BreakdownItem[];
  priorities: BreakdownItem[];
  actions: BreakdownItem[];
};

type MonthlyKpiData = {
  rows: MonthlyKpiRow[];
  latestMonth: string;
  latestRegulatorScore: number | null;
  latestCloseDays: number | null;
  latestFcrRate: number | null;
};

const requiredHeaders = [
  "complaint_id",
  "status",
  "channel",
  "category",
  "priority",
  "region",
  "source_system",
  "transferred_between_systems",
  "sla_days",
  "sla_breach",
  "days_to_close",
  "reopened",
  "resolvable_by_information_only",
  "resolution_action",
  "bill_correction_value",
];

const requiredMonthlyHeaders = [
  "month",
  "complaints_opened",
  "complaints_closed",
  "avg_days_to_close",
  "first_contact_resolution_rate",
  "inbound_calls",
  "cost_to_serve_per_account",
  "regulator_satisfaction_score_of_5",
];

const numberFrom = (value: string | undefined) => {
  if (!value?.trim()) return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const isTrue = (value: string | undefined) =>
  ["1", "true", "yes", "y"].includes(value?.trim().toLowerCase() ?? "");

const isOpen = (row: ComplaintRow) => {
  const status = row.status?.trim().toLowerCase();
  return numberFrom(row.days_to_close) === null || ["open", "in progress", "pending"].includes(status);
};

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

const summarizeMonthlyKpis = (rows: MonthlyKpiRow[]): MonthlyKpiData => {
  const sortedRows = [...rows].sort((first, second) => first.month.localeCompare(second.month));
  const latest = sortedRows[sortedRows.length - 1];
  return {
    rows: sortedRows,
    latestMonth: latest.month,
    latestRegulatorScore: numberFrom(latest.regulator_satisfaction_score_of_5),
    latestCloseDays: numberFrom(latest.avg_days_to_close),
    latestFcrRate: numberFrom(latest.first_contact_resolution_rate),
  };
};

const summarize = (rows: ComplaintRow[]): DashboardData => {
  const closedRows = rows.filter((row) => !isOpen(row));
  return {
    total: rows.length,
    openCount: rows.filter(isOpen).length,
    averageSla: averageFor(rows, "sla_days"),
    averageClose: averageFor(closedRows, "days_to_close"),
    slaBreachCount: rows.filter((row) => numberFrom(row.sla_breach) === 1).length,
    transferCount: rows.filter((row) => numberFrom(row.transferred_between_systems) === 1).length,
    reopenedCount: rows.filter((row) => numberFrom(row.reopened) === 1).length,
    informationOnlyCount: rows.filter((row) => numberFrom(row.resolvable_by_information_only) === 1).length,
    correctionTotal: rows.reduce((total, row) => total + (numberFrom(row.bill_correction_value) ?? 0), 0),
    categories: breakdown(rows, "category"),
    regions: breakdown(rows, "region"),
    systems: breakdown(rows, "source_system"),
    channels: breakdown(rows, "channel"),
    priorities: breakdown(rows, "priority"),
    actions: breakdown(rows, "resolution_action"),
  };
};

const countFormat = new Intl.NumberFormat("en-CA");
const percentageOfTotal = (count: number, total: number) => `${((count / total) * 100).toFixed(1)}%`;
const moneyFormat = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 2,
});

function MetricCard({
  label,
  value,
  valueAside,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  valueAside?: string;
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
      {valueAside ? (
        <div className="metric-value-line">
          <strong className="metric-value">{value}</strong>
          <span className="metric-value-aside">{valueAside}</span>
        </div>
      ) : <strong className="metric-value">{value}</strong>}
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

function MonthlyLineChart({
  rows,
  title,
  eyebrow,
  field,
  yAxisTitle,
  formatValue,
  axisMax,
  formatAxisValue,
}: {
  rows: MonthlyKpiRow[];
  title: string;
  eyebrow: string;
  field: string;
  yAxisTitle: string;
  formatValue: (value: number) => string;
  axisMax?: number;
  formatAxisValue?: (value: number) => string;
}) {
  const width = 640;
  const height = 250;
  const padding = { top: 18, right: 20, bottom: 42, left: 48 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const values = rows.map((row) => numberFrom(row[field]) ?? 0);
  const yMax = axisMax ?? Math.max(Math.ceil(Math.max(...values, 1) / 5) * 5, 5);
  const xFor = (index: number) => padding.left + (rows.length > 1 ? (index / (rows.length - 1)) * plotWidth : plotWidth / 2);
  const yFor = (value: number) => padding.top + plotHeight - (value / yMax) * plotHeight;
  const points = values.map((value, index) => `${xFor(index)},${yFor(value)}`).join(" ");
  const labelStep = Math.max(1, Math.ceil(rows.length / 8));

  return (
    <section className="panel close-time-chart-panel">
      <div className="panel-heading">
        <div className="panel-title-wrap">
          <span className="panel-icon"><TrendingUp size={17} strokeWidth={1.8} /></span>
          <div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div>
        </div>
        <span className="unit-label">{yAxisTitle.toUpperCase()}</span>
      </div>
      <div className="close-time-chart-wrap">
        <svg className="close-time-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title} by month`}>
          {Array.from({ length: 5 }, (_, index) => {
            const value = (yMax / 4) * index;
            const y = yFor(value);
            return (
              <g key={value}>
                <line className="chart-grid-line" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
                <text className="chart-axis-label" x={padding.left - 9} y={y + 3} textAnchor="end">{formatAxisValue ? formatAxisValue(value) : value.toFixed(0)}</text>
              </g>
            );
          })}
          <line className="chart-axis-line" x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} />
          <line className="chart-axis-line" x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} />
          <polyline className="close-time-line" points={points} />
          {values.map((value, index) => (
            <g key={rows[index].month}>
              <circle className="close-time-point" cx={xFor(index)} cy={yFor(value)} r="4">
                <title>{`${rows[index].month}: ${formatValue(value)} ${yAxisTitle}`}</title>
              </circle>
              {index % labelStep === 0 && <text className="chart-month-label" x={xFor(index)} y={height - padding.bottom + 19} textAnchor="middle">{rows[index].month}</text>}
            </g>
          ))}
          <text className="chart-axis-title" x="13" y={padding.top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 13 ${padding.top + plotHeight / 2})`}>{yAxisTitle}</text>
          <text className="chart-axis-title" x={padding.left + plotWidth / 2} y={height - 4} textAnchor="middle">month</text>
        </svg>
      </div>
    </section>
  );
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const monthlyInputRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyKpiData | null>(null);
  const [fileName, setFileName] = useState("");
  const [monthlyFileName, setMonthlyFileName] = useState("");
  const [error, setError] = useState("");
  const [monthlyError, setMonthlyError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(false);

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

  const handleMonthlyFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMonthlyError("");
    setIsMonthlyLoading(true);
    Papa.parse<MonthlyKpiRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) => header.trim(),
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        const missing = requiredMonthlyHeaders.filter((header) => !headers.includes(header));
        const rows = result.data.filter((row) => row.month?.trim());

        if (result.errors.length) {
          setMonthlyError(`Could not read the KPI CSV cleanly: ${result.errors[0].message}`);
        } else if (missing.length) {
          setMonthlyError(`Missing required KPI columns: ${missing.join(", ")}`);
        } else if (!rows.length) {
          setMonthlyError("No monthly KPI rows were found in this file.");
        } else {
          setMonthlyData(summarizeMonthlyKpis(rows));
          setMonthlyFileName(file.name);
        }
        setIsMonthlyLoading(false);
        event.target.value = "";
      },
      error: (parseError) => {
        setMonthlyError(`Could not open this KPI file: ${parseError.message}`);
        setIsMonthlyLoading(false);
        event.target.value = "";
      },
    });
  };

  const chooseFile = () => inputRef.current?.click();
  const shown = (value: number | null, digits = 1) => value === null ? "—" : value.toFixed(digits);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" aria-label="Northflow overview">
          <span className="brand-mark"><span /></span>
          <span className="brand-copy"><strong>northflow</strong><small>COMPLAINT OPERATIONS</small></span>
        </a>
        <div className="workspace-label">SERVICE OPERATIONS</div>
        <nav className="side-nav" aria-label="Dashboard sections">
          <a className="nav-item is-active" href="#overview"><BarChart3 size={17} />Overview</a>
          <a className="nav-item" href="#breakdowns"><FileSpreadsheet size={17} />Complaint Source</a>
          <a className="nav-item" href="#systems"><Layers3 size={17} />Complaint Handling</a>
          <a className="nav-item" href="#monthly-kpis"><CalendarDays size={17} />Monthly KPIs</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="note-icon"><ShieldAlert size={17} /></span>
            <p><strong>Evidence first</strong><br />No sample totals are shown. Upload a file to calculate metrics.</p>
          </div>
          <div className="profile-row">
            <span className="profile-avatar">NW</span>
            <span><strong>Northwind Utilities</strong><small>Executive view</small></span>
            <span aria-hidden="true">⌄</span>
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
            {data ? <span className="dataset-state">CSV READY</span> : <button className="text-action" onClick={chooseFile}>Select file <ArrowRight size={14} /></button>}
          </section>

          <section className="metric-grid" aria-label="Complaint performance metrics">
            <MetricCard label="Complaints analyzed" value={data ? countFormat.format(data.total) : "—"} detail="Rows in uploaded file" icon={Headset} tone="mint" />
            <MetricCard label="Open complaints" value={data ? countFormat.format(data.openCount) : "—"} valueAside={data ? `${((data.openCount / data.total) * 100).toFixed(1)}%` : undefined} detail="Of complaints analyzed · blank close-days or open status" icon={Clock3} tone="coral" />
            <MetricCard label="Avg. days to close" value={shown(data?.averageClose ?? null)} detail="Closed complaints only" icon={Activity} tone="gold" />
            <MetricCard label="Average SLA target" value={shown(data?.averageSla ?? null)} detail="Days allowed to resolve" icon={Clock3} tone="blue" />
            <MetricCard label="SLA breaches" value={data ? countFormat.format(data.slaBreachCount) : "—"} valueAside={data ? `${((data.slaBreachCount / data.total) * 100).toFixed(1)}%` : undefined} detail="Of complaints analyzed · sla_breach = 1" icon={ShieldAlert} tone="coral" />
            <MetricCard label="Bill correction value" value={data ? moneyFormat.format(data.correctionTotal) : "—"} detail="Recorded value in CSV · CAD" icon={Wallet} tone="green" />
          </section>

          <section className="section-heading" id="breakdowns">
            <div><p className="eyebrow">CASE DISTRIBUTION</p><h2>Where complaints come from</h2></div>
            <span className="section-meta">{data ? `${data.categories.length + data.regions.length + data.systems.length + data.channels.length} dimensions` : "Awaiting data"}</span>
          </section>

          <div className="primary-grid">
            <BreakdownPanel title="By category" eyebrow="COMPLAINT REASONS" items={data?.categories ?? []} icon={BarChart3} emptyText="Category counts appear when a CSV is loaded." />
            <BreakdownPanel title="By region" eyebrow="SERVICE FOOTPRINT" items={data?.regions ?? []} icon={Building2} emptyText="Regional counts appear when a CSV is loaded." />
            <BreakdownPanel title="Source system" eyebrow="ORIGINATING APPLICATION" items={data?.systems ?? []} icon={Layers3} emptyText="System counts appear when a CSV is loaded." />
            <BreakdownPanel title="By channel" eyebrow="CUSTOMER CONTACT" items={data?.channels ?? []} icon={Headset} emptyText="Channel counts appear when a CSV is loaded." />
          </div>

          <section className="section-heading lower-heading" id="systems">
            <div><p className="eyebrow">HANDLING & ROUTING</p><h2>How cases move through the estate</h2></div>
          </section>

          <div className="secondary-grid">
            <BreakdownPanel title="Resolution action" eyebrow="CLOSING OUTCOMES" items={data?.actions ?? []} icon={RotateCcw} emptyText="Resolution counts appear when a CSV is loaded." />
            <section className="panel handling-metrics">
              <div className="panel-heading">
                <div className="panel-title-wrap">
                  <span className="panel-icon"><Layers3 size={17} strokeWidth={1.8} /></span>
                  <div><p className="eyebrow">CASE HANDLING</p><h2>Routing & resolution flags</h2></div>
                </div>
                <span className="unit-label">COMPLAINTS</span>
              </div>
              <div className="handling-metric-list">
                <div className="handling-metric-row">
                  <span className="metric-icon blue"><ArrowRight size={16} /></span>
                  <span className="handling-metric-label">Transferred between systems</span>
                  <strong>{data ? countFormat.format(data.transferCount) : "—"}</strong>
                  {data && <span className="handling-metric-percent">{percentageOfTotal(data.transferCount, data.total)}</span>}
                </div>
                <div className="handling-metric-row">
                  <span className="metric-icon green"><RotateCcw size={16} /></span>
                  <span className="handling-metric-label">Reopened complaints</span>
                  <strong>{data ? countFormat.format(data.reopenedCount) : "—"}</strong>
                  {data && <span className="handling-metric-percent">{percentageOfTotal(data.reopenedCount, data.total)}</span>}
                </div>
                <div className="handling-metric-row">
                  <span className="metric-icon mint"><CircleHelp size={16} /></span>
                  <span className="handling-metric-label">Information-only resolvable</span>
                  <strong>{data ? countFormat.format(data.informationOnlyCount) : "—"}</strong>
                  {data && <span className="handling-metric-percent">{percentageOfTotal(data.informationOnlyCount, data.total)}</span>}
                </div>
              </div>
            </section>
            <BreakdownPanel title="By priority" eyebrow="CASE URGENCY" items={data?.priorities ?? []} icon={ShieldAlert} emptyText="Priority counts appear when a CSV is loaded." />
          </div>

          <footer className="dashboard-footer">
            <span><span className="footer-dot" />Values are calculated from the uploaded file in this browser.</span>
            <span>Bill correction value is the recorded CSV total; payment is not independently verified.</span>
          </footer>

          <section className="monthly-section" id="monthly-kpis">
            <div className="section-heading">
              <div><p className="eyebrow page-eyebrow">PERFORMANCE OVER TIME</p><h2>Monthly KPI performance</h2><p className="page-subtitle">Track demand, productivity, cost to serve and regulator sentiment by month.</p></div>
              <div className="heading-actions">
                <input ref={monthlyInputRef} className="visually-hidden" type="file" accept=".csv,text/csv" onChange={handleMonthlyFile} />
                <button className="upload-button" onClick={() => monthlyInputRef.current?.click()} disabled={isMonthlyLoading}>
                  <Upload size={16} />{isMonthlyLoading ? "Reading KPI file..." : monthlyData ? "Replace KPI CSV" : "Upload monthly KPI CSV"}
                </button>
              </div>
            </div>

            {monthlyError && <div className="error-banner" role="alert"><ShieldAlert size={17} /><span>{monthlyError}</span></div>}
            <section className="dataset-strip" aria-live="polite">
              <span className={`dataset-indicator ${monthlyData ? "loaded" : ""}`} />
              <span>{monthlyData ? <><strong>{monthlyFileName}</strong><span className="dataset-separator">·</span>{monthlyData.rows.length} monthly records loaded</> : "No monthly KPI file loaded"}</span>
              {monthlyData ? <span className="dataset-state">KPI READY</span> : <button className="text-action" onClick={() => monthlyInputRef.current?.click()}>Select file <ArrowRight size={14} /></button>}
            </section>

            <section className="metric-grid monthly-metric-grid" aria-label="Monthly KPI summary">
              <MetricCard label="Latest regulator score" value={monthlyData ? `${monthlyData.latestRegulatorScore?.toFixed(1) ?? "—"}/5` : "—"} detail={monthlyData ? `Latest month · ${monthlyData.latestMonth}` : "Latest loaded month"} icon={ShieldAlert} tone="coral" />
              <MetricCard label="Latest cost to serve" value={monthlyData ? moneyFormat.format(numberFrom(monthlyData.rows[monthlyData.rows.length - 1].cost_to_serve_per_account) ?? 0) : "—"} detail="Per account · CAD" icon={Wallet} tone="green" />
            </section>

            {monthlyData ? (
              <>
                <div className="monthly-chart-grid monthly-trend-grid">
                  <MonthlyLineChart rows={monthlyData.rows} title="Cost to serve per account" eyebrow="COST PRESSURE" field="cost_to_serve_per_account" yAxisTitle="CAD/account" formatValue={(value) => moneyFormat.format(value)} />
                  <MonthlyLineChart rows={monthlyData.rows} title="Regulator satisfaction" eyebrow="REGULATORY SIGNAL" field="regulator_satisfaction_score_of_5" yAxisTitle="score / 5" axisMax={5} formatValue={(value) => value.toFixed(1)} formatAxisValue={(value) => value.toFixed(1)} />
                  <MonthlyLineChart rows={monthlyData.rows} title="Average time to close" eyebrow="RESOLUTION SPEED" field="avg_days_to_close" yAxisTitle="days" formatValue={(value) => value.toFixed(1)} />
                  <MonthlyLineChart rows={monthlyData.rows} title="First-contact resolution" eyebrow="CUSTOMER OUTCOME" field="first_contact_resolution_rate" yAxisTitle="%" axisMax={1} formatValue={(value) => `${(value * 100).toFixed(0)}%`} formatAxisValue={(value) => `${(value * 100).toFixed(0)}%`} />
                </div>
              </>
            ) : <div className="chart-empty monthly-empty">Upload `northwind_monthly_kpis.csv` to see monthly volume and performance trends.</div>}
          </section>
        </div>
      </main>
    </div>
  );
}
