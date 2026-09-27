"use client";

import Link from "next/link";
import { useState } from "react";
import { ComplaintExplorer } from "@/components/complaint-explorer";
import { ErrorState, LoadingState } from "@/components/data-state";
import { EvidenceFilters } from "@/components/evidence-filters";
import { ArrowIcon, CheckIcon, FlowIcon, ShieldIcon, SparkIcon } from "@/components/icons";
import { NorthFlowFooter } from "@/components/northflow-footer";
import { SelectedComplaintDrawer } from "@/components/selected-complaint-drawer";
import { TracePanel } from "@/components/trace-panel";
import { analyticsProvider } from "@/integrations/analytics-provider";
import { oneDecimal, percent, whole } from "@/presentation/formatters";
import { DEFAULT_ASSUMPTIONS } from "@/simulation/engine";
import { useNorthFlow } from "@/state/northflow-context";

const workflow = [
  {
    label: "Context",
    title: "Meter and billing signals",
    copy: "Meter, billing, system, and operational context are normalized at the adapter boundary.",
  },
  {
    label: "Assessment",
    title: "Risk and confidence",
    copy: "Each normalized result carries a risk score, confidence, reason codes, action, and model provenance.",
  },
  {
    label: "Decision",
    title: "Proceed or review",
    copy: "High-confidence cases continue. Uncertain cases can be routed for human review.",
  },
  {
    label: "Verification",
    title: "Confirmed resolution",
    copy: "A correction or complaint resolution is verified before it becomes feedback.",
  },
  {
    label: "Feedback",
    title: "Improve future decisions",
    copy: "Verified outcomes can inform future model and workflow decisions through a separate feedback contract.",
  },
];

