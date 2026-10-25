export const DEPARTMENTS = [
  "Food",
  "Delivery",
  "Payment",
  "App & Tech",
  "Restaurant Experience",
];

export const DEPT_COLORS = {
  Food: "#2342ff",
  Delivery: "#0e6b47",
  Payment: "#9a5b00",
  "App & Tech": "#6b665a",
  "Restaurant Experience": "#17160f",
};

export const FALLBACK_COLOR = "#8f897b";

export function deptColor(name, fallback) {
  return DEPT_COLORS[name] || fallback || FALLBACK_COLOR;
}

export const STAGE_META = {
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

export const DECISION_BADGES = {
  HIGH_CONF: { label: "High confidence", tone: "success" },
  MID_ZONE: { label: "Middle zone", tone: "info" },
  LOW_CONF: { label: "Low confidence", tone: "warning" },
};

export function score(value, digits = 3) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "—";
}

export function percentOf(value, max) {
  const n = Number(value);
  const m = Number(max);
  if (!Number.isFinite(n) || !Number.isFinite(m) || m <= 0) return 0;
  return Math.max(0, Math.min(100, (n / m) * 100));
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)}s`;
}

export function summarizeStages(traces) {
  const used = new Set();
  for (const trace of traces || []) {
    for (const stage of trace.stages || []) used.add(stage.stage);
  }
  return used;
}
