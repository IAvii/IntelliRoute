import { DECISION_BADGES, STAGE_META, score } from "./theme";
import type { SoundingRailStep } from "@/components/ui/timeline-reasoning-rail";
import type { Trace, TraceScores, TraceStage } from "./types";

interface Evidence {
  label: string;
  value: string;
}

export interface CandidateScores {
  source: string | null;
  rows: Array<{ label: string; score: number }>;
}

function entries(scores?: TraceScores): Evidence[] {
  return Object.entries(scores || {}).map(([label, value]) => ({
    label,
    value: score(value),
  }));
}

function stageNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

/**
 * Turn the backend trace stage list into rail steps. Every stage that ran is
 * kept, including the optional rerank and the LLM fallback. Text here is
 * explanatory: the scores live in the evidence chips.
 */
export function buildTraceSteps(trace?: Trace | null): SoundingRailStep[] {
  if (!trace) return [];

  return (trace.stages || []).map((stage: TraceStage, index: number) => {
    const meta = STAGE_META[stage.stage] || {
      label: stage.stage,
      kicker: "Stage",
    };
    const base = {
      id: `${trace.query}-${index}-${stage.stage}`,
      label: meta.label,
      status: "done" as const,
      time: `S${stageNumber(index)}`,
    };

    if (stage.stage === "BM25") {
      return {
        ...base,
        detail: `Lexical retrieval kept ${stage.top2?.join(" and ") || "no departments"} in play. The sparse scores decide which department prototypes the dense search is allowed to compare.`,
        evidence: entries(stage.scores),
      };
    }

    if (stage.stage === "Dept FAISS") {
      return {
        ...base,
        detail: `Cosine similarity chose ${stage.winner || "no department"} at ${score(stage.sim)}. Only candidates surfaced by BM25 were embedded and compared.`,
        evidence: entries(stage.scores),
      };
    }

    if (stage.stage === "Sub FAISS") {
      const decision =
        DECISION_BADGES[stage.decision as string]?.label || stage.decision;
      return {
        ...base,
        detail: `${stage.winner} leads the shortlist with a ${score(stage.margin)} margin. The bi-encoder decision was ${decision}; the cross-encoder only fires when that confidence is thin.`,
        evidence: (stage.candidates || []).map(([label, value]) => ({
          label,
          value: score(value),
        })),
      };
    }

    if (stage.stage === "Rerank") {
      return {
        ...base,
        detail: stage.overrode
          ? `The cross-encoder overrode the bi-encoder, moving ${stage.bi_encoder_winner} aside for ${stage.winner}. Disagreement plus a clear probability gap is what earns the override.`
          : `The cross-encoder confirmed ${stage.winner} and left the bi-encoder ranking intact.`,
        evidence: [
          { label: "bi-encoder", value: stage.bi_encoder_winner || "—" },
          { label: "rerank", value: stage.winner || "—" },
          ...(
            (stage.scores as Array<[string, number]> | undefined) || []
          ).map(([label, value]) => ({
            label,
            value: score(value),
          })),
        ],
      };
    }

    return {
      ...base,
      detail:
        stage.reason ||
        "Similarity was too weak to assign a category, so the generative fallback chose the route.",
      evidence: [{ label: "route", value: "LLM fallback" }],
    };
  });
}

/**
 * Candidate confidence for the chart: rerank probabilities when the safety
 * net fired, otherwise the bi-encoder similarities.
 */
export function candidateScores(trace?: Trace | null): CandidateScores {
  if (!trace) return { source: null, rows: [] };

  const rerank = (trace.stages || []).find((s) => s.stage === "Rerank");
  if (rerank?.scores?.length) {
    return {
      source: "Cross-encoder probabilities",
      rows: (rerank.scores as Array<[string, number]>)
        .map(([label, value]) => ({ label, score: Number(value) }))
        .sort((a, b) => b.score - a.score),
    };
  }

  const sub = (trace.stages || []).find((s) => s.stage === "Sub FAISS");
  if (sub?.candidates?.length) {
    return {
      source: "Bi-encoder similarity",
      rows: sub.candidates
        .map(([label, value]) => ({ label, score: Number(value) }))
        .sort((a, b) => b.score - a.score),
    };
  }

  return { source: null, rows: [] };
}
