import { useEffect, useId, useRef } from "react";

interface YearSliderProps {
  years: number[];
  year: number;
  onYear: (year: number) => void;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function labeledYears(years: number[]): Set<number> {
  const first = years[0];
  const last = years[years.length - 1];
  const labels = new Set<number>();
  if (first != null) labels.add(first);
  if (last != null) labels.add(last);
  for (const y of years) {
    if (first == null || last == null) continue;
    if (y % 5 === 0 && y - first >= 3 && last - y >= 3) labels.add(y);
  }
  return labels;
}

export function YearSlider({ years, year, onYear }: YearSliderProps) {
  const labelId = useId();
  const lineRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const index = years.indexOf(year);
  const last = years.length - 1;
  const atStart = index <= 0;
  const atEnd = index < 0 || index >= last;
  const t = last <= 0 || index < 0 ? 0 : index / last;
  const labels = labeledYears(years);

  const yearAt = (clientX: number): number | null => {
    const line = lineRef.current;
    if (line == null || years.length === 0) return null;
    const rect = line.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / Math.max(rect.width, 1), 0, 1);
    const i = Math.round(ratio * last);
    return years[i] ?? null;
  };

  const moveTo = (next: number | null) => {
    if (next == null || next === year) return;
    onYear(next);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (event.key === "ArrowLeft" && !atStart) {
        event.preventDefault();
        onYear(years[index - 1] ?? year);
      }
      if (event.key === "ArrowRight" && !atEnd) {
        event.preventDefault();
        onYear(years[index + 1] ?? year);
      }
      if (event.key === "Home" && years[0] != null) {
        event.preventDefault();
        onYear(years[0]);
      }
      if (event.key === "End" && years[last] != null) {
        event.preventDefault();
        onYear(years[last]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [atEnd, atStart, index, last, onYear, year, years]);

  return (
    <div className="year-slider">
      <button
        type="button"
        className="year-slider__step"
        aria-label="前の年度"
        disabled={atStart}
        onClick={() => onYear(years[index - 1] ?? year)}
      >
        前へ
      </button>
      <div className="year-slider__track">
        <div id={labelId} className="visually-hidden">
          決算年度
        </div>
        <div
          className="year-rail"
          role="slider"
          tabIndex={0}
          aria-labelledby={labelId}
          aria-valuemin={years[0] ?? year}
          aria-valuemax={years[last] ?? year}
          aria-valuenow={year}
          aria-valuetext={`${year}年度`}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            dragging.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            moveTo(yearAt(event.clientX));
          }}
          onPointerMove={(event) => {
            if (!dragging.current) return;
            moveTo(yearAt(event.clientX));
          }}
          onPointerUp={() => {
            dragging.current = false;
          }}
          onPointerCancel={() => {
            dragging.current = false;
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" && !atStart) {
              event.preventDefault();
              event.stopPropagation();
              onYear(years[index - 1] ?? year);
            }
            if (event.key === "ArrowRight" && !atEnd) {
              event.preventDefault();
              event.stopPropagation();
              onYear(years[index + 1] ?? year);
            }
            if (event.key === "Home" && years[0] != null) {
              event.preventDefault();
              event.stopPropagation();
              onYear(years[0]);
            }
            if (event.key === "End" && years[last] != null) {
              event.preventDefault();
              event.stopPropagation();
              onYear(years[last]);
            }
          }}
        >
          <div className="year-rail__line" ref={lineRef}>
            {years.map((y, i) => (
              <span
                key={y}
                className={y === year ? "year-rail__mark is-current" : "year-rail__mark"}
                style={{ left: `${last <= 0 ? 0 : (i / last) * 100}%` }}
              />
            ))}
            <span className="year-rail__head" style={{ left: `${t * 100}%` }} />
          </div>
        </div>
        <div className="year-slider__ticks">
          {years.map((y, i) =>
            labels.has(y) ? (
              <button
                key={y}
                type="button"
                className={y === year ? "year-tick is-current" : "year-tick"}
                style={{ left: `${last <= 0 ? 0 : (i / last) * 100}%` }}
                onClick={() => onYear(y)}
              >
                {y}
              </button>
            ) : null,
          )}
        </div>
      </div>
      <button
        type="button"
        className="year-slider__step"
        aria-label="次の年度"
        disabled={atEnd}
        onClick={() => onYear(years[index + 1] ?? year)}
      >
        次へ
      </button>
    </div>
  );
}
