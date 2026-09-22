import { useId } from "react";
import { formatYen } from "../../lib/format.ts";
import type { FinanceYear } from "../../lib/types.ts";
import { responsiveSvgProps } from "../chart/responsiveSvg.ts";
import { useSize } from "../hooks/useSize.ts";
import { YearSlider } from "../sankey/YearSlider.tsx";
import { COLOR_DEDUCT, COLOR_EXPENSE, COLOR_INCOME, COLOR_TOTAL } from "../sankey/colors.ts";

interface BalanceViewProps {
  row: FinanceYear;
  years: number[];
  onYear: (year: number) => void;
}

interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
  hatch?: boolean;
}

export function BalanceView({ row, years, onYear }: BalanceViewProps) {
  const assets = row.assets.fixed + row.assets.current;
  const liabilities = row.liabilities.fixed + row.liabilities.current;
  const net = row.netAssets.basicFund + row.netAssets.carried;
  const patternId = useId().replace(/:/g, "");

  return (
    <>
      <YearSlider years={years} year={row.year} onYear={onYear} />
      <BalanceFigure row={row} patternId={patternId} />
      <dl className="facts">
        <div>
          <dt>総資産</dt>
          <dd>{formatYen(assets)}</dd>
        </div>
        <div>
          <dt>総負債</dt>
          <dd>{formatYen(liabilities)}</dd>
        </div>
        <div>
          <dt>純資産</dt>
          <dd>{formatYen(net)}</dd>
        </div>
        <div>
          <dt>うち繰越収支差額</dt>
          <dd>{formatYen(row.netAssets.carried)}</dd>
        </div>
      </dl>
      <p className="source">
        左が資産、右が負債と純資産。繰越収支差額がマイナスの年は、基本金の上端を控除して描き、左右の高さは資産合計で揃う。
      </p>
    </>
  );
}

function BalanceFigure({ row, patternId }: { row: FinanceYear; patternId: string }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const width = 720;
  const height = 460;
  const assets = row.assets.fixed + row.assets.current;
  const liab = row.liabilities.fixed + row.liabilities.current;
  const basic = row.netAssets.basicFund;
  const carried = row.netAssets.carried;
  const peak = liab + basic + Math.max(carried, 0);
  const scaleMax = Math.max(assets, peak, 1);
  const padTop = 28;
  const padBottom = 16;
  const inner = height - padTop - padBottom;
  const y = (amount: number) => padTop + inner - (amount / scaleMax) * inner;
  const h = (amount: number) => (Math.abs(amount) / scaleMax) * inner;
  const colW = 72;
  const leftX = Math.max(168, width * 0.28);
  const rightX = Math.min(width - 168 - colW, width * 0.62);

  const left: Segment[] = [
    { key: "fixed-asset", label: "固定資産", value: row.assets.fixed, color: COLOR_TOTAL },
    { key: "current-asset", label: "流動資産", value: row.assets.current, color: "#5d6b76" },
  ];
  const right: Segment[] = [
    { key: "fixed-liab", label: "固定負債", value: row.liabilities.fixed, color: COLOR_DEDUCT },
    { key: "current-liab", label: "流動負債", value: row.liabilities.current, color: COLOR_INCOME },
    { key: "basic", label: "基本金", value: basic, color: COLOR_EXPENSE },
  ];
  if (carried > 0) {
    right.push({ key: "carried", label: "繰越収支差額", value: carried, color: "#b8e186" });
  }

  let leftCursor = 0;
  const leftBars = left.map((segment) => {
    const bar = { ...segment, from: leftCursor };
    leftCursor += segment.value;
    return bar;
  });
  let rightCursor = 0;
  const rightBars = right.map((segment) => {
    const bar = { ...segment, from: rightCursor };
    rightCursor += segment.value;
    return bar;
  });
  const assetY = y(assets);
  const hatchTop = carried < 0 ? y(liab + basic) : null;
  const hatchH = carried < 0 ? h(carried) : 0;

  return (
    <div className="chart-wrap" ref={ref}>
      <svg
        {...responsiveSvgProps(width, height, size.width)}
        role="img"
        aria-label={`${row.year}年度の貸借対照表`}
      >
        <defs>
          <pattern id={patternId} width="7" height="7" patternUnits="userSpaceOnUse">
            <path d="M0 7 L7 0" stroke={COLOR_DEDUCT} strokeWidth="1.4" />
          </pattern>
        </defs>
        <line className="equality" x1={leftX - 28} x2={rightX + colW + 28} y1={assetY} y2={assetY} />
        {leftBars.map((bar) => (
          <g key={bar.key}>
            <rect
              className="stack-rect"
              x={leftX}
              y={y(bar.from + bar.value)}
              width={colW}
              height={Math.max(h(bar.value), 1)}
              fill={bar.color}
            />
            <text className="bar-label" x={leftX - 10} y={y(bar.from + bar.value / 2)} textAnchor="end">
              {bar.label}
            </text>
            <text className="bar-value" x={leftX - 10} y={y(bar.from + bar.value / 2) + 14} textAnchor="end">
              {formatYen(bar.value)}
            </text>
          </g>
        ))}
        {rightBars.map((bar) => (
          <g key={bar.key}>
            <rect
              className="stack-rect"
              x={rightX}
              y={y(bar.from + bar.value)}
              width={colW}
              height={Math.max(h(bar.value), 1)}
              fill={bar.color}
            />
            <text className="bar-label" x={rightX + colW + 10} y={y(bar.from + bar.value / 2)}>
              {bar.label}
            </text>
            <text className="bar-value" x={rightX + colW + 10} y={y(bar.from + bar.value / 2) + 14}>
              {formatYen(bar.value)}
            </text>
          </g>
        ))}
        {hatchTop != null ? (
          <g>
            <rect x={rightX} y={hatchTop} width={colW} height={hatchH} fill={`url(#${patternId})`} />
            <text className="bar-label" x={rightX + colW + 10} y={hatchTop + hatchH / 2}>
              繰越収支差額
            </text>
            <text className="bar-value" x={rightX + colW + 10} y={hatchTop + hatchH / 2 + 14}>
              {formatYen(carried)}
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
