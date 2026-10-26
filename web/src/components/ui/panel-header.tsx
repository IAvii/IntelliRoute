/**
 * PanelHeader - the kicker / heading / badge structure shared by every panel.
 *
 * Before: 9 identical <header><div><p kicker /><h2 panelTitle /></div>{badge}</header>
 *         blocks copy-pasted across 5 files.
 *
 * After: callers pass 3 strings and an optional ReactNode badge.
 * The DOM nesting, class ordering, and id wiring live here — once.
 */
import type { ReactNode } from "react";
import { kicker as kickerCls, panelHeader, panelTitle } from "@/lib/ui";

interface PanelHeaderProps {
  kicker: string;
  title: string;
  headingId?: string;
  badge?: ReactNode;
}

export default function PanelHeader({
  kicker,
  title,
  headingId,
  badge,
}: PanelHeaderProps) {
  return (
    <header className={panelHeader}>
      <div className="min-w-0">
        <p className={kickerCls}>{kicker}</p>
        <h2 id={headingId} className={panelTitle}>
          {title}
        </h2>
      </div>
      {badge ? (
        <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2">
          {badge}
        </div>
      ) : null}
    </header>
  );
}
