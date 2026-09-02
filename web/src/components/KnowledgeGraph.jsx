import { useMemo } from "react";

const SIZE = 640;
const CENTER = SIZE / 2;
const SCALE = 58; // px per "unit" in the original matplotlib layout
const DEPT_RADIUS = 3.0;
const SUB_RADIUS = 1.65;
const REV_RADIUS = 0.7;

function toXY(x, y) {
  return [CENTER + x * SCALE, CENTER + y * SCALE];
}

/** Mirrors the pentagon / fan-out layout from plot_network_graph(). */
function computeLayout(nodes, edges) {
  const pos = {};
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const childrenOf = {};
  edges.forEach((e) => {
    (childrenOf[e.source] ||= []).push(e.target);
  });

  const deptNodes = nodes.filter((n) => n.type === "department");
  const subNodes = nodes.filter((n) => n.type === "sub_category");
  const reviewNodes = nodes.filter((n) => n.type === "review");

  deptNodes.forEach((d, i) => {
    const angle = (2 * Math.PI * i) / deptNodes.length - Math.PI / 2;
    pos[d.id] = [DEPT_RADIUS * Math.cos(angle), DEPT_RADIUS * Math.sin(angle)];
  });

  deptNodes.forEach((d) => {
    const children = (childrenOf[d.id] || []).filter((c) => byId[c]?.type === "sub_category");
    if (!children.length) return;
    const [dx, dy] = pos[d.id];
    const baseAng = Math.atan2(dy, dx);
    const spread = ((120 * Math.PI) / 180) / Math.max(children.length, 1);
    children.forEach((childId, j) => {
      const offset = (j - (children.length - 1) / 2) * spread;
      const angle = baseAng + offset;
      pos[childId] = [dx + SUB_RADIUS * Math.cos(angle), dy + SUB_RADIUS * Math.sin(angle)];
    });
  });

  subNodes.forEach((sub) => {
    if (!pos[sub.id]) return;
    const children = (childrenOf[sub.id] || []).filter((c) => byId[c]?.type === "review");
    if (!children.length) return;
    const [sx, sy] = pos[sub.id];
    const baseAng = Math.atan2(sy, sx);
    const spread = ((100 * Math.PI) / 180) / Math.max(children.length, 1);
    children.forEach((childId, j) => {
      const offset = (j - (children.length - 1) / 2) * spread;
      const angle = baseAng + offset;
      pos[childId] = [sx + REV_RADIUS * Math.cos(angle), sy + REV_RADIUS * Math.sin(angle)];
    });
  });

  reviewNodes.forEach((r) => {
    if (!pos[r.id]) pos[r.id] = [0, 0];
  });

  return pos;
}

