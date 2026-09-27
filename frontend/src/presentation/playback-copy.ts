import { whole } from "@/presentation/formatters";
import type { PlaybackStage, PlaybackStatus } from "@/state/playback-reducer";
import type { PlaybackView } from "@/visualization/playback-houses";

export const ILLUSTRATIVE_LABEL =
  "Illustrative learning-loop simulation using observed Northwind data.";

export const STAGE_LABELS: Record<PlaybackStage, { title: string; short: string }> = {
  enter: { title: "Complaint enters", short: "Enter" },
  assess: { title: "NorthFlow checks risk", short: "Check risk" },
  route: { title: "Proceed, review, or reroute", short: "Route" },
  verify: { title: "Resolution verified", short: "Verify" },
  feedback: { title: "Feedback returns", short: "Learn" },
  update: { title: "Counters update", short: "Update" },
};

const monthFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const shortMonthFormatter = new Intl.DateTimeFormat("en-CA", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

function monthDate(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1, 1));
}

export function monthLabel(month: string) {
  return monthFormatter.format(monthDate(month));
}

export function shortMonthLabel(month: string) {
  return shortMonthFormatter.format(monthDate(month));
}

export function thousandsCurrency(value: number) {
  const thousands = Math.round(value / 1_000);
  return thousands === 0 ? "$0" : `$${whole.format(thousands)}K`;
}

export function nowDoingSentence({
  status,
  stage,
  month,
  observedComplaints,
  cumulativeAvoided,
  totalSteps,
  view,
}: {
  status: PlaybackStatus;
  stage: PlaybackStage | null;
  month: string | null;
  observedComplaints: number;
  cumulativeAvoided: number;
  totalSteps: number;
  view: PlaybackView;
}) {
  if (status === "idle" || !stage || !month) {
    return `Press Start to replay ${totalSteps} months of observed Northwind complaints through the NorthFlow learning loop.`;
  }
  if (status === "completed") {
    return view === "baseline"
      ? `Replay complete. Without NorthFlow, every complaint follows today's process.`
      : `Replay complete. All ${totalSteps} months have passed through the learning loop.`;
  }
  const when = monthLabel(month);
  const prefix = status === "paused" ? `Paused · ${when}. ` : `${when}: `;
  if (view === "baseline") {
    const baselineCopy: Record<PlaybackStage, string> = {
      enter: `${whole.format(observedComplaints)} complaints arrive.`,
      assess: "No risk check. Complaints follow today's process.",
      route: "Cases move between systems as they do today.",
      verify: "Resolutions are recorded but not reused.",
      feedback: "Nothing returns to a learning system.",
      update: "No complaints or transfers are avoided.",
    };
    return prefix + baselineCopy[stage];
  }
  const copy: Record<PlaybackStage, string> = {
    enter: `${whole.format(observedComplaints)} complaints enter the workflow.`,
    assess: "NorthFlow checks each case for billing-risk signals.",
    route: "Low-risk cases proceed. Risky cases are reviewed or rerouted, and some are prevented.",
    verify: "Corrections and resolutions are confirmed.",
    feedback: "Verified outcomes return to the learning loop.",
    update: `${whole.format(cumulativeAvoided)} complaints avoided so far.`,
  };
  return prefix + copy[stage];
}
