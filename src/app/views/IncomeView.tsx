import { formatShare, formatYen } from "../../lib/format.ts";
import { EXPENSE_NOTE, INCOME_NOTE } from "../../lib/taxonomy.ts";
import type { FinanceYear } from "../../lib/types.ts";
import { YearSlider } from "../sankey/YearSlider.tsx";
import { SankeyChart } from "../sankey/SankeyChart.tsx";

interface IncomeViewProps {
  row: FinanceYear;
  years: number[];
  onYear: (year: number) => void;
}

export function IncomeView({ row, years, onYear }: IncomeViewProps) {
  const surplus = row.balanceBeforeReserve >= 0;
  return (
    <>
      <YearSlider years={years} year={row.year} onYear={onYear} />
      <SankeyChart row={row} />
      <dl className="facts">
        <div>
          <dt>事業活動支出</dt>
          <dd>{formatYen(row.activityExpense)}</dd>
        </div>
        <div>
          <dt>{surplus ? "基本金組入前収支差額（黒字）" : "基本金組入前収支差額（赤字）"}</dt>
          <dd>{formatYen(Math.abs(row.balanceBeforeReserve))}</dd>
        </div>
        <div>
          <dt>収入に対する差額</dt>
          <dd>{formatShare(row.balanceBeforeReserve, row.activityIncome)}</dd>
        </div>
      </dl>
      <p className="source">
        {INCOME_NOTE}
        {EXPENSE_NOTE}
      </p>
    </>
  );
}
