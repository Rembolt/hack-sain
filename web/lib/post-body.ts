/** Reads the named string fields out of a JSON body. Anything missing reads as "". */
export async function stringFields<K extends string>(
  request: Request,
  keys: readonly K[],
): Promise<Record<K, string>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const source = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const out = {} as Record<K, string>;
  for (const key of keys) {
    const value = source[key];
    out[key] = typeof value === "string" ? value : "";
  }
  return out;
}
