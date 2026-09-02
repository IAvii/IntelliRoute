export default function ResultsSummary({ traces }) {
  if (!traces || traces.length === 0) return null;

  return (
    <div className="results-summary">
      {traces.map((t, i) => (
        <div className="result-row" key={i}>
          <span className="dept-tag">
            [{t.result.department}] → {t.result.sub_category}
          </span>{" "}
          — "{t.query}"
        </div>
      ))}
    </div>
  );
}
