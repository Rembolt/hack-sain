import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlaybackControls } from "@/components/playback-controls";
import { ComplaintBatch } from "@/components/complaint-batch";
import { RegionalComplaintCity } from "@/components/regional-complaint-city";
import type { BrowserComplaint } from "@/domain/types";
import { nowDoingSentence } from "@/presentation/playback-copy";
import { DEFAULT_ASSUMPTIONS, ZERO_ASSUMPTIONS } from "@/simulation/engine";
import {
  initialPlaybackState,
  type PlaybackState,
  type PlaybackStatus,
} from "@/state/playback-reducer";
import {
  countHouseTones,
  filterPlaybackComplaints,
  isFeaturedComplaintMoment,
  playbackHouses,
  samplePlaybackComplaints,
} from "@/visualization/playback-houses";

function complaint(overrides: Partial<BrowserComplaint> = {}): BrowserComplaint {
  return {
    complaintId: "NW-100001",
    accountId: "A-anonymized",
    month: "2025-06",
    dateOpened: "2025-06-01",
    dateClosed: "2025-06-08",
    status: "Closed",
    channel: "Web form",
    category: "Other",
    priority: "P2",
    region: "Barrowdale",
    sourceSystem: "SYS-01",
    transferred: false,
    slaDays: 10,
    daysToClose: 7,
    slaBreach: false,
    reopened: false,
    informationOnly: false,
    resolutionAction: "Explained",
    billCorrectionValue: null,
    ...overrides,
  };
}

function stateWith(status: PlaybackStatus, overrides: Partial<PlaybackState> = {}) {
  return { ...initialPlaybackState(24), status, ...overrides };
}

function renderControls(state: PlaybackState) {
  return renderToStaticMarkup(
    <PlaybackControls
      state={state}
      dispatch={() => undefined}
      view="northflow"
      onViewChange={() => undefined}
      firstMonth="2024-10"
      lastMonth="2026-09"
    />,
  );
}

describe("playback controls", () => {
  it("offers Start when idle and disables Reset", () => {
    const html = renderControls(stateWith("idle"));
    expect(html).toContain("Start simulation");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Reset<\/button>/);
    expect(html).toContain("0 of 24 months processed");
  });

  it("offers Pause while running and Resume while paused", () => {
    expect(renderControls(stateWith("running"))).toContain(">Pause<");
    expect(renderControls(stateWith("paused", { completedSteps: 7 }))).toContain(">Resume<");
    expect(renderControls(stateWith("paused", { completedSteps: 7 }))).toContain("7 of 24 months processed");
  });

  it("offers a replay when completed", () => {
    expect(renderControls(stateWith("completed", { completedSteps: 24 }))).toContain("Replay simulation");
  });

  it("marks the active speed", () => {
    const html = renderControls(stateWith("running", { speed: 2 }));
    expect(html).toContain('aria-pressed="true">2×');
    expect(html).toContain('aria-pressed="false">1×');
  });
});

