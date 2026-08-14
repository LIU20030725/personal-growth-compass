import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useRestTimer } from "./useRestTimer";
describe("rest timer", () => {
  beforeEach(() => localStorage.clear());
  it("starts, pauses, extends, resumes and skips from absolute time", () => {
    let now = 1_000;
    const { result } = renderHook(() => useRestTimer(() => now));
    act(() => result.current.start(90));
    expect(result.current.seconds).toBe(90);
    now += 10_000;
    act(() => result.current.pause());
    expect(result.current.seconds).toBe(80);
    act(() => result.current.extend(30));
    expect(result.current.seconds).toBe(110);
    act(() => result.current.resume());
    act(() => result.current.skip());
    expect(result.current.seconds).toBe(0);
    expect(
      JSON.parse(localStorage.getItem("dice-life.health.rest-timer.v1")!),
    ).toEqual({});
  });
});