export function LandingExperience() {
  const northflow = useNorthFlow();
  const [recordsOpen, setRecordsOpen] = useState(false);
  if (northflow.shared.status === "loading") return <LoadingState />;
  if (northflow.shared.status === "error") return <ErrorState message={northflow.shared.message} />;

  const { summary, lookups } = northflow.shared;
  const defaultResult = analyticsProvider.runScenario(
    summary.calibration,
    DEFAULT_ASSUMPTIONS,
  );
  const representativeComplaint =
    northflow.monthState.complaints.find(
      (complaint) => complaint.complaintId === "NW-108365",
    ) ?? northflow.selectedComplaint;
  const representativeContext = representativeComplaint
    ? lookups.contexts[
        `${representativeComplaint.month}|${representativeComplaint.region}`
      ] ?? null
    : null;

  return (
    <main id="top" className="product-story">
      <section className="product-hero" id="product">
        <div className="product-hero-copy">
          <p className="hero-kicker"><span>ML-assisted billing reliability</span><i /> Local prototype</p>
          <h1>Prevent billing problems before they become complaints.</h1>
          <p className="product-hero-lede">
            NorthFlow identifies billing cases at risk, explains why they were flagged,
            and routes uncertainty for review. Verified corrections and confirmed
            resolutions can then improve future decisions.
          </p>
          <div className="hero-actions">
            <a href="#solution" className="button-primary">See the solution <ArrowIcon /></a>
            <Link href={northflow.dashboardHref} className="button-secondary">Open scenario dashboard</Link>
          </div>
          <p className="product-boundary"><ShieldIcon /> The teammate&apos;s future model connects through a replaceable adapter. The scenario engine below is separate and is not a trained model.</p>
        </div>
        <aside className="assessment-preview" aria-label="Conceptual NorthFlow assessment">
          <div className="assessment-preview-head">
            <span className="status-dot" />
            <span>Normalized assessment result</span>
            <small>Internal UI contract</small>
          </div>
          <div className="assessment-score-row">
            <div><span>Risk score</span><strong>0—1</strong></div>
            <div><span>Confidence</span><strong>0—1</strong></div>
          </div>
          <div className="assessment-fields">
            <span>Reason codes</span>
            <span>Recommended action</span>
            <span>Model version</span>
            <span>Provenance</span>
          </div>
          <div className="assessment-decision"><SparkIcon /><span><strong>Proceed</strong> when confidence is sufficient<br /><strong>Review</strong> when uncertainty needs a person</span></div>
          <div className="feedback-return"><CheckIcon /> Verified outcome returns as governed feedback</div>
        </aside>
      </section>

      <section className="story-section problem-section" id="problem">
        <div className="story-intro">
          <p className="eyebrow">01 · The problem</p>
          <h2>Billing complaints create measurable operating pressure.</h2>
          <p>Complaint records show the workload and transfer friction. Company KPIs establish the current close-time position.</p>
        </div>
        <div className="problem-metrics">
          <article><span>Complaint events</span><strong>{whole.format(summary.calibration.totalComplaints)}</strong><small>Observed over 24 months</small></article>
          <article><span>Transferred complaints</span><strong>{whole.format(summary.calibration.transferredComplaints)}</strong><small>Avoidable hand-off pressure</small></article>
          <article className="metric-emphasis"><span>Observed complaint-handling exposure</span><strong>${(defaultResult.baselineHandlingCost / 1_000_000).toFixed(2)}M</strong><small>Handling cost, not lost revenue</small></article>
          <article><span>Current company close time</span><strong>{oneDecimal.format(summary.calibration.currentKpiCloseDays)} days</strong><small>September 2026 KPI</small></article>
        </div>
        <p className="cause-line"><FlowIcon /><span><strong>What appears to create avoidable work:</strong> estimated-read issues, information-only demand, cross-system transfers, and constrained closure capacity.</span></p>
      </section>

      <section className="story-section solution-section" id="solution">
        <div className="story-intro centered">
          <p className="eyebrow">02 · The proposal</p>
          <h2>A reliability layer between billing signals and customer harm.</h2>
          <p>NorthFlow does not replace the billing system. It adds an explainable decision point and a verified learning loop.</p>
        </div>
        <div className="workflow-strip" aria-label="NorthFlow product workflow">
          {workflow.map((step, index) => (
            <div className="workflow-pair" key={step.label}>
              <article className={index === 4 ? "feedback-step" : ""}>
                <span>{step.label}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
                {index === 1 ? (
                  <div className="result-contract" aria-label="Normalized model result fields">
                    <i>risk score</i><i>confidence</i><i>reason codes</i><i>action</i><i>model version</i>
                  </div>
                ) : null}
              </article>
              {index < workflow.length - 1 ? <ArrowIcon className="workflow-arrow" /> : null}
            </div>
          ))}
        </div>
        <div className="feedback-loop-note"><ArrowIcon /><span>Only verified outcomes return to the decision layer. The feedback contract records the case, confirmed outcome, correction, verification source, and timestamp.</span></div>
      </section>

      <section className="story-section complaint-story" id="case">
        <div className="story-intro">
          <p className="eyebrow">03 · Make it concrete</p>
          <h2>One complaint shows how evidence becomes feedback.</h2>
          <p>NW-108365 is a complaint event represented by a schematic house—not a real property.</p>
        </div>
        <div className="representative-layout">
          <aside className="representative-house-card">
            <div className="large-house" aria-hidden="true"><span className="large-house-roof" /><span className="large-house-wall"><i /></span></div>
            <span className="evidence-chip">Observed complaint</span>
            <h3>NW-108365</h3>
            <p>Estimated-read billing complaint · Barrowdale · opened 27 June 2025</p>
            <dl>
              <div><dt>Source</dt><dd>Aurora Billing</dd></div>
              <div><dt>Transferred</dt><dd>Yes</dd></div>
              <div><dt>Closed</dt><dd>31 days</dd></div>
              <div><dt>Resolution</dt><dd>Bill corrected and re-issued</dd></div>
            </dl>
          </aside>
          <div className="representative-trace">
            <TracePanel complaint={representativeComplaint} context={representativeContext} systems={lookups.systems} />
          </div>
        </div>
        <p className="schematic-disclosure">Schematic customer homes. Operational values come from Northwind&apos;s data; locations are illustrative.</p>

        <details
          className="inspect-panel"
          open={recordsOpen}
          onToggle={(event) => setRecordsOpen(event.currentTarget.open)}
        >
          <summary><span>Inspect records</span><small>Filters, schematic complaint view, and keyboard-accessible list</small></summary>
          {recordsOpen ? (
            <div className="inspect-panel-body">
              <EvidenceFilters
                lookups={lookups}
                month={northflow.month}
                region={northflow.region}
                onMonthChange={northflow.setMonth}
                onRegionChange={northflow.setRegion}
              />
              {northflow.monthState.status === "error" ? (
                <div className="inline-error"><ShieldIcon /><strong>Month data unavailable.</strong><span>{northflow.monthState.message}</span></div>
              ) : (
                <div className="inspect-record-grid">
                  <ComplaintExplorer
                    complaints={northflow.filteredComplaints}
                    region={northflow.region}
                    selectedComplaintId={northflow.selectedComplaintId}
                    onSelect={northflow.setSelectedComplaintId}
                  />
                  <SelectedComplaintDrawer complaint={northflow.selectedComplaint} context={northflow.selectedContext} />
                </div>
              )}
            </div>
          ) : null}
        </details>
      </section>

      <section className="story-section value-summary" id="value">
        <div className="value-summary-head">
          <div>
            <p className="eyebrow">04 · Possible impact</p>
            <h2>Use the scenario to size the opportunity—not to claim model performance.</h2>
          </div>
          <span className="scenario-label">Scenario, not forecast.</span>
        </div>
        <div className="value-summary-grid">
          <article><span>Complaints prevented</span><strong>{whole.format(defaultResult.totalPrevented)}</strong><small>Estimated-read prevention + information deflection</small></article>
          <article><span>Complaint reduction</span><strong>{percent(defaultResult.complaintReductionRate, 1)}</strong><small>Of the observed complaint population</small></article>
          <article className="value-primary"><span>Gross handling-cost exposure avoided</span><strong>${Math.round(defaultResult.handlingCostAvoided / 1_000)}K</strong><small>Observed 24-month population · not annual ROI</small></article>
          <article><span>Backlog after 12 months</span><strong>{whole.format(defaultResult.backlog[12])}</strong><small>Compared with {whole.format(defaultResult.unchangedBacklog[12])} unchanged</small></article>
        </div>
        <div className="money-boundary">
          <p><strong>Implementation cost is not yet included.</strong> This is gross avoided exposure, not net savings or ROI.</p>
          <p>$1.345M in recorded bill corrections is customer impact and is not added to handling-cost avoidance. Regulatory exposure remains separate.</p>
          <Link href={northflow.dashboardHref} className="button-primary">Open scenario dashboard <ArrowIcon /></Link>
        </div>
      </section>

      <NorthFlowFooter />
    </main>
  );
}
