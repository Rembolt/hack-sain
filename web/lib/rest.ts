const apis = {
  // Add each upstream here. Example:
  // weather: process.env.WEATHER_API_URL,
} as Record<string, string | undefined>;

export const apiNames = Object.keys(apis);

export async function rest<T>(
  api: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = apis[api];
  if (!base) {
    throw new Error(`REST API "${api}" is not configured`);
  }

  const response = await fetch(new URL(path, base), init);
  if (!response.ok) {
    throw new Error(`${api} responded ${response.status}`);
  }

  return response.json() as Promise<T>;
}
