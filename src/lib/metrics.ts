import type { FinanceYear } from "./types.ts";

export const METRIC_IDS = [
  "educationRatio",
  "personnelRatio",
  "adminRatio",
  "tuitionRatio",
  "surplusRatio",
  "liabilityRatio",
] as const;

export type MetricId = (typeof METRIC_IDS)[number];
export const DEFAULT_METRIC: MetricId = "educationRatio";

const METRIC_QUERY: Record<string, MetricId> = Object.fromEntries(
  METRIC_IDS.map((id) => [id, id]),
) as Record<string, MetricId>;

export function parseMetric(raw: string | null): MetricId {
  return (raw != null ? METRIC_QUERY[raw] : undefined) ?? DEFAULT_METRIC;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

export interface MetricDef {
  id: MetricId;
  label: string;
  hint: string;
  value: (row: FinanceYear) => number | null;
}

export const METRICS: MetricDef[] = [
  {
    id: "educationRatio",
    label: "教育研究経費比率",
    hint: "教育研究経費 ÷ 事業活動収入",
    value: (row) => ratio(row.expense.education, row.activityIncome),
  },
  {
    id: "personnelRatio",
    label: "人件費比率",
    hint: "人件費 ÷ 事業活動収入",
    value: (row) => ratio(row.expense.personnel, row.activityIncome),
  },
  {
    id: "adminRatio",
    label: "管理経費比率",
    hint: "管理経費 ÷ 事業活動収入",
    value: (row) => ratio(row.expense.admin, row.activityIncome),
  },
  {
    id: "tuitionRatio",
    label: "学生生徒等納付金比率",
    hint: "学生生徒等納付金 ÷ 事業活動収入",
    value: (row) => ratio(row.income.tuition, row.activityIncome),
  },
  {
    id: "surplusRatio",
    label: "事業活動収支差額比率",
    hint: "基本金組入前当年度収支差額 ÷ 事業活動収入",
    value: (row) => ratio(row.balanceBeforeReserve, row.activityIncome),
  },
  {
    id: "liabilityRatio",
    label: "総負債比率",
    hint: "総負債 ÷ 総資産",
    value: (row) =>
      ratio(
        row.liabilities.fixed + row.liabilities.current,
        row.assets.fixed + row.assets.current,
      ),
  },
];

export function metricById(id: MetricId): MetricDef {
  const found = METRICS.find((item) => item.id === id);
  if (found == null) throw new Error(`指標がない: ${id}`);
  return found;
}
