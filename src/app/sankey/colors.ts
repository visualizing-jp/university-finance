import { hcl } from "d3-color";
import { schemePiYG } from "d3-scale-chromatic";
import type { GraphNode } from "./buildIncome.ts";

const piyg = schemePiYG[7]!;

export const COLOR_INCOME = piyg[0]!;
export const COLOR_EXPENSE = piyg[6]!;
export const COLOR_TOTAL = "#2c3338";

const BALANCE_HUE = 250;

function retint(hex: string, hue: number): string {
  const src = hcl(hex);
  return hcl(hue, src.c, src.l).formatHex();
}

export const COLOR_BALANCE = retint(COLOR_EXPENSE, BALANCE_HUE);
export const COLOR_DEDUCT = "#8e0152";
export const LINK_STROKE_OPACITY = 0.38;

export function nodeFill(node: GraphNode): string {
  if (node.kind === "income") return COLOR_INCOME;
  if (node.kind === "expense") return COLOR_EXPENSE;
  if (node.kind === "balance") return COLOR_BALANCE;
  return COLOR_TOTAL;
}

export function linkStroke(source: GraphNode, target: GraphNode): string {
  if (target.kind === "expense" || target.kind === "balance") return nodeFill(target);
  return nodeFill(source);
}
