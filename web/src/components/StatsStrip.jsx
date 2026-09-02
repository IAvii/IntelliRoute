export default function StatsStrip({ stats }) {
  if (!stats) return null;
  return (
    <div className="stats-strip">
      <span>
        Depts: <strong>{stats.departments}</strong>
      </span>
      <span>
        Sub-categories: <strong>{stats.sub_categories}</strong>
      </span>
      <span>
        Reviews: <strong>{stats.reviews}</strong>
      </span>
      <span>
        Graph nodes: <strong>{stats.graph_nodes}</strong>
      </span>
    </div>
  );
}
