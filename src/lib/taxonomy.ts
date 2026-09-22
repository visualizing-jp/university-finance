import type { ExpenseParts, FinanceYear, IncomeParts } from "./types.ts";

export interface Bucket<K extends string> {
  key: K;
  label: string;
}

export const INCOME_BUCKETS: Bucket<keyof IncomeParts>[] = [
  { key: "tuition", label: "学生生徒等納付金" },
  { key: "subsidies", label: "補助金" },
  { key: "donations", label: "寄付金" },
  { key: "auxiliary", label: "付随事業収入" },
  { key: "interest", label: "受取利息・配当金" },
  { key: "other", label: "その他" },
];

export const EXPENSE_BUCKETS: Bucket<keyof ExpenseParts>[] = [
  { key: "personnel", label: "人件費" },
  { key: "education", label: "教育研究経費" },
  { key: "admin", label: "管理経費" },
  { key: "other", label: "その他" },
];

export const INCOME_NOTE =
  "補助金は経常費等補助金と施設設備補助金の合計。寄付金は教育活動の寄付金に、施設設備寄付金と特別収入の現物寄付を足したもの。その他の収入は手数料、雑収入、資産売却差額、教育活動外のその他、特別収入の残り。";

export const EXPENSE_NOTE =
  "その他の支出は、徴収不能額、借入金等利息、教育活動外のその他、資産処分差額、その他の特別支出。";

export const OPERATING_ASSET_NOTE = "運用資産は現金預金、特定資産、有価証券の合計。";

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
  value: (row: FinanceYear) => number;
}

export interface TrendGroup {
  id: string;
  title: string;
  series: TrendSeries[];
}

export const TREND_GROUPS: TrendGroup[] = [
  {
    id: "income",
    title: "収入",
    series: [
      { key: "tuition", label: "学生生徒等納付金", color: "#c51b7d", value: (row) => row.income.tuition },
      { key: "subsidies", label: "補助金", color: "#e9a3c9", value: (row) => row.income.subsidies },
      { key: "donations", label: "寄付金", color: "#8e0152", value: (row) => row.income.donations },
    ],
  },
  {
    id: "expense",
    title: "支出",
    series: [
      { key: "personnel", label: "人件費", color: "#276419", value: (row) => row.expense.personnel },
      { key: "education", label: "教育研究経費", color: "#4d9221", value: (row) => row.expense.education },
      { key: "admin", label: "管理経費", color: "#b8e186", value: (row) => row.expense.admin },
    ],
  },
  {
    id: "stock",
    title: "ストック",
    series: [
      {
        key: "assets",
        label: "総資産",
        color: "#2c3338",
        value: (row) => row.assets.fixed + row.assets.current,
      },
      { key: "operating", label: "運用資産", color: "#0090e6", value: (row) => row.operatingAssets },
      {
        key: "liabilities",
        label: "総負債",
        color: "#c51b7d",
        value: (row) => row.liabilities.fixed + row.liabilities.current,
      },
      {
        key: "net",
        label: "純資産",
        color: "#5d6b76",
        value: (row) => row.netAssets.basicFund + row.netAssets.carried,
      },
    ],
  },
  {
    id: "balance",
    title: "収支差額",
    series: [
      {
        key: "balance",
        label: "基本金組入前当年度収支差額",
        color: "#5e4fa2",
        value: (row) => row.balanceBeforeReserve,
      },
    ],
  },
];
