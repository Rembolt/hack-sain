"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Component,
  useMemo,
  useState,
  type CSSProperties,
  type Dispatch,
  type ReactNode,
} from "react";
import { ComplaintBatch } from "@/components/complaint-batch";
import { ErrorState, LoadingState } from "@/components/data-state";
import { ArrowIcon } from "@/components/icons";
import { PlaybackControls } from "@/components/playback-controls";
import { PlaybackCounters } from "@/components/playback-counters";
import { SimulatorControls } from "@/components/simulator-controls";
import { REGIONS, type Region, type SummaryData } from "@/domain/types";
import type { ProviderProvenance } from "@/integrations/contracts";
import { buildPlaybackTimeline, playbackProvider } from "@/integrations/playback-provider";
import { currency, percent, whole } from "@/presentation/formatters";
import {
  ILLUSTRATIVE_LABEL,
  monthLabel,
  nowDoingSentence,
} from "@/presentation/playback-copy";
import type { SimulationAssumptions } from "@/simulation/engine";
import { useNorthFlow } from "@/state/northflow-context";
import { activeStage, tickIntervalMs } from "@/state/playback-reducer";
import type { ScenarioAction } from "@/state/scenario-reducer";
import { usePlayback, usePlaybackMonth } from "@/state/use-playback";
import {
  filterPlaybackComplaints,
  playbackHouses,
  samplePlaybackComplaints,
  type PlaybackView,
} from "@/visualization/playback-houses";

const RegionalComplaintCity = dynamic(
  () =>
    import("@/components/regional-complaint-city").then(
      (module) => module.RegionalComplaintCity,
    ),
  {
    ssr: false,
    loading: () => <div className="pb-batch-empty">Loading regional complaint city…</div>,
  },
);

class RegionalCityBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; resetKey: string },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidUpdate(previous: Readonly<{ resetKey: string }>) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function AnalyticsDashboard() {
  const northflow = useNorthFlow();
  if (northflow.shared.status === "loading") return <LoadingState />;
  if (northflow.shared.status === "error") return <ErrorState message={northflow.shared.message} />;
  if (!northflow.result) return <LoadingState />;

  return (
    <PlaybackDashboard
      summary={northflow.shared.summary}
      assumptions={northflow.assumptions}
      dispatchAssumptions={northflow.dispatch}
      scenarioProvenance={northflow.providerProvenance}
      landingHref={northflow.landingHref}
    />
  );
}

function buildTimelineSafely(
  summary: SummaryData,
  assumptions: SimulationAssumptions,
  region: Region,
) {
  const regionalCalibration = summary.regionalComplaints[region];
  try {
    return {
      ok: true as const,
      timeline: buildPlaybackTimeline({
        calibration: summary.calibration,
        assumptions,
        monthlyComplaints: regionalCalibration.monthlyComplaints,
        region,
        regionalCalibration,
      }),
    };
  } catch (error) {
    return {
      ok: false as const,
      message: error instanceof Error ? error.message : "Playback timeline is invalid.",
    };
  }
}

