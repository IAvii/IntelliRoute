import { useEffect, useMemo, useRef, useState } from "react";
import {
  ToastStack,
  ToastStackProvider,
} from "@/components/arc/toast-stack/toast-stack";
import AppFooter from "@/components/console/AppFooter";
import AppHeader from "@/components/console/AppHeader";
import ComposerPanel from "@/components/console/ComposerPanel";
import Hero from "@/components/console/Hero";
import KpiStrip from "@/components/console/KpiStrip";
import PipelinePanel from "@/components/console/PipelinePanel";
import BootScreen from "@/components/intelliroute/BootScreen";
import CategoryIndex from "@/components/intelliroute/CategoryIndex";
import ConfidenceCard from "@/components/intelliroute/ConfidenceCard";
import DecisionCard from "@/components/intelliroute/DecisionCard";
import DistributionPanel from "@/components/intelliroute/DistributionPanel";
import KnowledgePanel from "@/components/intelliroute/KnowledgePanel";
import NodeDrawer from "@/components/intelliroute/NodeDrawer";
import TracePanel from "@/components/intelliroute/TracePanel";
import { useEngine } from "@/hooks/useEngine";
import { DEPT_SHORT, EMPTY_STATS } from "@/lib/console-content";
import {
  DEPARTMENTS,
  deptColor,
  statusLabel,
  statusTone,
  summarizeStages,
} from "@/lib/theme";

// ---------------------------------------------------------------------------
// Console — the page module. Owns UI state only; engine state lives in
// useEngine. The two are joined here via the small EngineState interface.
// ---------------------------------------------------------------------------

function Console() {
  const engine = useEngine();

  // UI state — what the user is looking at, not what the engine is doing.
  const [review, setReview] = useState(
    "The delivery took three hours and the pizza was cold.",
  );
  const [skipSplit, setSkipSplit] = useState(false);
  const [activeTraceIndex, setActiveTraceIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Reset the view whenever a new result arrives (or is cleared by reset).
  // engine.result changes both at classify-start (-> null) and on success.
  const prevResult = useRef(engine.result);
  useEffect(() => {
    if (prevResult.current !== engine.result) {
      prevResult.current = engine.result;
      setActiveTraceIndex(0);
      setSelectedId(null);
    }
  }, [engine.result]);

  // Keyboard: Cmd/Ctrl+Enter routes, Escape deselects a node.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void engine.classify(review.trim(), skipSplit);
      } else if (e.key === "Escape") {
        setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [engine.classify, review, skipSplit]);

  // Clear selectedId if the node is no longer in the graph (e.g. after reset).
  useEffect(() => {
    if (selectedId && !engine.graph?.nodes?.some((n) => n.id === selectedId)) {
      setSelectedId(null);
    }
  }, [engine.graph, selectedId]);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const selectedNode = useMemo(() => {
    if (!selectedId || !engine.graph) return null;
    return engine.graph.nodes.find((n) => n.id === selectedId) ?? null;
  }, [engine.graph, selectedId]);

  const deptAgg = useMemo(() => {
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
  const noComplaint =
    Boolean(engine.result) &&
    !engine.loading &&
    !engine.error &&
    traces.length === 0 &&
    engine.lastRun.duration != null;

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

  // ---------------------------------------------------------------------------
  // Boot / offline screen
  // ---------------------------------------------------------------------------

  if (!engine.graph) {
    return (
      <div className="relative min-h-screen">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(35,66,255,0.08),transparent_50%),radial-gradient(ellipse_at_80%_0%,rgba(14,107,71,0.05),transparent_45%)]"
        />
        <BootScreen
          offline={engine.offline}
          connecting={engine.connecting}
          onRetry={engine.loadGraph}
        />
        <ToastStack position="bottom-right" />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main console
  // ---------------------------------------------------------------------------

  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(35,66,255,0.085),transparent_50%),radial-gradient(ellipse_at_80%_0%,rgba(14,107,71,0.05),transparent_45%)]"
      />

      <AppHeader
        tone={tone}
        status={status}
        confirmReset={engine.confirmReset}
        resetting={engine.resetting}
        offline={engine.offline}
        onReset={engine.reset}
      />

      <main className="mx-auto w-full max-w-[1440px] px-5 pb-16 lg:px-8">
        <Hero />

        <KpiStrip
          stats={stats}
          deptAgg={deptAgg}
          avgPerCategory={avgPerCategory}
        />

        {/* ── Console + Pipeline ────────────────────────────────────────────── */}
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.22fr)_minmax(0,0.78fr)]">
          <ComposerPanel
            review={review}
            onReviewChange={setReview}
            skipSplit={skipSplit}
            onSkipSplitChange={setSkipSplit}
            loading={engine.loading}
            elapsed={engine.elapsed}
            onRoute={() => void engine.classify(review.trim(), skipSplit)}
          />
          <PipelinePanel
            usedStages={usedStages}
            lastRun={engine.lastRun}
            issueCount={traces.length}
            loading={engine.loading}
            noComplaint={noComplaint}
          />
        </div>

        {/* ── Trace + Confidence + Decision ─────────────────────────────────── */}
        <div
          id="trace"
          className="mt-4 grid scroll-mt-24 items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]"
        >
          <TracePanel
            traces={traces}
            loading={engine.loading}
            error={engine.error}
            elapsed={engine.elapsed}
            noComplaint={noComplaint}
            onExample={() => setReview("Pizza was ice cold")}
            onOpenNode={setSelectedId}
          />

          <div className="flex flex-col gap-4 xl:sticky xl:top-20">
            <ConfidenceCard
              trace={activeTrace}
              traces={traces}
              activeIndex={selectedTraceIndex}
              onActiveChange={setActiveTraceIndex}
              loading={engine.loading}
              noComplaint={noComplaint}
            />
            <DecisionCard
              trace={activeTrace}
              noComplaint={noComplaint}
              loading={engine.loading}
            />
          </div>
        </div>

        {/* ── Knowledge graph + Distribution ────────────────────────────────── */}
        <div
          id="knowledge"
          className="mt-4 grid scroll-mt-24 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]"
        >
          <KnowledgePanel graph={engine.graph} selectedId={selectedId} />

          <DistributionPanel stats={stats} deptData={deptData} />
        </div>

        {/* ── Taxonomy ──────────────────────────────────────────────────────── */}
        <div id="taxonomy" className="mt-4 scroll-mt-24">
          <CategoryIndex
            graph={engine.graph}
            selectedId={selectedId}
            onSelectNode={setSelectedId}
          />
        </div>

        <AppFooter />
      </main>

      <NodeDrawer
        open={Boolean(selectedNode)}
        node={selectedNode}
        graph={engine.graph}
        onClose={() => setSelectedId(null)}
        onSelectNode={setSelectedId}
      />
      <ToastStack position="bottom-right" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// App — wraps Console in the toast context provider.
// ---------------------------------------------------------------------------

export default function App() {
  return (
    <ToastStackProvider>
      <Console />
    </ToastStackProvider>
  );
}
