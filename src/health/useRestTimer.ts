import { useEffect, useState } from "react";
const KEY = "dice-life.health.rest-timer.v1";
type TimerState = { endAt?: number; pausedSeconds?: number };
function load(): TimerState {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}
export function useRestTimer(now = () => Date.now()) {
  const [timer, setTimer] = useState<TimerState>(() => load());
  const [, tick] = useState(0);
  const seconds =
    timer.pausedSeconds ??
    (timer.endAt ? Math.max(0, Math.ceil((timer.endAt - now()) / 1000)) : 0);
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(timer));
  }, [timer]);
  useEffect(() => {
    if (!timer.endAt) return;
    const id = window.setInterval(() => tick((v) => v + 1), 250);
    return () => window.clearInterval(id);
  }, [timer.endAt]);
  useEffect(() => {
    if (timer.endAt && seconds === 0) setTimer({});
  }, [seconds, timer.endAt]);
  return {
    seconds,
    running: Boolean(timer.endAt),
    paused: timer.pausedSeconds !== undefined,
    start: (value: number) => setTimer({ endAt: now() + value * 1000 }),
    pause: () =>
      setTimer((current) => ({
        pausedSeconds: current.endAt
          ? Math.max(0, Math.ceil((current.endAt - now()) / 1000))
          : seconds,
      })),
    resume: () => setTimer({ endAt: now() + seconds * 1000 }),
    extend: (value = 30) =>
      setTimer((current) =>
        current.pausedSeconds !== undefined
          ? { pausedSeconds: current.pausedSeconds + value }
          : { endAt: (current.endAt ?? now()) + value * 1000 },
      ),
    skip: () => setTimer({}),
  };
}
