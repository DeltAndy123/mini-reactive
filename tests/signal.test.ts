import { test, expect, describe, mock } from "bun:test";
import { Signal, ArraySignal, ComputedSignal, $s, $a, $c, isSignal, $gs, $ga } from "@src/signal";

describe("Signal", () => {
  test("initializes with correct value", () => {
    const s = new Signal(5);
    expect(s.value).toBe(5);
  });

  test("set with value updates correctly", () => {
    const s = new Signal(5);
    s.set(10);
    expect(s.value).toBe(10);
  });

  test("set with function updates correctly", () => {
    const s = new Signal(5);
    s.set(prev => prev + 1);
    expect(s.value).toBe(6);
  });

  test("does not emit if value is the same", () => {
    const s = new Signal(5);
    const cb = mock(() => {});
    s.subscribe(cb, false);
    s.set(5);
    expect(cb).not.toHaveBeenCalled();
  });

  test("subscribe calls callback immediately by default", () => {
    const s = new Signal(5);
    const cb = mock(() => {});
    s.subscribe(cb);
    expect(cb).toHaveBeenCalledWith(5);
  });

  test("subscribe with immediate=false does not call immediately", () => {
    const s = new Signal(5);
    const cb = mock(() => {});
    s.subscribe(cb, false);
    expect(cb).not.toHaveBeenCalled();
  });

  test("subscribe callback is called on change", () => {
    const s = new Signal(5);
    const cb = mock(() => {});
    s.subscribe(cb, false);
    s.set(10);
    expect(cb).toHaveBeenCalledWith(10);
  });

  test("unsubscribe stops callback from being called", () => {
    const s = new Signal(5);
    const cb = mock(() => {});
    const unsub = s.subscribe(cb, false);
    unsub();
    s.set(10);
    expect(cb).not.toHaveBeenCalled();
  });

  test("multiple subscribers all get called", () => {
    const s = new Signal(5);
    const cb1 = mock(() => {});
    const cb2 = mock(() => {});
    s.subscribe(cb1, false);
    s.subscribe(cb2, false);
    s.set(10);
    expect(cb1).toHaveBeenCalledWith(10);
    expect(cb2).toHaveBeenCalledWith(10);
  });
});

