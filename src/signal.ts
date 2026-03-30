export interface ReadableSignal<out T> {
  readonly value: T;
  subscribe(callback: (value: T) => void, immediate?: boolean): () => void;
  emit(): void;
}

let trackedCompute: ComputedSignal<unknown> | null = null;

const signals = new Map<string, ReadableSignal<unknown>>()

abstract class BaseSignal<T> implements ReadableSignal<T> {
  protected _value!: T;
  get value(): T {
    ComputedSignal.registerDependency(this as BaseSignal<unknown>);
    return this._value;
  }

  subscribers = new Set<(value: T) => void>();
  computedSubscribers = new Map<ComputedSignal<unknown>, () => void>();

  public subscribe(callback: (value: T) => void, immediate = true): () => void {
    this.subscribers.add(callback);
    if (immediate) callback(this._value);
    return () => this.subscribers.delete(callback);
  }

  public emit(): void {
    this.subscribers.forEach((callback) => callback(this.value));
    const computedSubs = [...this.computedSubscribers.values()];
    computedSubs.forEach((recompute) => recompute());
  }
}

export class Signal<T> extends BaseSignal<T> {
  public constructor(initialValue: T) {
    super();
    this._value = initialValue;
  }

  public set(value: T | ((prev: T) => T)) {
    const newValue = typeof value === "function" ? (value as (prev: T) => T)(this._value) : value;
    if (newValue !== this._value) {
      this._value = newValue;
      this.emit();
    }
  }
}

export function $s<T>(initialValue: T): Signal<T> {
  return new Signal(initialValue);
}

// Global signal registry for $s
export function $gs<T>(key: string, initialValue?: T): Signal<T> {
  if (!signals.has(key)) {
    signals.set(key, new Signal<unknown>(initialValue));
  }

  return signals.get(key)! as Signal<T>;
}


export class ArraySignal<T> extends Signal<T[]> {
  constructor(initialValue: T[] = []) {
    super(initialValue);
  }

  get(index: number): T | undefined {
    return this._value[index];
  }

  push(...items: T[]) {
    this._value.push(...items);
    this.emit();
  }

  pop() {
    this._value.pop();
    this.emit();
  }

  shift() {
    this._value.shift();
    this.emit();
  }

  remove(index: number) {
    this._value.splice(index, 1);
    this.emit();
  }
  
  update(index: number, item: T) {
    if (index >= 0 && index < this._value.length) {
      this._value[index] = item;
      this.emit();
    }
  }

  unshift(...items: T[]) {
    this._value.unshift(...items);
    this.emit();
  }

  filter(predicate: (item: T, index: number) => boolean) {
    this.set(prev => prev.filter(predicate));
  }

  map(transform: (item: T, index: number) => T) {
    this.set(prev => prev.map(transform));
  }

  clear() {
    this._value.length = 0;
    this.emit();
  }
}

export function $a<T>(initialValue: T[] = []): ArraySignal<T> {
  return new ArraySignal(initialValue);
}

// Global array signal registry for $a
export function $ga<T>(key: string, initialValue?: T[]): ArraySignal<T> {
  if (!signals.has(key)) {
    signals.set(key, new ArraySignal<unknown>(initialValue));
  }

  return signals.get(key)! as ArraySignal<T>;
}

export class ComputedSignal<T> extends BaseSignal<T> {
  private trackedSignals = new Set<BaseSignal<unknown>>();

  private recompute = () => {
    for (const signal of this.trackedSignals) {
      signal.computedSubscribers.delete(this as ComputedSignal<unknown>);
    }
    this.trackedSignals.clear();

    const prevTrackedCompute = trackedCompute;
    trackedCompute = this as ComputedSignal<unknown>;
    const newValue = this.compute();
    trackedCompute = prevTrackedCompute;
    
    if (newValue !== this._value) {
      this._value = newValue;
      this.emit();
    }
  };

  public constructor(public compute: () => T) {
    super();
    this.recompute();
  }

  private track(signal: BaseSignal<unknown>) {
    signal.computedSubscribers.set(this as ComputedSignal<unknown>, this.recompute);
    this.trackedSignals.add(signal);
  }

  public static registerDependency(signal: BaseSignal<unknown>) {
    if (trackedCompute) {
      trackedCompute.track(signal);
    }
  }
}

export function $c<T>(compute: () => T): ReadableSignal<T> {
  return new ComputedSignal(compute);
}


export function isSignal(value: unknown): value is ReadableSignal<unknown> {
  return value instanceof Signal || value instanceof ComputedSignal;
}