import { describe, expect, it } from "vitest";
import {
  buildNorthFlowHref,
  DEFAULT_COMPLAINT,
  DEFAULT_MONTH,
  DEFAULT_REGION,
  parseNorthFlowUrlState,
} from "@/state/url-state";

describe("URL-backed shared state", () => {
  it("uses the contracted demonstration selection by default", () => {
    const state = parseNorthFlowUrlState("");
    expect(state.month).toBe(DEFAULT_MONTH);
    expect(state.region).toBe(DEFAULT_REGION);
    expect(state.complaintId).toBe(DEFAULT_COMPLAINT);
    expect(state.mode).toBe("comparison");
    expect(state.assumptions).toEqual({
      estimationPreventionRate: 0.3,
      informationDeflectionRate: 0.25,
      transferReductionRate: 0.5,
      capacityRecoveryRate: 0,
    });
  });

  it("round-trips filters, complaint, assumptions, and comparison mode", () => {
    const input = parseNorthFlowUrlState(
      "?month=2026-02&region=Fenwick&complaint=NW-123456&view=scenario&estimate=0.42&inform=0.31&transfer=0.77&capacity=0.08",
    );
    const href = buildNorthFlowHref("/dashboard", input);
    const output = parseNorthFlowUrlState(href.slice(href.indexOf("?")));
    expect(output).toEqual(input);
  });

  it("rejects invalid filters and out-of-range assumptions", () => {
    const state = parseNorthFlowUrlState(
      "?month=tomorrow&region=Toronto&complaint=account-1&estimate=2&capacity=-1",
    );
    expect(state.month).toBe(DEFAULT_MONTH);
    expect(state.region).toBe(DEFAULT_REGION);
    expect(state.complaintId).toBe(DEFAULT_COMPLAINT);
    expect(state.assumptions.estimationPreventionRate).toBe(0.3);
    expect(state.assumptions.capacityRecoveryRate).toBe(0);
  });
});
