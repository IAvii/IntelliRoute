import { useMemo } from "react";

export default function CategoryPanel({ graph, selectedId, onSelectNode }) {
  const grouped = useMemo(() => {
    if (!graph) return [];
    const byDept = {};
    for (const n of graph.nodes) {
      if (n.type !== "sub_category") continue;
      (byDept[n.dept] ||= []).push(n);
    }
    Object.values(byDept).forEach((arr) =>
      arr.sort((a, b) => (b.count || 0) - (a.count || 0))
    );
    return Object.entries(byDept).sort(([a], [b]) => a.localeCompare(b));
  }, [graph]);

  if (!graph) {
    return (
      <div className="panel">
        <p className="panel-title">Discovered Categories</p>
        <p className="empty-state">Waiting for bootstrap…</p>
      </div>
    );
  }

  const totalSubs = grouped.reduce((acc, [, arr]) => acc + arr.length, 0);

  return (
    <div className="panel category-panel">
      <div className="panel-title-row">
        <p className="panel-title">Discovered Categories</p>
        <span className="panel-sub">{grouped.length} dept · {totalSubs} sub-cat</span>
      </div>
      <div className="category-grid">
        {grouped.map(([dept, subs]) => {
          const total = subs.reduce((acc, s) => acc + (s.count || 0), 0);
          return (
            <div key={dept} className="category-dept">
              <div className="category-dept-head">
                <span className="dot" style={{ background: subs[0]?.color || "var(--line)" }} />
                <span className="dept-name">{dept}</span>
                <span className="dept-total">{total}</span>
              </div>
              <ul>
                {subs.map((s) => (
                  <li
                    key={s.id}
                    className={"category-sub" + (s.id === selectedId ? " selected" : "")}
                    onClick={() => onSelectNode(s.id)}
                  >
                    <span className="sub-name">{s.label}</span>
                    <span className="sub-count">{s.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {grouped.length === 0 && (
          <p className="empty-state">No sub-categories discovered yet — classify a review to seed them.</p>
        )}
      </div>
    </div>
  );
}