describe("ArraySignal", () => {
  test("initializes with correct value", () => {
    const a = $a([1, 2, 3]);
    expect(a.value).toEqual([1, 2, 3]);
  });

  test("initializes empty by default", () => {
    const a = $a();
    expect(a.value).toEqual([]);
  });

  test("get returns correct element", () => {
    const a = $a(["x", "y", "z"]);
    expect(a.get(1)).toBe("y");
  });

  test("get returns undefined for out of bounds", () => {
    const a = $a([1, 2]);
    expect(a.get(99)).toBeUndefined();
  });

  test("push appends items and emits", () => {
    const a = $a([1, 2]);
    const cb = mock(() => {});
    a.subscribe(cb, false);
    a.push(3, 4);
    expect(a.value).toEqual([1, 2, 3, 4]);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("pop removes last item and emits", () => {
    const a = $a([1, 2, 3]);
    const cb = mock(() => {});
    a.subscribe(cb, false);
    a.pop();
    expect(a.value).toEqual([1, 2]);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("shift removes first item and emits", () => {
    const a = $a([1, 2, 3]);
    const cb = mock(() => {});
    a.subscribe(cb, false);
    a.shift();
    expect(a.value).toEqual([2, 3]);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("unshift prepends items and emits", () => {
    const a = $a([3, 4]);
    const cb = mock(() => {});
    a.subscribe(cb, false);
    a.unshift(1, 2);
    expect(a.value).toEqual([1, 2, 3, 4]);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("remove deletes item at index and emits", () => {
    const a = $a(["a", "b", "c"]);
    const cb = mock(() => {});
    a.subscribe(cb, false);
    a.remove(1);
    expect(a.value).toEqual(["a", "c"]);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("update replaces item at index and emits", () => {
    const a = $a([1, 2, 3]);
    const cb = mock(() => {});
    a.subscribe(cb, false);
    a.update(1, 99);
    expect(a.value).toEqual([1, 99, 3]);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("update does nothing for out of bounds index", () => {
    const a = $a([1, 2, 3]);
    const cb = mock(() => {});
    a.subscribe(cb, false);
    a.update(99, 0);
    expect(a.value).toEqual([1, 2, 3]);
    expect(cb).not.toHaveBeenCalled();
  });

  test("filter keeps matching items and emits", () => {
    const a = $a([1, 2, 3, 4, 5]);
    const cb = mock(() => {});
    a.subscribe(cb, false);
    a.filter(x => x % 2 === 0);
    expect(a.value).toEqual([2, 4]);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("map transforms items and emits", () => {
    const a = $a([1, 2, 3]);
    const cb = mock(() => {});
    a.subscribe(cb, false);
    a.map(x => x * 10);
    expect(a.value).toEqual([10, 20, 30]);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("clear empties array and emits", () => {
    const a = $a([1, 2, 3]);
    const cb = mock(() => {});
    a.subscribe(cb, false);
    a.clear();
    expect(a.value).toEqual([]);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  test("works as a dependency in a computed signal", () => {
    const a = $a([1, 2, 3]);
    const sum = $c(() => a.value.reduce((acc, x) => acc + x, 0));
    expect(sum.value).toBe(6);
    a.push(4);
    expect(sum.value).toBe(10);
    a.remove(0);
    expect(sum.value).toBe(9);
  });
});

describe("ComputedSignal", () => {
  test("initializes with correct computed value", () => {
    const s = new Signal(5);
    const c = new ComputedSignal(() => s.value * 2);
    expect(c.value).toBe(10);
  });

  test("updates when dependency changes", () => {
    const s = new Signal(5);
    const c = new ComputedSignal(() => s.value * 2);
    s.set(10);
    expect(c.value).toBe(20);
  });

  test("notifies subscribers when value changes", () => {
    const s = new Signal(5);
    const c = new ComputedSignal(() => s.value * 2);
    const cb = mock(() => {});
    c.subscribe(cb, false);
    s.set(10);
    expect(cb).toHaveBeenCalledWith(20);
  });

  test("does not emit if computed value is the same", () => {
    const s = new Signal(5);
    const c = new ComputedSignal(() => Math.abs(s.value));
    const cb = mock(() => {});
    c.subscribe(cb, false);
    s.set(-5);
    expect(cb).not.toHaveBeenCalled();
  });

  test("chained computed signals update correctly", () => {
    const num = new Signal(2);
    const doubled = new ComputedSignal(() => num.value * 2);
    const quadrupled = new ComputedSignal(() => doubled.value * 2);
    expect(quadrupled.value).toBe(8);
    num.set(3);
    expect(quadrupled.value).toBe(12);
    num.set(5);
    expect(quadrupled.value).toBe(20);
  });

  test("only tracks conditionally accessed signals", () => {
    const condition = new Signal(true);
    const a = new Signal(1);
    const b = new Signal(10);
    const result = new ComputedSignal(() => condition.value ? a.value * 2 : b.value * 3);
    const cb = mock(() => {});
    result.subscribe(cb, false);

    condition.set(false); // now tracks b, not a
    cb.mockClear();

    a.set(99); // should not trigger
    expect(cb).not.toHaveBeenCalled();

    b.set(20); // should trigger
    expect(cb).toHaveBeenCalledWith(60);
  });

  test("unsubscribes stale dependencies on recompute", () => {
    const condition = new Signal(true);
    const a = new Signal(1);
    const b = new Signal(10);
    new ComputedSignal(() => condition.value ? a.value : b.value);

    expect(a.computedSubscribers.size).toBe(1);
    expect(b.computedSubscribers.size).toBe(0);

    condition.set(false);

    expect(a.computedSubscribers.size).toBe(0);
    expect(b.computedSubscribers.size).toBe(1);
  });
});

describe("$s", () => {
  test("creates a signal with initial value", () => {
    const s = $s(42);
    expect(s.value).toBe(42);
  });

  test("each call creates a new independent signal", () => {
    const s1 = $s(1);
    const s2 = $s(1);
    s1.set(99);
    expect(s2.value).toBe(1);
  });
});

describe("$gs", () => {
  test("creates a signal with initial value", () => {
    const s = $gs("gs-init", 42);
    expect(s.value).toBe(42);
  });

  test("returns the same signal for the same key", () => {
    const s1 = $gs("gs-same-key", 1);
    const s2 = $gs("gs-same-key", 999);
    expect(s1).toBe(s2);
    expect(s1.value).toBe(1);
  });
});

describe("$ga", () => {
  test("creates an array signal with initial value", () => {
    const a = $ga("ga-init", [1, 2, 3]);
    expect(a.value).toEqual([1, 2, 3]);
  });

  test("returns the same signal for the same key", () => {
    const a1 = $ga("ga-same-key", [1, 2]);
    const a2 = $ga("ga-same-key", [99]);
    expect(a1).toBe(a2);
    expect(a1.value).toEqual([1, 2]);
  });
});

describe("$c", () => {
  test("creates a computed signal", () => {
    const s = new Signal(3);
    const c = $c(() => s.value * 3);
    expect(c.value).toBe(9);
  });
});

describe("isSignal", () => {
  test("returns true for Signal", () => {
    expect(isSignal(new Signal(1))).toBe(true);
  });

  test("returns true for ComputedSignal", () => {
    expect(isSignal(new ComputedSignal(() => 1))).toBe(true);
  });

  test("returns false for plain object", () => {
    expect(isSignal({})).toBe(false);
  });

  test("returns false for null", () => {
    expect(isSignal(null)).toBe(false);
  });

  test("returns false for primitive", () => {
    expect(isSignal(42)).toBe(false);
  });
});