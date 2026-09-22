/**
 * public/data/tamabi.json の検算。
 *
 *   npm run verify
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { UniversityFinance } from "../src/lib/types.ts";

const FILE = resolve(import.meta.dirname, "../public/data/tamabi.json");

function fail(msg: string): never {
  throw new Error(msg);
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

const data = JSON.parse(await readFile(FILE, "utf8")) as UniversityFinance;

if (data.id !== "tamabi") fail(`id ${data.id}`);
if (data.unit !== "円") fail(`unit ${data.unit}`);
if (data.years.length < 2) fail("年度が足りない");

let previousClosing: number | null = null;
for (const row of data.years) {
  const tag = String(row.year);
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
if (first == null || last == null) fail("年度がない");
if (first.year !== 2015) fail(`開始 ${first.year}`);
if (last.year - first.year + 1 !== data.years.length) fail("年度が飛んでいる");

console.log(`ok ${data.years.length} years ${first.year}–${last.year}`);
