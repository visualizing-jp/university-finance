import { DEFAULT_METRIC_ID } from "./metrics.ts";
import { DEFAULT_STRUCTURE_METRIC_ID } from "./structure.ts";

export const VIEW_IDS = ["income", "balance", "cash", "trend"] as const;
export type ViewId = (typeof VIEW_IDS)[number];
export const DEFAULT_VIEW: ViewId = "income";
export type AppMode = "view" | "compare" | "structure";
export const DEFAULT_YEAR = 2025;

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
  mode: AppMode;
  metric: string;
}

export function parseView(raw: string | null): ViewId {
  return (raw != null ? VIEW_QUERY[raw] : undefined) ?? DEFAULT_VIEW;
}

export function parsePermalink(search: string): PermalinkQuery {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const q = new URLSearchParams(raw);
  const empty = raw.trim() === "";
  const idRaw = q.get("id");
  const yearRaw = q.get("year");
  const id = idRaw != null && idRaw.trim() !== "" ? idRaw.trim() : null;
  const modeParam = q.get("mode");
  const mode: AppMode =
    modeParam === "structure" ? "structure" : empty || modeParam === "compare" ? "compare" : "view";
  const year =
    yearRaw != null && /^\d{4}$/.test(yearRaw)
      ? Number(yearRaw)
      : mode === "view"
        ? null
        : DEFAULT_YEAR;
  const metricRaw = q.get("metric");
  return {
    id,
    year,
    view: parseView(q.get("view")),
    mode,
    metric:
      metricRaw != null && metricRaw.trim() !== ""
        ? metricRaw.trim()
        : mode === "structure"
          ? DEFAULT_STRUCTURE_METRIC_ID
          : DEFAULT_METRIC_ID,
  };
}

export function formatStructurePermalink(
  year: number,
  metric: string = DEFAULT_STRUCTURE_METRIC_ID,
): string {
  const q = new URLSearchParams();
  q.set("mode", "structure");
  q.set("year", String(year));
  if (metric !== DEFAULT_STRUCTURE_METRIC_ID) q.set("metric", metric);
  return `?${q.toString()}`;
}

export function formatComparePermalink(year: number, metric: string = DEFAULT_METRIC_ID): string {
  const q = new URLSearchParams();
  q.set("mode", "compare");
  q.set("year", String(year));
  if (metric !== DEFAULT_METRIC_ID) q.set("metric", metric);
  return `?${q.toString()}`;
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
