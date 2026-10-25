import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ChartNoAxesColumnIncreasing,
  Command,
  CornerDownLeft,
  Heart,
  RotateCcw,
  Sparkles,
  Star,
  Terminal,
} from "lucide-react";
import { AnimatedCounter } from "@/components/arc/animated-counter/animated-counter";
import Badge from "@/components/arc/badge/badge";
import Button from "@/components/arc/button/button";
import { CopyButton } from "@/components/arc/copy-button/copy-button";
import Progress from "@/components/arc/progress/progress";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Switch } from "@/components/arc/switch/switch";
import { Textarea } from "@/components/arc/textarea/textarea";
import {
  ToastStack,
  ToastStackProvider,
  useToastStack,
} from "@/components/arc/toast-stack/toast-stack";
import MonoRoundedBarChart from "@/components/amicro/mono-rounded-bar-chart";
import { EvilBarChart } from "@/components/evilcharts/charts/recharts-bar-chart";
import { GraphFlow } from "@/components/graph-flow";
import { GraphKpi } from "@/components/graph-kpi";
import CategoryIndex from "@/components/intelliroute/CategoryIndex";
import KnowledgePanel from "@/components/intelliroute/KnowledgePanel";
import NodeDrawer from "@/components/intelliroute/NodeDrawer";
import TracePanel from "@/components/intelliroute/TracePanel";
import SmoothHeight from "@/components/ui/smooth-height";
import { bootstrap, classify, getGraph, resetState } from "./api.js";
import {
  DECISION_BADGES,
  DEPARTMENTS,
  deptColor,
  formatDuration,
  score,
  summarizeStages,
} from "@/lib/theme";
import { candidateScores } from "@/lib/trace";
import {
  kicker,
  panel,
  panelBody,
  panelHeader,
  panelTitle,
} from "@/lib/ui";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  { label: "Spicy + taste", text: "food was too spicy and not taste good" },
  { label: "Cold pizza", text: "Pizza was ice cold" },
  {
    label: "Two complaints",
    text: "The delivery took three hours and the pizza was cold.",
  },
  { label: "Double charge", text: "Got charged twice on card" },
];

const EMPTY_STATS = {
  departments: 5,
  sub_categories: 0,
  reviews: 0,
  graph_nodes: 0,
};

const PIPELINE = [
  { id: "BM25", label: "BM25" },
  { id: "Dept FAISS", label: "DEPT" },
  { id: "Sub FAISS", label: "SUB" },
  { id: "Rerank", label: "RERANK" },
  { id: "LLM", label: "LLM" },
];

const DEPT_SHORT = {
  Food: "Food",
  Delivery: "Deliv",
  Payment: "Pay",
  "App & Tech": "App",
  "Restaurant Experience": "Dining",
};

const SCORE_CONFIG = {
  score: {
    label: "Confidence",
    colors: { light: ["#2342ff"] },
  },
};

const START_COMMAND = "cd core && uvicorn app.main:app --port 8000";
const REPO_URL = "https://github.com/IAvii/IntelliRoute";
const PROFILE_URL = "https://github.com/IAvii";
const MIN_LOADING_MS = 700;

function statusTone(offline, connecting) {
  if (offline) return "danger";
  if (connecting) return "warning";
  return "success";
}

function statusLabel(offline, connecting) {
  if (offline) return "Engine offline";
  if (connecting) return "Connecting";
  return "Engine live";
}

function GitHubIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.98 3.23 9.2 7.71 10.69.56.1.77-.24.77-.54v-1.9c-3.14.68-3.8-1.51-3.8-1.51-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.51-.28-5.15-1.26-5.15-5.6 0-1.24.44-2.25 1.16-3.04-.12-.29-.5-1.44.11-3 0 0 .95-.3 3.12 1.16.9-.25 1.87-.38 2.83-.38.96 0 1.93.13 2.83.38 2.17-1.46 3.12-1.16 3.12-1.16.61 1.56.23 2.71.11 3 .72.79 1.16 1.8 1.16 3.04 0 4.35-2.65 5.31-5.17 5.59.4.35.76 1.04.76 2.09v3.1c0 .3.2.65.78.54a11.26 11.26 0 0 0 7.7-10.69C23.25 5.48 18.27.5 12 .5Z" />
    </svg>
  );
}

