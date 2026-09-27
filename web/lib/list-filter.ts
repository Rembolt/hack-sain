const isoDate = /^(\d{4})-(\d{2})-\d{2}/;

export const months = [
  ["01", "January"],
  ["02", "February"],
  ["03", "March"],
  ["04", "April"],
  ["05", "May"],
  ["06", "June"],
  ["07", "July"],
  ["08", "August"],
  ["09", "September"],
  ["10", "October"],
  ["11", "November"],
  ["12", "December"],
] as const;

export type DatedValue = {
  key: string;
  iso: string;
};

export function yearsIn(dates: string[]) {
  return [
    ...new Set(
      dates.flatMap((date) => {
        const match = isoDate.exec(date);
        return match ? [match[1]] : [];
      }),
    ),
  ].sort((a, b) => b.localeCompare(a));
}

function pointIn(date: string, year: string, month: string) {
  const match = isoDate.exec(date);
  if (!match) return false;
  if (year && match[1] !== year) return false;
  if (month && match[2] !== month) return false;
  return true;
}

function spanCovers(start: string, end: string, year: string, month: string) {
  const from = start.slice(0, 7);
  const to = end.slice(0, 7);
  if (year && month) {
    const cursor = `${year}-${month}`;
    return cursor >= from && cursor <= to;
  }
  if (year) return start.slice(0, 4) <= year && year <= end.slice(0, 4);
  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 240) {
    guard += 1;
    if (cursor.slice(5, 7) === month) return true;
    const [y, m] = cursor.split("-").map(Number);
    const nextMonth = m === 12 ? 1 : m + 1;
    const nextYear = m === 12 ? y + 1 : y;
    cursor = `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
    if (cursor.length < 7) break;
  }
  return false;
}

export function matchesList(
  texts: string[],
  dates: DatedValue[],
  query: string,
  year: string,
  month: string,
) {
  const needle = query.trim().toLowerCase();
  if (needle && !texts.join("\n").toLowerCase().includes(needle)) return false;
  if (!year && !month) return true;
  const start = dates.find((date) => date.key === "startDate")?.iso;
  const end = dates.find((date) => date.key === "endDate")?.iso;
  if (start && end) return spanCovers(start, end, year, month);
  const opened = dates.find((date) => date.key === "createdDate")?.iso;
  const pool = opened ? [opened] : dates.map((date) => date.iso);
  if (pool.length === 0) return false;
  return pool.some((date) => pointIn(date, year, month));
}