describe("playback houses", () => {
  const rows = [
    complaint({ complaintId: "NW-100002", category: "Billing - estimated read" }),
    complaint({ complaintId: "NW-100003", informationOnly: true }),
    complaint({ complaintId: "NW-100004", transferred: true }),
    complaint({ complaintId: "NW-100005", status: "Open", dateClosed: null, daysToClose: null }),
  ];
  const everything = {
    estimationPreventionRate: 0.6,
    informationDeflectionRate: 0.6,
    transferReductionRate: 1,
    capacityRecoveryRate: 0,
  };

  it("shows every house as an observed complaint before playback", () => {
    expect(countHouseTones(playbackHouses(rows, everything, null, "northflow")).observed).toBe(4);
  });

  it("keeps the baseline free of NorthFlow actions and feedback", () => {
    const houses = playbackHouses(rows, DEFAULT_ASSUMPTIONS, "feedback", "baseline");
    expect(houses.every((house) => house.tone === "observed" && !house.feedback)).toBe(true);
  });

  it("never marks an open complaint as resolved or as feedback", () => {
    const open = playbackHouses(rows, ZERO_ASSUMPTIONS, "feedback", "northflow").at(-1)!;
    expect(open.tone).toBe("observed");
    expect(open.feedback).toBe(false);
    expect(open.connection).toBe("open");
  });

  it("returns feedback only from resolved cases during the feedback stage", () => {
    const verify = playbackHouses(rows, ZERO_ASSUMPTIONS, "verify", "northflow");
    const feedback = playbackHouses(rows, ZERO_ASSUMPTIONS, "feedback", "northflow");
    expect(verify.some((house) => house.feedback)).toBe(false);
    expect(feedback.filter((house) => house.feedback)).toHaveLength(3);
  });

  it("samples a stable, bounded batch", () => {
    const many = Array.from({ length: 500 }, (_, index) =>
      complaint({ complaintId: `NW-${String(200000 + index)}` }),
    );
    const sample = samplePlaybackComplaints([...many].reverse(), 48);
    expect(sample).toHaveLength(48);
    expect(sample).toEqual(samplePlaybackComplaints(many, 48));
  });

  it("filters monthly houses to the selected region", () => {
    const mixed = [...rows, complaint({ complaintId: "NW-900001", region: "Ashford" })];
    const filtered = filterPlaybackComplaints(mixed, "Barrowdale");
    expect(filtered).toHaveLength(rows.length);
    expect(filtered.every((item) => item.region === "Barrowdale")).toBe(true);
  });

  it("keeps the featured complaint in a bounded June sample", () => {
    const many = Array.from({ length: 100 }, (_, index) =>
      complaint({ complaintId: `NW-${String(200000 + index)}` }),
    );
    many.push(complaint({ complaintId: "NW-108365" }));
    expect(samplePlaybackComplaints(many, 48, "NW-108365").some((item) => item.complaintId === "NW-108365")).toBe(true);
    expect(isFeaturedComplaintMoment("Barrowdale", "2025-06")).toBe(true);
    expect(isFeaturedComplaintMoment("Ashford", "2025-06")).toBe(false);
    expect(isFeaturedComplaintMoment("Barrowdale", "2025-07")).toBe(false);
  });

  it("turns resolved links green before removing them and never returns baseline feedback", () => {
    const closed = [complaint()];
    expect(playbackHouses(closed, ZERO_ASSUMPTIONS, "verify", "northflow")[0].connection).toBe("resolved");
    expect(playbackHouses(closed, ZERO_ASSUMPTIONS, "feedback", "northflow")[0].connection).toBe("feedback");
    expect(playbackHouses(closed, ZERO_ASSUMPTIONS, "update", "northflow")[0].connection).toBe("hidden");
    const baseline = playbackHouses(closed, ZERO_ASSUMPTIONS, "feedback", "baseline")[0];
    expect(baseline.connection).toBe("resolved");
    expect(baseline.feedback).toBe(false);
  });

  it("keeps complaint positions deterministic across renders", () => {
    const first = playbackHouses(rows, DEFAULT_ASSUMPTIONS, "route", "northflow");
    const second = playbackHouses([...rows].reverse(), DEFAULT_ASSUMPTIONS, "route", "northflow");
    const byId = new Map(second.map((house) => [house.key, house.position]));
    first.forEach((house) => expect(house.position).toEqual(byId.get(house.key)));
  });

  it("keeps the featured scene understandable without relying on motion", () => {
    const featured = complaint({
      complaintId: "NW-108365",
      category: "Billing - estimated read",
      transferred: true,
      slaBreach: true,
      daysToClose: 31,
      resolutionAction: "Bill corrected and re-issued",
      billCorrectionValue: 217.52,
    });
    const houses = playbackHouses([featured], ZERO_ASSUMPTIONS, "feedback", "northflow");
    const html = renderToStaticMarkup(
      <RegionalComplaintCity
        region="Barrowdale"
        month="2025-06"
        complaints={[featured]}
        houses={houses}
        observedComplaints={120}
        stage="feedback"
        status="running"
        view="northflow"
        completedSteps={8}
      />,
    );
    expect(html).toContain("Complaint NW-108365");
    expect(html).toContain("Verified correction returned to the learning loop.");
    expect(html).toContain("Showing 1 of 120 complaint events");
    expect(html).toContain("Schematic customer homes and resolution hub");
    expect(html).toContain('data-stage="feedback"');
  });

  it("renders the schematic scene when WebGL is unavailable", () => {
    const houses = playbackHouses(rows, ZERO_ASSUMPTIONS, "verify", "northflow");
    const html = renderToStaticMarkup(
      <RegionalComplaintCity
        region="Barrowdale"
        month="2025-07"
        complaints={rows}
        houses={houses}
        observedComplaints={rows.length}
        stage="verify"
        status="paused"
        view="northflow"
        completedSteps={9}
        tickMs={200}
      />,
    );
    expect(html).toContain('data-renderer="schematic"');
    expect(html.match(/class="regional-house /g)).toHaveLength(rows.length);
    expect(html).toContain("regional-link state-resolved");
    expect(html).toContain("Regional Resolution Hub");
    expect(html).toContain("Accessible complaint-event list");
    expect(html).not.toContain("Featured complaint");
  });

  it("provides the accessible complaint batch when the scene cannot load", () => {
    const houses = playbackHouses(rows, ZERO_ASSUMPTIONS, null, "northflow");
    const html = renderToStaticMarkup(
      <ComplaintBatch
        month="2025-06"
        houses={houses}
        observedComplaints={rows.length}
        status="error"
      />,
    );
    expect(html).toContain("Complaint events for this month could not be loaded");
    expect(html).toContain("Schematic customer homes");
  });
});

describe("status copy", () => {
  it("describes idle, paused, and completed playback plainly", () => {
    const base = {
      stage: null,
      month: "2025-06",
      observedComplaints: 1_062,
      cumulativeAvoided: 0,
      totalSteps: 24,
      view: "northflow" as const,
    };
    expect(nowDoingSentence({ ...base, status: "idle" })).toContain("Press Start");
    expect(nowDoingSentence({ ...base, status: "paused", stage: "assess" })).toMatch(/^Paused · June 2025/);
    expect(nowDoingSentence({ ...base, status: "completed", stage: "update" })).toContain("Replay complete");
  });
});
