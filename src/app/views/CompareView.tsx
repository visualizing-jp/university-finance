import { useState } from "react";
import { line as d3Line } from "d3-shape";
import { scaleLinear, scalePoint } from "d3-scale";
import { formatRatio } from "../../lib/format.ts";
import { METRICS, metricById, type MetricId } from "../../lib/metrics.ts";
import { UNIVERSITIES, type UniversityFinance } from "../../lib/types.ts";
import { useSize } from "../hooks/useSize.ts";
import { YearSlider } from "../sankey/YearSlider.tsx";

interface CompareViewProps {
  schools: UniversityFinance[];
  year: number;
  years: number[];
  metric: MetricId;
  onYear: (year: number) => void;
  onMetric: (metric: MetricId) => void;
}

function colorOf(id: string): string {
  return UNIVERSITIES.find((item) => item.id === id)?.color ?? "#2c3338";
}

function yearRow(school: UniversityFinance, year: number) {
  return school.years.find((row) => row.year === year) ?? null;
}

export function CompareView({
  schools,
  year,
  years,
  metric,
  onYear,
  onMetric,
}: CompareViewProps) {
  const def = metricById(metric);
  const bars = schools.flatMap((school) => {
    const row = yearRow(school, year);
    const value = row == null ? null : def.value(row);
    if (value == null) return [];
    return [{ id: school.id, name: school.name, color: colorOf(school.id), value }];
  });

  const values = bars.map((item) => item.value);
  const minValue = Math.min(0, ...values);
  const maxValue = Math.max(0, ...values, 0.01);
  const span = maxValue - minValue || 1;

  return (
    <>
      <nav className="metric-nav" aria-label="指標">
        {METRICS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={metric === item.id ? "true" : undefined}
            onClick={() => onMetric(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <YearSlider years={years} year={year} onYear={onYear} />
      <p className="cmp-hint">{def.hint}</p>
      <div className="cmp-bars">
        {bars.map((item) => {
          const left = ((Math.min(0, item.value) - minValue) / span) * 100;
          const width = (Math.abs(item.value) / span) * 100;
          return (
            <div key={item.id} className="cmp-row">
              <span className="cmp-row__name">{item.name}</span>
              <div className="cmp-track">
                {minValue < 0 ? (
                  <span
                    className="cmp-zero"
                    style={{ left: `${(-minValue / span) * 100}%` }}
                  />
                ) : null}
                <span
                  className="cmp-fill"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    background: item.color,
                  }}
                />
              </div>
              <span className="cmp-row__value">{formatRatio(item.value)}</span>
            </div>
          );
        })}
      </div>
      <CompareLines schools={schools} years={years} year={year} metric={metric} />
    </>
  );
}

function CompareLines({
  schools,
  years,
  year,
  metric,
}: {
  schools: UniversityFinance[];
  years: number[];
  year: number;
  metric: MetricId;
}) {
  const [ref, size] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const def = metricById(metric);
  const width = Math.max(size.width, 280);
  const height = 280;
  const pad = { top: 16, right: 12, bottom: 28, left: 48 };
  const series = schools.map((school) => ({
    id: school.id,
    name: school.name,
    color: colorOf(school.id),
    points: years.map((y) => {
      const row = yearRow(school, y);
      return { year: y, value: row == null ? null : def.value(row) };
    }),
  }));
  const nums = series.flatMap((item) =>
    item.points.map((point) => point.value).filter((value): value is number => value != null),
  );
  const minValue = Math.min(0, ...nums);
  const maxValue = Math.max(...nums, 0.01);
  const x = scalePoint<number>()
    .domain(years)
    .range([pad.left, width - pad.right])
    .padding(0.2);
  const y = scaleLinear()
    .domain([minValue, maxValue * 1.08])
    .range([height - pad.bottom, pad.top])
    .nice();
  const path = d3Line<{ year: number; value: number | null }>()
    .defined((point) => point.value != null)
    .x((point) => x(point.year) ?? 0)
    .y((point) => y(point.value ?? 0));
  const ticks = y.ticks(4);
  const hoverYear = hover == null ? null : years[hover];
  const yearAt = (clientX: number): number | null => {
    const box = ref.current?.getBoundingClientRect();
    if (box == null || years.length === 0) return null;
    const px = clientX - box.left;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    years.forEach((item, index) => {
      const dist = Math.abs((x(item) ?? 0) - px);
      if (dist < bestDist) {
        best = index;
        bestDist = dist;
      }
    });
    return best;
  };

  return (
    <figure className="trend-card cmp-lines">
      <figcaption>年度ごとの推移</figcaption>
      <ul className="legend">
        {series.map((item) => {
          const current = item.points.find((point) => point.year === year)?.value;
          return (
            <li key={item.id}>
              <span className="legend__swatch" style={{ background: item.color }} />
              {item.name}
              {current != null ? <em>{formatRatio(current)}</em> : <em>—</em>}
            </li>
          );
        })}
      </ul>
      <div className="chart-wrap chart-wrap--line" ref={ref}>
        <svg
          width={width}
          height={height}
          onPointerLeave={() => setHover(null)}
          onPointerMove={(event) => setHover(yearAt(event.clientX))}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                className="grid"
                x1={pad.left}
                x2={width - pad.right}
                y1={y(tick)}
                y2={y(tick)}
              />
              <text className="axis" x={pad.left - 8} y={y(tick)} textAnchor="end" dy="0.35em">
                {formatRatio(tick)}
              </text>
            </g>
          ))}
          {hoverYear != null ? (
            <line
              className="hover-rule"
              x1={x(hoverYear) ?? 0}
              x2={x(hoverYear) ?? 0}
              y1={pad.top}
              y2={height - pad.bottom}
            />
          ) : null}
          <line
            className="hover-rule"
            x1={x(year) ?? 0}
            x2={x(year) ?? 0}
            y1={pad.top}
            y2={height - pad.bottom}
          />
          {series.map((item) => (
            <path
              key={item.id}
              className="trend-line"
              fill="none"
              stroke={item.color}
              d={path(item.points) ?? ""}
            />
          ))}
          {series.flatMap((item) =>
            item.points
              .filter((point) => point.value != null)
              .map((point) => (
                <circle
                  key={`${item.id}-${point.year}`}
                  cx={x(point.year) ?? 0}
                  cy={y(point.value ?? 0)}
                  r={point.year === year ? 4 : 2.5}
                  fill={item.color}
                />
              )),
          )}
        </svg>
      </div>
    </figure>
  );
}
