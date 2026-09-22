import { DEFAULT_METRIC, parseMetric, type MetricId } from "./metrics.ts";

export const VIEW_IDS = ["income", "balance", "cash", "trend"] as const;
export type ViewId = (typeof VIEW_IDS)[number];
export const DEFAULT_VIEW: ViewId = "income";

export type ModeId = "compare" | "look";
export const DEFAULT_MODE: ModeId = "compare";
export const DEFAULT_YEAR = 2025;

const VIEW_QUERY: Record<string, ViewId> = {
  income: "income",
  balance: "balance",
  cash: "cash",
  trend: "trend",
};

export interface PermalinkQuery {
  mode: ModeId;
  id: string | null;
  year: number | null;
  view: ViewId;
  metric: MetricId;
}

export function parseView(raw: string | null): ViewId {
  return (raw != null ? VIEW_QUERY[raw] : undefined) ?? DEFAULT_VIEW;
}

export function parsePermalink(search: string): PermalinkQuery {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const q = new URLSearchParams(raw);
  const empty = raw.trim() === "";
  const modeRaw = q.get("mode");
  const idRaw = q.get("id");
  const yearRaw = q.get("year");
  const id = idRaw != null && idRaw.trim() !== "" ? idRaw.trim() : null;
  const mode: ModeId = empty || modeRaw === "compare" ? "compare" : "look";
  const year =
    yearRaw != null && /^\d{4}$/.test(yearRaw)
      ? Number(yearRaw)
      : mode === "compare"
        ? DEFAULT_YEAR
        : null;
  return { mode, id, year, view: parseView(q.get("view")), metric: parseMetric(q.get("metric")) };
}

export function formatPermalink(id: string, year: number, view: ViewId = DEFAULT_VIEW): string {
  const q = new URLSearchParams();
  q.set("id", id);
  q.set("year", String(year));
  if (view !== DEFAULT_VIEW) q.set("view", view);
  return `?${q.toString()}`;
}

export function formatComparePermalink(
  year: number,
  metric: MetricId = DEFAULT_METRIC,
): string {
  const q = new URLSearchParams();
  q.set("mode", "compare");
  q.set("year", String(year));
  if (metric !== DEFAULT_METRIC) q.set("metric", metric);
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
