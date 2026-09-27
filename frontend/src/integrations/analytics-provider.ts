import { assertAnalyticsProvider } from "@/integrations/contracts";
import { referenceAnalyticsProvider } from "@/integrations/reference-provider";

// Integration seam: a teammate-owned provider can replace this reference
// implementation after satisfying the same typed contract and provenance rules.
export const analyticsProvider = assertAnalyticsProvider(
  referenceAnalyticsProvider,
);
