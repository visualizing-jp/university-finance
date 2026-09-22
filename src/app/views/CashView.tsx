import { formatYen } from "../../lib/format.ts";
import type { FinanceYear } from "../../lib/types.ts";
import { useSize } from "../hooks/useSize.ts";
import { YearSlider } from "../sankey/YearSlider.tsx";
import { COLOR_DEDUCT, COLOR_EXPENSE, COLOR_TOTAL } from "../sankey/colors.ts";

interface CashViewProps {
  row: FinanceYear;
  years: number[];
  onYear: (year: number) => void;
}

interface Step {
  key: string;
  label: string;
  value: number;
  total: boolean;
}

export function CashView({ row, years, onYear }: CashViewProps) {
  return (
    <>
      <YearSlider years={years} year={row.year} onYear={onYear} />
      <Waterfall row={row} />
      <dl className="facts">
        <div>
          <dt>教育活動</dt>
          <dd>{formatYen(row.cash.education)}</dd>
        </div>
        <div>
          <dt>施設整備等活動</dt>
          <dd>{formatYen(row.cash.facility)}</dd>
        </div>
        <div>
          <dt>その他の活動</dt>
          <dd>{formatYen(row.cash.other)}</dd>
        </div>
      </dl>
      <p className="source">
        活動区分資金収支差額。前年度繰越支払資金に3つの差額を足すと、翌年度繰越支払資金になる。マイナスは資金の減少。
      </p>
    </>
  );
}

function Waterfall({ row }: { row: FinanceYear }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const width = Math.max(size.width, 640);
  const height = 420;
  const steps: Step[] = [
    { key: "opening", label: "前年度繰越", value: row.cash.opening, total: true },
    { key: "education", label: "教育活動", value: row.cash.education, total: false },
    { key: "facility", label: "施設整備", value: row.cash.facility, total: false },
    { key: "other", label: "その他", value: row.cash.other, total: false },
    { key: "closing", label: "翌年度繰越", value: row.cash.closing, total: true },
  ];

  let cursor = 0;
  const bars = steps.map((step) => {
    const from = step.total ? 0 : cursor;
    const to = step.total ? step.value : cursor + step.value;
    cursor = to;
    return { ...step, from, to };
  });
  const peak = Math.max(...bars.flatMap((bar) => [bar.from, bar.to]), 1);
  const pad = { top: 36, right: 12, bottom: 48, left: 12 };
  const innerH = height - pad.top - pad.bottom;
  const slot = (width - pad.left - pad.right) / bars.length;
  const barW = Math.min(56, slot * 0.46);
  const y = (amount: number) => pad.top + innerH - (amount / peak) * innerH;

  return (
    <div className="chart-wrap" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={`${row.year}年度の活動区分資金収支`}>
        {bars.map((bar, index) => {
          const x = pad.left + slot * index + (slot - barW) / 2;
          const top = Math.min(bar.from, bar.to);
          const bottom = Math.max(bar.from, bar.to);
          const positive = bar.total || bar.value >= 0;
          const fill = bar.total ? COLOR_TOTAL : positive ? COLOR_EXPENSE : COLOR_DEDUCT;
          const next = bars[index + 1];
          return (
            <g key={bar.key}>
              {next != null ? (
                <line
                  className="bridge"
                  x1={x + barW}
                  x2={pad.left + slot * (index + 1) + (slot - barW) / 2}
                  y1={y(bar.to)}
                  y2={y(bar.to)}
                />
              ) : null}
              <rect className="stack-rect" x={x} y={y(bottom)} width={barW} height={Math.max(y(top) - y(bottom), 1)} fill={fill} />
              <text className="bar-value" x={x + barW / 2} y={y(bottom) - 8} textAnchor="middle">
                {formatYen(bar.value)}
              </text>
              <text className="bar-label" x={x + barW / 2} y={height - 18} textAnchor="middle">
                {bar.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
