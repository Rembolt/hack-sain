import {
  validateMonthData,
  validateSharedPayloads,
} from "@/data/validate-payload";

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url} returned ${response.status}.`);
  return response.json() as Promise<unknown>;
}

export async function loadSharedBrowserData(signal?: AbortSignal) {
  const [summary, lookups, manifest] = await Promise.all([
    fetchJson("/data/summary.json", signal),
    fetchJson("/data/lookups.json", signal),
    fetchJson("/data/manifest.json", signal),
  ]);
  return validateSharedPayloads(summary, lookups, manifest);
}

export async function loadMonthBrowserData(
  month: string,
  signal?: AbortSignal,
) {
  const payload = await fetchJson(`/data/months/${month}.json`, signal);
  return validateMonthData(payload, month);
}
