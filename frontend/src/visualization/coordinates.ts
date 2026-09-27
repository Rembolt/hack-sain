import type { Region } from "@/domain/types";

export type SchematicPoint = { x: number; y: number };

export function stableHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function schematicCoordinates(
  complaintId: string,
  region: Region,
): SchematicPoint {
  const first = stableHash(`${complaintId}|${region}|x`);
  const second = stableHash(`${complaintId}|${region}|y`);
  return {
    x: 6 + (first % 8800) / 100,
    y: 8 + (second % 7400) / 100,
  };
}
