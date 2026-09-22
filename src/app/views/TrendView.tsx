import { useState } from "react";
import { line as d3Line } from "d3-shape";
import { scaleLinear, scalePoint } from "d3-scale";
import { formatYen } from "../../lib/format.ts";
import { OPERATING_ASSET_NOTE, TREND_GROUPS, type TrendGroup } from "../../lib/taxonomy.ts";
import type { FinanceYear } from "../../lib/types.ts";
import { responsiveSvgProps } from "../chart/responsiveSvg.ts";
import { useSize } from "../hooks/useSize.ts";

interface TrendViewProps {
  rows: FinanceYear[];
}

export function TrendView({ rows }: TrendViewProps) {
  return (
    <>
      <div className="trend-grid">
        {TREND_GROUPS.map((group) => (
          <TrendChart key={group.id} group={group} rows={rows} />
        ))}
      </div>
      <p className="source">{OPERATING_ASSET_NOTE}金額の推移。比率や学生1人あたりは、大学を比べるときの指標。</p>
    </>
  );
}

function TrendChart({ group, rows }: { group: TrendGroup; rows: FinanceYear[] }) {
  const [ref, size] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const ready = size.width >= 8;
  const width = ready ? size.width : 640;
  const height = 240;
  const pad = { top: 12, right: 8, bottom: 28, left: 72 };
  const years = rows.map((row) => row.year);
  const values = group.series.flatMap((series) => rows.map((row) => series.value(row)));
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(...values, 1);
  const x = scalePoint<number>()
    .domain(years)
    .range([pad.left, width - pad.right])
    .padding(0.2);
  const y = scaleLinear()
    .domain([minValue, maxValue * 1.08])
    .range([height - pad.bottom, pad.top])
    .nice();
  const ticks = y.ticks(4);
  const hoverRow = hover == null ? null : rows[hover];
  const yearAt = (clientX: number): number | null => {
    const box = ref.current?.getBoundingClientRect();
    if (box == null || years.length === 0) return null;
    const px = clientX - box.left;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    years.forEach((year, index) => {
      const dist = Math.abs((x(year) ?? 0) - px);
      if (dist < bestDist) {
        best = index;
        bestDist = dist;
      }
    });
    return best;
  };

  return (
    <figure className="trend-card">
      <figcaption>{group.title}</figcaption>
      <ul className="legend">
        {group.series.map((series) => {
          const last = rows[rows.length - 1];
          return (
            <li key={series.key}>
              <span className="legend__swatch" style={{ background: series.color }} />
              {series.label}
              {last != null ? <em>{formatYen(series.value(last))}</em> : null}
            </li>
          );
        })}
      </ul>
      <div className="chart-wrap chart-wrap--line" ref={ref}>
        <svg
          {...responsiveSvgProps(width, height, size.width)}
          role="img"
          aria-label={`${group.title}の経年変化`}
          onPointerMove={(event) => setHover(yearAt(event.clientX))}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="grid" x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} />
              <text className="axis" x={pad.left - 8} y={y(tick)} textAnchor="end" dy="0.32em">
                {formatYen(tick)}
              </text>
            </g>
          ))}
          {years.map((year, index) =>
            index === 0 || index === years.length - 1 || year % 5 === 0 ? (
              <text key={year} className="axis" x={x(year) ?? 0} y={height - 8} textAnchor="middle">
                {year}
              </text>
            ) : null,
          )}
          {group.series.map((series) => (
            <path
              key={series.key}
              className="trend-line"
              d={
                d3Line<FinanceYear>()
                  .x((row) => x(row.year) ?? 0)
                  .y((row) => y(series.value(row)))(rows) ?? ""
              }
              fill="none"
              stroke={series.color}
            />
          ))}
          {hoverRow != null
            ? group.series.map((series) => (
                <circle
                  key={series.key}
                  cx={x(hoverRow.year) ?? 0}
                  cy={y(series.value(hoverRow))}
                  r={4}
                  fill={series.color}
                />
              ))
            : null}
          {hoverRow != null ? (
            <line
              className="hover-rule"
              x1={x(hoverRow.year) ?? 0}
              x2={x(hoverRow.year) ?? 0}
              y1={pad.top}
              y2={height - pad.bottom}
            />
          ) : null}
        </svg>
        {hoverRow != null ? (
          <div className="sankey-tip trend-tip">
            <strong>{hoverRow.year}年度</strong>
            {group.series.map((series) => (
              <span key={series.key}>
                {series.label} {formatYen(series.value(hoverRow))}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </figure>
  );
}
