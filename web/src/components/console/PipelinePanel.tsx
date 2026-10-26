/**
 * PipelinePanel - the stage flow and the last-run strip. Reads the stages that
 * fired, not the engine itself.
 */
import { GraphFlow } from "@/components/graph-flow";
import PanelHeader from "@/components/ui/panel-header";
import StatusBadge from "@/components/ui/status-badge";
import { PIPELINE } from "@/lib/console-content";
import { formatDuration } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { panel } from "@/lib/ui";

interface PipelinePanelProps {
  /** Stage ids that fired in the last run; empty before the first route. */
  usedStages: Set<string>;
  lastRun: { duration: number | null; skipSplit: boolean };
  issueCount: number;
  loading: boolean;
  noComplaint: boolean;
}

export default function PipelinePanel({
  usedStages,
  lastRun,
  issueCount,
  loading,
  noComplaint,
}: PipelinePanelProps) {
  return (
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
            loading={loading}
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
                lastRun.duration ? formatDuration(lastRun.duration) : "—",
              ],
              ["issues", lastRun.duration != null ? issueCount : "—"],
              [
                "mode",
                lastRun.duration
                  ? lastRun.skipSplit
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
  );
}
