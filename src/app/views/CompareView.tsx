import { line as d3Line } from "d3-shape";
import { scaleLinear, scalePoint } from "d3-scale";
import { formatMetric } from "../../lib/format.ts";
import { metricGroups, schoolColor, type Metric } from "../../lib/metrics.ts";
import type { FinanceYear, UniversityFinance } from "../../lib/types.ts";
import { useSize } from "../hooks/useSize.ts";
import { YearSlider } from "../sankey/YearSlider.tsx";

interface CompareViewProps {
  schools: UniversityFinance[];
  years: number[];
  year: number;
  metric: Metric;
  onYear: (year: number) => void;
  onMetric: (id: string) => void;
}

export function CompareView({ schools, years, year, metric, onYear, onMetric }: CompareViewProps) {
  const rows = schools.map((school, index) => ({
    school,
    color: schoolColor(index),
    row: school.years.find((item) => item.year === year) ?? null,
  }));

  return (
    <>
      <label className="compare-metric">
        <span>指標</span>
        <select value={metric.id} onChange={(event) => onMetric(event.target.value)}>
          {metricGroups().map((group) => (
            <optgroup key={group.group} label={group.group}>
              {group.metrics.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <YearSlider years={years} year={year} onYear={onYear} />
      <CompareBars metric={metric} rows={rows} />
      <CompareLines metric={metric} schools={schools} years={years} year={year} />
      <p className="compare-definition">{metric.definition}</p>
    </>
  );
}

function CompareBars({
  metric,
  rows,
}: {
  metric: Metric;
  rows: Array<{ school: UniversityFinance; color: string; row: FinanceYear | null }>;
}) {
  const values = rows.map((item) => (item.row == null ? null : metric.value(item.row)));
  const finite = values.filter((value): value is number => value != null);
  const maxAbs = Math.max(...finite.map((value) => Math.abs(value)), 0);

  return (
    <ul className="compare-bars" key={metric.id}>
      {rows.map((item, index) => {
        const value = values[index] ?? null;
        return (
          <li key={item.school.id}>
            <span className="compare-bars__name">{item.school.name}</span>
            <span className={metric.diverging ? "compare-bars__track is-diverging" : "compare-bars__track"}>
              {metric.diverging ? <span className="compare-bars__zero" /> : null}
              {value != null ? (
                <span
                  className="compare-bars__fill"
                  style={{ background: item.color, ...barBox(value, maxAbs, metric.diverging) }}
                />
              ) : null}
            </span>
            <span className="compare-bars__value">
              {value == null ? "—" : formatMetric(value, metric.unit)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function barBox(value: number, maxAbs: number, diverging: boolean): { left: string; width: string } {
  if (maxAbs === 0) return { left: diverging ? "50%" : "0%", width: "0%" };
  if (!diverging) {
    const width = (Math.max(value, 0) / maxAbs) * 100;
    return { left: "0%", width: `${width}%` };
  }
  const width = (Math.abs(value) / maxAbs) * 50;
  const left = value >= 0 ? 50 : 50 - width;
  return { left: `${left}%`, width: `${width}%` };
}

function CompareLines({
  metric,
  schools,
  years,
  year,
}: {
  metric: Metric;
  schools: UniversityFinance[];
  years: number[];
  year: number;
}) {
  const [ref, size] = useSize<HTMLDivElement>();
  const width = Math.max(size.width, 320);
  const height = 280;
  const pad = { top: 16, right: 16, bottom: 28, left: 64 };
  const series = schools.map((school, index) => ({
    school,
    color: schoolColor(index),
    points: years.map((itemYear) => {
      const row = school.years.find((item) => item.year === itemYear);
      return { year: itemYear, value: row == null ? null : metric.value(row) };
    }),
  }));
  const finite = series.flatMap((item) =>
    item.points.map((point) => point.value).filter((value): value is number => value != null),
  );
  const minValue = Math.min(0, ...finite);
  const maxValue = Math.max(0, ...finite);
  const span = Math.max(maxValue - minValue, 0.01);
  const x = scalePoint<number>()
    .domain(years)
    .range([pad.left, width - pad.right])
    .padding(0.2);
  const y = scaleLinear()
    .domain([minValue - span * 0.08, maxValue + span * 0.08])
    .range([height - pad.bottom, pad.top])
    .nice();
  const [low, high] = y.domain();
  if (low > minValue || high < maxValue) {
    y.domain([Math.min(low, minValue - span * 0.08), Math.max(high, maxValue + span * 0.08)]);
  }
  const ticks = y.ticks(4);
  const path = d3Line<{ year: number; value: number | null }>()
    .defined((point) => point.value != null)
    .x((point) => x(point.year) ?? 0)
    .y((point) => y(point.value ?? 0));

  return (
    <div className="chart-wrap chart-wrap--line" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={`${metric.name}の2015年度以降`}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="grid" x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} />
            <text className="axis" x={pad.left - 8} y={y(tick)} textAnchor="end" dy="0.32em">
              {formatMetric(tick, metric.unit)}
            </text>
          </g>
        ))}
        {years.map((itemYear, index) =>
          index === 0 || index === years.length - 1 || itemYear % 5 === 0 ? (
            <text key={itemYear} className="axis" x={x(itemYear) ?? 0} y={height - 8} textAnchor="middle">
              {itemYear}
            </text>
          ) : null,
        )}
        {series.map((item) => (
          <path
            key={item.school.id}
            className="trend-line"
            d={path(item.points) ?? ""}
            fill="none"
            stroke={item.color}
          />
        ))}
        <g key={metric.id}>
          <g className="compare-year-rule" style={{ transform: `translateX(${x(year) ?? 0}px)` }}>
            <line x1={0} x2={0} y1={pad.top} y2={height - pad.bottom} />
          </g>
          {series.map((item) => {
            const point = item.points.find((candidate) => candidate.year === year);
            if (point?.value == null) return null;
            return (
              <g
                key={item.school.id}
                className="compare-marker"
                style={{ transform: `translate(${x(year) ?? 0}px, ${y(point.value)}px)` }}
              >
                <circle r={4.5} fill={item.color} />
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
