/**
 * useConsoleView - the derived view-model for the console page.
 *
 * Console() used to compute twelve values inline from engine state plus the
 * two pieces of UI state that select what you are looking at (selected node,
 * active issue). They are pure derivations, so they live here and the page is
 * left with layout and wiring.
 *
 * Nothing here stores state: every value is derived from its inputs on render,
 * with useMemo only where the original page memoised.
 */
import { useMemo } from "react";
import type { EngineState } from "@/hooks/useEngine";
import { DEPT_SHORT, EMPTY_STATS } from "@/lib/console-content";
import {
  DEPARTMENTS,
  deptColor,
  statusLabel,
  statusTone,
  summarizeStages,
} from "@/lib/theme";
import type { DeptAgg } from "@/lib/types";

export function useConsoleView(
  engine: EngineState,
  selectedId: string | null,
  activeTraceIndex: number,
) {
  const selectedNode = useMemo(() => {
    if (!selectedId || !engine.graph) return null;
    return engine.graph.nodes.find((n) => n.id === selectedId) ?? null;
  }, [engine.graph, selectedId]);

  /** Sub-category counts rolled up per department, in DEPARTMENTS order. */
  const deptAgg = useMemo<DeptAgg[]>(() => {
    const map = new Map(
      DEPARTMENTS.map((dept) => [
        dept,
        { dept, color: deptColor(dept), subs: 0, reviews: 0 },
      ]),
    );
    for (const node of engine.graph?.nodes ?? []) {
      if (node.type !== "sub_category") continue;
      const dept = node.dept as string;
      const entry = map.get(dept) ?? {
        dept,
        color: deptColor(dept, node.color),
        subs: 0,
        reviews: 0,
      };
      entry.subs += 1;
      entry.reviews += Number(node.count) || 0;
      map.set(dept, entry);
    }
    return [...map.values()];
  }, [engine.graph]);

  const stats = engine.graph?.stats ?? EMPTY_STATS;
  const avgPerCategory = stats.sub_categories
    ? (stats.reviews / stats.sub_categories).toFixed(1)
    : "0.0";

  const usedStages = summarizeStages(engine.result?.traces);
  const traces = engine.result?.traces ?? [];
  const selectedTraceIndex = Math.min(
    activeTraceIndex,
    Math.max(0, traces.length - 1),
  );
  const activeTrace = traces[selectedTraceIndex] ?? null;

  /** A run that finished with no issues to report (no complaint in the text). */
  const noComplaint =
    Boolean(engine.result) &&
    !engine.loading &&
    !engine.error &&
    traces.length === 0 &&
    engine.lastRun.duration != null;

  /** Chart rows: reviews per department, with the selected issue's one accented. */
  const deptData = useMemo(
    () =>
      deptAgg.map((d) => ({
        name: d.dept,
        label: DEPT_SHORT[d.dept] || d.dept,
        primary: d.reviews,
        secondary: d.subs,
        accent: activeTrace?.result.department === d.dept,
      })),
    [deptAgg, activeTrace],
  );

  const tone = statusTone(engine.offline, engine.connecting);
  const status = statusLabel(engine.offline, engine.connecting);

  return {
    selectedNode,
    deptAgg,
    deptData,
    stats,
    avgPerCategory,
    usedStages,
    traces,
    activeTrace,
    selectedTraceIndex,
    noComplaint,
    tone,
    status,
  };
}
