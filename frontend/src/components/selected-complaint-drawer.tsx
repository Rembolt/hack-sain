import { FlowIcon } from "@/components/icons";
import type { BrowserComplaint, RegionalContext } from "@/domain/types";
import { currencyPrecise, displayNullable, percent } from "@/presentation/formatters";

export function SelectedComplaintDrawer({
  complaint,
  context,
}: {
  complaint: BrowserComplaint | null;
  context: RegionalContext | null;
}) {
  if (!complaint) {
    return (
      <aside className="selected-drawer empty-state">
        <FlowIcon />
        <strong>Select a house to open the complaint</strong>
        <span>The selection clears if a month or region filter excludes it.</span>
      </aside>
    );
  }

  return (
    <aside className="selected-drawer" aria-live="polite">
      <div className="drawer-heading">
        <div>
          <p className="eyebrow">Selected complaint event</p>
          <h3>{complaint.complaintId}</h3>
        </div>
        <span className={`status-pill ${complaint.status === "Open" ? "open" : "closed"}`}>{complaint.status}</span>
      </div>
      <p className="drawer-category">{complaint.category}</p>
      <div className="drawer-marker-row" aria-label="Complaint markers">
        <span className={complaint.slaBreach ? "risk" : "healthy"}>{complaint.slaBreach ? "SLA breach" : "Within SLA"}</span>
        {complaint.transferred ? <span>Transferred</span> : null}
        {complaint.reopened ? <span>Reopened</span> : null}
      </div>
      <dl className="drawer-facts">
        <div><dt>Opened</dt><dd>{complaint.dateOpened}</dd></div>
        <div><dt>Priority</dt><dd>{complaint.priority}</dd></div>
        <div><dt>Channel</dt><dd>{complaint.channel}</dd></div>
        <div><dt>Region</dt><dd>{complaint.region}</dd></div>
        <div><dt>Source system</dt><dd>{complaint.sourceSystem}</dd></div>
        <div><dt>Closure time</dt><dd>{displayNullable(complaint.daysToClose, (value) => `${value} days`)}</dd></div>
        <div><dt>Bill correction</dt><dd>{displayNullable(complaint.billCorrectionValue, currencyPrecise.format)}</dd></div>
      </dl>
      <div className="drawer-context">
        <strong>Regional context · {complaint.month}</strong>
        {context ? (
          <p>{percent(context.estimatedReadRate, 1)} estimated reads · {context.agentFte} agent FTE · {context.openVacancies} vacancies</p>
        ) : <p>Context unavailable.</p>}
      </div>
      <p className="account-boundary">Account reference {complaint.accountId} is anonymized and never used as a location.</p>
    </aside>
  );
}
