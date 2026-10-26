import { RotateCcw, Terminal } from "lucide-react";
import Badge from "@/components/arc/badge/badge";
import Button from "@/components/arc/button/button";
import { CopyButton } from "@/components/arc/copy-button/copy-button";
import SmoothHeight from "@/components/ui/smooth-height";
import { statusTone } from "@/lib/theme";
import { kicker } from "@/lib/ui";

const START_COMMAND = "cd core && uvicorn app.main:app --port 8000";

interface BootScreenProps {
  offline: boolean;
  connecting: boolean;
  onRetry?: () => void;
}

export default function BootScreen({ offline, connecting, onRetry }: BootScreenProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden px-6 py-8">
      <a
        className="inline-flex w-fit items-center gap-2.5"
        href="/"
        aria-label="IntelliRoute home"
      >
        <img
          src="/extension-icon.svg"
          alt=""
          className="size-9 rounded-[11px] shadow-sm"
          decoding="async"
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-ink">
          intelliroute
        </span>
      </a>

      <SmoothHeight
        className="m-auto w-full max-w-[460px]"
        contentClassName="pb-16"
        morphKey={offline ? "offline" : "warming"}
      >
        <Badge
          tone={statusTone(offline, connecting)}
          size="sm"
          icon={<span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
        >
          {offline ? "Connection lost" : "Warming up"}
        </Badge>

        <div className="mt-7 flex items-start gap-4">
          <img
            src="/extension-icon.svg"
            alt=""
            className="size-16 shrink-0 rounded-[18px] shadow-[0_18px_38px_-20px_rgba(23,22,15,0.55)]"
            decoding="async"
          />
          <div>
            <p className={kicker}>Local-first routing engine</p>
            <h1 className="mt-2 font-serif text-[42px] leading-[0.98] tracking-[-0.02em] text-ink">
              {offline ? (
                <>
                  The engine is
                  <br />
                  <em className="text-accent">offline.</em>
                </>
              ) : (
                <>
                  Waking the
                  <br />
                  <em className="text-accent">routing engine.</em>
                </>
              )}
            </h1>
          </div>
        </div>

        <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-muted-ink">
          {offline
            ? "Start the FastAPI backend and this console will reconnect on its own. The knowledge base lives in memory, so a restart rebuilds it from seed reviews."
            : "Loading embeddings, the knowledge graph and the seed taxonomy. The first run can take up to a minute while the models warm."}
        </p>

        {offline ? (
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
              <Terminal className="size-3.5 shrink-0 text-muted-ink" />
              <code className="min-w-0 flex-1 truncate font-mono text-[11px] text-ink-soft">
                {START_COMMAND}
              </code>
              <CopyButton value={START_COMMAND} label="Copy command" iconOnly variant="plain" />
            </div>
            <Button variant="primary" onClick={onRetry} loading={connecting}>
              <RotateCcw className="size-4" />
              Retry connection
            </Button>
          </div>
        ) : (
          <div className="mt-6 flex items-center gap-1.5" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="h-1 w-10 animate-pulse rounded-full bg-ink/70"
                style={{ animationDelay: `${i * 140}ms` }}
              />
            ))}
          </div>
        )}

        <p className="mt-8 font-mono text-[10px] uppercase tracking-[0.16em] text-faint-ink">
          API · 127.0.0.1:8000
        </p>
      </SmoothHeight>
    </div>
  );
}
