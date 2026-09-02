import { useEffect, useMemo, useState } from "react";
import { classify, getGraph } from "./api.js";
import InferenceTrace from "./components/InferenceTrace.jsx";
import KnowledgeGraph from "./components/KnowledgeGraph.jsx";
import ResultsSummary from "./components/ResultsSummary.jsx";
import StatsStrip from "./components/StatsStrip.jsx";
import NodeDetailDrawer from "./components/NodeDetailDrawer.jsx";
import CategoryPanel from "./components/CategoryPanel.jsx";

export default function App() {
  const [review, setReview] = useState("The delivery took three hours and the pizza was cold.");
  const [skipSplit, setSkipSplit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [traces, setTraces] = useState([]);
  const [highlight, setHighlight] = useState([]);
  const [graph, setGraph] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  async function refreshGraph() {
    try {
      const g = await getGraph();
      setGraph(g);
    } catch (e) {
      // graph fetch failing shouldn't block the rest of the UI
      console.error(e);
    }
  }

  useEffect(() => {
    refreshGraph();
  }, []);

  // Selected node lookup (recomputed when graph or selection changes).
  const selectedNode = useMemo(() => {
    if (!selectedId || !graph) return null;
    return graph.nodes.find((n) => n.id === selectedId) || null;
  }, [selectedId, graph]);

  // If the selected node disappears (e.g. after a reset) drop the selection.
  useEffect(() => {
    if (selectedId && !selectedNode) setSelectedId(null);
  }, [selectedId, selectedNode]);

  async function handleClassify() {
    if (!review.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await classify(review, skipSplit);
      setTraces(result.traces);
      setHighlight(result.highlight);
      setGraph(result.graph);
      setSelectedId(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleClassify();
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <span className="eyebrow">Live inference console</span>
          <h1>Zomato Complaint Router</h1>
        </div>
        <StatsStrip stats={graph?.stats} />
      </header>

      <div className="console-input">
        <input
          value={review}
          onChange={(e) => setReview(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste a review, e.g. 'The delivery took three hours and the pizza was cold.'"
        />
        <label className="split-toggle">
          <input
            type="checkbox"
            checked={skipSplit}
            onChange={(e) => setSkipSplit(e.target.checked)}
          />
          skip split (already atomic)
        </label>
        <button onClick={handleClassify} disabled={loading}>
          {loading ? "Classifying…" : "Classify"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="main-grid">
        <div className="panel">
          <p className="panel-title">Live Inference Trace</p>
          <InferenceTrace traces={traces} />
          <ResultsSummary traces={traces} />
        </div>

        <div className="panel graph-panel">
          <p className="panel-title">Knowledge Graph · click any node</p>
          <KnowledgeGraph
            graph={graph}
            highlight={highlight}
            selectedId={selectedId}
            onSelectNode={setSelectedId}
          />
          <NodeDetailDrawer
            node={selectedNode}
            graph={graph}
            onClose={() => setSelectedId(null)}
            onSelectNode={setSelectedId}
          />
        </div>
      </div>

      <CategoryPanel
        graph={graph}
        selectedId={selectedId}
        onSelectNode={setSelectedId}
      />
    </div>
  );
}