function BootScreen({ offline, connecting, onRetry }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden px-6 py-8">
      <a
        className="inline-flex w-fit items-center gap-2.5"
        href="/"
        aria-label="IntelliRoute home"
      >
        <img
          src="/extension-icon.svg"
          alt=""
          className="size-9 rounded-[11px] shadow-sm"
          decoding="async"
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-ink">
          intelliroute
        </span>
      </a>

      <div className="m-auto w-full max-w-[460px] pb-16">
        <Badge
          tone={statusTone(offline, connecting)}
          size="sm"
          icon={
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
          }
        >
          {offline ? "Connection lost" : "Warming up"}
        </Badge>

        <div className="mt-7 flex items-start gap-4">
          <img
            src="/extension-icon.svg"
            alt=""
            className="size-16 shrink-0 rounded-[18px] shadow-[0_18px_38px_-20px_rgba(23,22,15,0.55)]"
            decoding="async"
          />
          <div>
            <p className={kicker}>Local-first routing engine</p>
            <h1 className="mt-2 font-serif text-[42px] leading-[0.98] tracking-[-0.02em] text-ink">
              {offline ? (
                <>
                  The engine is
                  <br />
                  <em className="text-accent">offline.</em>
                </>
              ) : (
                <>
                  Waking the
                  <br />
                  <em className="text-accent">routing engine.</em>
                </>
              )}
            </h1>
          </div>
        </div>

        <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-muted-ink">
          {offline
            ? "Start the FastAPI backend and this console will reconnect on its own. The knowledge base lives in memory, so a restart rebuilds it from seed reviews."
            : "Loading embeddings, the knowledge graph and the seed taxonomy. The first run can take up to a minute while the models warm."}
        </p>

        {offline ? (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
              <Terminal className="size-3.5 shrink-0 text-muted-ink" />
              <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-soft">
                {START_COMMAND}
              </code>
              <CopyButton value={START_COMMAND} label="Copy command" iconOnly variant="plain" />
            </div>
            <Button variant="primary" onClick={onRetry} loading={connecting}>
              <RotateCcw className="size-4" />
              Retry connection
            </Button>
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-1.5" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((index) => (
              <span
                key={index}
                className="h-1 w-10 animate-pulse rounded-full bg-ink/70"
                style={{ animationDelay: `${index * 140}ms` }}
              />
            ))}
          </div>
        )}

        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.16em] text-faint-ink">
          API · 127.0.0.1:8000
        </p>
      </div>
    </div>
  );
}

