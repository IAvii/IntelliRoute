/**
 * StatusBadge - encodes the loading -> result -> noComplaint -> idle
 * tri-state pattern that was copy-pasted across four panels.
 *
 * Callers pass facts (booleans + counts); this module decides tone,
 * label, icon, and min-width - all in one place.
 */
import { LoaderCircle } from "lucide-react";
import Badge from "@/components/arc/badge/badge";
import { formatDuration } from "@/lib/theme";

interface StatusBadgeProps {
  loading?: boolean;
  noComplaint?: boolean;
  /** Text shown when there is a result. Omit to show "idle". */
  resultLabel?: string;
  /**
   * Text shown during loading. When omitted and elapsed > 0 the
   * elapsed time is shown instead (TracePanel header behaviour).
   */
  loadingLabel?: string;
  /** Elapsed ms shown while loading when loadingLabel is not set. */
  elapsed?: number;
  /** Tailwind min-width class. Defaults to "min-w-[78px]". */
  minWidth?: string;
}

export default function StatusBadge({
  loading,
  noComplaint,
  resultLabel,
  loadingLabel,
  elapsed = 0,
  minWidth = "min-w-[78px]",
}: StatusBadgeProps) {
  const cls = `${minWidth} shrink-0 justify-center`;

  if (loading) {
    return (
      <Badge
        key="loading"
        tone="info"
        size="sm"
        animateWidth={false}
        className={cls}
        icon={<LoaderCircle className="size-3 animate-spin" />}
      >
        {loadingLabel ?? (
          <span className="inline-block w-11 text-center tabular-nums">
            {elapsed > 0 ? formatDuration(elapsed) : ""}
          </span>
        )}
      </Badge>
    );
  }

  if (noComplaint) {
    return (
      <Badge key="positive" tone="success" size="sm" animateWidth={false} className={cls}>
        positive
      </Badge>
    );
  }

  if (resultLabel) {
    return (
      <Badge key="result" tone="neutral" size="sm" animateWidth={false} className={cls}>
        {resultLabel}
      </Badge>
    );
  }

  return (
    <Badge key="idle" tone="neutral" size="sm" animateWidth={false} className={cls}>
      idle
    </Badge>
  );
}
