function StageBox({ stage, delay }) {
  const lines = [];
  if (stage.stage === "BM25") {
    Object.entries(stage.scores || {}).forEach(([d, sc]) => lines.push(`${d}: ${sc}`));
  } else if (stage.stage === "Dept FAISS") {
    Object.entries(stage.scores || {}).forEach(([d, sc]) =>
      lines.push(`${d}: ${sc}${d === stage.winner ? " ✓" : ""}`)
    );
  } else if (stage.stage === "Sub FAISS") {
    (stage.candidates || []).forEach(([name, sc]) =>
      lines.push(`${name}: ${sc}${name === stage.winner ? " ✓" : ""}`)
    );
  } else if (stage.stage === "Rerank") {
    (stage.scores || []).forEach(([name, sc]) => {
      const tag = name === stage.winner ? " ✓" : "";
      const flag = stage.overrode && name === stage.winner ? "  ← override" : "";
      lines.push(`${name}: ${sc}${tag}${flag}`);
    });
    if (stage.bi_encoder_winner && stage.bi_encoder_winner !== stage.winner) {
      lines.push(`bi-encoder picked: ${stage.bi_encoder_winner}`);
    }
  } else if (stage.stage === "LLM") {
    lines.push(stage.reason);
  }

  return (
    <div className="trace-box stage" style={{ animationDelay: `${delay}ms` }}>
      <div className="stage-name">{stage.stage}</div>
      {lines.map((l, i) => (
        <div key={i}>{l}</div>
      ))}
      {stage.decision && <span className="decision-tag">{stage.decision}</span>}
    </div>
  );
}

function TraceColumn({ trace, columnIndex }) {
  let delay = 60;
  const step = 140;

  return (
    <div className="trace-column">
      <div className="trace-column-label">Issue {columnIndex + 1}</div>
      <div className="trace-box query" style={{ animationDelay: `${delay}ms` }}>
        "{trace.query}"
      </div>
      <div className="trace-arrow" />
      {trace.stages.map((stage, i) => {
        delay += step;
        return (
          <div key={i}>
            <StageBox stage={stage} delay={delay} />
            <div className="trace-arrow" />
          </div>
        );
      })}
      <div
        className="trace-box result"
        style={{ animationDelay: `${delay + step}ms` }}
      >
        {trace.result.department} → {trace.result.sub_category}
      </div>
    </div>
  );
}

export default function InferenceTrace({ traces }) {
  if (!traces || traces.length === 0) {
    return (
      <div className="empty-state">
        Run a review through the pipeline to see its live BM25 → FAISS → LLM trace here.
      </div>
    );
  }

  return (
    <div className="trace-columns">
      {traces.map((t, i) => (
        <TraceColumn key={i} trace={t} columnIndex={i} />
      ))}
    </div>
  );
}
