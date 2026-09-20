"use client";

import { useEffect, useRef } from "react";

export function LessonStudyTracker({ lessonId }: { lessonId: string }) {
  const activeSince = useRef<number | null>(null);

  useEffect(() => {
    function visible() {
      return document.visibilityState === "visible";
    }

    function send(seconds: number, beacon = false) {
      const bounded = Math.min(60, Math.max(1, Math.round(seconds)));
      const payload = JSON.stringify({ lessonId, seconds: bounded });

      if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/analytics/study-time",
          new Blob([payload], { type: "application/json" }),
        );
        return;
      }

      void fetch("/api/analytics/study-time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }

    function flush(beacon = false) {
      if (activeSince.current === null) return;

      const now = Date.now();
      const elapsed = (now - activeSince.current) / 1000;
      activeSince.current = visible() ? now : null;

      if (elapsed >= 1) {
        send(elapsed, beacon);
      }
    }

    function onVisibilityChange() {
      if (visible()) {
        activeSince.current = Date.now();
      } else {
        flush(true);
      }
    }

    function onPageHide() {
      flush(true);
    }

    if (visible()) activeSince.current = Date.now();

    const interval = window.setInterval(() => {
      if (visible()) flush();
    }, 30_000);

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(interval);
      flush(true);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [lessonId]);

  return null;
}
