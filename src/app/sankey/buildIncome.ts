import type { FinanceYear } from "../../lib/types.ts";
import { EXPENSE_BUCKETS, INCOME_BUCKETS } from "../../lib/taxonomy.ts";

export type NodeKind = "income" | "total" | "expense" | "balance";
export type NodeSide = "in" | "center" | "out";

export interface GraphNode {
  id: string;
  label: string;
  kind: NodeKind;
  side: NodeSide;
  value: number;
  order: number;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
}

export interface IncomeGraph {
  year: number;
  total: number;
  expenseTotal: number;
  balance: number;
  nodes: GraphNode[];
  links: GraphLink[];
}

export function buildIncomeGraph(row: FinanceYear): IncomeGraph {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const total = row.activityIncome;
  const expenseTotal = row.activityExpense;
  const balance = row.balanceBeforeReserve;

  INCOME_BUCKETS.forEach((bucket, order) => {
    const value = row.income[bucket.key];
    if (value <= 0) return;
    nodes.push({
      id: `in:${bucket.key}`,
      label: bucket.label,
      kind: "income",
      side: "in",
      value,
      order,
    });
    links.push({ source: `in:${bucket.key}`, target: "total", value });
  });

  if (balance < 0) {
    nodes.push({
      id: "balance",
      label: "収支差額（赤字）",
      kind: "balance",
      side: "in",
      value: -balance,
      order: 80,
    });
    links.push({ source: "balance", target: "total", value: -balance });
  }

  nodes.push({
    id: "total",
    label: "事業活動",
    kind: "total",
    side: "center",
    value: balance < 0 ? expenseTotal : total,
    order: 0,
  });

  EXPENSE_BUCKETS.forEach((bucket, order) => {
    const value = row.expense[bucket.key];
    if (value <= 0) return;
    nodes.push({
      id: `out:${bucket.key}`,
      label: bucket.label,
      kind: "expense",
      side: "out",
      value,
      order,
    });
    links.push({ source: "total", target: `out:${bucket.key}`, value });
  });

  if (balance > 0) {
    nodes.push({
      id: "balance",
      label: "収支差額（黒字）",
      kind: "balance",
      side: "out",
      value: balance,
      order: 80,
    });
    links.push({ source: "total", target: "balance", value: balance });
  }

  return { year: row.year, total, expenseTotal, balance, nodes, links };
}
