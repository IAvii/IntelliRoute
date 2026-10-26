/** KpiStrip - the four knowledge-base metric cards above the console. */
import { GraphKpi } from "@/components/graph-kpi";
import type { DeptAgg, Stats } from "@/lib/types";

interface KpiStripProps {
  stats: Stats;
  deptAgg: DeptAgg[];
  avgPerCategory: string;
}

export default function KpiStrip({
  stats,
  deptAgg,
  avgPerCategory,
}: KpiStripProps) {
  return (
    <section
      className="grid grid-cols-1 gap-2.5 min-[380px]:grid-cols-2 xl:grid-cols-4"
      aria-label="Knowledge base metrics"
    >
      <GraphKpi
        title="TARGETS"
        value={String(stats.departments).padStart(2, "0")}
        label="departments"
        hint="fixed"
        data={deptAgg.map((d) => d.reviews)}
        palette="duo"
        corner="+"
        className="bg-surface/70"
      />
      <GraphKpi
        title="TAXONOMY"
        value={String(stats.sub_categories).padStart(2, "0")}
        label="categories"
        hint="learned"
        data={deptAgg.map((d) => d.subs)}
        palette="duo"
        corner="+"
        className="bg-surface/70"
      />
      <GraphKpi
        title="VOLUME"
        value={String(stats.reviews)}
        label="reviews routed"
        hint={`${avgPerCategory}/cat`}
        data={deptAgg.map((d) => d.reviews)}
        palette="duo"
        corner="+"
        className="bg-surface/70"
      />
      <GraphKpi
        title="DEPTH"
        value={avgPerCategory}
        label="per category"
        hint="avg"
        data={deptAgg.map((d) => (d.subs ? d.reviews / d.subs : 0))}
        palette="duo"
        corner="+"
        className="bg-surface/70"
      />
    </section>
  );
}
