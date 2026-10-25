import { useMemo } from "react";
import { ChartNoAxesColumnIncreasing, Heart } from "lucide-react";
import Badge from "@/components/arc/badge/badge";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { EvilBarChart } from "@/components/evilcharts/charts/recharts-bar-chart";
import SmoothHeight from "@/components/ui/smooth-height";
import { candidateScores } from "@/lib/trace";
import { kicker, panel, panelBody, panelHeader, panelTitle } from "@/lib/ui";
import type { Trace } from "@/lib/types";

interface ConfidenceCardProps {
  trace?: Trace | null;
  traces?: Trace[];
  activeIndex?: number;
  onActiveChange?: (index: number) => void;
  loading?: boolean;
  noComplaint?: boolean;
}

const SCORE_CONFIG = {
  score: { label: "Confidence", colors: { light: ["#2342ff"] } },
};

export default function ConfidenceCard({
  trace,
  traces = [],
  activeIndex = 0,
  onActiveChange,
  loading,
  noComplaint = false,
}: ConfidenceCardProps) {
  const { source, rows } = useMemo(() => candidateScores(trace), [trace]);
  const chartData = useMemo(
    () => rows.map((row) => ({ label: row.label, score: Number((row.score * 100).toFixed(1)) })),
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
              options={traces.map((_, i) => ({
                value: String(i),
                label: String(i + 1).padStart(2, "0"),
              }))}
              value={String(activeIndex)}
              onValueChange={(v) => onActiveChange?.(Number(v))}
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
                tickFormatter={(v) => `${Math.round(v)}%`}
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
              <EvilBarChart.Bar dataKey="score" variant="default" barProps={{ barSize: 18 }} />
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
