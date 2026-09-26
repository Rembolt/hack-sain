import {
  BarChart,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  LineChart,
  PieChart,
  Pill,
  Row,
  Stack,
  Stat,
  Table,
  Text,
  computeDAGLayout,
  useHostTheme,
  useState,
} from "cursor/canvas";

const MONTHS = [
  "Oct 24", "Nov 24", "Dec 24", "Jan 25", "Feb 25", "Mar 25", "Apr 25", "May 25", "Jun 25", "Jul 25", "Aug 25", "Sep 25",
  "Oct 25", "Nov 25", "Dec 25", "Jan 26", "Feb 26", "Mar 26", "Apr 26", "May 26", "Jun 26", "Jul 26", "Aug 26", "Sep 26",
];

const KPI = {
  opened: [912, 830, 951, 985, 851, 901, 1023, 1004, 982, 1222, 1026, 1020, 1189, 940, 1120, 1177, 1002, 1171, 1190, 1049, 1164, 1271, 1185, 1251],
  closed: [476, 760, 873, 927, 840, 901, 952, 942, 965, 1062, 1089, 1000, 1029, 1067, 1019, 1025, 1000, 1117, 1109, 1146, 1063, 1163, 1130, 1162],
  backlog: [436, 506, 584, 642, 653, 653, 724, 786, 803, 963, 900, 920, 1080, 953, 1054, 1206, 1208, 1262, 1343, 1246, 1347, 1455, 1510, 1599],
  days: [9.1, 16.5, 18.4, 19.5, 20.1, 21.4, 22.0, 23.2, 23.1, 24.9, 26.6, 28.6, 27.6, 29.8, 29.6, 31.0, 33.6, 32.8, 33.3, 34.6, 35.9, 35.7, 37.4, 38.2],
  fcr: [62.0, 61.1, 60.2, 59.3, 58.4, 57.5, 56.6, 55.7, 54.8, 53.9, 53.0, 52.1, 51.2, 50.3, 49.4, 48.5, 47.6, 46.7, 45.8, 44.9, 44.0, 43.1, 42.2, 41.3],
  score: [4.3, 4.22, 4.15, 4.08, 4.0, 3.92, 3.85, 3.77, 3.7, 3.62, 3.55, 3.47, 3.4, 3.32, 3.25, 3.17, 3.1, 3.02, 2.95, 2.88, 2.8, 2.72, 2.65, 2.58],
  calls: [42571, 43098, 41856, 42840, 41820, 42227, 44644, 43396, 45387, 50662, 47010, 47136, 49033, 48295, 48825, 50977, 48137, 51169, 50476, 52245, 53421, 53113, 55014, 57060],
  breach: [44.0, 49.9, 51.1, 55.0, 58.5, 61.2, 60.9, 65.1, 67.1, 72.3, 76.6, 76.8, 80.3, 82.8, 83.8, 85.8, 88.9, 88.8, 91.2, 92.2, 92.7, 93.9, 94.6, 94.2],
};

const EST_READ: Record<string, number[]> = {
  Ashford: [21.1, 23.8, 20.7, 14.6, 16.7, 22.2, 15.6, 24.0, 24.8, 21.7, 12.8, 18.5, 20.0, 18.3, 20.7, 19.4, 19.8, 27.6, 16.9, 15.8, 22.6, 19.0, 22.5, 25.0],
  Calderfield: [17.9, 16.6, 24.5, 23.5, 28.6, 21.3, 28.9, 26.0, 25.2, 20.8, 22.7, 32.1, 20.4, 29.4, 21.8, 28.1, 21.0, 23.3, 21.3, 25.5, 29.1, 19.8, 22.2, 21.4],
  Eastmarch: [20.9, 15.7, 21.8, 16.0, 20.2, 14.4, 19.7, 16.0, 16.5, 18.4, 15.7, 20.8, 12.3, 19.4, 9.6, 19.1, 16.3, 20.6, 12.5, 14.6, 18.3, 16.2, 15.1, 18.0],
  Fenwick: [25.5, 29.2, 28.9, 25.1, 22.7, 26.1, 27.7, 23.4, 24.4, 21.9, 26.3, 28.6, 26.4, 30.0, 25.1, 26.4, 25.6, 23.3, 27.8, 22.1, 29.8, 27.4, 23.5, 26.2],
  Barrowdale: [64.8, 63.6, 61.8, 61.5, 63.7, 64.6, 66.3, 65.7, 72.2, 66.2, 58.9, 69.9, 62.9, 57.7, 63.9, 67.3, 61.9, 65.1, 60.8, 63.7, 64.7, 66.0, 63.2, 62.0],
  Dunmoor: [55.8, 62.3, 60.2, 58.0, 56.7, 63.4, 56.1, 61.1, 59.3, 58.8, 55.1, 56.1, 63.9, 55.6, 55.2, 62.9, 53.3, 62.6, 58.7, 59.9, 59.4, 60.0, 53.4, 61.5],
};
const SMART_PEN = MONTHS.map((_, i) => Math.round((30 + 2.2 * i) * 10) / 10);
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const SMART_REGION_EST = MONTHS.map((_, i) =>
  Math.round(avg(["Ashford", "Calderfield", "Eastmarch", "Fenwick"].map((r) => EST_READ[r][i])) * 10) / 10,
);
const LEGACY_EST = MONTHS.map((_, i) => Math.round(avg([EST_READ.Barrowdale[i], EST_READ.Dunmoor[i]]) * 10) / 10);

