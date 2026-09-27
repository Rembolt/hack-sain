import { percent, whole } from "@/presentation/formatters";
import { thousandsCurrency } from "@/presentation/playback-copy";
import type { SimulationResult } from "@/simulation/engine";

export function PlaybackResult({
  result,
  completed,
}: {
  result: SimulationResult;
  completed: boolean;
}) {
  if (!completed) {
    return (
      <section className="pb-result is-pending" aria-labelledby="pb-result-title">
        <h2 id="pb-result-title">24-month result</h2>
        <p>The result appears here when the replay finishes.</p>
      </section>
    );
  }
  return (
    <section className="pb-result" aria-labelledby="pb-result-title">
      <div className="pb-result-head">
        <h2 id="pb-result-title">What the replay shows</h2>
        <span className="scenario-label">Scenario, not forecast.</span>
      </div>
      <div className="pb-result-grid">
        <article><strong>{whole.format(result.totalPrevented)}</strong><span>complaints avoided</span></article>
        <article><strong>{percent(result.complaintReductionRate, 1)}</strong><span>fewer complaints</span></article>
        <article className="pb-result-primary"><strong>≈{thousandsCurrency(result.handlingCostAvoided)}</strong><span>gross handling-cost exposure avoided</span></article>
        <article><strong>{whole.format(result.backlog[12])}</strong><span>backlog cases after 12 months, compared with {whole.format(result.unchangedBacklog[12])} without NorthFlow</span></article>
      </div>
      <p>
        The cost figure is gross handling-cost exposure avoided across the observed 24-month complaint population. It is not net savings, annual savings, or validated model performance.
      </p>
    </section>
  );
}
