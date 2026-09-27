/** Server-side calls to the unified database. The browser never talks to the mock sources. */

const unifiedBase = (process.env.UNIFIED_API_URL ?? "http://127.0.0.1:8003").replace(/\/$/, "");

export async function unifiedFetch(path: string, init?: RequestInit): Promise<Response> {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  try {
    return await fetch(`${unifiedBase}${suffix}`, {
      ...init,
      cache: "no-store",
      signal: init?.signal ?? AbortSignal.timeout(8000),
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });
  } catch {
    return Response.json({ message: "Unified database is not reachable." }, { status: 502 });
  }
}
