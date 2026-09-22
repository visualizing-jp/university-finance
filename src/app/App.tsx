import { useEffect, useRef, useState } from "react";
import { formatEraYear } from "../lib/era.ts";
import { formatYen } from "../lib/format.ts";
import { metricById } from "../lib/metrics.ts";
import { trackPage } from "../lib/analytics.ts";
import {
  DEFAULT_YEAR,
  formatComparePermalink,
  formatPermalink,
  parsePermalink,
  snapYear,
  type AppMode,
  type ViewId,
} from "../lib/permalink.ts";
import {
  UNIVERSITIES,
  universityById,
  type FinanceYear,
  type UniversityFinance,
} from "../lib/types.ts";
import { ViewNav } from "./ViewNav.tsx";
import { BalanceView } from "./views/BalanceView.tsx";
import { CashView } from "./views/CashView.tsx";
import { CompareView } from "./views/CompareView.tsx";
import { IncomeView } from "./views/IncomeView.tsx";
import { TrendView } from "./views/TrendView.tsx";

function applyPermalink(id: string, year: number, view: ViewId): void {
  const next = formatPermalink(id, year, view);
  if (window.location.search === next) return;
  window.history.replaceState({ id, year, view }, "", `${window.location.pathname}${next}`);
}

function applyComparePermalink(year: number, metric: string): void {
  const next = formatComparePermalink(year, metric);
  if (window.location.search === next) return;
  window.history.replaceState({ mode: "compare", year, metric }, "", `${window.location.pathname}${next}`);
}

function pageTitle(name: string, year: number, view: ViewId): string {
  if (view === "balance") return `${name} ${year}年度の資産と負債`;
  if (view === "cash") return `${name} ${year}年度の資金の流れ`;
  if (view === "trend") return `${name}の経年変化`;
  return `${name} ${year}年度の収支`;
}

function unionYears(schools: UniversityFinance[]): number[] {
  return [...new Set(schools.flatMap((school) => school.years.map((row) => row.year)))].sort(
    (a, b) => a - b,
  );
}

