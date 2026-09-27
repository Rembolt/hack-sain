import type { PlaybackStep } from "@/integrations/playback-contracts";
import { whole } from "@/presentation/formatters";
import { thousandsCurrency } from "@/presentation/playback-copy";
import type { PlaybackView } from "@/visualization/playback-houses";

export function PlaybackCounters({
  step,
  view,
}: {
  step: PlaybackStep | null;
  view: PlaybackView;
}) {
  const baseline = view === "baseline";
  const replayed = step?.cumulativeObservedComplaints ?? 0;
  const transfers = step?.cumulativeObservedTransfers ?? 0;
  const avoided = baseline ? 0 : step?.cumulativeComplaintsAvoided ?? 0;
  const transfersAvoided = baseline ? 0 : step?.cumulativeTransfersAvoided ?? 0;
  const cost = baseline ? 0 : step?.cumulativeCostAvoided ?? 0;

  return (
    <section className="pb-counters" aria-label="Running totals">
      <article>
        <span>Complaints avoided</span>
        <strong>{whole.format(avoided)}</strong>
        <small>of {whole.format(replayed)} observed complaints replayed</small>
      </article>
      <article>
        <span>Transfers avoided</span>
        <strong>{whole.format(transfersAvoided)}</strong>
        <small>{whole.format(transfers - transfersAvoided)} hand-offs between systems remain</small>
      </article>
      <article className="pb-counter-primary">
        <span>Gross handling-cost exposure avoided</span>
        <strong>{thousandsCurrency(cost)}</strong>
        <small>{baseline ? "No avoided cost without NorthFlow" : "Handling cost only · not net savings"}</small>
      </article>
    </section>
  );
}