const REGIONS = ["Ashford", "Barrowdale", "Calderfield", "Dunmoor", "Eastmarch", "Fenwick"];
const REGION_STATS = {
  accountsK: [412, 298, 355, 221, 304, 210],
  estRead: [20.2, 64.1, 23.8, 58.7, 17.0, 26.0],
  smartPen: [55.3, 0, 55.3, 0, 55.3, 55.3],
  excPer1k: [8.3, 26.3, 9.8, 24.1, 7.0, 10.7],
  meterComplaintsPer10k: [12.7, 31.5, 15.2, 40.7, 17.9, 25.3],
  exceptions: [81799, 187944, 83154, 127675, 50866, 53661],
};

const CATEGORIES = [
  { label: "Billing - disputed amount", value: 8060 },
  { label: "Billing - estimated read", value: 4833 },
  { label: "Metering - no read taken", value: 3120 },
  { label: "Supply - interruption", value: 2192 },
  { label: "Service - poor communication", value: 1908 },
  { label: "Service - missed appointment", value: 1718 },
  { label: "Payment - plan or arrears", value: 1601 },
  { label: "Water - pressure or quality", value: 1313 },
  { label: "Other", value: 671 },
];

const TRANSFER_BY_CAT = {
  cats: ["Disputed amount", "Estimated read", "No read taken", "Supply", "Poor comms", "Missed appt", "Payment", "Water", "Other"],
  notTransferred: [25.5, 25.2, 19.9, 20.3, 20.4, 20.9, 20.7, 21.0, 20.6],
  transferred: [42.0, 42.5, 34.3, 33.8, 35.1, 33.3, 35.3, 34.8, 33.9],
};

const PILOT = {
  months: ["Jan 25", "Feb 25", "Mar 25", "Apr 25", "May 25", "Jun 25", "Jul 25", "Aug 25", "Sep 25"],
  sessions: [14775, 13685, 15773, 18069, 18791, 18766, 20133, 19890, 20780],
  contained: [16.0, 15.3, 14.6, 13.9, 13.2, 12.5, 11.8, 11.1, 10.4],
  escalated: [77.0, 77.7, 78.4, 79.1, 79.8, 80.5, 81.2, 81.9, 82.6],
  repeat: [31.0, 32.7, 34.4, 36.1, 37.8, 39.5, 41.2, 42.9, 44.6],
  complaintAfter: [11.0, 11.4, 11.8, 12.2, 12.6, 13.0, 13.4, 13.8, 14.2],
  csat: [2.6, 2.53, 2.46, 2.39, 2.32, 2.25, 2.18, 2.11, 2.04],
};

type NodeKind = "cause" | "mechanism" | "symptom";
const CAUSAL_NODES: { id: string; kind: NodeKind; title: string; detail: string }[] = [
  { id: "legacy", kind: "cause", title: "1998 billing stack, no smart meters", detail: "Barrowdale + Dunmoor on Aurora + MeterHub" },
  { id: "smart", kind: "cause", title: "Smart reads not reaching bills", detail: "Coverage 30% → 81%, est. reads flat ~21%" },
  { id: "algo", kind: "cause", title: "Estimation logic frozen since 2012", detail: "No feedback loop from corrected bills" },
  { id: "est", kind: "mechanism", title: "Estimated reads", detail: "61% legacy regions vs 21% elsewhere" },
  { id: "exc", kind: "mechanism", title: "Billing exceptions", detail: "4.1% of estimated accounts, every month" },
  { id: "bill", kind: "symptom", title: "Billing & metering complaints", detail: "63% of all complaint volume" },
  { id: "handoff", kind: "cause", title: "Hand-offs lose case history", detail: "35% of cases transferred; 0% from CaseTrack" },
  { id: "screens", kind: "cause", title: "4 screens, no bill breakdown", detail: "Agents & AI can't see the bill" },
  { id: "slow", kind: "mechanism", title: "Slow, repeated resolution", detail: "38 vs 23 days; reopen 27% vs 8%" },
  { id: "fcr", kind: "mechanism", title: "First-contact resolution falls", detail: "62% → 41%; calls +34%" },
  { id: "backlog", kind: "symptom", title: "Backlog & SLA breach", detail: "1,599 open; 77% breach" },
  { id: "reg", kind: "symptom", title: "Regulator score 4.3 → 2.6", detail: "Penalty exposure $2.4M / quarter" },
];
const CAUSAL_EDGES = [
  { from: "legacy", to: "est" },
  { from: "smart", to: "est" },
  { from: "algo", to: "est" },
  { from: "est", to: "exc" },
  { from: "exc", to: "bill" },
  { from: "bill", to: "backlog" },
  { from: "bill", to: "fcr" },
  { from: "handoff", to: "slow" },
  { from: "slow", to: "backlog" },
  { from: "slow", to: "fcr" },
  { from: "screens", to: "fcr" },
  { from: "fcr", to: "reg" },
  { from: "backlog", to: "reg" },
];

