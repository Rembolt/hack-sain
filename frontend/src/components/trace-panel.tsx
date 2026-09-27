import { ArrowIcon, FlowIcon } from "@/components/icons";
import type {
  BrowserComplaint,
  RegionalContext,
  SystemRecord,
} from "@/domain/types";
import { currencyPrecise, displayNullable, percent } from "@/presentation/formatters";

function TraceNode({
  label,
  title,
  copy,
  tone = "observed",
}: {
  label: string;
  title: string;
  copy: string;
  tone?: "observed" | "context" | "simulated";
}) {
  return (
    <article className={`product-trace-node ${tone}`}>
      <span>{label}</span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </article>
  );
}

export function TracePanel({
  complaint,
  context,
  systems,
}: {
  complaint: BrowserComplaint | null;
  context: RegionalContext | null;
  systems: SystemRecord[];
}) {
  if (!complaint) {
    return (
      <div className="empty-state trace-empty">
        <FlowIcon />
        <strong>Loading the representative complaint</strong>
        <span>The evidence trace remains separate from the scenario engine.</span>
      </div>
    );
  }

  const sourceSystem = systems.find(
    (entry) => entry.systemId === complaint.sourceSystem,
  );
  const contextualSystem = (context?.systemsServingRegion ?? [])
    .filter((systemId) => systemId !== complaint.sourceSystem)
    .map((systemId) => systems.find((entry) => entry.systemId === systemId))
    .find((entry): entry is SystemRecord => Boolean(entry));

  return (
    <div className="product-trace">
      <div className="product-trace-legend" aria-label="Evidence relationship legend">
        <span><i className="connector-key observed" /> Observed</span>
        <span><i className="connector-key context" /> Regional context</span>
        <span><i className="connector-key simulated" /> Proposed future</span>
      </div>
      <div className="product-trace-flow">
        <TraceNode
          label="Observed event"
          title={complaint.complaintId}
          copy={`${complaint.category} · ${complaint.priority} · ${complaint.channel}`}
        />
        <div className="product-trace-connector observed"><ArrowIcon /></div>
        <TraceNode
          label="Observed source"
          title={sourceSystem?.systemName ?? complaint.sourceSystem}
          copy={`${complaint.transferred ? "Transferred" : "Not transferred"} · ${complaint.slaBreach ? "SLA breached" : "Within SLA"}`}
        />
        <div className="product-trace-connector context"><ArrowIcon /></div>
        <TraceNode
          label="Regional context"
          title={`${complaint.region} + ${contextualSystem?.systemName ?? "regional system"}`}
          copy={context ? `${percent(context.estimatedReadRate, 1)} estimated reads · ${context.agentFte} agent FTE` : "Regional context unavailable"}
          tone="context"
        />
        <div className="product-trace-connector observed"><ArrowIcon /></div>
        <TraceNode
          label="Verified resolution"
          title="Corrected bill"
          copy={`${displayNullable(complaint.resolutionAction)} · ${displayNullable(complaint.billCorrectionValue, currencyPrecise.format)}`}
        />
        <div className="product-trace-connector simulated"><ArrowIcon /></div>
        <TraceNode
          label="Proposed feedback"
          title="Verified outcome returns"
          copy="Case outcome and correction can inform future decisions after verification."
          tone="simulated"
        />
      </div>

      <details className="technical-evidence">
        <summary>Evidence and relationship detail</summary>
        <dl className="technical-evidence-grid">
          <div><dt>Complaint key</dt><dd>{complaint.complaintId}</dd></div>
          <div><dt>Anonymized account reference</dt><dd>{complaint.accountId}</dd></div>
          <div><dt>Opened / closed</dt><dd>{complaint.dateOpened} / {displayNullable(complaint.dateClosed)}</dd></div>
          <div><dt>Closure duration</dt><dd>{displayNullable(complaint.daysToClose, (value) => `${value} days`)}</dd></div>
          <div><dt>Observed source relationship</dt><dd>{complaint.sourceSystem} · {sourceSystem?.systemName ?? "Unknown"}</dd></div>
          <div><dt>Regional system context</dt><dd>{contextualSystem ? `${contextualSystem.systemId} · ${contextualSystem.systemName}` : "Unavailable"}</dd></div>
          <div><dt>Regional billing exceptions</dt><dd>{context?.billingExceptionsRaised.toLocaleString("en-CA") ?? "Unavailable"}</dd></div>
          <div><dt>Feedback status</dt><dd>Proposed · requires verified outcome</dd></div>
        </dl>
        <p>Source-system association is observed. Meter, staffing, and MeterHub relationships are regional context. The feedback link is proposed.</p>
      </details>
    </div>
  );
}
