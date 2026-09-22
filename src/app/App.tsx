import { useEffect, useRef, useState } from "react";
import { formatEraYear } from "../lib/era.ts";
import { formatYen } from "../lib/format.ts";
import { formatPermalink, parsePermalink, snapYear, type ViewId } from "../lib/permalink.ts";
import { UNIVERSITY_ID, type FinanceYear, type UniversityFinance } from "../lib/types.ts";
import { ViewNav } from "./ViewNav.tsx";
import { BalanceView } from "./views/BalanceView.tsx";
import { CashView } from "./views/CashView.tsx";
import { IncomeView } from "./views/IncomeView.tsx";
import { TrendView } from "./views/TrendView.tsx";

function applyPermalink(id: string, year: number, view: ViewId): void {
  const next = formatPermalink(id, year, view);
  if (window.location.search === next) return;
  window.history.replaceState({ id, year, view }, "", `${window.location.pathname}${next}`);
}

function pageTitle(year: number, view: ViewId): string {
  if (view === "balance") return `多摩美術大学 ${year}年度の資産と負債`;
  if (view === "cash") return `多摩美術大学 ${year}年度の資金の流れ`;
  if (view === "trend") return "多摩美術大学の経年変化";
  return `多摩美術大学 ${year}年度の収支`;
}

export function App() {
  const boot = parsePermalink(window.location.search);
  const [data, setData] = useState<UniversityFinance | null>(null);
  const [error, setError] = useState<string | null>(
    boot.id != null && boot.id !== UNIVERSITY_ID ? `「${boot.id}」はまだありません。` : null,
  );
  const [year, setYear] = useState<number | null>(null);
  const [view, setView] = useState<ViewId>(boot.view);
  const yearRef = useRef<number | null>(boot.year);

  useEffect(() => {
    if (year != null) yearRef.current = year;
  }, [year]);

  useEffect(() => {
    if (boot.id != null && boot.id !== UNIVERSITY_ID) return;
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/tamabi.json`)
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
  }, [boot.id]);

  useEffect(() => {
    if (year == null) return;
    applyPermalink(UNIVERSITY_ID, year, view);
    document.title = pageTitle(year, view);
  }, [year, view]);

  if (error && data == null) {
    return (
      <main className="page">
        <p className="status">{error}</p>
      </main>
    );
  }

  const years = data?.years.map((row) => row.year) ?? [];
  const row: FinanceYear | null = data?.years.find((item) => item.year === year) ?? null;
  const first = years[0];
  const last = years[years.length - 1];

  return (
    <div className="page">
      <header className="masthead">
        <p className="eyebrow">学校法人の計算書類</p>
        <div className="masthead__row">
          <h1>
            多摩美術大学
            <span className="sep">の経営状況</span>
          </h1>
          <ViewNav view={view} onView={setView} />
        </div>
      </header>
      <p className="lede">{lede(view, row, first, last)}</p>
      {error ? <p className="status">{error}</p> : null}
      {data && row ? (
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