function PlaybackDashboard({
  summary,
  assumptions,
  dispatchAssumptions,
  scenarioProvenance,
  landingHref,
}: {
  summary: SummaryData;
  assumptions: SimulationAssumptions;
  dispatchAssumptions: Dispatch<ScenarioAction>;
  scenarioProvenance: ProviderProvenance;
  landingHref: string;
}) {
  const [playback, dispatchPlayback] = usePlayback(24);
  const selectedRegion = playback.region;
  const built = useMemo(
    () => buildTimelineSafely(summary, assumptions, selectedRegion),
    [assumptions, selectedRegion, summary],
  );
  const steps = built.ok ? built.timeline.steps : [];
  const [view, setView] = useState<PlaybackView>("northflow");
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  const current = steps[playback.stepIndex] ?? null;
  const next = playback.status === "idle" ? null : steps[playback.stepIndex + 1] ?? null;
  const counterStep = playback.completedSteps > 0 ? steps[playback.completedSteps - 1] : null;
  const stage = activeStage(playback);
  const monthSample = usePlaybackMonth(current?.month ?? null, next?.month ?? null);
  const regionalMonthComplaints = useMemo(
    () => filterPlaybackComplaints(monthSample?.complaints ?? [], selectedRegion),
    [monthSample, selectedRegion],
  );
  const sample = useMemo(
    () =>
      samplePlaybackComplaints(
        regionalMonthComplaints,
        undefined,
        selectedRegion === "Barrowdale" && current?.month === "2025-06"
          ? "NW-108365"
          : undefined,
      ),
    [current?.month, regionalMonthComplaints, selectedRegion],
  );
  const houses = useMemo(
    () => playbackHouses(sample, assumptions, stage, view),
    [assumptions, sample, stage, view],
  );

  if (!built.ok || !current) {
    return <ErrorState message={built.ok ? "No months are available to replay." : built.message} />;
  }

  const statusWord = {
    idle: "Ready",
    running: "Running",
    paused: "Paused",
    completed: "Complete",
  }[playback.status];
  const sceneFallback = (
    <ComplaintBatch
      month={current.month}
      houses={houses}
      observedComplaints={current.observedComplaints}
      status={monthSample ? monthSample.status : "loading"}
    />
  );
  const regionalCalibration = summary.regionalComplaints[selectedRegion];
  const impact = built.timeline.impact;

  return (
    <main
      id="top"
      className={`pb-dashboard status-${playback.status}`}
      style={{ "--pb-tick": `${tickIntervalMs(playback.speed)}ms` } as CSSProperties}
    >
      <header className="pb-now" aria-labelledby="pb-title">
        <div className="pb-now-copy">
          <div className="pb-region-row">
            <p className="eyebrow">What NorthFlow is doing now</p>
            <label className="pb-region-select">
              <span>Region</span>
              <select
                value={selectedRegion}
                onChange={(event) => {
                  dispatchPlayback({ type: "set-region", region: event.target.value as Region });
                }}
              >
                {REGIONS.map((region) => <option key={region}>{region}</option>)}
              </select>
            </label>
          </div>
          <h1 id="pb-title">{nowDoingSentence({
            status: playback.status,
            stage,
            month: current.month,
            observedComplaints: current.observedComplaints,
            cumulativeAvoided: counterStep?.cumulativeComplaintsAvoided ?? 0,
            totalSteps: steps.length,
            view,
          })}</h1>
          <p className="pb-honesty">{ILLUSTRATIVE_LABEL}</p>
        </div>
        <Link href={landingHref} className="text-link">Back to product story <ArrowIcon /></Link>
        <p className="sr-only" aria-live="polite">{statusWord} · {monthLabel(current.month)}</p>
      </header>

      <section className="pb-stage-area" aria-label="Animated complaint workflow">
        {!monthSample || monthSample.status === "error" ? sceneFallback : (
          <RegionalCityBoundary
            fallback={sceneFallback}
            resetKey={`${selectedRegion}-${current.month}`}
          >
            <RegionalComplaintCity
              region={selectedRegion}
              month={current.month}
              complaints={sample}
              houses={houses}
              observedComplaints={current.observedComplaints}
              stage={stage}
              status={playback.status}
              view={view}
              completedSteps={playback.completedSteps}
              tickMs={tickIntervalMs(playback.speed)}
            />
          </RegionalCityBoundary>
        )}
      </section>

      <PlaybackCounters step={counterStep} view={view} />

      <PlaybackControls
        state={playback}
        dispatch={dispatchPlayback}
        view={view}
        onViewChange={setView}
        firstMonth={steps[0].month}
        lastMonth={steps[steps.length - 1].month}
      />

      <section className={`pb-result${playback.status === "completed" ? "" : " is-pending"}`} aria-label="Final regional result">
        <div className="pb-result-head">
          <h2>{playback.status === "completed" ? `${selectedRegion} regional result` : "Final regional result appears after replay"}</h2>
          <span className="scenario-label">Scenario, not forecast.</span>
        </div>
        {playback.status === "completed" ? (
          <div className="pb-result-grid">
            <article><span>Observed complaints</span><strong>{whole.format(impact.observedComplaints)}</strong></article>
            <article><span>Eligible complaints illustratively prevented</span><strong>{whole.format(impact.eligibleComplaintsPrevented)}</strong></article>
            <article><span>Observed transfers</span><strong>{whole.format(impact.observedTransfers)}</strong><small>{whole.format(impact.transfersAvoided)} illustratively avoided</small></article>
            <article className="pb-result-primary"><span>Gross handling-cost exposure avoided</span><strong>{currency.format(impact.grossHandlingExposureAvoided)}</strong><small>of {currency.format(impact.grossHandlingExposure)} observed exposure</small></article>
          </div>
        ) : <p>Complete the 24-month regional replay to reveal the result.</p>}
      </section>

      <details
        className="pb-disclosure"
        open={assumptionsOpen}
        onToggle={(event) => setAssumptionsOpen(event.currentTarget.open)}
      >
        <summary>Advanced scenario assumptions</summary>
        <div className="pb-disclosure-body">
          <p>These assumptions estimate possible business impact while the learning model is being integrated. The demonstration works without changing them.</p>
          <SimulatorControls assumptions={assumptions} dispatch={dispatchAssumptions} />
        </div>
      </details>

      <details className="pb-disclosure">
        <summary>Methodology</summary>
        <div className="pb-disclosure-body pb-method">
          <section>
            <h3>What is observed and what is illustrative</h3>
            <ul>
              <li>Monthly complaint volumes and complaint-event houses are filtered to {selectedRegion}&apos;s {whole.format(regionalCalibration.totalComplaints)} observed complaint records.</li>
              <li>The replay spreads the regional scenario totals across its 24 observed monthly counts. Which eligible house fades or changes route is an illustrative counterfactual allocation, not a prediction for a named complaint.</li>
              <li>The learning loop is the proposed design. This replay does not train a model and does not report accuracy, rewards, or policy performance.</li>
              <li>Company-level backlog remains outside this regional result.</li>
            </ul>
          </section>
          <section>
            <h3>How the totals are calculated</h3>
            <ul>
              <li>{whole.format(impact.eligibleComplaintsPrevented)} eligible estimated-read and information-only complaints are illustratively prevented using the selected assumptions, without counting the {whole.format(regionalCalibration.overlapComplaints)} overlapping cases twice.</li>
              <li>{whole.format(impact.transfersAvoided)} of {whole.format(impact.observedTransfers)} observed transfers are illustratively avoided after prevention and the {percent(assumptions.transferReductionRate)} bridge assumption.</li>
              <li>Each complaint costs {currency.format(summary.calibration.normalHandlingCost)} to handle, plus {currency.format(summary.calibration.transferPremium)} when transferred. Implementation cost is not included.</li>
              <li>Gross observed regional handling exposure is {currency.format(impact.grossHandlingExposure)}; the scenario avoids {currency.format(impact.grossHandlingExposureAvoided)} of that exposure over the observed 24-month population.</li>
            </ul>
          </section>
          <section>
            <h3>Kept separate from the cost total</h3>
            <ul>
              <li>$1.345M in recorded bill corrections is customer impact, not handling cost.</li>
              <li>Regulatory exposure of {currency.format(summary.regulatoryPenaltyPerQuarter)} per quarter is excluded.</li>
              <li>Company KPIs report {whole.format(summary.reconciliation.kpiComplaintsOpened)} complaints opened, {whole.format(summary.reconciliation.complaintDifference)} more than the complaint records. KPI backlog exceeds open complaint records by {whole.format(summary.reconciliation.backlogDifference)}. These differences are shown, not reconciled away.</li>
            </ul>
          </section>
          <section>
            <h3>Data providers</h3>
            <ul>
              <li>Playback: {playbackProvider.provenance.label}. {playbackProvider.provenance.description}</li>
              <li>Scenario totals: {scenarioProvenance.label}. {scenarioProvenance.description}</li>
              <li>When the teammate&apos;s model is connected it can supply each step&apos;s selected action, explanation, reward, cumulative reward, model version, and verified feedback through the same playback contract.</li>
            </ul>
          </section>
        </div>
      </details>
    </main>
  );
}
