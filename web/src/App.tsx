import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Command,
  CornerDownLeft,
  Sparkles,
} from "lucide-react";
import { AnimatedCounter } from "@/components/arc/animated-counter/animated-counter";
import Badge from "@/components/arc/badge/badge";
import Button from "@/components/arc/button/button";
import { Switch } from "@/components/arc/switch/switch";
import { Textarea } from "@/components/arc/textarea/textarea";
import {
  ToastStack,
  ToastStackProvider,
} from "@/components/arc/toast-stack/toast-stack";
import MonoRoundedBarChart from "@/components/amicro/mono-rounded-bar-chart";
import AppFooter from "@/components/console/AppFooter";
import AppHeader from "@/components/console/AppHeader";
import Hero from "@/components/console/Hero";
import KpiStrip from "@/components/console/KpiStrip";
import { GraphFlow } from "@/components/graph-flow";
import BootScreen from "@/components/intelliroute/BootScreen";
import CategoryIndex from "@/components/intelliroute/CategoryIndex";
import ConfidenceCard from "@/components/intelliroute/ConfidenceCard";
import DecisionCard from "@/components/intelliroute/DecisionCard";
import KnowledgePanel from "@/components/intelliroute/KnowledgePanel";
import NodeDrawer from "@/components/intelliroute/NodeDrawer";
import TracePanel from "@/components/intelliroute/TracePanel";
import PanelHeader from "@/components/ui/panel-header";
import StatusBadge from "@/components/ui/status-badge";
import { useEngine } from "@/hooks/useEngine";
import {
  DEPT_SHORT,
  EMPTY_STATS,
  EXAMPLES,
  PIPELINE,
} from "@/lib/console-content";
import {
  DEPARTMENTS,
  deptColor,
  formatDuration,
  statusLabel,
  statusTone,
  summarizeStages,
} from "@/lib/theme";
import { panel, panelBody } from "@/lib/ui";
import { cn } from "@/lib/utils";

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

  const isMac = /Mac|iPhone|iPad/.test(
    typeof navigator === "undefined" ? "" : navigator.platform,
  );

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
          <section
            id="console"
            className={cn(panel, "scroll-mt-24")}
            aria-labelledby="composer-heading"
          >
            <PanelHeader
              kicker="01 · Console"
              title="Route a review"
              headingId="composer-heading"
              badge={<Badge tone="neutral" size="sm">{review.length} chars</Badge>}
            />

            <div className={panelBody}>
              <Textarea
                label="Incoming review"
                description="Compound complaints are split into atomic issues unless skip is on."
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={4}
                placeholder="Paste a customer complaint…"
                spellCheck="true"
                className="min-h-[132px]"
              />

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.16em] text-faint-ink">
                  try
                </span>
                {EXAMPLES.map((ex) => (
                  <Button
                    key={ex.label}
                    variant="ghost"
                    size="sm"
                    onClick={() => setReview(ex.text)}
                  >
                    {ex.label}
                  </Button>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-4 border-t border-line/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-4">
                  <Switch
                    label="Skip split"
                    checked={skipSplit}
                    onCheckedChange={setSkipSplit}
                  />
                  <span className="hidden items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-faint-ink sm:inline-flex">
                    <kbd className="rounded-md border border-line bg-paper px-1.5 py-0.5 text-[9px] text-muted-ink">
                      {isMac ? <Command className="size-2.5" /> : "Ctrl"}
                    </kbd>
                    <kbd className="rounded-md border border-line bg-paper px-1.5 py-0.5 text-[9px] text-muted-ink">
                      <CornerDownLeft className="size-2.5" />
                    </kbd>
                    route
                  </span>
                </div>

                <div className="flex items-center sm:justify-end">
                  <span
                    aria-hidden={!engine.loading}
                    className={`inline-flex shrink-0 items-center justify-end overflow-hidden font-mono text-[11px] tabular-nums text-muted-ink transition-[width,opacity,margin-right] duration-200 ease-out ${
                      engine.loading
                        ? "mr-3 w-12 opacity-100"
                        : "mr-0 w-0 opacity-0"
                    }`}
                  >
                    {engine.loading ? formatDuration(engine.elapsed) : ""}
                  </span>
                  <Button
                    variant="primary"
                    size="lg"
                    loading={engine.loading}
                    disabled={!review.trim() || engine.loading}
                    onClick={() => void engine.classify(review.trim(), skipSplit)}
                    className="min-w-[190px]"
                  >
                    <Sparkles className="size-4" />
                    Classify review
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Pipeline */}
          <section
            className={cn(panel, "flex flex-col")}
            aria-labelledby="pipeline-heading"
          >
            <PanelHeader
              kicker="01b · Flow"
              title="Pipeline"
              headingId="pipeline-heading"
              badge={
                <StatusBadge
                  loading={engine.loading}
                  noComplaint={noComplaint}
                  resultLabel={usedStages.size ? `${usedStages.size}/5 fired` : undefined}
                  loadingLabel="running"
                  minWidth="min-w-[64px]"
                />
              }
            />

            <div className="flex flex-1 flex-col p-5">
              <GraphFlow
                title="ROUTE"
                palette="duo"
                corner="+"
                rows={[
                  {
                    nodes: PIPELINE.map((stage) => ({
                      label: stage.label,
                      tone: usedStages.size
                        ? usedStages.has(stage.id)
                          ? "accent"
                          : "muted"
                        : "default",
                    })),
                  },
                ]}
              />

              <div className="mt-5 grid grid-cols-3 divide-x divide-line/80 overflow-hidden rounded-xl border border-line bg-paper/40">
                {(
                  [
                    [
                      "latency",
                      engine.lastRun.duration
                        ? formatDuration(engine.lastRun.duration)
                        : "—",
                    ],
                    [
                      "issues",
                      engine.lastRun.duration != null ? traces.length : "—",
                    ],
                    [
                      "mode",
                      engine.lastRun.duration
                        ? engine.lastRun.skipSplit
                          ? "single"
                          : "split"
                        : "—",
                    ],
                  ] as [string, string | number][]
                ).map(([label, value]) => (
                  <div key={label} className="px-3 py-2.5">
                    <p className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-faint-ink">
                      {label}
                    </p>
                    <p className="mt-0.5 font-mono text-[13px] tabular-nums text-ink">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <p className="mt-auto pt-4 font-mono text-[9px] uppercase leading-relaxed tracking-[0.14em] text-faint-ink">
                accent = fired last run
                <br />
                muted = skipped by confidence
              </p>
            </div>
          </section>
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

          <section
            className={cn(panel, "flex flex-col")}
            aria-labelledby="distribution-heading"
          >
            <PanelHeader
              kicker="06 · Distribution"
              title="Department mix"
              headingId="distribution-heading"
              badge={<Badge tone="neutral" size="sm">{stats.sub_categories} categories</Badge>}
            />

            <div className={cn(panelBody, "flex flex-1 flex-col")}>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint-ink">
                    total routed
                  </p>
                  <div className="mt-1 text-[32px] leading-none tracking-tight text-ink">
                    <AnimatedCounter value={stats.reviews} />
                  </div>
                </div>
                <div className="space-y-1.5 pb-0.5 text-right">
                  <span className="flex items-center justify-end gap-1.5 text-[10px] text-muted-ink">
                    <span className="size-2 rounded-full bg-ink" /> reviews
                  </span>
                  <span className="flex items-center justify-end gap-1.5 text-[10px] text-muted-ink">
                    <span className="size-2 rounded-full bg-line-strong" />{" "}
                    categories
                  </span>
                </div>
              </div>

              <MonoRoundedBarChart
                data={deptData}
                height="100%"
                className="mt-3 min-h-[240px] flex-1"
                primaryLabel="Reviews"
                secondaryLabel="Categories"
              />

              <p className="mt-3 border-t border-line/80 pt-3 text-[11.5px] leading-relaxed text-muted-ink">
                Cumulative counts, updated after every route. The cobalt bar
                marks the department behind the selected issue.
              </p>
            </div>
          </section>
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
