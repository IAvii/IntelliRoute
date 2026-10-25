/**
 * useEngine - all async engine state behind one small interface.
 *
 * Hides: 10 useState, 1 useRef, 5 useEffect, toast orchestration,
 * offline polling, elapsed timer, and the MIN_LOADING_MS pacing delay.
 *
 * Callers receive plain values + two async actions (classify, reset)
 * and never need to touch any setter directly.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useToastStack } from "@/components/arc/toast-stack/toast-stack";
import {
  bootstrap,
  classify as apiClassify,
  getGraph,
  resetState,
} from "@/api";
import type { ClassifyResult, GraphData } from "@/lib/types";

const MIN_LOADING_MS = 700;

export interface EngineState {
  offline: boolean;
  connecting: boolean;
  loading: boolean;
  elapsed: number;
  error: string | null;
  result: ClassifyResult | null;
  lastRun: { duration: number | null; skipSplit: boolean };
  graph: GraphData | null;
  confirmReset: boolean;
  resetting: boolean;
  /** Reload the graph from the backend (also used as the retry handler). */
  loadGraph: () => Promise<GraphData | null>;
  /** Route a review through the pipeline. */
  classify: (text: string, skipSplit: boolean) => Promise<void>;
  /** Two-tap reset: first call arms it, second call executes it. */
  reset: () => Promise<void>;
}

export function useEngine(): EngineState {
  const { toast } = useToastStack();

  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [offline, setOffline] = useState(false);
  const [lastRun, setLastRun] = useState<{
    duration: number | null;
    skipSplit: boolean;
  }>({ duration: null, skipSplit: false });
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const loadGraph = useCallback(async () => {
    try {
      const next = await getGraph();
      setGraph(next);
      setOffline(false);
      return next;
    } catch {
      setOffline(true);
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  // Initial fetch on mount.
  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  // Poll every 8s while offline so the UI reconnects automatically.
  useEffect(() => {
    if (!offline) return undefined;
    const id = setInterval(() => void loadGraph(), 8000);
    return () => clearInterval(id);
  }, [offline, loadGraph]);

  // Elapsed-time ticker - runs only while a classify is in flight.
  useEffect(() => {
    if (!loading) return undefined;
    const started = performance.now();
    setElapsed(0);
    const id = setInterval(() => setElapsed(performance.now() - started), 120);
    return () => clearInterval(id);
  }, [loading]);

  // Cleanup the two-tap reset timeout on unmount.
  useEffect(() => {
    const timer = resetTimer.current;
    return () => clearTimeout(timer);
  }, []);

  const classify = useCallback(
    async (text: string, skipSplit: boolean) => {
      if (!text || loading) return;

      setLoading(true);
      setError(null);
      setResult(null);
      setLastRun({ duration: null, skipSplit: false });
      const requestStarted = performance.now();

      try {
        const payload = await apiClassify(text, skipSplit);
        const requestDuration = Math.max(1, performance.now() - requestStarted);

        // Keep the routing skeleton visible long enough to read.
        const remaining = MIN_LOADING_MS - requestDuration;
        if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));

        setResult(payload);
        setOffline(false);
        setLastRun({ duration: requestDuration, skipSplit });

        const traces = payload.traces ?? [];
        const usedLlm = traces.some((t) =>
          (t.stages ?? []).some((s) => s.stage === "LLM"),
        );

        if (traces.length === 1) {
          const route = traces[0].result;
          toast({
            type: usedLlm ? "warning" : "success",
            title: `Routed to ${route.sub_category}`,
            description: usedLlm
              ? `${route.department} - similarity was weak, so the LLM chose the route.`
              : `${route.department} - logged to the knowledge base.`,
          });
        } else if (traces.length > 1) {
          toast({
            type: "success",
            title: `${traces.length} issues routed`,
            description: "Compound review split into atomic labels.",
          });
        } else {
          toast({
            type: "success",
            title: "Positive review",
            description:
              "No complaint found, so it was not added to the knowledge base.",
          });
        }

        void loadGraph();
      } catch (err) {
        setError((err as Error).message || "Classification failed");
        toast({
          type: "error",
          title: "Routing failed",
          description:
            (err as Error).message || "The request could not be completed.",
        });
        if (err instanceof TypeError) setOffline(true);
      } finally {
        setLoading(false);
      }
    },
    [loading, loadGraph, toast],
  );

  const reset = useCallback(async () => {
    if (resetting) return;

    if (!confirmReset) {
      setConfirmReset(true);
      clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => setConfirmReset(false), 4200);
      return;
    }

    clearTimeout(resetTimer.current);
    setConfirmReset(false);
    setResetting(true);

    try {
      await resetState();
      await bootstrap();
      const next = await getGraph();
      setGraph(next);
      setResult(null);
      setOffline(false);
      toast({
        type: "success",
        title: "Knowledge base rebuilt",
        description: "Seed taxonomy restored and the graph reloaded.",
      });
    } catch (err) {
      toast({
        type: "error",
        title: "Reset failed",
        description: (err as Error).message || "The engine did not respond.",
      });
    } finally {
      setResetting(false);
    }
  }, [confirmReset, resetting, toast]);

  return {
    offline,
    connecting,
    loading,
    elapsed,
    error,
    result,
    lastRun,
    graph,
    confirmReset,
    resetting,
    loadGraph,
    classify,
    reset,
  };
}
