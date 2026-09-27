"use client";

import dynamic from "next/dynamic";
import {
  Component,
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  usePrefersReducedMotion,
  useWebGLSupport,
} from "@/components/city-3d/scene-capabilities";
import type { BrowserComplaint, Region } from "@/domain/types";
import { whole } from "@/presentation/formatters";
import { monthLabel, STAGE_LABELS } from "@/presentation/playback-copy";
import {
  BASE_TICK_MS,
  PLAYBACK_STAGES,
  type PlaybackStage,
  type PlaybackStatus,
} from "@/state/playback-reducer";
import {
  countHouseTones,
  isFeaturedComplaintMoment,
  type PlaybackHouse,
  type PlaybackView,
} from "@/visualization/playback-houses";

const HUB = { x: 50, y: 46 };

const RegionalCityCanvas = dynamic(
  () =>
    import("@/components/city-3d/regional-city-canvas").then(
      (module) => module.RegionalCityCanvas,
    ),
  {
    ssr: false,
    loading: () => <p className="regional-city-canvas-status">Preparing the 3D regional city…</p>,
  },
);

class SceneRendererBoundary extends Component<
  { children: ReactNode; onFailure: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFailure();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

type RegionalComplaintCityProps = {
  region: Region;
  month: string;
  complaints: readonly BrowserComplaint[];
  houses: readonly PlaybackHouse[];
  observedComplaints: number;
  stage: PlaybackStage | null;
  status: PlaybackStatus;
  view: PlaybackView;
  completedSteps: number;
  tickMs?: number;
};

function complaintLabel(complaint: BrowserComplaint) {
  const state = complaint.status === "Open" ? "open" : "resolved";
  const flags = [complaint.transferred ? "transferred" : null, complaint.slaBreach ? "SLA breached" : null]
    .filter(Boolean)
    .join(", ");
  return `${complaint.complaintId}, ${complaint.category}, ${state}${flags ? `, ${flags}` : ""}`;
}

function sceneDescription(houses: readonly PlaybackHouse[]) {
  const counts = countHouseTones(houses);
  return `Three-dimensional schematic of ${houses.length} complaint-event homes linked to the Regional Resolution Hub, an illustrative operational layer: ${counts.observed} received, ${counts.risk} flagged, ${counts.handled} rerouted or resolved, ${counts.prevented} prevented.`;
}

function FeaturedCallout({ feedbackReturned }: { feedbackReturned: boolean }) {
  return (
    <aside className="regional-featured-callout" aria-label="Featured complaint">
      <small>Featured complaint</small>
      <strong>Complaint NW-108365</strong>
      <span>Billing — estimated read</span>
      <span>Transferred · 31 days to close</span>
      <span>Bill corrected and reissued</span>
      <span>$217.52 correction</span>
      {feedbackReturned ? (
        <em>Verified correction returned to the learning loop.</em>
      ) : null}
    </aside>
  );
}

/** CSS/SVG scene used when WebGL is unavailable or the 3D renderer fails. */
function SchematicCityScene({
  houses,
  featuredContext,
  callout,
}: {
  houses: readonly PlaybackHouse[];
  featuredContext: boolean;
  callout: ReactNode;
}) {
  const focusHouse = callout ? houses.find((house) => house.featured) : undefined;
  return (
    <div
      className="regional-city-world"
      style={
        callout
          ? ({
              "--focus-x": `${focusHouse?.position.x ?? 50}%`,
              "--focus-y": `${focusHouse?.position.y ?? 50}%`,
            } as CSSProperties)
          : undefined
      }
    >
      <div className="regional-city-ground" aria-hidden="true">
        <i className="regional-road road-one" />
        <i className="regional-road road-two" />
        <i className="regional-road road-three" />
      </div>

      <svg className="regional-city-links" viewBox="0 0 100 100" aria-hidden="true">
        {houses.map((house) =>
          house.connection === "hidden" ? null : (
            <line
              key={house.key}
              x1={house.position.x}
              y1={house.position.y}
              x2={HUB.x}
              y2={HUB.y}
              className={`regional-link state-${house.connection} emphasis-${house.emphasis}${house.featured && featuredContext ? " is-featured" : ""}`}
            />
          ),
        )}
      </svg>

      {houses.map((house, index) => (
        <span
          key={house.key}
          className={`regional-house tone-${house.tone} connection-${house.connection}${house.open ? " is-open" : ""}${house.featured && featuredContext ? " is-featured" : ""}`}
          style={
            {
              left: `${house.position.x}%`,
              top: `${house.position.y}%`,
              "--house-index": index,
            } as CSSProperties
          }
          aria-hidden="true"
        >
          <i className="regional-house-roof" />
          <i className="regional-house-front" />
          <i className="regional-house-side" />
        </span>
      ))}

      <div className="regional-hub" aria-label="Regional Resolution Hub — illustrative operational layer">
        <i className="regional-hub-roof" aria-hidden="true" />
        <i className="regional-hub-front" aria-hidden="true" />
        <i className="regional-hub-side" aria-hidden="true" />
        <span className="regional-core" aria-hidden="true" />
        <strong>Regional Resolution Hub</strong>
        <small>Illustrative operational layer</small>
      </div>

      {callout}
    </div>
  );
}

export function RegionalComplaintCity({
  region,
  month,
  complaints,
  houses,
  observedComplaints,
  stage,
  status,
  view,
  completedSteps,
  tickMs = BASE_TICK_MS,
}: RegionalComplaintCityProps) {
  const webgl = useWebGLSupport();
  const reducedMotion = usePrefersReducedMotion();
  const [rendererFailed, setRendererFailed] = useState(false);
  const markRendererFailed = useCallback(() => setRendererFailed(true), []);
  const use3d = webgl && !rendererFailed;

  const complaintIds = useMemo(
    () => new Set(complaints.map((complaint) => complaint.complaintId)),
    [complaints],
  );
  const visibleHouses = useMemo(
    () => houses.filter((house) => complaintIds.has(house.key)),
    [complaintIds, houses],
  );
  const running = status === "running";
  const motion = useMemo(
    () => ({ reducedMotion, running, tickMs }),
    [reducedMotion, running, tickMs],
  );

  const featuredContext = isFeaturedComplaintMoment(region, month);
  const featured = featuredContext && complaintIds.has("NW-108365");
  const focusFeatured =
    featured &&
    status !== "idle" &&
    stage !== "enter" &&
    stage !== "update";
  const feedbackActive = view === "northflow" && stage === "feedback";
  const callout = featured ? (
    <FeaturedCallout feedbackReturned={stage === "feedback" && view === "northflow"} />
  ) : null;

  return (
    <figure
      className={`regional-city status-${status} mode-${view}${focusFeatured ? " is-featured-focus" : ""}${feedbackActive ? " is-feedback" : ""}`}
      aria-labelledby="regional-city-title"
      data-region={region}
      data-month={month}
      data-stage={stage ?? "idle"}
      data-renderer={use3d ? "webgl" : "schematic"}
    >
      <figcaption className="regional-city-head">
        <span>
          <small>Regional complaint city</small>
          <strong id="regional-city-title">{region}</strong>
        </span>
        <span className="regional-city-month">
          <small>Current month</small>
          <strong>{monthLabel(month)}</strong>
        </span>
      </figcaption>

      <div className="regional-city-viewport">
        {use3d ? (
          <div className="regional-city-3d">
            <div className="regional-city-canvas" role="img" aria-label={sceneDescription(visibleHouses)}>
              <SceneRendererBoundary onFailure={markRendererFailed}>
                <RegionalCityCanvas
                  houses={visibleHouses}
                  featuredContext={featuredContext}
                  focusFeatured={focusFeatured}
                  feedbackActive={feedbackActive}
                  view={view}
                  motion={motion}
                  onContextLost={markRendererFailed}
                />
              </SceneRendererBoundary>
            </div>
            {callout}
          </div>
        ) : (
          <SchematicCityScene
            houses={visibleHouses}
            featuredContext={featuredContext}
            callout={callout}
          />
        )}

        <ol className="regional-stage-rail" aria-label="Complaint handling stages">
          {PLAYBACK_STAGES.map((item) => (
            <li key={item} className={stage === item ? "is-active" : undefined} aria-current={stage === item ? "step" : undefined}>
              {STAGE_LABELS[item].short}
            </li>
          ))}
        </ol>
      </div>

      <div className="regional-city-foot">
        <p>
          Showing {whole.format(houses.length)} of {whole.format(observedComplaints)} complaint events for this region and month.
        </p>
        <p>
          {view === "baseline"
            ? "Baseline: complaints can reach resolution, but no learning-loop return occurs."
            : `NorthFlow learning loop · ${completedSteps} of 24 regional feedback cycles complete.`}
        </p>
      </div>
      <details className="regional-city-accessible">
        <summary>Accessible complaint-event list</summary>
        <ol>
          {complaints.map((complaint) => (
            <li key={complaint.complaintId}>{complaintLabel(complaint)}</li>
          ))}
        </ol>
      </details>
      <p className="regional-city-disclosure">
        Schematic customer homes and resolution hub. Operational values come from Northwind&apos;s data; locations and routing are illustrative.
      </p>
    </figure>
  );
}
