import { useRef, useState } from "react";
import { scaleLinear, scalePoint } from "d3-scale";
import { line as d3Line } from "d3-shape";
import { formatShare, formatStructure, formatYen } from "../../lib/format.ts";
import { schoolColor } from "../../lib/metrics.ts";
import {
  POSITION_X_ID,
  POSITION_Y_ID,
  STRUCTURE_METRICS,
  median,
  paddedExtent,
  shortName,
  structureMetricById,
  type StructureMetric,
  type StructureUnit,
} from "../../lib/structure.ts";
import { EXPENSE_BUCKETS, INCOME_BUCKETS, INCOME_NOTE } from "../../lib/taxonomy.ts";
import type { ExpenseParts, FinanceYear, IncomeParts, UniversityFinance } from "../../lib/types.ts";
import { responsiveSvgProps } from "../chart/responsiveSvg.ts";
import { useSize } from "../hooks/useSize.ts";
import { YearSlider } from "../sankey/YearSlider.tsx";

const INCOME_FILL: Record<keyof IncomeParts, string> = {
  tuition: "#243140",
  subsidies: "#6d9a5b",
  donations: "#c51b7d",
  auxiliary: "#7f97a6",
  interest: "#c4a35a",
  other: "#c5d0d6",
};

const EXPENSE_FILL: Record<keyof ExpenseParts, string> = {
  personnel: "#243140",
  education: "#6d9a5b",
  admin: "#c4a35a",
  other: "#c5d0d6",
};

interface SchoolEntry {
  school: UniversityFinance;
  color: string;
  short: string;
  row: FinanceYear | null;
}

interface StructureViewProps {
  schools: UniversityFinance[];
  years: number[];
  year: number;
  metricId: string;
  onYear: (year: number) => void;
  onMetric: (id: string) => void;
}

export function StructureView({ schools, years, year, metricId, onYear, onMetric }: StructureViewProps) {
  const metric = structureMetricById(metricId);
  const [encode, setEncode] = useState<"share" | "amount">("share");
  const [activeId, setActiveId] = useState<string | null>(null);
  const trendRef = useRef<HTMLHeadingElement>(null);
  const entries: SchoolEntry[] = schools.map((school, index) => ({
    school,
    color: schoolColor(index),
    short: shortName(school.id, school.name),
    row: school.years.find((item) => item.year === year) ?? null,
  }));

  function selectMetric(id: string) {
    onMetric(id);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    trendRef.current?.focus({ preventScroll: true });
    trendRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
  }

  return (
    <div className="structure">
      <YearSlider years={years} year={year} onYear={onYear} />
      <section className="structure-section" aria-labelledby="structure-position">
        <h2 id="structure-position">
          <span className="structure-kicker">1</span>経営ポジション
          <span className="structure-year">{year}年度</span>
        </h2>
        <p className="structure-note">
          横軸は純資産比率（ストック）、縦軸は教育活動収支差額比率（フロー）。破線は、その年の計算書類がある大学の中央値。右上は優秀という意味にせず、フロー型・ストック型・両方厚い・相対的に低い、という置き方として読む。
        </p>
        <PositionScatter entries={entries} year={year} activeId={activeId} onActive={setActiveId} />
      </section>
      <section className="structure-section" aria-labelledby="structure-mix">
        <div className="structure-head">
          <h2 id="structure-mix">
            <span className="structure-kicker">2</span>収入と支出の構成
            <span className="structure-year">{year}年度</span>
          </h2>
          <div className="structure-toggle" role="group" aria-label="棒の表し方">
            <button type="button" aria-pressed={encode === "share"} onClick={() => setEncode("share")}>
              構成比
            </button>
            <button type="button" aria-pressed={encode === "amount"} onClick={() => setEncode("amount")}>
              金額
            </button>
          </div>
        </div>
        <p className="structure-note">
          {encode === "share"
            ? "棒の長さは100%。色は事業活動収入・事業活動支出に占める科目の割合。"
            : "棒の長さは金額。この4大学で一番大きい大学を幅いっぱいにしている。"}
          {INCOME_NOTE}
        </p>
        <Composition
          heading="収入"
          encode={encode}
          entries={entries}
          activeId={activeId}
          onActive={setActiveId}
          parts={(row) =>
            INCOME_BUCKETS.map((bucket) => ({
              key: bucket.key,
              label: bucket.label,
              color: INCOME_FILL[bucket.key],
              value: row.income[bucket.key],
            }))
          }
        />
        <Composition
          heading="支出"
          encode={encode}
          entries={entries}
          activeId={activeId}
          onActive={setActiveId}
          parts={(row) =>
            EXPENSE_BUCKETS.map((bucket) => ({
              key: bucket.key,
              label: bucket.label,
              color: EXPENSE_FILL[bucket.key],
              value: row.expense[bucket.key],
            }))
          }
        />
      </section>
      <section className="structure-section" aria-labelledby="structure-metrics">
        <h2 id="structure-metrics">
          <span className="structure-kicker">3</span>経営指標
          <span className="structure-year">{year}年度</span>
        </h2>
        <p className="structure-note">指標を選ぶと、下にその推移が出る。点は左が低く、右が高い。</p>
        <ul className="legend" aria-label="大学の色">
          {entries.map((entry) => (
            <li key={entry.school.id}>
              <span className="legend__swatch" style={{ background: entry.color }} />
              {entry.short}
            </li>
          ))}
        </ul>
        <MetricDots
          entries={entries}
          selectedId={metric.id}
          activeId={activeId}
          onActive={setActiveId}
          onSelect={selectMetric}
        />
      </section>
      <section className="structure-section structure-trend" aria-labelledby="structure-trend-title">
        <h2 id="structure-trend-title" ref={trendRef} tabIndex={-1}>
          <span className="structure-kicker">4</span>
          {metric.name}の推移
        </h2>
        <p className="structure-note">
          {metric.definition}。{metric.reading}
          {years[0] != null && years[years.length - 1] != null
            ? `${years[0]}–${years[years.length - 1]}年度。線が途中から始まる大学は、その年からの計算書類。`
            : ""}
        </p>
        <MetricTrend metric={metric} schools={schools} years={years} year={year} activeId={activeId} />
      </section>
    </div>
  );
}

