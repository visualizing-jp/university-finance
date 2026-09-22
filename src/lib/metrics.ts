import type { FinanceYear } from "./types.ts";

export type MetricUnit = "percent" | "year";

export interface Metric {
  id: string;
  group: "収支" | "コスト" | "収入" | "安全性";
  name: string;
  unit: MetricUnit;
  /** 収支差額は負になりうるので、横棒はゼロから左右へ伸ばす。 */
  diverging: boolean;
  definition: string;
  value: (row: FinanceYear) => number | null;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

export const METRICS: Metric[] = [
  {
    id: "activityBalanceRatio",
    group: "収支",
    name: "事業活動収支差額比率",
    unit: "percent",
    diverging: true,
    definition: "基本金組入前当年度収支差額 ÷ 事業活動収入",
    value: (row) => ratio(row.balanceBeforeReserve, row.activityIncome),
  },
  {
    id: "ordinaryBalanceRatio",
    group: "収支",
    name: "経常収支差額比率",
    unit: "percent",
    diverging: true,
    definition: "経常収支差額 ÷ 経常収入",
    value: (row) => ratio(row.ordinaryBalance, row.ordinaryIncome),
  },
  {
    id: "personnelRatio",
    group: "コスト",
    name: "人件費比率",
    unit: "percent",
    diverging: false,
    definition: "人件費 ÷ 経常収入",
    value: (row) => ratio(row.expense.personnel, row.ordinaryIncome),
  },
  {
    id: "educationRatio",
    group: "コスト",
    name: "教育研究経費比率",
    unit: "percent",
    diverging: false,
    definition: "教育研究経費 ÷ 経常収入",
    value: (row) => ratio(row.expense.education, row.ordinaryIncome),
  },
  {
    id: "adminRatio",
    group: "コスト",
    name: "管理経費比率",
    unit: "percent",
    diverging: false,
    definition: "管理経費 ÷ 経常収入",
    value: (row) => ratio(row.expense.admin, row.ordinaryIncome),
  },
  {
    id: "tuitionRatio",
    group: "収入",
    name: "学生生徒等納付金比率",
    unit: "percent",
    diverging: false,
    definition: "学生生徒等納付金 ÷ 経常収入",
    value: (row) => ratio(row.income.tuition, row.ordinaryIncome),
  },
  {
    id: "subsidyRatio",
    group: "収入",
    name: "補助金比率",
    unit: "percent",
    diverging: false,
    definition: "経常費等補助金 ÷ 経常収入",
    value: (row) => ratio(row.ordinarySubsidy, row.ordinaryIncome),
  },
  {
    id: "donationRatio",
    group: "収入",
    name: "寄付金比率",
    unit: "percent",
    diverging: false,
    definition: "教育活動の寄付金 ÷ 経常収入",
    value: (row) => ratio(row.ordinaryDonation, row.ordinaryIncome),
  },
  {
    id: "operatingReserveRatio",
    group: "安全性",
    name: "運用資産余裕比率",
    unit: "year",
    diverging: false,
    definition: "（運用資産 − 外部負債）÷ 経常支出",
    value: (row) => ratio(row.operatingAssets - row.externalLiabilities, row.ordinaryExpense),
  },
  {
    id: "liabilityRatio",
    group: "安全性",
    name: "総負債比率",
    unit: "percent",
    diverging: false,
    definition: "総負債 ÷ 総資産",
    value: (row) =>
      ratio(row.liabilities.fixed + row.liabilities.current, row.assets.fixed + row.assets.current),
  },
  {
    id: "currentRatio",
    group: "安全性",
    name: "流動比率",
    unit: "percent",
    diverging: false,
    definition: "流動資産 ÷ 流動負債",
    value: (row) => ratio(row.assets.current, row.liabilities.current),
  },
];

export const DEFAULT_METRIC_ID = "educationRatio";

/** 多摩美は朱、武蔵野は緑。3校目以降は墨。 */
const SCHOOL_COLORS = ["#c51b7d", "#4d9221", "#2c3338"] as const;

export function schoolColor(index: number): string {
  return SCHOOL_COLORS[index] ?? SCHOOL_COLORS[SCHOOL_COLORS.length - 1] ?? "#2c3338";
}

export function metricById(id: string | null): Metric {
  const found = METRICS.find((metric) => metric.id === id);
  if (found != null) return found;
  const fallback = METRICS.find((metric) => metric.id === DEFAULT_METRIC_ID);
  const first = fallback ?? METRICS[0];
  if (first == null) throw new Error("指標がない");
  return first;
}

export function metricGroups(): Array<{ group: Metric["group"]; metrics: Metric[] }> {
  const groups: Metric["group"][] = ["収支", "コスト", "収入", "安全性"];
  return groups.map((group) => ({
    group,
    metrics: METRICS.filter((metric) => metric.group === group),
  }));
}
