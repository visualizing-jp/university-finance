import { metricById } from "./metrics.ts";
import type { FinanceYear } from "./types.ts";

export type StructureUnit = "percent" | "month";

export interface StructureMetric {
  id: string;
  name: string;
  unit: StructureUnit;
  definition: string;
  reading: string;
  value: (row: FinanceYear) => number | null;
}

function ratio(numerator: number, denominator: number): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return null;
  }
  return numerator / denominator;
}

const tuitionDependence = metricById("tuitionRatio").value;
const personnelRatio = metricById("personnelRatio").value;

export const STRUCTURE_METRICS: StructureMetric[] = [
  {
    id: "educationBalanceRatio",
    name: "教育活動収支差額比率",
    unit: "percent",
    definition: "（教育活動収入計 − 教育活動支出計）÷ 教育活動収入計",
    reading: "教育活動の単年度の余剰。年をまたいだ線で、続く黒字かその年だけかを見る。",
    value: (row) => ratio(row.educationIncome - row.educationExpense, row.educationIncome),
  },
  {
    id: "tuitionDependence",
    name: "学生納付金依存度",
    unit: "percent",
    definition: "学生生徒等納付金 ÷ 経常収入",
    reading: "経常収入のうち学生納付金が占める割合。納付金への依存の厚さ。",
    value: tuitionDependence,
  },
  {
    id: "personnelRatio",
    name: "人件費比率",
    unit: "percent",
    definition: "人件費 ÷ 経常収入",
    reading: "経常収入に対する人件費の厚さ。コストの構造として読む。",
    value: personnelRatio,
  },
  {
    id: "interestDependence",
    name: "運用収益依存度",
    unit: "percent",
    definition: "受取利息・配当金 ÷ 経常収入",
    reading: "経常収入のうち受取利息・配当金が占める割合。資産運用への依存。",
    value: (row) => ratio(row.income.interest, row.ordinaryIncome),
  },
  {
    id: "netAssetRatio",
    name: "純資産比率",
    unit: "percent",
    definition: "純資産 ÷ 総資産",
    reading: "総資産のうち純資産が占める割合。蓄積された財務基盤の厚さ。",
    value: (row) =>
      ratio(row.netAssets.basicFund + row.netAssets.carried, row.assets.fixed + row.assets.current),
  },
  {
    id: "cashMonths",
    name: "手元流動性",
    unit: "month",
    definition: "現金預金 ÷（経常支出 ÷ 12）",
    reading: "現金預金が、経常支出の何か月分か。支払いにすぐ使える資金の厚さ。",
    value: (row) => ratio(row.cashDeposits, row.ordinaryExpense / 12),
  },
];

export const DEFAULT_STRUCTURE_METRIC_ID = "educationBalanceRatio";
export const POSITION_X_ID = "netAssetRatio";
export const POSITION_Y_ID = "educationBalanceRatio";

export function structureMetricById(id: string | null): StructureMetric {
  const found = STRUCTURE_METRICS.find((metric) => metric.id === id);
  if (found != null) return found;
  const fallback = STRUCTURE_METRICS.find((metric) => metric.id === DEFAULT_STRUCTURE_METRIC_ID);
  const first = fallback ?? STRUCTURE_METRICS[0];
  if (first == null) throw new Error("経営指標がない");
  return first;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? null;
  const left = sorted[mid - 1];
  const right = sorted[mid];
  if (left == null || right == null) return null;
  return (left + right) / 2;
}

/**
 * 点が潰れないよう、ゼロから遠い帯はデータ幅に合わせる。
 * ゼロ付近と負の値は、収支ゼロの線が残るようゼロを含める。
 * 全大学の中央値帯は、対象が増えたときにドットの背景へ足す。今は4大学だけなので出さない。
 */
export function paddedExtent(values: number[], unit: StructureUnit): [number, number] {
  if (values.length === 0) return [0, unit === "month" ? 1 : 0.01];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const floor = unit === "month" ? 0.4 : 0.008;
  const span = Math.max(max - min, floor);
  let lo = min - span * 0.18;
  const hi = max + span * 0.18;
  const nearZero = min >= 0 && min <= span * 1.25;
  if (min < 0 || nearZero) lo = Math.min(lo, 0);
  if (min >= 0 && lo < 0) lo = 0;
  if (hi <= lo) return [lo, lo + floor];
  return [lo, hi];
}

const SHORT_NAMES: Record<string, string> = {
  tamabi: "多摩美",
  musabi: "武蔵美",
  zokei: "東京造形",
  joshibi: "女子美",
};

export function shortName(id: string, fallback: string): string {
  return SHORT_NAMES[id] ?? fallback;
}
