/**
 * ComposerPanel - the review input, example chips, skip-split switch and the
 * route action. Owns no engine state: the page passes the six facts it needs.
 */
import {
  ArrowRight,
  Command,
  CornerDownLeft,
  Sparkles,
} from "lucide-react";
import Badge from "@/components/arc/badge/badge";
import Button from "@/components/arc/button/button";
import { Switch } from "@/components/arc/switch/switch";
import { Textarea } from "@/components/arc/textarea/textarea";
import PanelHeader from "@/components/ui/panel-header";
import { EXAMPLES } from "@/lib/console-content";
import { formatDuration } from "@/lib/theme";
import { cn, plural } from "@/lib/utils";
import { panel, panelBody } from "@/lib/ui";

interface ComposerPanelProps {
  review: string;
  onReviewChange: (value: string) => void;
  skipSplit: boolean;
  onSkipSplitChange: (value: boolean) => void;
  loading: boolean;
  elapsed: number;
  onRoute: () => void;
}

export default function ComposerPanel({
  review,
  onReviewChange,
  skipSplit,
  onSkipSplitChange,
  loading,
  elapsed,
  onRoute,
}: ComposerPanelProps) {
  const isMac = /Mac|iPhone|iPad/.test(
    typeof navigator === "undefined" ? "" : navigator.platform,
  );

  return (
    <section
      id="console"
      className={cn(panel, "scroll-mt-24")}
      aria-labelledby="composer-heading"
    >
      <PanelHeader
        kicker="01 · Console"
        title="Route a review"
        headingId="composer-heading"
        badge={<Badge tone="neutral" size="sm">{plural(review.length, "char")}</Badge>}
      />

      <div className={panelBody}>
        <Textarea
          label="Incoming review"
          description="Compound complaints are split into atomic issues unless skip is on."
          value={review}
          onChange={(e) => onReviewChange(e.target.value)}
          rows={4}
          placeholder="Paste a customer complaint…"
          spellCheck="true"
          className="min-h-[132px]"
        />

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-mono text-[9px] uppercase tracking-[0.16em] text-faint-ink">
            try
          </span>
          {EXAMPLES.map((ex) => (
            <Button
              key={ex.label}
              variant="ghost"
              size="sm"
              onClick={() => onReviewChange(ex.text)}
            >
              {ex.label}
            </Button>
          ))}
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t border-line/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <Switch
              label="Skip split"
              checked={skipSplit}
              onCheckedChange={onSkipSplitChange}
            />
            <span className="hidden items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em] text-faint-ink sm:inline-flex">
              <kbd className="rounded-md border border-line bg-paper px-1.5 py-0.5 text-[9px] text-muted-ink">
                {isMac ? <Command className="size-2.5" /> : "Ctrl"}
              </kbd>
              <kbd className="rounded-md border border-line bg-paper px-1.5 py-0.5 text-[9px] text-muted-ink">
                <CornerDownLeft className="size-2.5" />
              </kbd>
              route
            </span>
          </div>

          <div className="flex items-center sm:justify-end">
            <span
              aria-hidden={!loading}
              className={`inline-flex shrink-0 items-center justify-end overflow-hidden font-mono text-[11px] tabular-nums text-muted-ink transition-[width,opacity,margin-right] duration-200 ease-out ${
                loading
                  ? "mr-3 w-12 opacity-100"
                  : "mr-0 w-0 opacity-0"
              }`}
            >
              {loading ? formatDuration(elapsed) : ""}
            </span>
            <Button
              variant="primary"
              size="lg"
              loading={loading}
              disabled={!review.trim() || loading}
              onClick={onRoute}
              className="min-w-[190px]"
            >
              <Sparkles className="size-4" />
              Classify review
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
