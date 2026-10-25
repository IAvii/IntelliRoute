import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { motionTokens } from "@/components/arc/lib/motion-tokens";

/**
 * Follows its content height. When `morphKey` changes, the height springs
 * from the old size to the new one and then returns to auto, so passive
 * reflows such as a resize or font swap still follow instantly.
 */
export default function SmoothHeight({
  children,
  className,
  contentClassName,
  morphKey = "",
}) {
  const reduce = useReducedMotion();
  const frame = useRef(null);
  const content = useRef(null);
  const last = useRef();
  const controls = useRef();
  const moving = useRef(false);
  const height = useMotionValue("auto");

  const settle = useCallback(() => {
    const playback = controls.current;
    controls.current = undefined;
    moving.current = false;
    playback?.stop();
    height.jump("auto");
    if (frame.current) {
      Object.assign(frame.current.style, { overflow: "", height: "auto" });
    }
  }, [height]);

  // Measure the committed content before paint. This is deliberately separate
  // from the ResizeObserver: large result panels can take longer than a frame
  // to lay out, and a delayed observer entry must not turn the morph into a jump.
  useLayoutEffect(() => {
    const node = content.current;
    if (!node) return;

    const next = node.getBoundingClientRect().height;
    const current = height.get();
    const from = typeof current === "number" ? current : last.current;
    last.current = next;

    if (reduce || from === undefined || from === next) {
      settle();
      return;
    }

    controls.current?.stop();
    if (frame.current) {
      Object.assign(frame.current.style, {
        overflow: "hidden",
        height: `${from}px`,
      });
    }
    moving.current = true;
    let playback;
    playback = animate(height, [from, next], {
      ...motionTokens.spring.smooth,
      onComplete: () => {
        // A stopped animation can still deliver a late completion. Only the
        // animation that currently owns the frame may settle it.
        if (controls.current === playback) settle();
      },
    });
    controls.current = playback;

    return () => {
      playback.stop();
      if (controls.current === playback) controls.current = undefined;
    };
  }, [height, morphKey, reduce, settle]);

  // An observer still catches passive reflows (fonts, responsive resizes).
  // Those follow immediately instead of restarting the spring.
  useEffect(() => {
    const node = content.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry || moving.current) return;
      last.current =
        entry.borderBoxSize?.[0]?.blockSize ??
        node.getBoundingClientRect().height;
      settle();
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [settle]);

  return (
    <motion.div
      ref={frame}
      // A flex parent must not compress the frame while it is animating.
      className={["shrink-0", className].filter(Boolean).join(" ")}
      style={{ height }}
    >
      <div ref={content} className={contentClassName}>
        {children}
      </div>
    </motion.div>
  );
}
