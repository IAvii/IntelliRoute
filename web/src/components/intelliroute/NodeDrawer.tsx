import type { CSSProperties } from "react";
import { ArrowRight, Layers, MessageSquareText } from "lucide-react";
import Badge from "@/components/arc/badge/badge";
import { CopyButton } from "@/components/arc/copy-button/copy-button";
import {
  Drawer,
  DrawerContent,
  useDrawerItem,
} from "@/components/arc/drawer/drawer";
import { CarbonLift } from "@/components/ui/copy-button-travel";
import { deptColor } from "@/lib/theme";
import type { GraphData, GraphEdge, GraphNode } from "@/lib/types";

interface NodeDrawerProps {
  open?: boolean;
  node?: GraphNode | null;
  graph?: GraphData | null;
  onClose?: () => void;
  onSelectNode?: (id: string) => void;
}

interface NodeBodyProps {
  node: GraphNode;
  graph?: GraphData | null;
  onSelectNode?: (id: string) => void;
}

function parentEdge(node?: GraphNode | null, graph?: GraphData | null): GraphEdge | undefined {
  return (graph?.edges || []).find(
    (edge) => edge.type === "has_review" && edge.target === node?.id,
  );
}

function fullReview(node?: GraphNode | null, graph?: GraphData | null) {
  if (!node) return "";
  const edge = parentEdge(node, graph);
  const list = edge?.source ? graph?.reviews_by_node_id?.[edge.source] || [] : [];
  const prefix = (node.label || "").replace(/\.\.\.$/, "");
  return list.find((text) => text.startsWith(prefix)) || node.label || "";
}

function subReviews(node?: GraphNode | null, graph?: GraphData | null) {
  return graph?.reviews_by_node_id?.[node?.id as string] || [];
}

function DepartmentBody({ node, graph, onSelectNode }: NodeBodyProps) {
  const subs = (graph?.nodes || [])
    .filter((item) => item.type === "sub_category" && item.dept === node.id)
    .sort((a, b) => (b.count || 0) - (a.count || 0));
  const reviews = subs.reduce((sum, item) => sum + (Number(item.count) || 0), 0);
  const color = deptColor(node.id);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral" size="sm" icon={<Layers className="size-3" />}>
          Department
        </Badge>
        <Badge tone="neutral" size="sm">
          {subs.length} categories
        </Badge>
        <Badge tone="neutral" size="sm">
          {reviews} reviews
        </Badge>
      </div>

      <div
        className="h-1 w-full rounded-full"
        style={{ background: color }}
        aria-hidden="true"
      />

      <p className="text-[13px] leading-relaxed text-muted-ink">
        Every category below is a learned cluster under this department. Open
        one to read the reviews that shaped its prototype.
      </p>

      <div className="space-y-1.5">
        {subs.map((sub) => (
          <button
            key={sub.id}
            type="button"
            onClick={() => onSelectNode?.(sub.id)}
            className="flex w-full items-center gap-2 rounded-xl border border-line bg-paper/50 px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-muted/60"
          >
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: color }}
            />
            <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
              {sub.label}
            </span>
            <span className="font-mono text-[10px] tabular-nums text-faint-ink">
              {sub.count}
            </span>
            <ArrowRight className="size-3.5 text-faint-ink" />
          </button>
        ))}
      </div>
    </div>
  );
}

function CategoryBody({ node, graph, onSelectNode }: NodeBodyProps) {
  const reviews = subReviews(node, graph);
  const color = deptColor(node.dept);

  return (
    <div className="space-y-5" style={{ "--dept": color } as CSSProperties}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="neutral" size="sm" icon={<Layers className="size-3" />}>
          {node.dept}
        </Badge>
        <Badge tone="neutral" size="sm">
          {reviews.length} reviews
        </Badge>
      </div>

      <CarbonLift
        value={`${node.dept} / ${node.label}`}
        description="category path"
        className="rounded-xl border border-line bg-paper/50 px-3 py-2"
      />

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-ink">
          source reviews
        </p>
        {reviews.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted-ink">
            No reviews recorded for this category yet.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {reviews.map((text, index) => (
              <li
                key={`${index}-${text.slice(0, 12)}`}
                className="group rounded-xl border border-line/80 bg-paper/45 p-3"
              >
                <div className="flex items-start gap-1.5">
                  <span className="mt-1 font-mono text-[9px] tabular-nums text-faint-ink">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-ink-soft">
                    {text}
                  </p>
                  <CopyButton
                    value={text}
                    label="Copy review"
                    iconOnly
                    variant="plain"
                    className="shrink-0"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => onSelectNode?.(node.dept as string)}
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-ink underline-offset-4 hover:text-ink hover:underline"
      >
        <ArrowRight className="size-3 rotate-180" />
        Back to {node.dept}
      </button>
    </div>
  );
}

function ReviewBody({ node, graph, onSelectNode }: NodeBodyProps) {
  const text = fullReview(node, graph);
  const edge = parentEdge(node, graph);
  const parent = (graph?.nodes || []).find((item) => item.id === edge?.source);
  const color = deptColor(node.dept);

  return (
    <div className="space-y-5" style={{ "--dept": color } as CSSProperties}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          tone="neutral"
          size="sm"
          icon={<MessageSquareText className="size-3" />}
        >
          Review node
        </Badge>
        <Badge tone="neutral" size="sm">
          {node.dept}
        </Badge>
      </div>

      <blockquote className="border-l-2 pl-4 font-serif text-[21px] leading-[1.35] text-ink" style={{ borderColor: color }}>
        {text}
      </blockquote>

      <CarbonLift
        value={text}
        description="review text"
        className="rounded-xl border border-line bg-paper/50 px-3 py-2"
      />

      {parent ? (
        <button
          type="button"
          onClick={() => onSelectNode?.(parent.id)}
          className="flex w-full items-center gap-2 rounded-xl border border-line bg-paper/50 px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-muted/60"
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: color }}
          />
          <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
            {parent.label}
          </span>
          <ArrowRight className="size-3.5 text-faint-ink" />
        </button>
      ) : null}
    </div>
  );
}

export default function NodeDrawer({
  open,
  node,
  graph,
  onClose,
  onSelectNode,
}: NodeDrawerProps) {
  const last = useDrawerItem(node);
  const current = node ?? last;

  const isDepartment = current?.type === "department";
  const isReview = current?.type === "review";
  const description = isDepartment
    ? "Department overview and its categories"
    : isReview
      ? "The review that created this node"
      : current?.dept
        ? `${current.dept} · category detail`
        : "Knowledge graph detail";

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose?.()}>
      <DrawerContent
        title={current?.label || "Knowledge node"}
        description={description}
        side="right"
        className="max-w-[440px]"
      >
        {current ? (
          isDepartment ? (
            <DepartmentBody
              node={current}
              graph={graph}
              onSelectNode={onSelectNode}
            />
          ) : isReview ? (
            <ReviewBody
              node={current}
              graph={graph}
              onSelectNode={onSelectNode}
            />
          ) : (
            <CategoryBody
              node={current}
              graph={graph}
              onSelectNode={onSelectNode}
            />
          )
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
