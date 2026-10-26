/**
 * Static copy and console constants. No logic lives here, so the page and its
 * sections can share one source without importing each other.
 */
import type { Stats } from "./types";

export const EXAMPLES = [
  { label: "Spicy + taste", text: "food was too spicy and not taste good" },
  { label: "Cold pizza", text: "Pizza was ice cold" },
  {
    label: "Two complaints",
    text: "The delivery took three hours and the pizza was cold.",
  },
  { label: "Double charge", text: "Got charged twice on card" },
];

export const PIPELINE: Array<{ id: string; label: string }> = [
  { id: "BM25", label: "BM25" },
  { id: "Dept FAISS", label: "DEPT" },
  { id: "Sub FAISS", label: "SUB" },
  { id: "Rerank", label: "RERANK" },
  { id: "LLM", label: "LLM" },
];

export const DEPT_SHORT: Record<string, string> = {
  Food: "Food",
  Delivery: "Deliv",
  Payment: "Pay",
  "App & Tech": "App",
  "Restaurant Experience": "Dining",
};

export const EMPTY_STATS: Stats = {
  departments: 5,
  sub_categories: 0,
  reviews: 0,
  graph_nodes: 0,
};

export const REPO_URL = "https://github.com/IAvii/IntelliRoute";
export const PROFILE_URL = "https://github.com/IAvii";
