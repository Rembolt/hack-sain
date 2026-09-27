"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { loadMonthBrowserData } from "@/data/browser-data-provider";
import type { BrowserComplaint } from "@/domain/types";
import {
  initialPlaybackState,
  playbackReducer,
  tickIntervalMs,
} from "@/state/playback-reducer";

export function usePlayback(totalSteps: number) {
  const [state, dispatch] = useReducer(
    playbackReducer,
    totalSteps,
    (steps: number) => initialPlaybackState(steps),
  );

  useEffect(() => {
    dispatch({ type: "set-total", totalSteps });
  }, [totalSteps]);

  useEffect(() => {
    if (state.status !== "running") return;
    const timer = window.setInterval(
      () => dispatch({ type: "tick" }),
      tickIntervalMs(state.speed),
    );
    return () => window.clearInterval(timer);
  }, [state.status, state.speed]);

  return [state, dispatch] as const;
}

type MonthSample =
  | { month: string; status: "ready"; complaints: BrowserComplaint[] }
  | { month: string; status: "error"; complaints: BrowserComplaint[] };

/** Loads the replayed month's complaint events and prefetches the next month. */
export function usePlaybackMonth(month: string | null, nextMonth: string | null) {
  const cache = useRef(new Map<string, Promise<BrowserComplaint[]>>());
  const [sample, setSample] = useState<MonthSample | null>(null);

  const load = useCallback((value: string) => {
    let pending = cache.current.get(value);
    if (!pending) {
      pending = loadMonthBrowserData(value).then((payload) => payload.complaints);
      pending.catch(() => cache.current.delete(value));
      cache.current.set(value, pending);
    }
    return pending;
  }, []);

  useEffect(() => {
    if (!month) return;
    let active = true;
    load(month)
      .then((complaints) => {
        if (active) setSample({ month, status: "ready", complaints });
      })
      .catch(() => {
        if (active) setSample({ month, status: "error", complaints: [] });
      });
    if (nextMonth) load(nextMonth).catch(() => undefined);
    return () => {
      active = false;
    };
  }, [load, month, nextMonth]);

  return sample?.month === month ? sample : null;
}