function CausalDiagram() {
  const t = useHostTheme();
  const W = 190;
  const H = 58;
  const layout = computeDAGLayout({
    nodes: CAUSAL_NODES.map((n) => ({ id: n.id })),
    edges: CAUSAL_EDGES,
    direction: "vertical",
    nodeWidth: W,
    nodeHeight: H,
    rankGap: 44,
    nodeGap: 20,
    padding: 12,
  });
  const byId = Object.fromEntries(CAUSAL_NODES.map((n) => [n.id, n]));
  const kindLabel: Record<NodeKind, string> = { cause: "ROOT CAUSE", mechanism: "MECHANISM", symptom: "SYMPTOM" };
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ position: "relative", width: layout.width, height: layout.height, margin: "0 auto" }}>
        <svg width={layout.width} height={layout.height} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={t.stroke.primary} />
            </marker>
          </defs>
          {layout.edges.map((e, i) => {
            const my = (e.sourceY + e.targetY) / 2;
            return (
              <path
                key={i}
                d={`M${e.sourceX},${e.sourceY} C${e.sourceX},${my} ${e.targetX},${my} ${e.targetX},${e.targetY}`}
                fill="none"
                stroke={t.stroke.primary}
                strokeWidth={1.2}
                markerEnd="url(#arrow)"
              />
            );
          })}
        </svg>
        {layout.nodes.map((n) => {
          const node = byId[n.id];
          const isCause = node.kind === "cause";
          const isSymptom = node.kind === "symptom";
          return (
            <div
              key={n.id}
              style={{
                position: "absolute",
                left: n.x,
                top: n.y,
                width: W,
                height: H,
                boxSizing: "border-box",
                padding: "6px 8px",
                borderRadius: 6,
                background: isSymptom ? t.fill.secondary : t.bg.editor,
                border: `1px solid ${isCause ? t.accent.primary : t.stroke.secondary}`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 1,
              }}
            >
              <span style={{ fontSize: 9, letterSpacing: 0.6, color: isCause ? t.accent.primary : t.text.tertiary }}>
                {kindLabel[node.kind]}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600, color: t.text.primary, lineHeight: "15px" }}>{node.title}</span>
              <span style={{ fontSize: 11, color: t.text.secondary, lineHeight: "14px" }}>{node.detail}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Caption({ children }: { children: string }) {
  return (
    <Text size="small" tone="tertiary">
      {children}
    </Text>
  );
}

const VALUE_POOLS = [
  { pool: "Regulator enhanced-monitoring penalty", annual: 9.6, basis: "$2.4M per quarter in breach × 4 quarters", confidence: "Exposure, not yet incurred" },
  { pool: "Billing exceptions worked manually (all regions)", annual: 9.9, basis: "292.5k exceptions / yr × $34 manual correction", confidence: "Upper bound: assumes every exception is a manual correction" },
  { pool: "Cost-to-serve increase since Oct 2024", annual: 9.3, basis: "($23.92 − $18.73) × 1.8M accounts", confidence: "Umbrella figure, overlaps other rows" },
  { pool: "Legacy billing + metering stack run cost", annual: 5.8, basis: "Aurora $4.1M + MeterHub $1.7M, serving 29% of accounts", confidence: "From systems file" },
  { pool: "Excess exceptions in legacy regions only", annual: 3.5, basis: "103k / yr above smart-region rate × $34", confidence: "Same $34 assumption" },
  { pool: "SmartRead Gateway with no measurable read benefit", annual: 2.6, basis: "Run cost; est. read rate flat while coverage rose 51 pts", confidence: "From systems + meter files" },
  { pool: "Repeat calls from falling first-contact resolution", annual: 1.5, basis: "(33.5k − 16.2k) unresolved calls / mo × $7.40 × 12", confidence: "Assumes unresolved first calls generate one repeat call" },
  { pool: "Complaint handling (all complaints)", annual: 1.1, basis: "16.5k × $68 + 8.9k × $121, over 2 years ÷ 2", confidence: "From unit costs" },
  { pool: "Bill-correction value returned to customers", annual: 0.67, basis: "$1.35M in corrections over 2 years ÷ 2", confidence: "From complaints file" },
  { pool: "AskNorthwind pilot contract", annual: 0.64, basis: "Vendor contract; $23 per contained session vs $7.40 per call", confidence: "From unit costs" },
  { pool: "Transfer premium on complaints", annual: 0.24, basis: "8,870 transferred × ($121 − $68), ÷ 2 years", confidence: "From unit costs" },
];

export default function NorthwindDiagnosis() {
  const t = useHostTheme();
  const [trendView, setTrendView] = useState<"reg" | "flow" | "calls">("reg");

  return (
    <Stack gap={28} style={{ padding: 24, maxWidth: 1180, margin: "0 auto" }}>
      <Stack gap={8}>
        <Text size="small" tone="tertiary">
          CGI consulting team · Northwind Utilities · Root-cause diagnosis (no solutions yet)
        </Text>
        <H1>Northwind has a billing-data problem that shows up as a complaints problem</H1>
        <Text tone="secondary">
          63% of complaints are about bills and meter reads. Most of that volume comes from estimated reads,
          which are concentrated in the two regions still on the 1998 billing stack. Estimated reads have also
          stayed flat in the regions where smart meters were rolled out. Cases then take longer to resolve
          because hand-offs between systems strip out the case history. An AI tool for triage and responses
          works on the queue, not on what fills it.
        </Text>
      </Stack>

      <Grid columns={6} gap={12}>
        <Stat value="1,599" label="Open complaints (Sep 26)" tone="danger" />
        <Stat value="38.2 d" label="Avg days to close (was 9.1)" tone="danger" />
        <Stat value="76.8%" label="Complaints breaching SLA" tone="danger" />
        <Stat value="2.58" label="Regulator score (was 4.30)" tone="warning" />
        <Stat value="41.3%" label="First-contact resolution (was 62%)" tone="warning" />
        <Stat value="63%" label="Complaints that are billing / metering" />
      </Grid>

      <Divider />

      <Stack gap={12}>
        <H2>How the causes connect</H2>
        <Text tone="secondary">
          Connecting the meter-read file with the complaints file and the systems notes. Boxes outlined in accent
          colour are root causes; shaded boxes are the symptoms the board and regulator can see.
        </Text>
        <CausalDiagram />
        <Caption>Sources: all six Northwind CSVs, Oct 2024 – Sep 2026. Every figure in a box is derived in the sections below.</Caption>
      </Stack>

      <Divider />

      <Stack gap={12}>
        <Row justify="space-between" align="center">
          <H2>Symptoms: a steady, linear decline</H2>
          <Row gap={6}>
            <Pill active={trendView === "reg"} onClick={() => setTrendView("reg")}>Regulator vs FCR</Pill>
            <Pill active={trendView === "flow"} onClick={() => setTrendView("flow")}>Intake vs closures</Pill>
            <Pill active={trendView === "calls"} onClick={() => setTrendView("calls")}>Calls & SLA breach</Pill>
          </Row>
        </Row>
        {trendView === "reg" && (
          <Grid columns={2} gap={20}>
            <Stack gap={6}>
              <H3>Regulator satisfaction score (out of 5)</H3>
              <LineChart
                categories={MONTHS}
                series={[{ name: "Regulator score", data: KPI.score, tone: "danger" }]}
                beginAtZero={false}
                yMin={2}
                yMax={4.5}
                referenceLines={[{ value: 4.0, label: "Board target 4.0", tone: "success" }]}
                height={220}
              />
              <Caption>Source: northwind_monthly_kpis.csv · x: month · y: score out of 5</Caption>
            </Stack>
            <Stack gap={6}>
              <H3>First-contact resolution rate (%)</H3>
              <LineChart
                categories={MONTHS}
                series={[{ name: "First-contact resolution", data: KPI.fcr, tone: "warning" }]}
                valueSuffix="%"
                beginAtZero={false}
                yMin={35}
                yMax={65}
                referenceLines={[{ value: 58.4, label: "FCR implied by score 4.0", tone: "success" }]}
                height={220}
              />
              <Caption>Source: northwind_monthly_kpis.csv · x: month · y: % of contacts resolved first time</Caption>
            </Stack>
          </Grid>
        )}
        {trendView === "flow" && (
          <Grid columns={2} gap={20}>
            <Stack gap={6}>
              <H3>Complaints opened vs closed per month</H3>
              <LineChart
                categories={MONTHS}
                series={[
                  { name: "Opened", data: KPI.opened, tone: "danger" },
                  { name: "Closed", data: KPI.closed, tone: "info" },
                ]}
                beginAtZero={false}
                height={220}
              />
              <Caption>Source: northwind_monthly_kpis.csv · x: month · y: complaints</Caption>
            </Stack>
            <Stack gap={6}>
              <H3>Cumulative open backlog (complaints)</H3>
              <BarChart
                categories={MONTHS}
                series={[{ name: "Open backlog", data: KPI.backlog, tone: "danger" }]}
                height={220}
                showValues={false}
              />
              <Caption>Derived: running sum of (opened − closed) · reconciles exactly to 1,599 open cases in complaints file</Caption>
            </Stack>
          </Grid>
        )}
        {trendView === "calls" && (
          <Grid columns={2} gap={20}>
            <Stack gap={6}>
              <H3>Inbound calls per month</H3>
              <LineChart
                categories={MONTHS}
                series={[{ name: "Inbound calls", data: KPI.calls, tone: "info" }]}
                beginAtZero={false}
                height={220}
              />
              <Caption>Source: northwind_monthly_kpis.csv · x: month · y: calls</Caption>
            </Stack>
            <Stack gap={6}>
              <H3>SLA breach rate by month opened (%)</H3>
              <LineChart
                categories={MONTHS}
                series={[{ name: "SLA breach rate", data: KPI.breach, tone: "danger" }]}
                valueSuffix="%"
                height={220}
              />
              <Caption>Source: northwind_complaints.csv · x: month opened · y: % of complaints breaching SLA</Caption>
            </Stack>
          </Grid>
        )}
        <Grid columns={3} gap={16}>
          <Callout tone="neutral" title="The regulator score tracks FCR exactly">
            Score = 8.33 × FCR − 0.86 (r = 1.00). Getting back to 4.0 requires first-contact resolution of 58.4%,
            the level Northwind last had in Feb 2025. That is 17 points above today's rate.
          </Callout>
          <Callout tone="neutral" title="The backlog is small, but it keeps growing">
            On average, intake has exceeded closures by 67 complaints per month for two years. Closures grew 35%
            but intake grew 38%. Waiting time rises because the queue gets longer, not because each case takes
            more work.
          </Callout>
          <Callout tone="neutral" title="Calls rose 34%; unresolved calls doubled">
            Calls not resolved first time went from 16.2k to 33.5k per month. Much of the extra call volume is
            failure demand: customers calling back about the same problem.
          </Callout>
        </Grid>
      </Stack>

      <Divider />

      <Stack gap={12}>
        <H2>What the complaints are actually about</H2>
        <Grid columns="1fr 1fr" gap={24}>
          <Stack gap={6}>
            <H3>Complaints by category (25,416 over 24 months)</H3>
            <PieChart data={CATEGORIES} size={220} donut />
            <Caption>Source: northwind_complaints.csv · Oct 2024 – Sep 2026</Caption>
          </Stack>
          <Stack gap={6}>
            <H3>Complaints grouped by root-cause family</H3>
            <PieChart
              data={[
                { label: "Meter & billing data (disputed, estimated, no read)", value: 16013, tone: "danger" },
                { label: "Service process (comms, missed appointments)", value: 3626 },
                { label: "Field & network (supply, water)", value: 3505 },
                { label: "Payment plans & arrears", value: 1601 },
                { label: "Other", value: 671, tone: "neutral" },
              ]}
              size={220}
              donut
            />
            <Caption>Grouping by CGI team; counts from northwind_complaints.csv</Caption>
          </Stack>
        </Grid>
        <Text tone="secondary">
          The three billing and metering categories account for 63% of volume and 69% of today's open backlog
          (1,095 of 1,599 cases). The two billing categories are the slowest (31 days on average against 25 for
          everything else) and have the highest breach rates (81–83%). Between them, these three categories
          account for every bill correction, every refund and every meter visit.
        </Text>
      </Stack>

      <Divider />

      <Stack gap={12}>
        <H2>The hidden link: meter reads drive the billing complaints</H2>
        <Text tone="secondary">
          The complaints file and the meter-read file only make sense together. Billing exceptions are exactly
          4.1% of estimated-read accounts in every region, every month, so estimated reads mechanically produce
          billing exceptions. The regions still running Aurora Billing and MeterHub have three times the
          estimated-read rate of the other regions.
        </Text>
        <Grid columns={2} gap={20}>
          <Stack gap={6}>
            <H3>Estimated-read rate by region (24-month average, %)</H3>
            <BarChart
              categories={REGIONS}
              series={[{ name: "Estimated-read rate", data: REGION_STATS.estRead }]}
              valueSuffix="%"
              height={220}
            />
            <Caption>Source: northwind_meter_reads.csv · Barrowdale & Dunmoor = SYS-01/SYS-06, 0% smart meters</Caption>
          </Stack>
          <Stack gap={6}>
            <H3>Meter-driven complaints per 10k accounts per year</H3>
            <BarChart
              categories={REGIONS}
              series={[{ name: "Estimated-read + no-read complaints", data: REGION_STATS.meterComplaintsPer10k }]}
              height={220}
            />
            <Caption>Complaints file joined to meter-read accounts · correlation with estimated-read rate across regions r = 0.88</Caption>
          </Stack>
          <Stack gap={6}>
            <H3>Share of billing exceptions by region (585k over 24 months)</H3>
            <PieChart
              data={REGIONS.map((r, i) => ({
                label: r,
                value: REGION_STATS.exceptions[i],
                tone: r === "Barrowdale" || r === "Dunmoor" ? "danger" : undefined,
              }))}
              size={200}
            />
            <Caption>Source: northwind_meter_reads.csv · Barrowdale + Dunmoor produce 54% of exceptions with 29% of accounts</Caption>
          </Stack>
          <Stack gap={6}>
            <H3>Smart-meter coverage vs estimated-read rate, smart regions (%)</H3>
            <LineChart
              categories={MONTHS}
              series={[
                { name: "Smart-meter penetration", data: SMART_PEN, tone: "success" },
                { name: "Estimated-read rate (avg of 4 smart regions)", data: SMART_REGION_EST, tone: "danger" },
                { name: "Estimated-read rate (Barrowdale + Dunmoor)", data: LEGACY_EST, tone: "neutral" },
              ]}
              valueSuffix="%"
              height={220}
            />
            <Caption>Source: northwind_meter_reads.csv · x: month · y: % of accounts</Caption>
          </Stack>
        </Grid>
        <Callout tone="warning" title="Smart meters are being installed, but they are not changing the bills">
          In Ashford, Calderfield, Eastmarch and Fenwick, smart-meter coverage rose from 30% to 81%, yet the
          estimated-read rate stayed at about 21% (month-by-month correlation between −0.27 and +0.13). Either
          smart reads are not reaching the bill, since Helix CIS still takes nightly batch files, or MeterHub's
          2012 estimation logic overrides them. SmartRead Gateway costs $2.6M a year to run and shows no
          measurable effect on estimated reads. Ask the COO to confirm which it is.
        </Callout>
      </Stack>

      <Divider />

      <Stack gap={12}>
        <H2>Why resolution is slow: hand-offs, not triage</H2>
        <Grid columns="3fr 2fr" gap={20}>
          <Stack gap={6}>
            <H3>Average days to close, transferred vs not, by category</H3>
            <BarChart
              categories={TRANSFER_BY_CAT.cats}
              series={[
                { name: "Not transferred", data: TRANSFER_BY_CAT.notTransferred, tone: "info" },
                { name: "Transferred between systems", data: TRANSFER_BY_CAT.transferred, tone: "danger" },
              ]}
              valueSuffix=" d"
              height={240}
            />
            <Caption>Source: northwind_complaints.csv · closed cases · y: days to close</Caption>
          </Stack>
          <Stack gap={10}>
            <Table
              headers={["Metric", "Not transferred", "Transferred"]}
              rows={[
                ["Cases", "16,546", "8,870"],
                ["Avg days to close", "23.0", "38.2"],
                ["SLA breach", "70.4%", "88.7%"],
                ["Reopened", "8.4%", "26.9%"],
                ["Unit cost", "$68", "$121"],
              ]}
              columnAlign={["left", "right", "right"]}
              rowTone={[undefined, undefined, "danger", "danger", "warning"]}
            />
            <Text size="small" tone="secondary">
              The gap holds within every category, so it is not explained by case mix. Cases opened directly in
              CaseTrack (SYS-04) are never transferred. Cases entering through Aurora, Northwind Connect or the
              CallCentre CRM are transferred 46% of the time, and according to the systems file,
              "transferred cases lose their history".
            </Text>
          </Stack>
        </Grid>
        <Grid columns={2} gap={20}>
          <Stack gap={6}>
            <H3>SLA breach rate by priority, by quarter opened (%)</H3>
            <LineChart
              categories={["Q4 24", "Q1 25", "Q2 25", "Q3 25", "Q4 25", "Q1 26", "Q2 26", "Q3 26"]}
              series={[
                { name: "P1 (5-day SLA)", data: [48.6, 51.8, 56.1, 69.1, 75.4, 81.3, 90.3, 89.1] },
                { name: "P2 (10-day SLA)", data: [46.6, 58.1, 64.6, 73.6, 80.8, 86.8, 92.0, 93.2] },
                { name: "P3 (20-day SLA)", data: [48.8, 58.7, 65.0, 76.0, 83.3, 88.6, 92.1, 95.1] },
              ]}
              valueSuffix="%"
              height={220}
            />
            <Caption>Source: northwind_complaints.csv · x: quarter opened · y: % breaching SLA</Caption>
          </Stack>
          <Stack gap={10} style={{ justifyContent: "center" }}>
            <Callout tone="info" title="Priority triage is not the bottleneck">
              P1, P2 and P3 cases breach at almost the same rate (89–95%) and have deteriorated in step. Cases
              are already sorted by priority; they breach because every queue is slow. Automating triage would
              re-sort cases that are already sorted.
            </Callout>
            <Text size="small" tone="secondary">
              The transfer rate has stayed at about 35% for all 24 months, so hand-offs are a constant drag
              rather than the cause of the trend. The trend comes from intake exceeding capacity, combined with
              falling first-contact resolution.
            </Text>
          </Stack>
        </Grid>
      </Stack>

      <Divider />

      <Stack gap={12}>
        <H2>Testing the brief: what an AI triage and response tool could reach</H2>
        <Grid columns="1fr 2fr" gap={24}>
          <Stack gap={6}>
            <H3>How closed complaints were resolved (23,817)</H3>
            <PieChart
              data={[
                { label: "Information only / explained", value: 5865, tone: "info" },
                { label: "Bill corrected & re-issued", value: 6089, tone: "danger" },
                { label: "Meter visit required", value: 4055 },
                { label: "Field repair required", value: 2074 },
                { label: "Refund or credit", value: 1785 },
                { label: "Payment plan amended", value: 1122 },
                { label: "Appointment rebooked", value: 1087 },
                { label: "Apology & manual fix", value: 976 },
                { label: "Compensation paid", value: 764 },
              ]}
              size={200}
              donut
            />
            <Caption>Source: northwind_complaints.csv · resolution_action</Caption>
          </Stack>
          <Stack gap={10}>
            <Text tone="secondary">
              Only 24.6% of closed complaints could have been resolved with information alone. That is the most
              an automated response tool could handle. The other 75% needed a physical or financial action: a
              corrected bill, a meter visit, a refund or a field repair. None of those can be done by answering the
              customer faster.
            </Text>
            <H3>The 2025 AskNorthwind pilot got worse every month</H3>
            <Grid columns={2} gap={16}>
              <Stack gap={4}>
                <LineChart
                  categories={PILOT.months}
                  series={[
                    { name: "Escalated to agent", data: PILOT.escalated, tone: "danger" },
                    { name: "Repeat contact in 7 days", data: PILOT.repeat, tone: "warning" },
                    { name: "Fully contained", data: PILOT.contained, tone: "success" },
                    { name: "Complaint raised after session", data: PILOT.complaintAfter, tone: "neutral" },
                  ]}
                  valueSuffix="%"
                  height={200}
                />
                <Caption>Source: northwind_ai_pilot_2025.csv · y: % of sessions</Caption>
              </Stack>
              <Stack gap={4}>
                <LineChart
                  categories={PILOT.months}
                  series={[{ name: "Assistant CSAT", data: PILOT.csat, tone: "danger" }]}
                  beginAtZero={false}
                  yMin={1.5}
                  yMax={3}
                  height={200}
                />
                <Caption>Source: northwind_ai_pilot_2025.csv · y: CSAT out of 5</Caption>
              </Stack>
            </Grid>
            <Table
              headers={["Pilot, Jan–Sep 2025", "Value"]}
              rows={[
                ["Sessions", "160,662"],
                ["Fully contained", "20,843 (13%)"],
                ["Escalated to a human agent", "128,573 (80%)"],
                ["Cost per contained session", "$23.03 (vs $7.40 per agent call)"],
                ["Inbound calls, Jan → Sep 2025", "42,840 → 47,136 (+10%)"],
              ]}
              columnAlign={["left", "right"]}
            />
            <Text size="small" tone="secondary">
              The pilot sat on top of the same data it could not see. Northwind Connect cannot show a bill
              breakdown, and account data arrives in nightly batches. So the assistant escalated four out of
              five sessions, repeat contact rose from 31% to 45%, and calls kept rising.
            </Text>
          </Stack>
        </Grid>
      </Stack>

      <Divider />

      <Stack gap={12}>
        <H2>Where the money and reputation are leaking</H2>
        <Text tone="secondary">
          Annual value at stake by cause, using northwind_unit_costs.csv and the systems file. Some rows overlap
          (cost to serve includes the others), so do not add them up. Each basis is shown so a finance director
          can challenge it.
        </Text>
        <BarChart
          categories={VALUE_POOLS.map((v) => v.pool)}
          series={[{ name: "Annual value at stake ($M)", data: VALUE_POOLS.map((v) => v.annual), tone: "danger" }]}
          horizontal
          valuePrefix="$"
          valueSuffix="M"
          showValues
          height={380}
        />
        <Caption>Derived from the Northwind data pack · $M per year · Oct 2024 – Sep 2026 run-rate</Caption>
        <Table
          headers={["Value pool", "$M / yr", "Basis", "Confidence / assumption"]}
          rows={VALUE_POOLS.map((v) => [v.pool, v.annual.toFixed(2), v.basis, v.confidence])}
          columnAlign={["left", "right", "left", "left"]}
          striped
        />
        <Grid columns={2} gap={16}>
          <Card>
            <CardHeader trailing={<Pill size="sm">Biggest money</Pill>}>Estimated reads → billing exceptions</CardHeader>
            <CardBody>
              <Text size="small" tone="secondary">
                Estimated reads produce 585k billing exceptions over two years, which is 23 exceptions for every
                complaint. Each complaint costs $68–$121 to handle, but each exception that needs manual rework
                costs about $34, and there are far more of them. The two legacy regions generate 3× as many
                exceptions per account.
              </Text>
            </CardBody>
          </Card>
          <Card>
            <CardHeader trailing={<Pill size="sm">Biggest reputation</Pill>}>Regulator score & first-contact resolution</CardHeader>
            <CardBody>
              <Text size="small" tone="secondary">
                The score falls 0.075 points per month. At that rate it reaches 2.0 in about 8 months, and every
                quarter in enhanced monitoring costs $2.4M. The score moves one-for-one with first-contact
                resolution, which depends on agents being able to see and correct the bill on the first call.
              </Text>
            </CardBody>
          </Card>
        </Grid>
      </Stack>

      <Divider />

      <Grid columns={2} gap={24}>
        <Stack gap={8}>
          <H2>What the client's brief gets wrong</H2>
          <Table
            headers={["Client assumption", "What the data shows"]}
            rows={[
              ["Complaints need faster triage", "All priorities breach at 89–95%; cases are already triaged correctly"],
              ["AI can automate the response", "Only 24.6% of complaints can be resolved with information alone"],
              ["Clearing the backlog fixes it", "Backlog is 1.3 months of intake; it refills while estimated reads persist"],
              ["The AI pilot needs a better model", "The pilot had no access to bill data: 80% escalated, CSAT 2.0"],
              ["Smart meters are fixing reads", "Estimated reads unchanged in smart regions despite 81% coverage"],
            ]}
            rowTone={["warning", "warning", "warning", "warning", "danger"]}
          />
        </Stack>
        <Stack gap={8}>
          <H2>Caveats & questions for the COO</H2>
          <Text size="small" tone="secondary">
            Complaint counts are almost identical across regions (~4,200 each) regardless of account numbers,
            so the regional differences only show up in the category mix. Treat per-account rates as indicative.
          </Text>
          <Text size="small" tone="secondary">
            The pilot's "complaint raised after session" rate implies about 20k complaints, more than the roughly
            9k logged in the complaints file for Jan–Sep 2025. The definitions need confirming.
          </Text>
          <Text size="small" tone="secondary">
            Average days to close for Aug–Sep 2026 cohorts is understated because many of those cases are still
            open. KPI-file averages are used for trends instead.
          </Text>
          <Text size="small" tone="secondary">
            To ask: are smart reads loaded into Helix CIS for billing, or does MeterHub still estimate? What share
            of billing exceptions become a manual correction? Which quarters count as "in breach" for the $2.4M
            penalty?
          </Text>
        </Stack>
      </Grid>

      <Text size="small" tone="quaternary" style={{ color: t.text.quaternary }}>
        All figures computed from the six synthetic Northwind CSVs (Oct 2024 – Sep 2026). Analysis scripts:
        analysis/explore.py and analysis/deep.py in the workspace. No outside data used.
      </Text>
    </Stack>
  );
}
