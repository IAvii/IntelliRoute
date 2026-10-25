import { useEffect, useMemo, useState } from "react";
import { Network, MousePointerClick } from "lucide-react";
import Badge from "@/components/arc/badge/badge";
import Treemap from "@/components/arc/treemap/treemap";
import { DEPARTMENTS, deptColor } from "@/lib/theme";
import PanelHeader from "@/components/ui/panel-header";
import { panel, panelBody } from "@/lib/ui";
import type { GraphData } from "@/lib/types";

interface KnowledgeLeaf {
  id: string;
  label: string;
  value: number;
  color: number;
}

interface KnowledgeBranch {
  id: string;
  label: string;
  children: KnowledgeLeaf[];
}

interface KnowledgeTree {
  id: string;
  label: string;
  children: KnowledgeBranch[];
}

interface KnowledgePanelProps {
  graph?: GraphData | null;
  selectedId?: string | null;
}

function buildTree(graph?: GraphData | null): KnowledgeTree {
  const order = [...DEPARTMENTS];
  const byDept = new Map<string, KnowledgeLeaf[]>(
    order.map((dept) => [dept, []]),
  );

  for (const node of graph?.nodes || []) {
    if (node.type !== "sub_category") continue;
    const dept = node.dept as string;
    if (!byDept.has(dept)) {
      byDept.set(dept, []);
      order.push(dept);
    }
    byDept.get(dept)!.push({
      id: node.id,
      label: node.label,
      value: Math.max(1, Number(node.count) || 0),
      color: Math.max(1, Number(node.count) || 0),
    });
  }

  return {
    id: "kb",
    label: "Knowledge base",
    children: [...byDept.entries()]
      .filter(([, subs]) => subs.length > 0)
      .map(([dept, subs]) => ({
        id: dept,
        label: dept,
        children: subs.sort((a, b) => b.value - a.value),
      })),
  };
}

export default function KnowledgePanel({ graph, selectedId }: KnowledgePanelProps) {
  const [focus, setFocus] = useState("kb");
  const tree = useMemo(() => buildTree(graph), [graph]);

  useEffect(() => {
    if (!selectedId) {
      setFocus("kb");
      return;
    }
    const node = (graph?.nodes || []).find((item) => item.id === selectedId);
    if (node?.type === "department") setFocus(node.id);
    else if (node?.dept) setFocus(node.dept);
  }, [graph, selectedId]);

  const groups = tree.children || [];
  const total = groups.reduce(
    (sum, group) => sum + group.children.reduce((n, leaf) => n + leaf.value, 0),
    0,
  );

  return (
    <section className={panel} aria-labelledby="knowledge-heading">
      <PanelHeader
        kicker="05 · Knowledge"
        title="Knowledge map"
        headingId="knowledge-heading"
        badge={
          <div className="flex items-center gap-2">
            <Badge tone="neutral" size="sm" icon={<Network className="size-3" />}>
              {groups.length} branches
            </Badge>
            <Badge tone="neutral" size="sm">{total} reviews</Badge>
          </div>
        }
      />

      <div className={panelBody}>
        <Treemap
          data={tree}
          label="Knowledge base reviews by department and sub-category"
          focus={focus}
          onFocusChange={setFocus}
          height={318}
          colorLabel="Reviews"
          formatValue={(value: number) =>
            `${value} ${value === 1 ? "review" : "reviews"}`
          }
          formatColor={(value: number) => {
            const count = Math.round(value);
            return `${count} ${count === 1 ? "review" : "reviews"}`;
          }}
          emptyLabel="No routes learned yet"
        />

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {groups.map((group) => {
            const count = group.children.reduce((n, leaf) => n + leaf.value, 0);
            return (
              <button
                key={group.id}
                type="button"
                onClick={() => setFocus(group.id)}
                className="flex items-center gap-2 rounded-xl border border-line/80 bg-paper/45 px-2.5 py-2 text-left transition-colors hover:border-line-strong hover:bg-surface-muted/60"
              >
                <span
                  className="size-2 rounded-full"
                  style={{ background: deptColor(group.id) }}
                />
                <span className="min-w-0 truncate text-[11px] text-ink-soft">
                  {group.label}
                </span>
                <span className="ml-auto font-mono text-[10px] tabular-nums text-faint-ink">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-faint-ink">
          <MousePointerClick className="size-3" />
          click a block to zoom · use the index below for detail
        </p>
      </div>
    </section>
  );
}
