import '@testing-library/jest-dom/vitest';

class TestResizeObserver implements ResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element): void {
    const width = target instanceof HTMLElement ? target.offsetWidth : 1;
    const height = target instanceof HTMLElement ? target.offsetHeight : 1;
    const contentRect = { ...target.getBoundingClientRect(), width, height } as DOMRectReadOnly;
    setTimeout(() => this.callback([{ target, contentRect } as ResizeObserverEntry], this), 0);
  }
  unobserve(): void {}
  disconnect(): void {}
}

class TestDOMMatrixReadOnly {
  m22: number;
  constructor(transform?: string) {
    const scale = transform?.match(/scale\(([1-9.]+)\)/)?.[1];
    this.m22 = scale === undefined ? 1 : Number(scale);
  }
}

globalThis.ResizeObserver = TestResizeObserver;
// React Flow only reads m22 from DOMMatrixReadOnly in the test environment.
globalThis.DOMMatrixReadOnly = TestDOMMatrixReadOnly as unknown as typeof DOMMatrixReadOnly;

Object.defineProperties(globalThis.HTMLElement.prototype, {
  offsetHeight: { get() { return Number.parseFloat(this.style.height) || 1; } },
  offsetWidth: { get() { return Number.parseFloat(this.style.width) || 1; } }
});

Object.defineProperty(globalThis.SVGElement.prototype, 'getBBox', {
  configurable: true,
  value: () => ({ x: 0, y: 0, width: 0, height: 0 })
});
