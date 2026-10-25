import type { Trace } from "./types";

/** Tones line up with `BadgeTone`, so a decision can be handed straight to `<Badge tone>`. */
export type DecisionTone = "neutral" | "success" | "info" | "warning" | "danger";

export interface DecisionBadge {
  label: string;
  tone: DecisionTone;
}

export interface StageMeta {
  label: string;
  kicker: string;
  icon: string;
}

export const DEPARTMENTS = [
  "Food",
  "Delivery",
  "Payment",
  "App & Tech",
  "Restaurant Experience",
];

export const DEPT_COLORS: Record<string, string> = {
  Food: "#2342ff",
  Delivery: "#0e6b47",
  Payment: "#9a5b00",
  "App & Tech": "#6b665a",
  "Restaurant Experience": "#17160f",
};

export const FALLBACK_COLOR = "#8f897b";

export function deptColor(name?: string, fallback?: string) {
  return (name ? DEPT_COLORS[name] : undefined) || fallback || FALLBACK_COLOR;
}

export const STAGE_META: Record<string, StageMeta> = {
  BM25: {
    label: "BM25 retrieval",
    kicker: "Lexical match",
    icon: "search",
  },
  "Dept FAISS": {
    label: "Department match",
    kicker: "Cosine similarity",
    icon: "layers",
  },
  "Sub FAISS": {
    label: "Sub-category match",
    kicker: "Vector search",
    icon: "target",
  },
  Rerank: {
    label: "Cross-encoder rerank",
    kicker: "Safety net",
    icon: "shuffle",
  },
  LLM: {
    label: "LLM fallback",
    kicker: "Generative routing",
    icon: "cpu",
  },
};

export const DECISION_BADGES: Record<string, DecisionBadge> = {
  HIGH_CONF: { label: "High confidence", tone: "success" },
  MID_ZONE: { label: "Middle zone", tone: "info" },
  LOW_CONF: { label: "Low confidence", tone: "warning" },
};

export function score(value: unknown, digits = 3) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

export function percentOf(value: unknown, max: unknown) {
  const n = Number(value);
  const m = Number(max);
  if (!Number.isFinite(n) || !Number.isFinite(m) || m <= 0) return 0;
  return Math.max(0, Math.min(100, (n / m) * 100));
}

export function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)}s`;
}

export function summarizeStages(traces?: Trace[] | null) {
  const used = new Set<string>();
  for (const trace of traces || []) {
    for (const stage of trace.stages || []) used.add(stage.stage);
  }
  return used;
}
