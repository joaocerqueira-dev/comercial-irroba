// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useTimeout } from "@/lib/client/useTimeout";

afterEach(() => {
  vi.useRealTimers();
});

describe("useTimeout", () => {
  it("executa após o tempo e um novo schedule cancela o anterior", () => {
    vi.useFakeTimers();
    const first = vi.fn();
    const second = vi.fn();
    const { result } = renderHook(() => useTimeout());
    act(() => result.current.schedule(first, 1000));
    act(() => result.current.schedule(second, 1000));
    act(() => vi.advanceTimersByTime(1000));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("limpa o timeout pendente no unmount", () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const { result, unmount } = renderHook(() => useTimeout());
    act(() => result.current.schedule(fn, 2000));
    unmount();
    vi.advanceTimersByTime(5000);
    expect(fn).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
