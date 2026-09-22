export const VIEW_IDS = ["income", "balance", "cash", "trend"] as const;
export type ViewId = (typeof VIEW_IDS)[number];
export const DEFAULT_VIEW: ViewId = "income";

const VIEW_QUERY: Record<string, ViewId> = {
  income: "income",
  balance: "balance",
  cash: "cash",
  trend: "trend",
};

export interface PermalinkQuery {
  id: string | null;
  year: number | null;
  view: ViewId;
}

export function parseView(raw: string | null): ViewId {
  return (raw != null ? VIEW_QUERY[raw] : undefined) ?? DEFAULT_VIEW;
}

export function parsePermalink(search: string): PermalinkQuery {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const idRaw = q.get("id");
  const yearRaw = q.get("year");
  const id = idRaw != null && idRaw.trim() !== "" ? idRaw.trim() : null;
  const year = yearRaw != null && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null;
  return { id, year, view: parseView(q.get("view")) };
}

export function formatPermalink(id: string, year: number, view: ViewId = DEFAULT_VIEW): string {
  const q = new URLSearchParams();
  q.set("id", id);
  q.set("year", String(year));
  if (view !== DEFAULT_VIEW) q.set("view", view);
  return `?${q.toString()}`;
}

export function snapYear(years: number[], requested: number | null): number {
  const last = years[years.length - 1];
  if (last == null) throw new Error("年度がない");
  if (requested == null) return last;
  if (years.includes(requested)) return requested;
  return years.reduce((best, year) =>
    Math.abs(year - requested) < Math.abs(best - requested) ? year : best,
  );
}