export default function KnowledgeGraph({ graph, highlight, selectedId, onSelectNode }) {
  const pos = useMemo(() => (graph ? computeLayout(graph.nodes, graph.edges) : {}), [graph]);

  if (!graph || graph.nodes.length === 0) {
    return <div className="empty-state">Knowledge graph will appear once the app has bootstrapped.</div>;
  }

  const hlSubNodes = new Set((highlight || []).map((h) => h.sub_category_node));
  const hlReviewNodes = new Set((highlight || []).map((h) => h.review_node));
  const hlDeptNodes = new Set((highlight || []).map((h) => h.department));

  const deptEdges = graph.edges.filter((e) => e.type === "has_category");
  const reviewEdges = graph.edges.filter((e) => e.type === "has_review");

  const isHlEdge = (e) =>
    (hlDeptNodes.has(e.source) && hlSubNodes.has(e.target)) ||
    (hlSubNodes.has(e.source) && hlReviewNodes.has(e.target));

  const subNodes = graph.nodes.filter((n) => n.type === "sub_category");
  const maxCount = Math.max(1, ...subNodes.map((n) => n.count || 1));

  const handleSelect = (id) => onSelectNode && onSelectNode(id);

  return (
    <div className="graph-svg-wrap">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width="100%"
        height="auto"
        preserveAspectRatio="xMidYMid meet"
        overflow="visible"
      >
        {/* plain edges first, highlighted edges drawn on top */}
        {reviewEdges.map((e, i) => {
          if (!pos[e.source] || !pos[e.target] || isHlEdge(e)) return null;
          const [x1, y1] = toXY(...pos[e.source]);
          const [x2, y2] = toXY(...pos[e.target]);
          return <line key={`re-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1" />;
        })}
        {deptEdges.map((e, i) => {
          if (!pos[e.source] || !pos[e.target] || isHlEdge(e)) return null;
          const [x1, y1] = toXY(...pos[e.source]);
          const [x2, y2] = toXY(...pos[e.target]);
          return <line key={`de-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1.6" />;
        })}
        {[...deptEdges, ...reviewEdges].filter(isHlEdge).map((e, i) => {
          if (!pos[e.source] || !pos[e.target]) return null;
          const [x1, y1] = toXY(...pos[e.source]);
          const [x2, y2] = toXY(...pos[e.target]);
          return <line key={`hl-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f1c40f" strokeOpacity="0.95" strokeWidth="3" />;
        })}

        {/* review dots */}
        {graph.nodes.filter((n) => n.type === "review").map((n) => {
          if (!pos[n.id]) return null;
          const [x, y] = toXY(...pos[n.id]);
          const hl = hlReviewNodes.has(n.id);
          const sel = selectedId === n.id;
          return (
            <circle
              key={n.id}
              cx={x}
              cy={y}
              r={sel ? 7 : hl ? 6.5 : 3}
              fill={sel ? "#ffffff" : hl ? "#f1c40f" : "#b2bec3"}
              opacity={sel || hl ? 1 : 0.55}
              stroke={sel ? "#f1c40f" : hl ? "#fff" : "none"}
              strokeWidth="1"
              onClick={() => handleSelect(n.id)}
              style={{ cursor: "pointer" }}
            >
              <title>{n.label}</title>
            </circle>
          );
        })}

        {/* sub-category nodes */}
        {subNodes.map((n) => {
          if (!pos[n.id]) return null;
          const [x, y] = toXY(...pos[n.id]);
          const hl = hlSubNodes.has(n.id);
          const sel = selectedId === n.id;
          const r = 12 + 16 * Math.sqrt((n.count || 1) / maxCount);
          return (
            <g key={n.id} onClick={() => handleSelect(n.id)} style={{ cursor: "pointer" }}>
              {(hl || sel) && <circle cx={x} cy={y} r={r * 1.8} fill={sel ? "#3498db" : "#f1c40f"} opacity={sel ? 0.35 : 0.28} />}
              <circle
                cx={x}
                cy={y}
                r={r}
                fill={n.color}
                stroke={sel ? "#3498db" : hl ? "#f1c40f" : "#ffffff"}
                strokeWidth={sel || hl ? 2.5 : 1.2}
                opacity="0.92"
              />
              <text x={x} y={y - r - 6} textAnchor="middle" fontSize="9.5" fill="#e9e9f2" fontFamily="IBM Plex Mono, monospace">
                {n.label} ({n.count})
              </text>
              <title>{`${n.dept} → ${n.label} (${n.count} reviews)`}</title>
            </g>
          );
        })}

        {/* department nodes */}
        {graph.nodes.filter((n) => n.type === "department").map((n) => {
          if (!pos[n.id]) return null;
          const [x, y] = toXY(...pos[n.id]);
          const hl = hlDeptNodes.has(n.id);
          const sel = selectedId === n.id;
          const half = 26;
          const points = `${x},${y - half} ${x + half},${y} ${x},${y + half} ${x - half},${y}`;
          return (
            <g key={n.id} onClick={() => handleSelect(n.id)} style={{ cursor: "pointer" }}>
              {(hl || sel) && <circle cx={x} cy={y} r={half * 1.9} fill={sel ? "#3498db" : "#f1c40f"} opacity={sel ? 0.32 : 0.25} />}
              <polygon
                points={points}
                fill={n.color}
                stroke={sel ? "#3498db" : hl ? "#f1c40f" : "#ffffff"}
                strokeWidth={sel || hl ? 3 : 1.6}
              />
              <text x={x} y={y + 3} textAnchor="middle" fontSize="10" fontWeight="700" fill="#14140d" fontFamily="Sora, sans-serif">
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="legend">
        {Object.entries({
          Food: "var(--dept-food)",
          Delivery: "var(--dept-delivery)",
          Payment: "var(--dept-payment)",
          "App & Tech": "var(--dept-apptech)",
          "Restaurant Experience": "var(--dept-restaurant)",
        }).map(([label, color]) => (
          <span key={label}>
            <span className="legend-dot" style={{ background: color }} />
            {label}
          </span>
        ))}
        <span>
          <span className="legend-dot" style={{ background: "#f1c40f" }} />
          Just assigned
        </span>
        <span>
          <span className="legend-dot" style={{ background: "#3498db" }} />
          Selected (click)
        </span>
      </div>
    </div>
  );
}
