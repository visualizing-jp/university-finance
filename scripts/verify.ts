/**
 * public/data の計算書類JSONを検算する。
 *
 *   npm run verify
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { UniversityFinance } from "../src/lib/types.ts";

const FILES = ["tamabi.json", "musabi.json"] as const;

function fail(msg: string): never {
  throw new Error(msg);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

for (const file of FILES) {
  const data = JSON.parse(
    await readFile(resolve(import.meta.dirname, "../public/data", file), "utf8"),
  ) as UniversityFinance;
  const expected = file.replace(/\.json$/, "");
  if (data.id !== expected) fail(`${file}: id ${data.id}`);
  if (data.unit !== "円") fail(`${file}: unit ${data.unit}`);
  if (data.years.length < 2) fail(`${file}: 年度が足りない`);

  let previousClosing: number | null = null;
  for (const row of data.years) {
    const tag = `${data.id} ${row.year}`;
    const income = sum(Object.values(row.income));
    const expense = sum(Object.values(row.expense));
    const assets = row.assets.fixed + row.assets.current;
    const liabilities = row.liabilities.fixed + row.liabilities.current;
    const net = row.netAssets.basicFund + row.netAssets.carried;
    const cashMove = row.cash.opening + row.cash.education + row.cash.facility + row.cash.other;

    if (income !== row.activityIncome) fail(`${tag}: 収入バケット ${income} ≠ ${row.activityIncome}`);
    if (expense !== row.activityExpense) fail(`${tag}: 支出バケット ${expense} ≠ ${row.activityExpense}`);
    if (row.activityIncome - row.activityExpense !== row.balanceBeforeReserve) {
      fail(`${tag}: 収支差額`);
    }
    if (assets !== liabilities + net) fail(`${tag}: 貸借が一致しない`);
    if (cashMove !== row.cash.closing) fail(`${tag}: 支払資金の橋`);
    if (row.cashDeposits !== row.cash.closing) fail(`${tag}: 現金預金 ≠ 翌年度繰越支払資金`);
    if (previousClosing != null && previousClosing !== row.cash.opening) {
      fail(`${tag}: 前年度繰越が前年の期末と違う`);
    }
    previousClosing = row.cash.closing;
  }

  const first = data.years[0];
  const last = data.years[data.years.length - 1];
  if (first == null || last == null) fail(`${file}: 年度がない`);
  if (first.year !== 2015) fail(`${file}: 開始 ${first.year}`);
  if (last.year - first.year + 1 !== data.years.length) fail(`${file}: 年度が飛んでいる`);
  console.log(`${data.id} ok ${data.years.length} years ${first.year}–${last.year}`);
}
