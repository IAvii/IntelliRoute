/**
 * DistributionPanel - total routed, the department mix chart, and its legend.
 */
import { AnimatedCounter } from "@/components/arc/animated-counter/animated-counter";
import Badge from "@/components/arc/badge/badge";
import MonoRoundedBarChart, {
  type MonoBarDatum,
} from "@/components/amicro/mono-rounded-bar-chart";
import PanelHeader from "@/components/ui/panel-header";
import type { Stats } from "@/lib/types";
import { cn } from "@/lib/utils";
import { panel, panelBody } from "@/lib/ui";

interface DistributionPanelProps {
  stats: Stats;
  deptData: MonoBarDatum[];
}

export default function DistributionPanel({
  stats,
  deptData,
}: DistributionPanelProps) {
  return (
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
  );
}
