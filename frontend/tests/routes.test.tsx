import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DashboardPage from "@/app/dashboard/page";
import Home from "@/app/page";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { LandingExperience } from "@/components/landing-experience";
import { NorthFlowProvider } from "@/state/northflow-context";

describe("route composition", () => {
  it("renders the evidence experience on the landing route", () => {
    const route = Home();
    expect(isValidElement(route)).toBe(true);
    expect(route.type).toBe(LandingExperience);
    const html = renderToStaticMarkup(
      <NorthFlowProvider>{route}</NorthFlowProvider>,
    );
    expect(html).toContain("Connecting observed evidence");
  });

  it("renders the analytics experience on the dashboard route", () => {
    const route = DashboardPage();
    expect(isValidElement(route)).toBe(true);
    expect(route.type).toBe(AnalyticsDashboard);
    const html = renderToStaticMarkup(
      <NorthFlowProvider>{route}</NorthFlowProvider>,
    );
    expect(html).toContain("Connecting observed evidence");
  });
});
