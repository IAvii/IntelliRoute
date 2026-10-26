/**
 * AppHeader - the sticky site chrome: brand, section nav, engine status, reset.
 *
 * Before: ~70 lines of markup inside Console(), wired directly to engine state.
 * After:  callers pass the six facts the header renders.
 */
import { RotateCcw } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Badge, { type BadgeTone } from "@/components/arc/badge/badge";
import Button from "@/components/arc/button/button";
import { RESET_ARM_MS } from "@/hooks/useEngine";

const NAV = [
  ["Console", "#console"],
  ["Trace", "#trace"],
  ["Knowledge", "#knowledge"],
  ["Taxonomy", "#taxonomy"],
];

interface AppHeaderProps {
  tone: BadgeTone;
  status: string;
  confirmReset: boolean;
  resetting: boolean;
  offline: boolean;
  onReset: () => void;
}

export default function AppHeader({
  tone,
  status,
  confirmReset,
  resetting,
  offline,
  onReset,
}: AppHeaderProps) {
  const reduce = useReducedMotion();

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-4 px-5 py-3 lg:px-8">
        <a
          className="flex shrink-0 items-center gap-2.5"
          href="/"
          aria-label="IntelliRoute home"
        >
          <img
            src="/extension-icon.svg"
            alt=""
            className="size-9 rounded-[11px] shadow-sm"
            decoding="async"
          />
          <span className="leading-none">
            <span className="block text-[14px] font-semibold tracking-[-0.02em] text-ink">
              IntelliRoute
            </span>
            <span className="mt-1 block font-mono text-[8.5px] uppercase tracking-[0.18em] text-muted-ink">
              complaint routing
            </span>
          </span>
        </a>

        <nav
          className="ml-5 hidden items-center gap-5 lg:flex"
          aria-label="Sections"
        >
          {NAV.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-ink transition-colors hover:text-ink"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <span className="max-sm:hidden">
            <Badge
              tone={tone}
              size="sm"
              icon={
                <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              }
            >
              {status}
            </Badge>
          </span>
          <span className="sm:hidden">
            <Badge
              tone={tone}
              size="sm"
              animateWidth={false}
              icon={
                <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              }
              role="img"
              aria-label={status}
              title={status}
            />
          </span>
          <span className="relative inline-flex">
            <Button
              variant={confirmReset ? "danger" : "ghost"}
              size="sm"
              loading={resetting}
              disabled={offline || resetting}
              onClick={onReset}
              title="Wipe in-memory state and rebuild from the seed reviews"
              className="sm:min-w-[104px]"
            >
              <RotateCcw className="size-3.5" />
              <span className="max-sm:sr-only">
                {confirmReset ? "Confirm reset" : "Reset KB"}
              </span>
            </Button>
            {confirmReset ? (
              <motion.span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-1 bottom-1.5 h-[2px] origin-left rounded-full bg-danger/70 sm:inset-x-4"
                initial={reduce ? { opacity: 1 } : { scaleX: 1 }}
                animate={reduce ? { opacity: 0 } : { scaleX: 0 }}
                transition={{ duration: RESET_ARM_MS / 1000, ease: "linear" }}
              />
            ) : null}
          </span>
        </div>
      </div>
    </header>
  );
}
