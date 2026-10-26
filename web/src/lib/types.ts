/**
 * Shapes exchanged with the FastAPI backend. These mirror the JSON the
 * pipeline returns and are intentionally permissive: optional fields only
 * appear for the stages that produced them.
 */

/** `BM25` and `Dept FAISS` send a score map, `Rerank` sends `[label, probability]` pairs. */
export type TraceScores =
  | Record<string, number | string>
  | Array<[string, number | string]>;

export interface TraceStage {
  stage: string;
  /** BM25 only: the departments that stayed in play. */
  top2?: string[];
  winner?: string;
  sim?: number;
  margin?: number;
  decision?: string;
  overrode?: boolean;
  bi_encoder_winner?: string;
  /** LLM fallback only. */
  reason?: string;
  scores?: TraceScores;
  candidates?: Array<[string, number]>;
}

export interface TraceResult {
  department: string;
  sub_category: string;
  sub_category_node: string;
  review_node: string;
}

/** One classified issue, as both the waterfall and the category index read it. */
export interface Trace {
  query: string;
  stages?: TraceStage[];
  result: TraceResult;
}

export interface ClassifyResult {
  traces: Trace[];
  no_complaint?: boolean;
}

export interface GraphNode {
  id: string;
  label: string;
  type?: string;
  /** Set for `sub_category` and `review` nodes. */
  dept?: string;
  count?: number;
  /** Only present on nodes that carry an explicit tint. */
  color?: string;
}

export interface GraphEdge {
  type?: string;
  source: string;
  target: string;
}

export interface Stats {
  departments: number;
  sub_categories: number;
  reviews: number;
  graph_nodes?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats?: Stats;
  /** Review text keyed by the review node id. */
  reviews_by_node_id?: Record<string, string[]>;
}

/** One department row: the shape the KPI strip and the distribution chart read. */
export interface DeptAgg {
  dept: string;
  color: string;
  /** Number of sub-categories filed under the department. */
  subs: number;
  /** Sum of the sub-categories' review counts. */
  reviews: number;
}
