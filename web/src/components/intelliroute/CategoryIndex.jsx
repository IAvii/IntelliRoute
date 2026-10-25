import { useMemo, useState } from "react";
import { ArrowUpRight, FolderSearch, Layers } from "lucide-react";
import Badge from "@/components/arc/badge/badge";
import Button from "@/components/arc/button/button";
import EmptyState from "@/components/arc/empty-state/empty-state";
import { Input } from "@/components/arc/input/input";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import SmoothHeight from "@/components/ui/smooth-height";
import { deptColor } from "@/lib/theme";
import { kicker, panel, panelBody, panelHeader, panelTitle } from "@/lib/ui";
import { cn } from "@/lib/utils";

function buildGroups(graph) {
  if (!graph?.nodes) return [];
  const map = new Map();

  for (const node of graph.nodes) {
    if (node.type !== "sub_category") continue;
    if (!map.has(node.dept)) {
      map.set(node.dept, {
        dept: node.dept,
        color: deptColor(node.dept),
        reviews: 0,
        subs: [],
      });
    }
    const group = map.get(node.dept);
    group.subs.push(node);
    group.reviews += Number(node.count) || 0;
  }

  return [...map.values()]
    .map((group) => ({
      ...group,
      subs: group.subs.sort((a, b) => (b.count || 0) - (a.count || 0)),
    }))
    .sort((a, b) => a.dept.localeCompare(b.dept));
}

export default function CategoryIndex({ graph, selectedId, onSelectNode }) {
  const [query, setQuery] = useState("");
  const [dept, setDept] = useState("all");

  const groups = useMemo(() => buildGroups(graph), [graph]);
  const totalReviews = groups.reduce((sum, group) => sum + group.reviews, 0);

  const options = useMemo(
    () => [
      { value: "all", label: "All" },
      ...groups.map((group) => ({
        value: group.dept,
        label: group.dept,
      })),
    ],
    [groups],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return groups
      .filter((group) => dept === "all" || group.dept === dept)
      .map((group) => ({
        ...group,
        subs: needle
          ? group.subs.filter(
              (sub) =>
                sub.label.toLowerCase().includes(needle) ||
                group.dept.toLowerCase().includes(needle),
            )
          : group.subs,
      }))
      .filter((group) => group.subs.length > 0);
  }, [dept, groups, query]);

  const contentKey = `${dept}:${query.trim().toLowerCase()}:${filtered
    .map(
      (group) =>
        `${group.dept}:${group.reviews}:${group.subs
          .map((sub) => `${sub.id}:${sub.count}`)
          .join(",")}`,
    )
    .join("|")}`;

  return (
    <section className={panel} aria-labelledby="categories-heading">
      <header className={panelHeader}>
        <div>
          <p className={kicker}>04 · Taxonomy</p>
          <h2 id="categories-heading" className={panelTitle}>
            Category index
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral" size="sm">
            {groups.length} departments
          </Badge>
          <Badge tone="neutral" size="sm">
            {totalReviews} reviews
          </Badge>
        </div>
      </header>

      <div className={panelBody}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input
                label="Search categories"
                placeholder="Temperature, refund, rider…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
              />
            </div>
            {query ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuery("")}
                className="mb-0.5"
              >
                Clear
              </Button>
            ) : null}
          </div>

          <div className="min-w-0 overflow-hidden">
            <SegmentedControl
              options={options}
              value={dept}
              onValueChange={setDept}
              label="Department filter"
            />
          </div>
        </div>

        <SmoothHeight className="mt-5" morphKey={contentKey}>
          {filtered.length === 0 ? (
            <div>
              <EmptyState
                icon={<FolderSearch className="size-5" />}
                title="No categories match"
                description="Try a shorter search, or clear the department filter to see the full taxonomy."
                action={
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setDept("all");
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((group) => {
                const share = totalReviews
                  ? Math.round((group.reviews / totalReviews) * 100)
                  : 0;

                return (
                  <article
                    key={group.dept}
                    className="rounded-2xl border border-line bg-paper/40 p-3"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectNode?.(group.dept)}
                      className="flex w-full items-center gap-2 rounded-xl px-1 py-1 text-left transition-colors hover:bg-surface-muted/70"
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ background: group.color }}
                      />
                      <span className="text-[13px] font-medium text-ink">
                        {group.dept}
                      </span>
                      <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-ink">
                        {group.reviews} / {share}%
                      </span>
                      <ArrowUpRight className="size-3.5 text-faint-ink" />
                    </button>

                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line/70">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${Math.max(3, share)}%`,
                          background: group.color,
                        }}
                      />
                    </div>

                    <div className="mt-2 space-y-0.5">
                      {group.subs.map((sub) => {
                        const active = selectedId === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => onSelectNode?.(sub.id)}
                            aria-current={active ? "true" : undefined}
                            className={cn(
                              "group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                              active
                                ? "bg-accent-soft text-ink"
                                : "text-ink-soft hover:bg-surface-muted/70 hover:text-ink",
                            )}
                          >
                            <Layers
                              className={cn(
                                "size-3 shrink-0",
                                active ? "text-accent" : "text-faint-ink",
                              )}
                            />
                            <span className="min-w-0 truncate text-[12.5px]">
                              {sub.label}
                            </span>
                            <span className="ml-auto font-mono text-[10px] tabular-nums text-faint-ink group-hover:text-muted-ink">
                              {sub.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </SmoothHeight>
      </div>
    </section>
  );
}
