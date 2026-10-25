import {
  ArrowUpRight,
  CircleCheck,
  Heart,
  LoaderCircle,
  Waypoints,
} from "lucide-react";
import Alert from "@/components/arc/alert/alert";
import Badge from "@/components/arc/badge/badge";
import Button from "@/components/arc/button/button";
import EmptyState from "@/components/arc/empty-state/empty-state";
import SmoothHeight from "@/components/ui/smooth-height";
import { SoundingRail } from "@/components/ui/timeline-reasoning-rail";
import { buildTraceSteps } from "@/lib/trace";
import { DECISION_BADGES, deptColor, formatDuration } from "@/lib/theme";
import { kicker, panel, panelBody, panelHeader, panelTitle } from "@/lib/ui";

function confidence(stages) {
  const sub = (stages || []).find((stage) => stage.stage === "Sub FAISS");
  if (!sub) return { label: "LLM fallback", tone: "warning" };
  return DECISION_BADGES[sub.decision] || { label: "Assigned", tone: "neutral" };
}

function TraceCard({ trace, index, onOpenNode }) {
  const steps = buildTraceSteps(trace);
  const decision = confidence(trace.stages);
  const color = deptColor(trace.result.department);

  return (
    <article className="rounded-2xl border border-line bg-paper/45">
      <div className="flex items-center justify-between gap-3 border-b border-line/75 px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-ink">
          issue {String(index + 1).padStart(2, "0")}
        </span>
        <Badge tone={decision.tone} size="sm">
          {decision.label}
        </Badge>
      </div>

      <div className="px-4 pt-4">
        <p className="font-serif text-[22px] leading-[1.25] tracking-[-0.01em] text-ink">
          {trace.query}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink-soft">
            <span
              className="size-1.5 rounded-full"
              style={{ background: color }}
            />
            {trace.result.department}
          </span>
          <span className="text-line-strong">/</span>
          <button
            type="button"
            onClick={() => onOpenNode?.(trace.result.sub_category_node)}
            className="group inline-flex items-center gap-1 text-[12px] font-medium text-ink underline-offset-4 hover:underline"
          >
            {trace.result.sub_category}
            <ArrowUpRight className="size-3.5 text-muted-ink transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </button>
          <button
            type="button"
            onClick={() => onOpenNode?.(trace.result.review_node)}
            className="ml-auto font-mono text-[10px] text-muted-ink underline-offset-4 hover:text-ink hover:underline"
          >
            review node
          </button>
        </div>
      </div>

      <SoundingRail
        steps={steps}
        label={`Inference stages for ${trace.query}`}
        className="m-4 mt-4 border-line/80 bg-surface"
      />
    </article>
  );
}

function RoutingSkeleton() {
  return (
    <div
      className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong bg-paper/40 px-6 py-10 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="grid size-12 place-items-center rounded-2xl border border-line bg-surface">
        <LoaderCircle className="size-5 animate-spin text-accent" />
      </div>
      <p className="mt-4 text-sm font-medium text-ink">
        Routing through five stages
      </p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-ink">
        BM25 narrows the departments, FAISS matches the category, and the
        cross-encoder only steps in when the margin is thin.
      </p>
      <div className="mt-5 w-full max-w-xs space-y-2" aria-hidden="true">
        {[88, 72, 61, 44].map((width, index) => (
          <div
            key={width}
            className="h-1.5 animate-pulse rounded-full bg-line [animation-duration:2.6s]"
            style={{ width: `${width}%`, animationDelay: `${index * 180}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

export default function TracePanel({
  traces = [],
  loading,
  error,
  elapsed,
  noComplaint = false,
  onExample,
  onOpenNode,
}) {
  const hasTraces = traces.length > 0;
  const bodyKey = error
    ? `error:${error}`
    : loading
      ? "loading"
      : hasTraces
        ? traces.map((trace, index) => `${index}:${trace.query}`).join("|")
        : noComplaint
          ? "positive"
          : "idle";

  return (
    <section
      className={`${panel} flex h-full flex-col`}
      aria-labelledby="trace-heading"
      aria-busy={loading}
    >
      <header className={panelHeader}>
        <div>
          <p className={kicker}>02 · Inference</p>
          <h2 id="trace-heading" className={panelTitle}>
            Trace log
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <Badge
              key="loading"
              tone="info"
              size="sm"
              animateWidth={false}
              className="min-w-[78px] shrink-0 justify-center"
              icon={<LoaderCircle className="size-3 animate-spin" />}
            >
              <span className="inline-block w-11 text-center tabular-nums">
                {elapsed > 0 ? formatDuration(elapsed) : ""}
              </span>
            </Badge>
          ) : hasTraces ? (
            <Badge
              key="issues"
              tone="neutral"
              size="sm"
              animateWidth={false}
              className="min-w-[78px] shrink-0 justify-center"
            >
              {traces.length} {traces.length === 1 ? "issue" : "issues"}
            </Badge>
          ) : noComplaint ? (
            <Badge
              key="positive"
              tone="success"
              size="sm"
              animateWidth={false}
              className="min-w-[78px] shrink-0 justify-center"
            >
              positive
            </Badge>
          ) : (
            <Badge
              key="idle"
              tone="neutral"
              size="sm"
              animateWidth={false}
              className="min-w-[78px] shrink-0 justify-center"
            >
              idle
            </Badge>
          )}
        </div>
      </header>

      <SmoothHeight
        contentClassName={`${panelBody} space-y-4 ${
          !hasTraces && !loading && !error
            ? "flex flex-col justify-center"
            : ""
        }`}
        morphKey={bodyKey}
      >
        {error ? (
          <Alert tone="danger" title="Routing failed" open>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <RoutingSkeleton />
        ) : hasTraces ? (
          traces.map((trace, index) => (
            <TraceCard
              key={`${trace.query}-${index}`}
              trace={trace}
              index={index}
              onOpenNode={onOpenNode}
            />
          ))
        ) : error ? null : noComplaint ? (
          <EmptyState
            icon={<Heart className="size-5" />}
            title="No complaint found"
            description="This reads as a positive review, so there is nothing to route. It was not added to the knowledge base."
            action={
              <Button variant="secondary" size="sm" onClick={onExample}>
                Try a complaint sample
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Waypoints className="size-5" />}
            title="Nothing routed yet"
            description="Paste a review above and send it through the pipeline. Every stage and score lands here."
            action={
              <Button variant="secondary" size="sm" onClick={onExample}>
                Try the cold-pizza sample
              </Button>
            }
          />
        )}

        {hasTraces ? (
          <p className="flex items-center gap-1.5 px-1 font-mono text-[10px] uppercase tracking-[0.14em] text-faint-ink">
            <CircleCheck className="size-3" />
            every stage recorded from the live backend
          </p>
        ) : null}
      </SmoothHeight>
    </section>
  );
}
