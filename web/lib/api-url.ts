/** Local routes live under /api. An upstream base, if set, is used as-is. */
export function apiUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${suffix}` : `/api${suffix}`;
}
