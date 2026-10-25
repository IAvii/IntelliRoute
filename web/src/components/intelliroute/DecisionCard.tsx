import { ArrowRight, Heart } from "lucide-react";
import Badge from "@/components/arc/badge/badge";
import Progress from "@/components/arc/progress/progress";
import SmoothHeight from "@/components/ui/smooth-height";
import { DECISION_BADGES, deptColor, score } from "@/lib/theme";
import { kicker, panel, panelBody, panelHeader, panelTitle } from "@/lib/ui";
import type { Trace } from "@/lib/types";

interface DecisionCardProps {
  trace?: Trace | null;
  noComplaint?: boolean;
  loading?: boolean;
}

export default function DecisionCard({
  trace,
  noComplaint = false,
  loading = false,
}: DecisionCardProps) {
  const sub = trace?.stages?.find((s) => s.stage === "Sub FAISS");
  const rerank = trace?.stages?.find((s) => s.stage === "Rerank");
  const decision = DECISION_BADGES[sub?.decision as string];
  const margin = Math.max(0, Math.min(1, Number(sub?.margin) || 0));
  const bodyKey = loading
    ? "loading"
    : noComplaint
      ? "positive"
      : trace
        ? `${trace.query}:${sub?.decision ?? ""}`
        : "idle";

  return (
    <section className={panel} aria-labelledby="decision-heading" aria-busy={loading}>
      <header className={panelHeader}>
        <div>
          <p className={kicker}>03b · Decision</p>
          <h2 id="decision-heading" className={panelTitle}>Call sheet</h2>
        </div>
        {loading ? (
          <Badge tone="neutral" size="sm" animateWidth={false} className="min-w-[102px] shrink-0 justify-center">
            waiting
          </Badge>
        ) : noComplaint ? (
          <Badge tone="success" size="sm" animateWidth={false} className="min-w-[102px] shrink-0 justify-center">
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
          <Badge tone="neutral" size="sm" animateWidth={false} className="min-w-[102px] shrink-0 justify-center">
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
              <p className="text-[11px] text-muted-ink">{trace.result.department}</p>
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
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint-ink">rerank</p>
                <p className="mt-0.5 text-[12px] text-ink-soft">
                  {rerank ? (rerank.overrode ? "overrode" : "confirmed") : "skipped"}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-paper/40 px-2.5 py-2">
                <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-faint-ink">similarity</p>
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
              No complaint to route. This review reads as positive, so the knowledge base was left unchanged.
            </p>
          </div>
        ) : (
          <p className="text-[13px] leading-relaxed text-muted-ink">
            The call sheet fills in after a route: confidence margin, rerank verdict and the winning similarity.
          </p>
        )}
      </SmoothHeight>
    </section>
  );
}
