import { useMemo } from "react";

/** Count of full reviews on file for a (dept, sub_category) pair. */
function countReviews(graph, dept, subLabel) {
  const map = graph?.reviews_by_sub || {};
  const arr = (map[dept] && map[dept][subLabel]) || [];
  return arr.length;
}

export default function NodeDetailDrawer({ node, graph, onClose, onSelectNode }) {
  const subNodes = useMemo(() => {
    if (!node || !graph) return [];
    if (node.type === "department") {
      return graph.nodes.filter((n) => n.type === "sub_category" && n.dept === node.id);
    }
    if (node.type === "sub_category") {
      return graph.nodes.filter((n) => n.id === node.id);
    }
    return [];
  }, [node, graph]);

  const parentSub = useMemo(() => {
    if (!node || !graph) return null;
    if (node.type !== "review") return null;
    return graph.nodes.find((n) =>
      graph.edges.some(
        (e) => e.source === n.id && e.target === node.id && e.type === "has_review"
      )
    );
  }, [node, graph]);

  // ----- empty state -----
  if (!node) {
    return (
      <aside className="drawer empty">
        <p className="panel-title">Node details</p>
        <p className="empty-state">Click any node in the graph to inspect it.</p>
      </aside>
    );
  }

  // ----- department -----
  if (node.type === "department") {
    return (
      <aside className="drawer">
        <div className="drawer-header" style={{ borderColor: node.color }}>
          <div>
            <span className="drawer-eyebrow">Department</span>
            <h3>{node.label}</h3>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="drawer-sub">{subNodes.length} sub-categor{subNodes.length === 1 ? "y" : "ies"} discovered</p>
        <ul className="subcat-list">
          {subNodes.map((s) => (
            <li
              key={s.id}
              className="subcat-row"
              onClick={() => onSelectNode(s.id)}
              style={{ borderLeftColor: s.color }}
            >
              <span className="subcat-name">{s.label}</span>
              <span className="subcat-count">{s.count}</span>
            </li>
          ))}
          {subNodes.length === 0 && (
            <li className="empty-state small">No sub-categories yet.</li>
          )}
        </ul>
      </aside>
    );
  }

  // ----- sub-category -----
  // Look up reviews by node.id first (matches the same key the backend
  // produces when serializing), then by (dept, label) as a fallback.
  if (node.type === "sub_category") {
    const fromId = graph.reviews_by_node_id?.[node.id];
    const fromNested = graph.reviews_by_sub?.[node.dept]?.[node.label];
    const reviews = fromId ?? fromNested ?? [];
    return (
      <aside className="drawer">
        <div className="drawer-header" style={{ borderColor: node.color }}>
          <div>
            <span className="drawer-eyebrow">{node.dept} → Sub-category</span>
            <h3>{node.label}</h3>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="drawer-sub">
          {reviews.length} review{reviews.length === 1 ? "" : "s"} on file
        </p>
        <ul className="review-list">
          {reviews.map((r, i) => (
            <li key={i} className="review-row">
              <span className="review-num">#{i + 1}</span>
              <span className="review-text">{r}</span>
            </li>
          ))}
          {reviews.length === 0 && (
            <li className="empty-state small">No reviews yet for this sub-category.</li>
          )}
        </ul>
      </aside>
    );
  }

  // ----- review node -----
  const backCount = parentSub
    ? countReviews(graph, node.dept, parentSub.label)
    : 0;
  return (
    <aside className="drawer">
      <div className="drawer-header" style={{ borderColor: node.color }}>
        <div>
          <span className="drawer-eyebrow">
            {node.dept}
            {parentSub ? ` → ${parentSub.label}` : ""}
          </span>
          <h3>Review</h3>
        </div>
        <button className="drawer-close" onClick={onClose} aria-label="Close">×</button>
      </div>
      <p className="review-full">{node.label}</p>
      {parentSub && (
        <button className="link-btn" onClick={() => onSelectNode(parentSub.id)}>
          ← Back to {parentSub.label} ({backCount} review{backCount === 1 ? "" : "s"})
        </button>
      )}
    </aside>
  );
}
