import { useEffect, useMemo, useRef, useState } from "react";
import { select } from "d3-selection";
import { sankey as d3Sankey, sankeyLinkHorizontal } from "d3-sankey";
import "d3-transition";
import type { SankeyLink, SankeyNode } from "d3-sankey";
import { formatShare, formatYen } from "../../lib/format.ts";
import { useSize } from "../hooks/useSize.ts";
import { buildIncomeGraph, type GraphLink, type GraphNode } from "./buildIncome.ts";
import { LINK_STROKE_OPACITY, linkStroke, nodeFill } from "./colors.ts";
import type { FinanceYear } from "../../lib/types.ts";

interface SankeyChartProps {
  row: FinanceYear;
}

type SNode = SankeyNode<GraphNode, GraphLink>;
type SLink = SankeyLink<GraphNode, GraphLink>;

const EASE_OUT = (t: number) => 1 - (1 - t) ** 4;

function endpointId(end: SLink["source"] | SLink["target"]): string {
  if (typeof end === "object" && end !== null) return (end as SNode).id;
  return String(end);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function nodeHeight(node: SNode): number {
  return (node.y1 ?? 0) - (node.y0 ?? 0);
}

function labelAnchors(nodes: SNode[], height: number): Map<string, number> {
  const anchors = new Map<string, number>();
  const gap = 34;
  const top = 18;
  const bottom = Math.max(top + gap, height - 20);

  for (const side of ["in", "out"] as const) {
    const group = nodes
      .filter((node) => node.side === side)
      .map((node) => {
        const h = nodeHeight(node);
        let y = ((node.y0 ?? 0) + (node.y1 ?? 0)) / 2;
        if (node.kind === "balance" && h < 22) y = (node.y1 ?? 0) + 8;
        return { id: node.id, y };
      })
      .sort((a, b) => a.y - b.y);

    for (let i = 1; i < group.length; i++) {
      const prev = group[i - 1];
      if (prev && group[i]!.y < prev.y + gap) group[i]!.y = prev.y + gap;
    }
    const last = group[group.length - 1];
    if (last && last.y > bottom) {
      const shift = last.y - bottom;
      for (const item of group) item.y -= shift;
    }
    for (let i = group.length - 2; i >= 0; i--) {
      const next = group[i + 1];
      if (next && group[i]!.y > next.y - gap) group[i]!.y = next.y - gap;
    }
    for (const item of group) {
      anchors.set(item.id, Math.min(bottom, Math.max(top, item.y)));
    }
  }

  return anchors;
}

export function SankeyChart({ row }: SankeyChartProps) {
  const [wrapRef, size] = useSize<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const firstDraw = useRef(true);
  const yearRef = useRef(row.year);
  const [hover, setHover] = useState<{ title: string; body: string; x: number; y: number } | null>(
    null,
  );
  const graph = useMemo(() => buildIncomeGraph(row), [row]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || size.width < 40 || size.height < 40) return;

    const yearChanged = yearRef.current !== row.year;
    const duration = !firstDraw.current && yearChanged && !prefersReducedMotion() ? 600 : 0;
    firstDraw.current = false;
    yearRef.current = row.year;
    setHover(null);

    const layoutWidth = Math.max(size.width, 880);
    const margin = {
      top: 16,
      right: layoutWidth < 1000 ? 132 : 148,
      bottom: 16,
      left: layoutWidth < 1000 ? 132 : 156,
    };
    const layout = d3Sankey<GraphNode, GraphLink>()
      .nodeId((d) => d.id)
      .nodeWidth(18)
      .nodePadding(size.height < 560 ? 8 : 14)
      .nodeSort((a, b) => a.order - b.order)
      .extent([
        [margin.left, margin.top],
        [layoutWidth - margin.right, size.height - margin.bottom],
      ]);

    const laid = layout({
      nodes: graph.nodes.map((node) => ({ ...node })),
      links: graph.links.map((link) => ({ ...link })),
    });
    const nodes = laid.nodes;
    const links = laid.links;
    const path = sankeyLinkHorizontal<SNode, SLink>();
    const root = select(svg);

    const linkSel = root
      .select<SVGGElement>("g.links")
      .selectAll<SVGPathElement, SLink>("path")
      .data(links, (d) => `${endpointId(d.source)}>${endpointId(d.target)}`);

    linkSel.exit().transition().duration(duration).style("opacity", 0).remove();

    const linkEnter = linkSel
      .enter()
      .append("path")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke-opacity", LINK_STROKE_OPACITY)
      .style("opacity", 0);

    const linkMerge = linkEnter.merge(linkSel);
    linkMerge
      .attr("stroke", (d) => linkStroke(d.source as SNode, d.target as SNode))
      .transition()
      .duration(duration)
      .ease(EASE_OUT)
      .attr("d", path)
      .attr("stroke-width", (d) => Math.max(1, d.width ?? 1))
      .style("opacity", 1);

    const nodeSel = root
      .select<SVGGElement>("g.nodes")
      .selectAll<SVGRectElement, SNode>("rect")
      .data(nodes, (d) => d.id);

    nodeSel.exit().transition().duration(duration).style("opacity", 0).remove();

    const nodeEnter = nodeSel
      .enter()
      .append("rect")
      .attr("x", (d) => d.x0 ?? 0)
      .attr("y", (d) => d.y0 ?? 0)
      .attr("width", (d) => Math.max(1, (d.x1 ?? 0) - (d.x0 ?? 0)))
      .attr("height", (d) => Math.max(1, (d.y1 ?? 0) - (d.y0 ?? 0)))
      .style("opacity", 0);

    const nodeMerge = nodeEnter.merge(nodeSel);
    nodeMerge
      .attr("fill", (d) => nodeFill(d))
      .transition()
      .duration(duration)
      .ease(EASE_OUT)
      .attr("x", (d) => d.x0 ?? 0)
      .attr("y", (d) => d.y0 ?? 0)
      .attr("width", (d) => Math.max(1, (d.x1 ?? 0) - (d.x0 ?? 0)))
      .attr("height", (d) => Math.max(1, (d.y1 ?? 0) - (d.y0 ?? 0)))
      .style("opacity", 1);

    const labelSel = root
      .select<SVGGElement>("g.labels")
      .selectAll<SVGGElement, SNode>("g.label")
      .data(nodes, (d) => d.id);

    labelSel.exit().transition().duration(duration).style("opacity", 0).remove();

    const labelEnter = labelSel.enter().append("g").attr("class", "label");
    labelEnter.append("text").attr("class", "label-name");
    labelEnter.append("text").attr("class", "label-meta");

    const anchors = labelAnchors(nodes, size.height);
    const labelPos = (d: SNode) => {
      const y = anchors.get(d.id) ?? ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2;
      if (d.side === "center") {
        const x = ((d.x0 ?? 0) + (d.x1 ?? 0)) / 2;
        return `translate(${x},${y})`;
      }
      const x = d.side === "in" ? (d.x0 ?? 0) - 8 : (d.x1 ?? 0) + 8;
      return `translate(${x},${y})`;
    };

    labelEnter.attr("transform", labelPos).style("opacity", 0);

    const labelMerge = labelEnter.merge(labelSel);
    labelMerge
      .transition()
      .duration(duration)
      .ease(EASE_OUT)
      .attr("transform", labelPos)
      .style("opacity", 1);
    labelMerge
      .select(".label-name")
      .attr("class", (d) => (d.side === "center" ? "label-name is-on-ink" : "label-name"))
      .attr("text-anchor", (d) => {
        if (d.side === "center") return "middle";
        return d.side === "in" ? "end" : "start";
      })
      .attr("dy", "-0.15em")
      .text((d) => d.label);
    labelMerge
      .select(".label-meta")
      .attr("class", (d) => (d.side === "center" ? "label-meta is-on-ink" : "label-meta"))
      .attr("text-anchor", (d) => {
        if (d.side === "center") return "middle";
        return d.side === "in" ? "end" : "start";
      })
      .attr("dy", "1.05em")
      .text((d) => {
        if (d.side === "center") return formatYen(graph.total);
        return `${formatShare(d.value, graph.total)}  ${formatYen(d.value)}`;
      });

    const relatedIds = (node: SNode) => {
      const ids = new Set<string>([node.id]);
      for (const link of links) {
        const s = link.source as SNode;
        const t = link.target as SNode;
        if (s.id === node.id || t.id === node.id) {
          ids.add(s.id);
          ids.add(t.id);
        }
      }
      return ids;
    };

    const showTip = (event: PointerEvent, node: SNode) => {
      const box = svg.getBoundingClientRect();
      setHover({
        title: node.label,
        body: `${formatYen(node.side === "center" ? graph.total : node.value)}（事業活動収入比 ${formatShare(node.side === "center" ? graph.total : node.value, graph.total)}）`,
        x: event.clientX - box.left,
        y: event.clientY - box.top,
      });
    };

    nodeMerge
      .on("pointerenter", function (event, node) {
        const ids = relatedIds(node);
        linkMerge.style("opacity", (d) => {
          const s = d.source as SNode;
          const t = d.target as SNode;
          return ids.has(s.id) && ids.has(t.id) ? 0.72 : 0.08;
        });
        nodeMerge.style("opacity", (d) => (ids.has(d.id) ? 1 : 0.28));
        showTip(event as PointerEvent, node);
      })
      .on("pointermove", function (event, node) {
        showTip(event as PointerEvent, node);
      })
      .on("pointerleave", () => {
        linkMerge.style("opacity", 1);
        nodeMerge.style("opacity", 1);
        setHover(null);
      });
  }, [graph, row.year, size.height, size.width]);

  return (
    <div className="sankey-wrap" ref={wrapRef}>
      <svg
        ref={svgRef}
        width={Math.max(size.width, 880)}
        height={size.height}
        role="img"
        aria-label={`${row.year}年度の事業活動収支`}
      >
        <g className="links" />
        <g className="nodes" />
        <g className="labels" />
      </svg>
      {hover ? (
        <div className="sankey-tip" style={{ left: hover.x, top: hover.y }}>
          <strong>{hover.title}</strong>
          <span>{hover.body}</span>
        </div>
      ) : null}
    </div>
  );
}
