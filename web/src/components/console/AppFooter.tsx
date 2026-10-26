/** AppFooter - the static footer: attribution and the GitHub link. */
import { Star } from "lucide-react";
import { PROFILE_URL, REPO_URL } from "@/lib/console-content";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5C5.73.5.75 5.48.75 11.75c0 4.98 3.23 9.2 7.71 10.69.56.1.77-.24.77-.54v-1.9c-3.14.68-3.8-1.51-3.8-1.51-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.51-.28-5.15-1.26-5.15-5.6 0-1.24.44-2.25 1.16-3.04-.12-.29-.5-1.44.11-3 0 0 .95-.3 3.12 1.16.9-.25 1.87-.38 2.83-.38.96 0 1.93.13 2.83.38 2.17-1.46 3.12-1.16 3.12-1.16.61 1.56.23 2.71.11 3 .72.79 1.16 1.8 1.16 3.04 0 4.35-2.65 5.31-5.17 5.59.4.35.76 1.04.76 2.09v3.1c0 .3.2.65.78.54a11.26 11.26 0 0 0 7.7-10.69C23.25 5.48 18.27.5 12 .5Z" />
    </svg>
  );
}

export default function AppFooter() {
  return (
    <footer className="mt-10 flex flex-col gap-4 border-t border-line pt-5 font-mono text-[9px] uppercase tracking-[0.16em] text-faint-ink sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span>IntelliRoute · local-first inference</span>
        <span
          className="hidden text-line-strong sm:inline"
          aria-hidden="true"
        >
          /
        </span>
        <span>BM25 → FAISS → rerank → LLM</span>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <a
          href={PROFILE_URL}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-1.5 text-[10px] normal-case tracking-[0.02em] transition-colors duration-150 hover:text-ink"
          aria-label="Made by Avinash Ganore on GitHub"
        >
          <span className="uppercase tracking-[0.16em]">Made by</span>
          <span className="font-medium text-ink-soft transition-colors duration-150 group-hover:text-ink">
            Avinash Ganore
          </span>
        </a>

        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-2.5 py-1.5 text-ink-soft transition-[color,background-color,border-color,transform] duration-150 ease-out hover:border-line-strong hover:bg-surface hover:text-ink active:scale-[0.97]"
          aria-label="Star IntelliRoute on GitHub"
        >
          <GitHubIcon className="size-3" />
          Star on GitHub
          <Star className="size-3 text-faint-ink transition-colors duration-150 group-hover:text-accent" />
        </a>
      </div>
    </footer>
  );
}
