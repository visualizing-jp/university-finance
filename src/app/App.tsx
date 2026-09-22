import { useEffect, useRef, useState } from "react";
import { formatEraYear } from "../lib/era.ts";
import { formatYen } from "../lib/format.ts";
import {
  DEFAULT_YEAR,
  formatComparePermalink,
  formatPermalink,
  parsePermalink,
  snapYear,
  type ModeId,
  type ViewId,
} from "../lib/permalink.ts";
import type { MetricId } from "../lib/metrics.ts";
import {
  UNIVERSITIES,
  universityById,
  type FinanceYear,
  type UniversityFinance,
} from "../lib/types.ts";
import { ModeNav } from "./ModeNav.tsx";
import { ViewNav } from "./ViewNav.tsx";
import { CompareView } from "./views/CompareView.tsx";
import { BalanceView } from "./views/BalanceView.tsx";
import { CashView } from "./views/CashView.tsx";
import { IncomeView } from "./views/IncomeView.tsx";
import { TrendView } from "./views/TrendView.tsx";

function applyLookPermalink(id: string, year: number, view: ViewId): void {
  const next = formatPermalink(id, year, view);
  if (window.location.search === next) return;
  window.history.replaceState({ id, year, view }, "", `${window.location.pathname}${next}`);
}

function applyComparePermalink(year: number, metric: MetricId): void {
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
  const [mode, setMode] = useState<ModeId>(boot.mode);
  const [metric, setMetric] = useState<MetricId>(boot.metric);
  const [lookId, setLookId] = useState(boot.id ?? UNIVERSITIES[0].id);
  const school = universityById(lookId);
  const [data, setData] = useState<UniversityFinance | null>(null);
  const [catalog, setCatalog] = useState<UniversityFinance[] | null>(null);
  const [error, setError] = useState<string | null>(
    mode === "look" && school == null ? `「${lookId}」はまだありません。` : null,
  );
  const [year, setYear] = useState<number | null>(boot.year);
  const [view, setView] = useState<ViewId>(boot.view);
  const yearRef = useRef<number | null>(boot.year);

  useEffect(() => {
    if (year != null) yearRef.current = year;
  }, [year]);

  useEffect(() => {
    if (mode !== "look" || school == null) return;
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
  }, [school, mode]);

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
      .then((rows) => {
        if (cancelled) return;
        setCatalog(rows);
        setYear(snapYear(unionYears(rows), yearRef.current ?? DEFAULT_YEAR));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "読み込みに失敗しました");
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  useEffect(() => {
    if (mode === "compare") {
      const nextYear = year ?? DEFAULT_YEAR;
      applyComparePermalink(nextYear, metric);
      document.title = `大学を比べる ${nextYear}年度`;
      return;
    }
    if (year == null || data == null) return;
    applyLookPermalink(data.id, year, view);
    document.title = pageTitle(data.name, year, view);
  }, [mode, year, view, data, metric]);

  if (error && data == null && catalog == null) {
    return (
      <main className="page">
        <p className="status">{error}</p>
      </main>
    );
  }

  const years =
    mode === "compare"
      ? (catalog != null ? unionYears(catalog) : [])
      : (data?.years.map((row) => row.year) ?? []);
  const row: FinanceYear | null = data?.years.find((item) => item.year === year) ?? null;
  const first = years[0];
  const last = years[years.length - 1];

  return (
    <div className="page">
      <header className="masthead">
        <p className="eyebrow">学校法人の計算書類</p>
        {mode === "look" ? (
          <nav className="school-nav" aria-label="学校">
            {UNIVERSITIES.map((item) => (
              <a
                key={item.id}
                href={formatPermalink(item.id, year ?? boot.year ?? DEFAULT_YEAR, view)}
                aria-current={data?.id === item.id ? "page" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  setLookId(item.id);
                  setMode("look");
                }}
              >
                {item.name}
              </a>
            ))}
          </nav>
        ) : null}
        <div className="masthead__row">
          <h1>
            {mode === "compare" ? "大学を比べる" : (data?.name ?? school?.name ?? "学校法人")}
            {mode === "look" ? <span className="sep">の経営状況</span> : null}
          </h1>
          <ModeNav mode={mode} onMode={setMode} />
        </div>
        {mode === "look" ? <ViewNav view={view} onView={setView} /> : null}
      </header>
      <p className="lede">
        {mode === "compare"
          ? compareLede(year, first, last)
          : lede(view, row, first, last)}
      </p>
      {error ? <p className="status">{error}</p> : null}
      {mode === "compare" ? (
        catalog != null && year != null ? (
          <>
            <CompareView
              schools={catalog}
              year={year}
              years={years}
              metric={metric}
              onYear={setYear}
              onMetric={setMetric}
            />
            <footer className="source">
              比率の分母は事業活動収入（経常収入は未抽出）。学生数がないため1人あたりは出していない。日本大学は法人全体。出典は各学校の計算書類。円を百万円に四捨五入して表示。2014年度以前の消費収支計算書は含まない。
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

function compareLede(year: number | null, first: number | undefined, last: number | undefined): string {
  const span = first != null && last != null ? `${first}–${last}年度。` : "";
  const when = year != null ? `${year}年度（${formatEraYear(year)}）。` : "";
  return `${when}${span}大学によって、経営や教育への投資はどう違うか。`;
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
