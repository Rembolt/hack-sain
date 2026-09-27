import { ArrowIcon } from "@/components/icons";
import { oneDecimal, whole } from "@/presentation/formatters";
import type { SimulationResult } from "@/simulation/engine";

export function ComplaintFlow({ result }: { result: SimulationResult }) {
  const nodes = [
    { label: "Observed complaints", value: result.remainingComplaints + result.totalPrevented, tone: "observed" },
    { label: "Prevented / deflected", value: result.totalPrevented, tone: "positive" },
    { label: "Remaining complaints", value: result.remainingComplaints, tone: "scenario" },
    { label: "Transferred", value: result.remainingTransfers, tone: "warning" },
  ];
  return (
    <div className="flow-card">
      <div className="chart-title-row">
        <div>
          <p className="eyebrow">Complaint flow</p>
          <h3>From observed demand to remaining work</h3>
        </div>
        <span className="scenario-label">Scenario, not forecast.</span>
      </div>
      <div className="flow-strip">
        {nodes.map((node, index) => (
          <div className="flow-pair" key={node.label}>
            <div className={`flow-node ${node.tone}`}>
              <span>{node.label}</span>
              <strong>{whole.format(node.value)}</strong>
              {index === 1 ? <small>{oneDecimal.format(result.complaintReductionRate * 100)}% of observed</small> : null}
            </div>
            {index < nodes.length - 1 ? <ArrowIcon className="flow-arrow" /> : null}
          </div>
        ))}
      </div>
      <p className="flow-note">Transfer removal changes routing friction only; it does not reduce complaint volume.</p>
    </div>
  );
}
