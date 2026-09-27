import { describe, expect, it } from "vitest";
import { schematicCoordinates } from "@/visualization/coordinates";

describe("schematic coordinates", () => {
  it("are stable and bounded", () => {
    const first = schematicCoordinates("NW-108365", "Barrowdale");
    const second = schematicCoordinates("NW-108365", "Barrowdale");
    expect(first).toEqual(second);
    expect(first.x).toBeGreaterThanOrEqual(6);
    expect(first.x).toBeLessThan(94);
    expect(first.y).toBeGreaterThanOrEqual(8);
    expect(first.y).toBeLessThan(82);
  });

  it("uses complaint and region, not account identity", () => {
    expect(schematicCoordinates("NW-108365", "Barrowdale")).not.toEqual(
      schematicCoordinates("NW-108365", "Ashford"),
    );
  });
});
