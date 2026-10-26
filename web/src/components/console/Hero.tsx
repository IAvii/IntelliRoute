/** Hero - the static page title block. No props, no state. */
export default function Hero() {
  return (
    <section className="flex flex-wrap items-end justify-between gap-8 pb-8 pt-12 lg:pt-16">
      <div className="max-w-3xl">
        <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-ink">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success/60" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          Live inference console
        </p>
        <h1 className="mt-4 text-[clamp(2.7rem,6.2vw,5.4rem)] font-medium leading-[0.92] tracking-[-0.055em] text-ink">
          Every complaint,
          <br />
          <em className="font-serif font-normal italic text-accent">
            cleanly routed.
          </em>
        </h1>
      </div>

      <div className="max-w-xs border-l border-line pl-5">
        <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-faint-ink">
          retrieval stack
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-ink">
          Five stages, one decision. BM25 narrows the departments, FAISS
          matches the category, and a cross-encoder only fires when the
          margin is thin.
        </p>
        <p className="mt-4 font-mono text-[10px] tracking-[0.04em] text-ink-soft">
          BM25 → FAISS → RERANK → LLM
        </p>
      </div>
    </section>
  );
}
