import { useEffect, useId, useRef, useState } from "react";
import { formatEraYear } from "../../lib/era.ts";

interface YearSliderProps {
  years: number[];
  year: number;
  onYear: (year: number) => void;
}

/** チャートの遷移（600ms）が終わってから数字を読む間を残す。 */
const PLAY_STEP_MS = 1400;

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
  const [playing, setPlaying] = useState(false);
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

  const go = (next: number | null | undefined) => {
    setPlaying(false);
    if (next == null || next === year) return;
    onYear(next);
  };

  const togglePlay = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (atEnd && years[0] != null) onYear(years[0]);
    setPlaying(true);
  };

  useEffect(() => {
    if (!playing) return;
    const next = years[index + 1];
    if (next == null) {
      setPlaying(false);
      return;
    }
    const id = window.setTimeout(() => onYear(next), PLAY_STEP_MS);
    return () => window.clearTimeout(id);
  }, [index, onYear, playing, years]);

  const onStepKey = (event: { key: string; preventDefault: () => void }): boolean => {
    if (event.key === "ArrowLeft" && !atStart) {
      event.preventDefault();
      go(years[index - 1]);
      return true;
    }
    if (event.key === "ArrowRight" && !atEnd) {
      event.preventDefault();
      go(years[index + 1]);
      return true;
    }
    if (event.key === "Home") {
      event.preventDefault();
      go(years[0]);
      return true;
    }
    if (event.key === "End") {
      event.preventDefault();
      go(years[last]);
      return true;
    }
    return false;
  };

  const onStepKeyRef = useRef(onStepKey);
  onStepKeyRef.current = onStepKey;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }
      onStepKeyRef.current(event);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="year-slider">
      <div className="year-slider__head">
        <p className="year-now" aria-live="polite">
          <span className="year-now__num">{year}</span>
          <span className="year-now__unit">年度</span>
          <span className="year-now__era">{formatEraYear(year)}</span>
        </p>
        <button
          type="button"
          className="year-slider__step year-slider__play"
          aria-pressed={playing}
          disabled={years.length < 2}
          onClick={togglePlay}
        >
          <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
            {playing ? (
              <path d="M1.5 1h2.5v8H1.5zM6 1h2.5v8H6z" />
            ) : (
              <path d="M2 1l7 4-7 4z" />
            )}
          </svg>
          {playing ? "停止" : "再生"}
        </button>
      </div>
      <div className="year-slider__body">
        <button
          type="button"
          className="year-slider__step"
          aria-label="最初の年度"
          disabled={atStart}
          onClick={() => go(years[0])}
        >
          最初
        </button>
        <button
          type="button"
          className="year-slider__step"
          aria-label="前の年度"
          disabled={atStart}
          onClick={() => go(years[index - 1])}
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
              go(yearAt(event.clientX));
            }}
            onPointerMove={(event) => {
              if (!dragging.current) return;
              go(yearAt(event.clientX));
            }}
            onPointerUp={() => {
              dragging.current = false;
            }}
            onPointerCancel={() => {
              dragging.current = false;
            }}
            onKeyDown={(event) => {
              if (onStepKey(event)) event.stopPropagation();
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
                  onClick={() => go(y)}
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
          onClick={() => go(years[index + 1])}
        >
          次へ
        </button>
        <button
          type="button"
          className="year-slider__step"
          aria-label="最新の年度"
          disabled={atEnd}
          onClick={() => go(years[last])}
        >
          最新
        </button>
      </div>
    </div>
  );
}