function ConfidenceCard({
  trace,
  traces = [],
  activeIndex = 0,
  onActiveChange,
  loading,
  noComplaint = false,
}) {
  const { source, rows } = useMemo(() => candidateScores(trace), [trace]);
  const chartData = useMemo(
    () =>
      rows.map((row) => ({
        label: row.label,
        score: Number((row.score * 100).toFixed(1)),
      })),
    [rows],
  );
  const winner = chartData[0];
  const bodyKey = loading
    ? "loading"
    : noComplaint
      ? "positive"
      : chartData.length
        ? `scored:${source ?? ""}:${chartData.length}`
        : "waiting";

  return (
    <section className={panel} aria-labelledby="confidence-heading">
      <header className={panelHeader}>
        <div>
          <p className={kicker}>03 · Confidence</p>
          <h2 id="confidence-heading" className={panelTitle}>
            Candidate confidence
          </h2>
        </div>
        {traces.length > 1 ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-faint-ink">
              issue
            </span>
            <SegmentedControl
              options={traces.map((_, index) => ({
                value: String(index),
                label: String(index + 1).padStart(2, "0"),
              }))}
              value={String(activeIndex)}
              onValueChange={(value) => onActiveChange?.(Number(value))}
              label="Issue confidence"
            />
          </div>
        ) : (
          <Badge
            tone={source ? "info" : noComplaint ? "success" : "neutral"}
            size="sm"
            animateWidth={false}
            className="min-w-[56px] shrink-0 justify-center"
          >
            {source ? "scored" : noComplaint ? "positive" : "waiting"}
          </Badge>
        )}
      </header>

      <SmoothHeight contentClassName={panelBody} morphKey={bodyKey}>
        {chartData.length > 0 ? (
          <>
            <EvilBarChart
              config={SCORE_CONFIG}
              data={chartData}
              layout="horizontal"
              barRadius={7}
              barGap={4}
              barCategoryGap="24%"
              animationType="left-to-right"
              className="aspect-auto h-[248px] w-full"
            >
              <EvilBarChart.Grid stroke="var(--line)" strokeDasharray="2 4" />
              <EvilBarChart.XAxis
                type="number"
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${Math.round(value)}%`}
                tick={{ fontSize: 10, fill: "#6b665a", fontFamily: "var(--font-mono)" }}
              />
              <EvilBarChart.YAxis
                dataKey="label"
                type="category"
                width={132}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#17160f" }}
              />
              <EvilBarChart.Tooltip />
              <EvilBarChart.Bar
                dataKey="score"
                variant="default"
                barProps={{ barSize: 18 }}
              />
            </EvilBarChart>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line/80 pt-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint-ink">
                {source}
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-soft">
                <span className="size-1.5 rounded-full bg-accent" />
                <span className="font-medium">{winner.label}</span>
                <span className="font-mono text-[10px] text-muted-ink">
                  {Math.round(winner.score)}%
                </span>
              </span>
            </div>
          </>
        ) : (
          <div className="flex h-[272px] flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong bg-paper/40 px-6 text-center">
            {noComplaint ? (
              <Heart className="size-5 text-success" />
            ) : (
              <ChartNoAxesColumnIncreasing className="size-5 text-faint-ink" />
            )}
            <p className="mt-3 text-sm font-medium text-ink">
              {noComplaint ? "No complaint to score" : "No candidates yet"}
            </p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-ink">
              {noComplaint
                ? "This reads as a positive review, so nothing was added to the knowledge base."
                : loading
                  ? "Embedding the review and scoring the shortlist."
                  : "Route a review to compare the shortlist. The chart uses rerank probabilities when the safety net fires."}
            </p>
          </div>
        )}
      </SmoothHeight>
    </section>
  );
}

function DecisionCard({ trace, noComplaint = false, loading = false }) {
  const sub = trace?.stages?.find((stage) => stage.stage === "Sub FAISS");
  const rerank = trace?.stages?.find((stage) => stage.stage === "Rerank");
  const decision = DECISION_BADGES[sub?.decision];
  const margin = Math.max(0, Math.min(1, Number(sub?.margin) || 0));
  const bodyKey = loading
    ? "loading"
    : noComplaint
      ? "positive"
      : trace
        ? `${trace.query}:${sub?.decision ?? ""}`
        : "idle";

  return (
    <section
      className={panel}
      aria-labelledby="decision-heading"
      aria-busy={loading}
    >
      <header className={panelHeader}>
        <div>
          <p className={kicker}>03b · Decision</p>
          <h2 id="decision-heading" className={panelTitle}>
            Call sheet
          </h2>
        </div>
        {loading ? (
          <Badge
            tone="neutral"
            size="sm"
            animateWidth={false}
            className="min-w-[102px] shrink-0 justify-center"
          >
            waiting
          </Badge>
        ) : noComplaint ? (
          <Badge
            tone="success"
            size="sm"
            animateWidth={false}
            className="min-w-[102px] shrink-0 justify-center"
          >
            positive
          </Badge>
        ) : trace ? (
          <Badge
            tone={decision?.tone || "neutral"}
            size="sm"
            animateWidth={false}
            className="min-w-[102px] shrink-0 justify-center"
          >
            {decision?.label || "LLM route"}
          </Badge>
        ) : (
          <Badge
            tone="neutral"
            size="sm"
            animateWidth={false}
            className="min-w-[102px] shrink-0 justify-center"
          >
            idle
          </Badge>
        )}
      </header>

      <SmoothHeight contentClassName={panelBody} morphKey={bodyKey}>
        {trace ? (
          <>
            <div className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ background: deptColor(trace.result.department) }}
              />
              <p className="text-[11px] text-muted-ink">
                {trace.result.department}
              </p>
              <ArrowRight className="size-3 text-faint-ink" />
            </div>
            <p className="mt-1 font-serif text-[24px] leading-tight text-ink">
              {trace.result.sub_category}
            </p>

            <Progress
              className="mt-4"
              value={Math.round(margin * 100)}
              max={100}
              label="margin over runner-up"
              showValue
            />

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-line bg-paper/40 px-2.5 py-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint-ink">
                  rerank
                </p>
                <p className="mt-0.5 text-[12px] text-ink-soft">
                  {rerank
                    ? rerank.overrode
                      ? "overrode"
                      : "confirmed"
                    : "skipped"}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-paper/40 px-2.5 py-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint-ink">
                  similarity
                </p>
                <p className="mt-0.5 font-mono text-[12px] tabular-nums text-ink-soft">
                  {score(sub?.sim)}
                </p>
              </div>
            </div>
          </>
        ) : noComplaint ? (
          <div className="flex items-start gap-2.5">
            <Heart className="mt-0.5 size-4 shrink-0 text-success" />
            <p className="text-[13px] leading-relaxed text-muted-ink">
              No complaint to route. This review reads as positive, so the
              knowledge base was left unchanged.
            </p>
          </div>
        ) : (
          <p className="text-[13px] leading-relaxed text-muted-ink">
            The call sheet fills in after a route: confidence margin, rerank
            verdict and the winning similarity.
          </p>
        )}
      </SmoothHeight>
    </section>
  );
}

function Console() {
  const { toast } = useToastStack();

  const [review, setReview] = useState(
    "The delivery took three hours and the pizza was cold.",
  );
  const [skipSplit, setSkipSplit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [activeTraceIndex, setActiveTraceIndex] = useState(0);
  const [graph, setGraph] = useState(null);
  const [connecting, setConnecting] = useState(true);
  const [offline, setOffline] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [lastRun, setLastRun] = useState({ duration: null, skipSplit: false });
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const resetTimer = useRef(null);
  const isMac = /Mac|iPhone|iPad/.test(
    typeof navigator === "undefined" ? "" : navigator.platform,
  );

  const loadGraph = useCallback(async () => {
    try {
      const next = await getGraph();
      setGraph(next);
      setOffline(false);
      return next;
    } catch {
      setOffline(true);
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  useEffect(() => {
    if (!offline) return undefined;
    const id = setInterval(loadGraph, 8000);
    return () => clearInterval(id);
  }, [offline, loadGraph]);

  useEffect(() => {
    if (!loading) return undefined;
    const started = performance.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(performance.now() - started), 120);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    const timer = resetTimer.current;
    return () => clearTimeout(timer);
  }, []);

  const handleClassify = useCallback(async () => {
    const text = review.trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveTraceIndex(0);
    setSelectedId(null);
    setLastRun({ duration: null, skipSplit: false });
    const requestStarted = performance.now();

    try {
      const payload = await classify(text, skipSplit);
      const requestDuration = Math.max(1, performance.now() - requestStarted);

      // Keep the routing skeleton visible long enough to read. The request
      // itself is usually faster than this, so the wait only ever closes the
      // gap — it never delays a genuinely slow classification further.
      const remaining = MIN_LOADING_MS - requestDuration;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }

      setResult(payload);
      setActiveTraceIndex(0);
      setSelectedId(null);
      setOffline(false);
      setLastRun({ duration: requestDuration, skipSplit });

      const traces = payload.traces || [];
      const llm = traces.some((trace) =>
        (trace.stages || []).some((stage) => stage.stage === "LLM"),
      );

      if (traces.length === 1) {
        const route = traces[0].result;
        toast({
          type: llm ? "warning" : "success",
          title: `Routed to ${route.sub_category}`,
          description: llm
            ? `${route.department} · similarity was weak, so the LLM chose the route.`
            : `${route.department} · logged to the knowledge base.`,
        });
      } else if (traces.length > 1) {
        toast({
          type: "success",
          title: `${traces.length} issues routed`,
          description: "Compound review split into atomic labels.",
        });
      } else {
        toast({
          type: "success",
          title: "Positive review",
          description:
            "No complaint found, so it was not added to the knowledge base.",
        });
      }

      void loadGraph();
    } catch (err) {
      setError(err.message || "Classification failed");
      toast({
        type: "error",
        title: "Routing failed",
        description: err.message || "The request could not be completed.",
      });
      if (err instanceof TypeError) setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [loading, loadGraph, review, skipSplit, toast]);

  const handleReset = useCallback(async () => {
    if (resetting) return;

    if (!confirmReset) {
      setConfirmReset(true);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setConfirmReset(false), 4200);
      return;
    }

    clearTimeout(resetTimer.current);
    setConfirmReset(false);
    setResetting(true);

    try {
      await resetState();
      await bootstrap();
      const next = await getGraph();
      setGraph(next);
      setResult(null);
      setActiveTraceIndex(0);
      setSelectedId(null);
      setLastRun({ duration: null, skipSplit: false });
      setOffline(false);
      toast({
        type: "success",
        title: "Knowledge base rebuilt",
        description: "Seed taxonomy restored and the graph reloaded.",
      });
    } catch (err) {
      toast({
        type: "error",
        title: "Reset failed",
        description: err.message || "The engine did not respond.",
      });
    } finally {
      setResetting(false);
    }
  }, [confirmReset, resetting, toast]);

  useEffect(() => {
    function onKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        handleClassify();
      } else if (event.key === "Escape") {
        setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClassify]);

  useEffect(() => {
    if (selectedId && !graph?.nodes?.some((node) => node.id === selectedId)) {
      setSelectedId(null);
    }
  }, [graph, selectedId]);

  const selectedNode = useMemo(() => {
    if (!selectedId || !graph) return null;
    return graph.nodes.find((node) => node.id === selectedId) || null;
  }, [graph, selectedId]);

  const deptAgg = useMemo(() => {
    const map = new Map(
      DEPARTMENTS.map((dept) => [
        dept,
        { dept, color: deptColor(dept), subs: 0, reviews: 0 },
      ]),
    );
    for (const node of graph?.nodes || []) {
      if (node.type !== "sub_category") continue;
      const entry =
        map.get(node.dept) ||
        {
          dept: node.dept,
          color: deptColor(node.dept, node.color),
          subs: 0,
          reviews: 0,
        };
      entry.subs += 1;
      entry.reviews += Number(node.count) || 0;
      map.set(node.dept, entry);
    }
    return [...map.values()];
  }, [graph]);

  const stats = graph?.stats || EMPTY_STATS;
  const avgPerCategory = stats.sub_categories
    ? (stats.reviews / stats.sub_categories).toFixed(1)
    : "0.0";
  const usedStages = summarizeStages(result?.traces);
  const traces = result?.traces || [];
  const selectedTraceIndex = Math.min(
    activeTraceIndex,
    Math.max(0, traces.length - 1),
  );
  const activeTrace = traces[selectedTraceIndex] || null;
  const noComplaint =
    Boolean(result) &&
    !loading &&
    !error &&
    traces.length === 0 &&
    lastRun.duration != null;
  const deptData = useMemo(
    () =>
      deptAgg.map((department) => ({
        name: department.dept,
        label: DEPT_SHORT[department.dept] || department.dept,
        primary: department.reviews,
        secondary: department.subs,
        accent: activeTrace?.result.department === department.dept,
      })),
    [deptAgg, activeTrace],
  );

  function applyExample(text) {
    setReview(text);
    setError(null);
  }

  const tone = statusTone(offline, connecting);
  const status = statusLabel(offline, connecting);

  if (!graph) {
    return (
      <div className="relative min-h-screen">
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(35,66,255,0.08),transparent_50%),radial-gradient(ellipse_at_80%_0%,rgba(14,107,71,0.05),transparent_45%)]"
        />
        <BootScreen
          offline={offline}
          connecting={connecting}
          onRetry={loadGraph}
        />
        <ToastStack position="bottom-right" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(35,66,255,0.085),transparent_50%),radial-gradient(ellipse_at_80%_0%,rgba(14,107,71,0.05),transparent_45%)]"
      />

      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-[1440px] items-center gap-4 px-5 py-3 lg:px-8">
          <a
            className="flex shrink-0 items-center gap-2.5"
            href="/"
            aria-label="IntelliRoute home"
          >
            <img
              src="/extension-icon.svg"
              alt=""
              className="size-9 rounded-[11px] shadow-sm"
              decoding="async"
            />
            <span className="leading-none">
              <span className="block text-[14px] font-semibold tracking-[-0.02em] text-ink">
                IntelliRoute
              </span>
              <span className="mt-1 block font-mono text-[8.5px] uppercase tracking-[0.18em] text-muted-ink">
                complaint routing
              </span>
            </span>
          </a>

          <nav className="ml-5 hidden items-center gap-5 lg:flex" aria-label="Sections">
            {[
              ["Console", "#console"],
              ["Trace", "#trace"],
              ["Knowledge", "#knowledge"],
              ["Taxonomy", "#taxonomy"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-ink transition-colors hover:text-ink"
              >
                {label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Badge
              tone={tone}
              size="sm"
              icon={
                <span
                  className="size-1.5 rounded-full bg-current"
                  aria-hidden="true"
                />
              }
            >
              {status}
            </Badge>
            <Button
              variant={confirmReset ? "danger" : "ghost"}
              size="sm"
              loading={resetting}
              disabled={offline || resetting}
              onClick={handleReset}
              title="Wipe in-memory state and rebuild from the seed reviews"
              className="min-w-[104px]"
            >
              <RotateCcw className="size-3.5" />
              {confirmReset ? "Confirm reset" : "Reset KB"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-5 pb-16 lg:px-8">
        <section className="flex flex-wrap items-end justify-between gap-8 pb-8 pt-12 lg:pt-16">
          <div className="max-w-3xl">
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-ink">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              Live inference console
            </p>
            <h1 className="mt-4 text-[clamp(2.7rem,6.2vw,5.4rem)] font-medium leading-[0.92] tracking-[-0.055em] text-ink">
              Every complaint,
              <br />
              <em className="font-serif font-normal italic text-accent">
                cleanly routed.
              </em>
            </h1>
          </div>

          <div className="max-w-xs border-l border-line pl-5">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint-ink">
              retrieval stack
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-ink">
              Five stages, one decision. BM25 narrows the departments, FAISS
              matches the category, and a cross-encoder only fires when the
              margin is thin.
            </p>
            <p className="mt-4 font-mono text-[10px] tracking-[0.04em] text-ink-soft">
              BM25 → FAISS → RERANK → LLM
            </p>
          </div>
        </section>

        <section
          className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2 xl:grid-cols-4"
          aria-label="Knowledge base metrics"
        >
          <GraphKpi
            title="TARGETS"
            value={String(stats.departments).padStart(2, "0")}
            label="departments"
            hint="fixed"
            data={deptAgg.map((department) => department.reviews)}
            palette="duo"
            corner="+"
            className="bg-surface/70"
          />
          <GraphKpi
            title="TAXONOMY"
            value={String(stats.sub_categories).padStart(2, "0")}
            label="categories"
            hint="learned"
            data={deptAgg.map((department) => department.subs)}
            palette="duo"
            corner="+"
            className="bg-surface/70"
          />
          <GraphKpi
            title="VOLUME"
            value={String(stats.reviews)}
            label="reviews routed"
            hint={`${avgPerCategory}/cat`}
            data={deptAgg.map((department) => department.reviews)}
            palette="duo"
            corner="+"
            className="bg-surface/70"
          />
          <GraphKpi
            title="DEPTH"
            value={avgPerCategory}
            label="per category"
            hint="avg"
            data={deptAgg.map((department) =>
              department.subs ? department.reviews / department.subs : 0,
            )}
            palette="duo"
            corner="+"
            className="bg-surface/70"
          />
        </section>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.22fr)_minmax(0,0.78fr)]">
          <section id="console" className={cn(panel, "scroll-mt-24")} aria-labelledby="composer-heading">
            <header className={panelHeader}>
              <div>
                <p className={kicker}>01 · Console</p>
                <h2 id="composer-heading" className={panelTitle}>
                  Route a review
                </h2>
              </div>
              <Badge tone="neutral" size="sm">
                {review.length} chars
              </Badge>
            </header>

            <div className={panelBody}>
              <Textarea
                label="Incoming review"
                description="Compound complaints are split into atomic issues unless skip is on."
                value={review}
                onChange={(event) => setReview(event.target.value)}
                rows={4}
                placeholder="Paste a customer complaint…"
                spellCheck="true"
                className="min-h-[132px]"
              />

              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.16em] text-faint-ink">
                  try
                </span>
                {EXAMPLES.map((example) => (
                  <Button
                    key={example.label}
                    variant="ghost"
                    size="sm"
                    onClick={() => applyExample(example.text)}
                  >
                    {example.label}
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
                    aria-hidden={!loading}
                    className={`inline-flex shrink-0 items-center justify-end overflow-hidden font-mono text-[11px] tabular-nums text-muted-ink transition-[width,opacity,margin-right] duration-200 ease-out ${
                      loading
                        ? "mr-3 w-12 opacity-100"
                        : "mr-0 w-0 opacity-0"
                    }`}
                  >
                    {loading ? formatDuration(elapsed) : ""}
                  </span>
                  <Button
                    variant="primary"
                    size="lg"
                    loading={loading}
                    disabled={!review.trim() || loading}
                    onClick={handleClassify}
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

          <section className={cn(panel, "flex flex-col")} aria-labelledby="pipeline-heading">
            <header className={panelHeader}>
              <div>
                <p className={kicker}>01b · Flow</p>
                <h2 id="pipeline-heading" className={panelTitle}>
                  Pipeline
                </h2>
              </div>
              <Badge
                tone={
                  loading
                    ? "info"
                    : noComplaint
                      ? "success"
                      : usedStages.size
                        ? "success"
                        : "neutral"
                }
                size="sm"
                animateWidth={false}
                className="min-w-[64px] shrink-0 justify-center"
              >
                {loading
                  ? "running"
                  : noComplaint
                    ? "positive"
                    : usedStages.size
                      ? `${usedStages.size}/5 fired`
                      : "idle"}
              </Badge>
            </header>

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
                {[
                  ["latency", lastRun.duration ? formatDuration(lastRun.duration) : "—"],
                  ["issues", lastRun.duration != null ? traces.length : "—"],
                  [
                    "mode",
                    lastRun.duration
                      ? lastRun.skipSplit
                        ? "single"
                        : "split"
                      : "—",
                  ],
                ].map(([label, value]) => (
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

        <div
          id="trace"
          className="mt-4 grid scroll-mt-24 items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]"
        >
          <TracePanel
            traces={traces}
            loading={loading}
            error={error}
            elapsed={elapsed}
            noComplaint={noComplaint}
            onExample={() => applyExample("Pizza was ice cold")}
            onOpenNode={setSelectedId}
          />

          <div className="flex flex-col gap-4 xl:sticky xl:top-20">
            <ConfidenceCard
              trace={activeTrace}
              traces={traces}
              activeIndex={selectedTraceIndex}
              onActiveChange={setActiveTraceIndex}
              loading={loading}
              noComplaint={noComplaint}
            />
            <DecisionCard
              trace={activeTrace}
              noComplaint={noComplaint}
              loading={loading}
            />
          </div>
        </div>

        <div
          id="knowledge"
          className="mt-4 grid scroll-mt-24 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]"
        >
          <KnowledgePanel graph={graph} selectedId={selectedId} />

          <section className={cn(panel, "flex flex-col")} aria-labelledby="distribution-heading">
            <header className={panelHeader}>
              <div>
                <p className={kicker}>06 · Distribution</p>
                <h2 id="distribution-heading" className={panelTitle}>
                  Department mix
                </h2>
              </div>
              <Badge tone="neutral" size="sm">
                {stats.sub_categories} categories
              </Badge>
            </header>

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
                    <span className="size-2 rounded-full bg-ink" />
                    reviews
                  </span>
                  <span className="flex items-center justify-end gap-1.5 text-[10px] text-muted-ink">
                    <span className="size-2 rounded-full bg-line-strong" />
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

        <div id="taxonomy" className="mt-4 scroll-mt-24">
          <CategoryIndex
            graph={graph}
            selectedId={selectedId}
            onSelectNode={setSelectedId}
          />
        </div>

        <footer className="mt-10 flex flex-col gap-4 border-t border-line pt-5 font-mono text-[9px] uppercase tracking-[0.16em] text-faint-ink sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>IntelliRoute · local-first inference</span>
            <span className="hidden text-line-strong sm:inline" aria-hidden="true">
              /
            </span>
            <span>BM25 → FAISS → rerank → LLM</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <a
              href={PROFILE_URL}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 text-[10px] normal-case tracking-[0.02em] transition-colors duration-150 hover:text-ink"
              aria-label="Made by Avinash Ganore on GitHub"
            >
              <span className="uppercase tracking-[0.16em]">Made by</span>
              <span className="font-medium text-ink-soft transition-colors duration-150 group-hover:text-ink">
                Avinash Ganore
              </span>
            </a>

            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-2.5 py-1.5 text-ink-soft transition-[color,background-color,border-color,transform] duration-150 ease-out hover:border-line-strong hover:bg-surface hover:text-ink active:scale-[0.97]"
              aria-label="Star IntelliRoute on GitHub"
            >
              <GitHubIcon className="size-3" />
              Star on GitHub
              <Star className="size-3 text-faint-ink transition-colors duration-150 group-hover:text-accent" />
            </a>
          </div>
        </footer>
      </main>

      <NodeDrawer
        open={Boolean(selectedNode)}
        node={selectedNode}
        graph={graph}
        onClose={() => setSelectedId(null)}
        onSelectNode={setSelectedId}
      />
      <ToastStack position="bottom-right" />
    </div>
  );
}

export default function App() {
  return (
    <ToastStackProvider>
      <Console />
    </ToastStackProvider>
  );
}
