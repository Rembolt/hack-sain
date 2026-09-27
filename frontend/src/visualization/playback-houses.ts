import type { BrowserComplaint, Region } from "@/domain/types";
import type { SimulationAssumptions } from "@/simulation/engine";
import type { PlaybackStage } from "@/state/playback-reducer";
import {
  scenarioHouseState,
  type ScenarioHouseState,
} from "@/visualization/scenario-allocation";
import { schematicCoordinates, type SchematicPoint } from "@/visualization/coordinates";

export type PlaybackView = "northflow" | "baseline";

export type PlaybackHouseTone = "observed" | "risk" | "handled" | "prevented";
export type PlaybackConnectionState =
  | "hidden"
  | "forming"
  | "risk"
  | "routing"
  | "resolved"
  | "feedback"
  | "open";

export type PlaybackHouse = {
  key: string;
  tone: PlaybackHouseTone;
  feedback: boolean;
  connection: PlaybackConnectionState;
  emphasis: "standard" | "escalated";
  position: SchematicPoint;
  open: boolean;
  featured: boolean;
};

export const PLAYBACK_SAMPLE_SIZE = 48;

export function filterPlaybackComplaints(
  complaints: readonly BrowserComplaint[],
  region: Region,
) {
  return complaints.filter((complaint) => complaint.region === region);
}

/** Evenly spaced, ID-ordered sample so each month shows a stable batch. */
export function samplePlaybackComplaints(
  complaints: readonly BrowserComplaint[],
  limit = PLAYBACK_SAMPLE_SIZE,
  pinnedComplaintId?: string,
) {
  const ordered = [...complaints].sort((left, right) =>
    left.complaintId.localeCompare(right.complaintId),
  );
  if (ordered.length <= limit) return ordered;
  const stride = ordered.length / limit;
  const sample = Array.from(
    { length: limit },
    (_, index) => ordered[Math.floor(index * stride)],
  );
  const pinned = pinnedComplaintId
    ? ordered.find((complaint) => complaint.complaintId === pinnedComplaintId)
    : undefined;
  if (pinned && !sample.some((complaint) => complaint.complaintId === pinnedComplaintId)) {
    sample[sample.length - 1] = pinned;
    sample.sort((left, right) => left.complaintId.localeCompare(right.complaintId));
  }
  return sample;
}

export function isFeaturedComplaintMoment(region: Region, month: string) {
  return region === "Barrowdale" && month === "2025-06";
}

function toneFor(
  allocation: ScenarioHouseState,
  complaint: BrowserComplaint,
  stage: PlaybackStage,
): PlaybackHouseTone {
  if (stage === "enter") return "observed";
  if (stage === "assess") return allocation === "unchanged" ? "observed" : "risk";
  if (allocation === "prevented-estimation" || allocation === "prevented-information") {
    return "prevented";
  }
  if (allocation === "rerouted") return "handled";
  if (stage === "route") return "observed";
  return complaint.status === "Open" ? "observed" : "handled";
}

function connectionFor(
  allocation: ScenarioHouseState,
  complaint: BrowserComplaint,
  stage: PlaybackStage | null,
  view: PlaybackView,
): PlaybackConnectionState {
  if (stage === null) return "hidden";
  if (stage === "enter") return "forming";
  if (stage === "assess") return complaint.transferred || complaint.slaBreach ? "risk" : "forming";
  if (
    view === "northflow" &&
    (allocation === "prevented-estimation" || allocation === "prevented-information")
  ) {
    return "hidden";
  }
  if (stage === "route") return "routing";
  if (complaint.status === "Open") return "open";
  if (stage === "verify") return "resolved";
  if (stage === "feedback") return view === "northflow" ? "feedback" : "resolved";
  return "hidden";
}

export function playbackHouses(
  complaints: readonly BrowserComplaint[],
  assumptions: SimulationAssumptions,
  stage: PlaybackStage | null,
  view: PlaybackView,
): PlaybackHouse[] {
  return complaints.map((complaint) => {
    const allocation = scenarioHouseState(complaint, assumptions);
    const tone =
      stage === null || view === "baseline"
        ? "observed"
        : toneFor(allocation, complaint, stage);
    const connection = connectionFor(allocation, complaint, stage, view);
    return {
      key: complaint.complaintId,
      tone,
      feedback:
        view === "northflow" &&
        connection === "feedback" &&
        tone === "handled" &&
        complaint.status !== "Open",
      connection,
      emphasis: complaint.transferred || complaint.slaBreach ? "escalated" : "standard",
      position: schematicCoordinates(complaint.complaintId, complaint.region),
      open: complaint.status === "Open",
      featured: complaint.complaintId === "NW-108365",
    };
  });
}

export function countHouseTones(houses: readonly PlaybackHouse[]) {
  const counts: Record<PlaybackHouseTone, number> = {
    observed: 0,
    risk: 0,
    handled: 0,
    prevented: 0,
  };
  houses.forEach((house) => {
    counts[house.tone] += 1;
  });
  return counts;
}