function PositionScatter({
  entries,
  year,
  activeId,
  onActive,
}: {
  entries: SchoolEntry[];
  year: number;
  activeId: string | null;
  onActive: (id: string | null) => void;
}) {
  const [ref, size] = useSize<HTMLDivElement>();
  const [readout, setReadout] = useState<string | null>(null);
  const xMetric = structureMetricById(POSITION_X_ID);
  const yMetric = structureMetricById(POSITION_Y_ID);
  const points = entries.flatMap((entry) => {
    if (entry.row == null) return [];
    const x = xMetric.value(entry.row);
    const y = yMetric.value(entry.row);
    if (x == null || y == null) return [];
    return [{ ...entry, x, y }];
  });
  const ready = size.width >= 8;
  const width = ready ? size.width : 720;
  const height = 440;
  const pad = { top: 28, right: 36, bottom: 48, left: 78 };
  const plotRight = width - pad.right;
  const plotBottom = height - pad.bottom;
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const xScale = scaleLinear().domain(paddedExtent(xs, "percent")).nice(4).range([pad.left, plotRight]);
  const yScale = scaleLinear().domain(paddedExtent(ys, "percent")).nice(4).range([plotBottom, pad.top]);
  const xTicks = xScale.ticks(4);
  const yTicks = yScale.ticks(4);
  const yDomain = yScale.domain();
  const yLo = yDomain[0] ?? 0;
  const yHi = yDomain[1] ?? 1;
  const pixels = points.map((point) => ({ x: xScale(point.x), y: yScale(point.y) }));
  const xMed = median(xs);
  const yMed = median(ys);
  const placed = placeLabels(
    points.map((point) => ({
      id: point.school.id,
      px: xScale(point.x),
      py: yScale(point.y),
      text: point.short,
    })),
    plotRight,
    pad.top + 10,
    plotBottom - 8,
  );
  const minX = xs.length === 0 ? null : Math.min(...xs);
  const maxX = xs.length === 0 ? null : Math.max(...xs);
  const zoomNote =
    minX != null && maxX != null && minX > 0.75 && maxX - minX < 0.15
      ? `純資産比率は${formatStructure(minX, "percent")}から${formatStructure(maxX, "percent")}。横軸は、その差が見える幅にしている。`
      : null;

  return (
    <>
      <div
        className="chart-wrap chart-wrap--scatter"
        ref={ref}
        onPointerLeave={() => {
          onActive(null);
          setReadout(null);
        }}
      >
        <svg
          {...responsiveSvgProps(width, height, size.width)}
          role="img"
          aria-label={scatterLabel(year, points)}
        >
          {yTicks.map((tick) => (
            <g key={`y-${tick}`}>
              <line className="grid" x1={pad.left} x2={plotRight} y1={yScale(tick)} y2={yScale(tick)} />
              <text className="axis" x={pad.left - 8} y={yScale(tick)} textAnchor="end" dy="0.32em">
                {formatStructure(tick, "percent")}
              </text>
            </g>
          ))}
          {xTicks.map((tick) => (
            <text
              key={`x-${tick}`}
              className="axis"
              x={xScale(tick)}
              y={plotBottom + 16}
              textAnchor="middle"
            >
              {formatStructure(tick, "percent")}
            </text>
          ))}
          {yLo < 0 && yHi > 0 ? (
            <line className="structure-zero" x1={pad.left} x2={plotRight} y1={yScale(0)} y2={yScale(0)} />
          ) : null}
          {xMed != null && yMed != null ? (
            <g className="structure-median">
              <line x1={xScale(xMed)} x2={xScale(xMed)} y1={pad.top} y2={plotBottom} />
              <line x1={pad.left} x2={plotRight} y1={yScale(yMed)} y2={yScale(yMed)} />
            </g>
          ) : null}
          {width >= 640 && xMed != null && yMed != null
            ? quadrantLabels(pad.left, pad.top, plotRight, plotBottom, xScale(xMed), yScale(yMed), pixels).map(
                (label) => (
                  <text
                    key={label.text}
                    className="structure-quadrant"
                    x={label.x}
                    y={label.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {label.text}
                  </text>
                ),
              )
            : null}
          <text
            className="axis structure-axis-title"
            transform={`rotate(-90 16 ${height / 2})`}
            x={16}
            y={height / 2}
            textAnchor="middle"
          >
            {yMetric.name}
          </text>
          <text className="axis structure-axis-title" x={(pad.left + plotRight) / 2} y={height - 8} textAnchor="middle">
            {xMetric.name}
          </text>
          {points.map((point) => {
            const label = placed.get(point.school.id);
            const dim = activeId != null && activeId !== point.school.id;
            return (
              <g
                key={point.school.id}
                className="structure-point"
                style={{
                  transform: `translate(${xScale(point.x)}px, ${yScale(point.y)}px)`,
                  opacity: dim ? 0.35 : 1,
                }}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "mouse") return;
                  onActive(point.school.id);
                  setReadout(
                    `${point.school.name} · ${yMetric.name} ${formatStructure(point.y, "percent")} · ${xMetric.name} ${formatStructure(point.x, "percent")}`,
                  );
                }}
              >
                <circle r={16} fill="transparent" />
                <circle r={6.5} fill={point.color} stroke="#e8eef1" strokeWidth={2} />
                {width >= 640 ? (
                  <text
                    className="structure-label"
                    x={label?.dx ?? 12}
                    y={label?.dy ?? 0}
                    textAnchor={label?.anchor ?? "start"}
                    dominantBaseline="middle"
                  >
                    {point.short}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        <table className="visually-hidden">
          <caption>
            {year}年度の経営ポジション。横軸は{xMetric.name}、縦軸は{yMetric.name}。
          </caption>
          <thead>
            <tr>
              <th>大学</th>
              <th>{xMetric.name}</th>
              <th>{yMetric.name}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.school.id}>
                <td>{point.school.name}</td>
                <td>{formatStructure(point.x, "percent")}</td>
                <td>{formatStructure(point.y, "percent")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {width < 640 ? (
        <ul className="legend" aria-label="大学の色">
          {entries.map((entry) => (
            <li key={entry.school.id}>
              <span className="legend__swatch" style={{ background: entry.color }} />
              {entry.short}
            </li>
          ))}
        </ul>
      ) : null}
      {zoomNote != null ? <p className="structure-note">{zoomNote}</p> : null}
      <p className="structure-readout" aria-live="polite">
        {readout ?? "点に触れると、その大学の二つの比率が出る。"}
      </p>
    </>
  );
}

function scatterLabel(
  year: number,
  points: Array<{ school: UniversityFinance; x: number; y: number }>,
): string {
  const body = points
    .map(
      (point) =>
        `${point.school.name}は純資産比率${formatStructure(point.x, "percent")}、教育活動収支差額比率${formatStructure(point.y, "percent")}`,
    )
    .join("。");
  return `${year}年度の経営ポジション。${body}`;
}

function quadrantLabels(
  left: number,
  top: number,
  right: number,
  bottom: number,
  xMed: number,
  yMed: number,
  points: Array<{ x: number; y: number }>,
): Array<{ text: string; x: number; y: number }> {
  const boxes = [
    { text: "フロー型", x0: left, x1: xMed, y0: top, y1: yMed },
    { text: "両方厚い", x0: xMed, x1: right, y0: top, y1: yMed },
    { text: "相対的に低い", x0: left, x1: xMed, y0: yMed, y1: bottom },
    { text: "ストック型", x0: xMed, x1: right, y0: yMed, y1: bottom },
  ];
  return boxes.flatMap((box) => {
    if (box.x1 - box.x0 < 72 || box.y1 - box.y0 < 28) return [];
    const options = [0.22, 0.5, 0.78].flatMap((tx) =>
      [0.22, 0.5, 0.78].map((ty) => ({
        x: box.x0 + (box.x1 - box.x0) * tx,
        y: box.y0 + (box.y1 - box.y0) * ty,
      })),
    );
    let best: { x: number; y: number; dist: number } | null = null;
    for (const option of options) {
      const dist =
        points.length === 0
          ? 999
          : Math.min(...points.map((point) => Math.hypot(point.x - option.x, point.y - option.y)));
      if (best == null || dist > best.dist) best = { x: option.x, y: option.y, dist };
    }
    if (best == null || best.dist < 34) return [];
    return [{ text: box.text, x: best.x, y: best.y }];
  });
}

interface LabelPlacement {
  anchor: "start" | "end";
  dx: number;
  dy: number;
}

function placeLabels(
  points: Array<{ id: string; px: number; py: number; text: string }>,
  right: number,
  minY: number,
  maxY: number,
): Map<string, LabelPlacement> {
  const placed = points.map((point) => {
    const width = point.text.length * 13 + 4;
    const roomRight = point.px + 14 + width <= right;
    return {
      id: point.id,
      px: point.px,
      py: point.py,
      width,
      anchor: roomRight ? ("start" as const) : ("end" as const),
      dx: roomRight ? 12 : -12,
      dy: 0,
    };
  });
  const sorted = [...placed].sort((a, b) => a.py - b.py || a.px - b.px);
  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    if (current == null) continue;
    for (let j = 0; j < i; j++) {
      const other = sorted[j];
      if (other == null) continue;
      if (Math.hypot(current.px - other.px, current.py - other.py) < 48) {
        other.dy = Math.min(other.dy, -18);
        current.dy = Math.max(current.dy, 18);
      }
      const currentLeft =
        current.anchor === "start" ? current.px + current.dx : current.px + current.dx - current.width;
      const otherLeft = other.anchor === "start" ? other.px + other.dx : other.px + other.dx - other.width;
      const overlapX = currentLeft < otherLeft + other.width + 8 && otherLeft < currentLeft + current.width + 8;
      const currentTop = current.py + current.dy - 9;
      const otherTop = other.py + other.dy - 9;
      if (overlapX && currentTop < otherTop + 22) current.dy = other.py + other.dy + 22 - current.py;
    }
    const labelY = current.py + current.dy;
    if (labelY < minY) current.dy = minY - current.py;
    if (labelY > maxY) current.dy = maxY - current.py;
  }
  return new Map(placed.map((item) => [item.id, { anchor: item.anchor, dx: item.dx, dy: item.dy }]));
}

interface Segment {
  key: string;
  label: string;
  color: string;
  value: number;
}

function Composition({
  heading,
  encode,
  entries,
  activeId,
  onActive,
  parts,
}: {
  heading: string;
  encode: "share" | "amount";
  entries: SchoolEntry[];
  activeId: string | null;
  onActive: (id: string | null) => void;
  parts: (row: FinanceYear) => Segment[];
}) {
  const [readout, setReadout] = useState<string | null>(null);
  const rows = entries.map((entry) => {
    if (entry.row == null) return { ...entry, segments: [] as Segment[], total: 0, missing: true };
    const segments = parts(entry.row).filter((segment) => segment.value > 0);
    const total = segments.reduce((sum, segment) => sum + segment.value, 0);
    return { ...entry, segments, total, missing: false };
  });
  const maxTotal = Math.max(...rows.map((row) => row.total), 1);
  const legend = rows.find((row) => row.segments.length > 0)?.segments ?? [];

  return (
    <div
      className="structure-mix"
      onPointerLeave={() => {
        onActive(null);
        setReadout(null);
      }}
    >
      <h3>{heading}</h3>
      <ul className="comp-list">
        {rows.map((row) => (
          <li
            key={row.school.id}
            className={activeId != null && activeId !== row.school.id ? "comp-row is-dim" : "comp-row"}
            onPointerEnter={(event) => {
              if (event.pointerType !== "mouse") return;
              onActive(row.school.id);
            }}
          >
            <span className="comp-name">{row.short}</span>
            <span className="comp-track">
              {row.missing ? null : (
              <span
                className="comp-bar"
                style={{ width: encode === "share" ? "100%" : `${(row.total / maxTotal) * 100}%` }}
              >
                {row.segments.map((segment) => (
                  <span
                    key={segment.key}
                    className="comp-seg"
                    style={{ flexGrow: segment.value, background: segment.color }}
                    onPointerEnter={(event) => {
                      if (event.pointerType !== "mouse") return;
                      onActive(row.school.id);
                      setReadout(
                        `${row.school.name}の${segment.label} ${formatYen(segment.value)}（${formatShare(segment.value, row.total)}）`,
                      );
                    }}
                  />
                ))}
              </span>
              )}
            </span>
            <span className="comp-total">{row.missing ? "—" : formatYen(row.total)}</span>
          </li>
        ))}
      </ul>
      <ul className="legend" aria-label={`${heading}の科目`}>
        {legend.map((segment) => (
          <li key={segment.key}>
            <span className="legend__swatch" style={{ background: segment.color }} />
            {segment.label}
          </li>
        ))}
      </ul>
      <p className="structure-readout" aria-live="polite">
        {readout ?? "帯に触れると、科目の金額と構成比が出る。"}
      </p>
      <table className="visually-hidden">
        <caption>
          {heading}の構成。{encode === "share" ? "割合" : "金額"}。
        </caption>
        <thead>
          <tr>
            <th>大学</th>
            {legend.map((segment) => (
              <th key={segment.key}>{segment.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.school.id}>
              <td>{row.school.name}</td>
              {legend.map((segment) => {
                const found = row.segments.find((item) => item.key === segment.key);
                const value = found?.value ?? 0;
                return (
                  <td key={segment.key}>
                    {formatYen(value)}（{formatShare(value, row.total)}）
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricDots({
  entries,
  selectedId,
  activeId,
  onActive,
  onSelect,
}: {
  entries: SchoolEntry[];
  selectedId: string;
  activeId: string | null;
  onActive: (id: string | null) => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="dot-list" onPointerLeave={() => onActive(null)}>
      {STRUCTURE_METRICS.map((metric) => {
        const ranked = entries
          .map((entry) => ({
            ...entry,
            value: entry.row == null ? null : metric.value(entry.row),
          }))
          .sort((a, b) => {
            if (a.value == null && b.value == null) return 0;
            if (a.value == null) return 1;
            if (b.value == null) return -1;
            return a.value - b.value;
          });
        const finite = ranked.flatMap((item) => (item.value == null ? [] : [item.value]));
        const scale = scaleLinear().domain(paddedExtent(finite, metric.unit)).nice(4).range([0, 100]);
        const ticks = spreadTicks(scale.ticks(6), 3);
        return (
          <button
            key={metric.id}
            type="button"
            className={metric.id === selectedId ? "dot-metric is-selected" : "dot-metric"}
            aria-pressed={metric.id === selectedId}
            onClick={() => onSelect(metric.id)}
          >
            <span className="dot-metric__title">{metric.name}</span>
            {ranked.map((item) => (
              <span
                key={item.school.id}
                className={activeId != null && activeId !== item.school.id ? "dot-row is-dim" : "dot-row"}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "mouse") return;
                  onActive(item.school.id);
                }}
              >
                <span className="dot-row__name">{item.short}</span>
                <span className="dot-track">
                  {item.value != null ? (
                    <span
                      className="dot-mark"
                      style={{ left: `${clampPct(scale(item.value))}%`, background: item.color }}
                    />
                  ) : null}
                </span>
                <span className="dot-row__value">
                  {item.value == null ? "—" : formatStructure(item.value, metric.unit)}
                </span>
              </span>
            ))}
            <span className="dot-axis-row">
              <span />
              <span className="dot-axis" aria-hidden="true">
                {ticks.map((tick) => (
                  <span key={tick} style={tickStyle(clampPct(scale(tick)))}>
                    {formatAxisTick(tick, metric.unit)}
                  </span>
                ))}
              </span>
              <span />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function spreadTicks(ticks: number[], limit: number): number[] {
  const first = ticks[0];
  const last = ticks[ticks.length - 1];
  if (first == null || last == null || ticks.length <= limit) return ticks;
  const picked: number[] = [];
  for (let index = 0; index < limit; index++) {
    const goal = first + ((last - first) * index) / (limit - 1);
    const tick = ticks.reduce((best, item) => (Math.abs(item - goal) < Math.abs(best - goal) ? item : best));
    if (!picked.includes(tick)) picked.push(tick);
  }
  return picked.sort((a, b) => a - b);
}

function formatAxisTick(value: number, unit: StructureUnit): string {
  if (unit === "month") {
    const sign = value < 0 ? "△" : "";
    return `${sign}${Math.abs(value).toFixed(1)}`;
  }
  return formatStructure(value, "percent");
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function tickStyle(pct: number): { left: string; transform: string } {
  if (pct < 8) return { left: `${pct}%`, transform: "translateX(0)" };
  if (pct > 92) return { left: `${pct}%`, transform: "translateX(-100%)" };
  return { left: `${pct}%`, transform: "translateX(-50%)" };
}

function MetricTrend({
  metric,
  schools,
  years,
  year,
  activeId,
}: {
  metric: StructureMetric;
  schools: UniversityFinance[];
  years: number[];
  year: number;
  activeId: string | null;
}) {
  const [ref, size] = useSize<HTMLDivElement>();
  const ready = size.width >= 8;
  const width = ready ? size.width : 720;
  const height = 280;
  const pad = { top: 16, right: 16, bottom: 28, left: 72 };
  const series = schools.map((school, index) => ({
    school,
    color: schoolColor(index),
    short: shortName(school.id, school.name),
    points: years.map((itemYear) => {
      const row = school.years.find((item) => item.year === itemYear);
      return { year: itemYear, value: row == null ? null : metric.value(row) };
    }),
  }));
  const finite = series.flatMap((item) =>
    item.points.flatMap((point) => (point.value == null ? [] : [point.value])),
  );
  const y = scaleLinear()
    .domain(paddedExtent(finite, metric.unit))
    .nice(4)
    .range([height - pad.bottom, pad.top]);
  const domain = y.domain();
  const low = domain[0] ?? 0;
  const high = domain[1] ?? 1;
  const x = scalePoint<number>()
    .domain(years)
    .range([pad.left, width - pad.right])
    .padding(0.2);
  const ticks = y.ticks(4);
  const path = d3Line<{ year: number; value: number | null }>()
    .defined((point) => point.value != null)
    .x((point) => x(point.year) ?? 0)
    .y((point) => y(point.value ?? 0));
  const showZero = low < 0 && high > 0;

  return (
    <>
      <div className="chart-wrap chart-wrap--line" ref={ref}>
        <svg
          {...responsiveSvgProps(width, height, size.width)}
          role="img"
          aria-label={`${metric.name}の${years[0] ?? ""}年度以降`}
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line className="grid" x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} />
              <text className="axis" x={pad.left - 8} y={y(tick)} textAnchor="end" dy="0.32em">
                {formatStructure(tick, metric.unit)}
              </text>
            </g>
          ))}
          {showZero ? (
            <line className="structure-zero" x1={pad.left} x2={width - pad.right} y1={y(0)} y2={y(0)} />
          ) : null}
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
              style={{ opacity: activeId != null && activeId !== item.school.id ? 0.28 : 1 }}
            />
          ))}
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
                style={{
                  transform: `translate(${x(year) ?? 0}px, ${y(point.value)}px)`,
                  opacity: activeId != null && activeId !== item.school.id ? 0.28 : 1,
                }}
              >
                <circle r={4.5} fill={item.color} />
              </g>
            );
          })}
        </svg>
      </div>
      <ul className="legend">
        {series.map((item) => {
          const point = item.points.find((candidate) => candidate.year === year);
          return (
            <li key={item.school.id}>
              <span className="legend__swatch" style={{ background: item.color }} />
              {item.short}
              <em>{point?.value == null ? "—" : formatStructure(point.value, metric.unit)}</em>
            </li>
          );
        })}
      </ul>
    </>
  );
}
