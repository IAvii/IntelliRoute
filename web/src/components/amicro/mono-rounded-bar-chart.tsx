import { motion, useReducedMotion } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Adapted from Amicro Mono Charts' MonoRoundedBarChart
// (github.com/Subhan-code/Amicro--Micro-transitions-, MIT).
// Re-skinned for the IntelliRoute paper/ink system: one ink, rounded
// geometry, mono captions, no chart chrome.

const number = new Intl.NumberFormat("en-US");

export interface MonoBarDatum {
  /** Full name shown as the tooltip title; falls back to `label`. */
  name?: string;
  label: string;
  primary: number;
  secondary?: number;
  /** Draws this bar in the accent ink, such as the selected issue's department. */
  accent?: boolean;
}

export interface MonoRoundedBarChartProps {
  data?: MonoBarDatum[];
  height?: number | string;
  primaryLabel?: string;
  secondaryLabel?: string;
  className?: string;
}

interface MonoBarTooltipDatum {
  dataKey?: string | number;
  value?: number;
  fill?: string;
  payload?: MonoBarDatum;
}

interface MonoBarTooltipProps {
  active?: boolean;
  payload?: MonoBarTooltipDatum[];
  label?: string | number;
  primaryLabel: string;
  secondaryLabel: string;
}

function MonoBarTooltip({ active, payload, label, primaryLabel, secondaryLabel }: MonoBarTooltipProps) {
  if (!active || !payload?.length) return null;
  const title = payload[0]?.payload?.name || label;

  return (
    <div className="min-w-40 rounded-xl border border-line bg-surface-raised px-3 py-2 shadow-[0_12px_30px_-18px_rgba(23,22,15,0.35)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-ink">
        {title}
      </p>
      <div className="mt-2 space-y-1">
        {payload
          .filter((item) => item.dataKey !== "max")
          .map((item) => (
            <div
              key={item.dataKey}
              className="flex items-center justify-between gap-5 text-xs"
            >
              <span className="flex items-center gap-1.5 text-muted-ink">
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: item.fill }}
                />
                {item.dataKey === "primary" ? primaryLabel : secondaryLabel}
              </span>
              <span className="font-mono tabular-nums text-ink">
                {number.format(item.value ?? 0)}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

export function MonoRoundedBarChart({
  data = [],
  height = 228,
  primaryLabel = "Reviews",
  secondaryLabel = "Categories",
  className = "",
}: MonoRoundedBarChartProps) {
  const reduce = useReducedMotion();
  const hasSecondary = data.some((item) => Number(item.secondary) > 0);
  const maxValue = data.reduce(
    (max, item) =>
      Math.max(max, Number(item.primary) || 0, Number(item.secondary) || 0),
    0,
  );

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className={`relative w-full overflow-hidden rounded-2xl bg-paper/70 p-2 ${className}`}
      aria-label="Department distribution"
    >
      <div style={{ height }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barGap={4}
            barCategoryGap="26%"
            margin={{ top: 10, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="2 4"
              vertical={false}
              stroke="var(--line)"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tick={{
                fontSize: 10,
                fill: "var(--muted-ink)",
                fontFamily: "var(--font-mono)",
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={28}
              tickMargin={4}
              allowDecimals={false}
              domain={[0, Math.max(1, maxValue + 1)]}
              tick={{
                fontSize: 10,
                fill: "var(--faint-ink)",
                fontFamily: "var(--font-mono)",
              }}
            />
            <Tooltip
              cursor={{ fill: "var(--paper-deep)", opacity: 0.55 }}
              content={
                <MonoBarTooltip
                  primaryLabel={primaryLabel}
                  secondaryLabel={secondaryLabel}
                />
              }
            />
            <Bar
              dataKey="primary"
              name={primaryLabel}
              radius={[7, 7, 7, 7]}
              barSize={18}
              isAnimationActive={!reduce}
              animationDuration={720}
            >
              {data.map((item) => (
                <Cell
                  key={item.label}
                  fill={item.accent ? "var(--accent)" : "var(--ink)"}
                />
              ))}
            </Bar>
            {hasSecondary ? (
              <Bar
                dataKey="secondary"
                name={secondaryLabel}
                fill="var(--line-strong)"
                radius={[7, 7, 7, 7]}
                barSize={18}
                isAnimationActive={!reduce}
                animationDuration={820}
              />
            ) : null}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

export default MonoRoundedBarChart;