export function App() {
  const boot = parsePermalink(window.location.search);
  const school = boot.id == null ? UNIVERSITIES[0] : universityById(boot.id);
  const [mode, setMode] = useState<AppMode>(boot.mode);
  const [data, setData] = useState<UniversityFinance | null>(null);
  const [compared, setCompared] = useState<UniversityFinance[] | null>(null);
  const [error, setError] = useState<string | null>(
    boot.mode === "view" && school == null ? `「${boot.id}」はまだありません。` : null,
  );
  const [year, setYear] = useState<number | null>(boot.year);
  const [view, setView] = useState<ViewId>(boot.view);
  const [metricId, setMetricId] = useState(boot.metric);
  const yearRef = useRef<number | null>(boot.year);
  const viewYear = useRef<number | null>(boot.year);
  const metric = metricById(metricId);

  useEffect(() => {
    if (year != null) yearRef.current = year;
  }, [year]);

  useEffect(() => {
    if (mode !== "view" || school == null) return;
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/${school.file}`)
      .then((res) => {
        if (!res.ok) throw new Error(`データの読み込みに失敗しました（${res.status}）`);
        return res.json() as Promise<UniversityFinance>;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json);
        setYear(snapYear(json.years.map((row) => row.year), yearRef.current));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "読み込みに失敗しました");
      });
    return () => {
      cancelled = true;
    };
  }, [mode, school]);

  useEffect(() => {
    if (mode !== "compare") return;
    let cancelled = false;
    Promise.all(
      UNIVERSITIES.map((item) =>
        fetch(`${import.meta.env.BASE_URL}data/${item.file}`).then((res) => {
          if (!res.ok) throw new Error(`データの読み込みに失敗しました（${res.status}）`);
          return res.json() as Promise<UniversityFinance>;
        }),
      ),
    )
      .then((schools) => {
        if (cancelled) return;
        setCompared(schools);
        setYear(snapYear(unionYears(schools), yearRef.current ?? DEFAULT_YEAR));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "読み込みに失敗しました");
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (year == null) return;
    if (mode === "compare") {
      applyComparePermalink(year, metric.id);
      document.title = `大学を比べる ${year}年度の${metric.name}`;
      trackPage();
      return;
    }
    if (data == null) return;
    applyPermalink(data.id, year, view);
    document.title = pageTitle(data.name, year, view);
    trackPage();
  }, [mode, year, view, data, metric]);

  if (mode === "view" && error && data == null) {
    return (
      <main className="page">
        <p className="status">{error}</p>
      </main>
    );
  }

  const compareYears = compared == null ? [] : unionYears(compared);
  const years = mode === "compare" ? compareYears : (data?.years.map((row) => row.year) ?? []);
  const row: FinanceYear | null = data?.years.find((item) => item.year === year) ?? null;
  const first = years[0];
  const last = years[years.length - 1];
  const compareReady = mode === "compare" && compared != null && year != null;

  return (
    <div className="page">
      <header className="masthead">
        <p className="eyebrow">学校法人の計算書類</p>
        <nav className="mode-nav" aria-label="画面">
          <button
            type="button"
            aria-current={mode === "compare" ? "page" : undefined}
            onClick={() => {
              viewYear.current = year ?? viewYear.current;
              setMode("compare");
            }}
          >
            比べる
          </button>
          <button
            type="button"
            aria-current={mode === "view" ? "page" : undefined}
            onClick={() => {
              if (viewYear.current != null) setYear(viewYear.current);
              setMode("view");
            }}
          >
            見る
          </button>
        </nav>
        {mode === "view" ? (
          <nav className="school-nav" aria-label="学校">
            {UNIVERSITIES.map((item) => (
              <a
                key={item.id}
                href={formatPermalink(item.id, year ?? boot.year ?? DEFAULT_YEAR, view)}
                aria-current={data?.id === item.id ? "page" : undefined}
              >
                {item.name}
              </a>
            ))}
          </nav>
        ) : null}
        <div className="masthead__row">
          <h1>
            {mode === "compare" ? "大学を比べる" : (data?.name ?? school?.name ?? "学校法人")}
            {mode === "view" ? <span className="sep">の経営状況</span> : null}
          </h1>
          {mode === "view" ? <ViewNav view={view} onView={setView} /> : null}
        </div>
      </header>
      <p className="lede">
        {mode === "compare"
          ? year == null
            ? "1つの比率で、計算書類がある大学を並べる。"
            : `${year}年度。1つの比率で並べる。横棒はその年度、折れ線は${first ?? 2015}年度以降。`
          : lede(view, row, first, last)}
      </p>
      {error && mode === "compare" ? <p className="status">{error}</p> : null}
      {mode === "compare" ? (
        compareReady && compared != null ? (
          <>
            <CompareView
              schools={compared}
              years={compareYears}
              year={year}
              metric={metric}
              onYear={setYear}
              onMetric={setMetricId}
            />
            <footer className="source">
              出典:{" "}
              {compared.map((item, index) => (
                <span key={item.id}>
                  {index > 0 ? "、" : null}
                  {item.corporation}「{item.source.replace(`${item.corporation} `, "")}」（
                  <a href={item.sourceUrl}>{item.sourceUrl}</a>）
                </span>
              ))}
              。比率はパーセント（小数1桁）、運用資産余裕比率は年。2014年度以前の消費収支計算書は含まない。
            </footer>
          </>
        ) : error ? null : (
          <p className="status">読み込み中</p>
        )
      ) : data && row ? (
        <>
          {view === "income" ? <IncomeView row={row} years={years} onYear={setYear} /> : null}
          {view === "balance" ? <BalanceView row={row} years={years} onYear={setYear} /> : null}
          {view === "cash" ? <CashView row={row} years={years} onYear={setYear} /> : null}
          {view === "trend" ? <TrendView rows={data.years} /> : null}
          <footer className="source">
            出典: {data.corporation}「{data.source.replace(`${data.corporation} `, "")}」（
            <a href={data.sourceUrl}>{data.sourceUrl}</a>
            ）。円を百万円に四捨五入して表示。2014年度以前の消費収支計算書は含まない。
          </footer>
        </>
      ) : error ? null : (
        <p className="status">読み込み中</p>
      )}
    </div>
  );
}

function lede(
  view: ViewId,
  row: FinanceYear | null,
  first: number | undefined,
  last: number | undefined,
): string {
  if (view === "trend") {
    return first != null && last != null
      ? `${first}–${last}年度。同じ科目の金額が、年ごとにどう動いたか。`
      : "同じ科目の金額が、年ごとにどう動いたか。";
  }
  if (row == null) return "計算書類を読み込んでいます。";
  const when = `${row.year}年度（${formatEraYear(row.year)}）`;
  if (view === "balance") {
    const assets = row.assets.fixed + row.assets.current;
    return `${when}。資産 ${formatYen(assets)} を、負債と純資産がどう支えているか。`;
  }
  if (view === "cash") {
    return `${when}。期首の支払資金が、教育・施設整備・その他の活動を経て期末にどう着地したか。`;
  }
  return `${when}。事業活動収入 ${formatYen(row.activityIncome)} が、支出と収支差額へどう分かれたか。`;
}
