export function advanceProgress(current: number, target: number, elapsed: number, reduced = false): number {
  const delta = Math.max(0, Math.min(elapsed, 64));
  const next = current + (target - current) * (1 - Math.exp(-delta / (reduced ? 24 : 130)));
  const bounded = Math.max(current, Math.min(100, next));
  return target === 100 && bounded > 99.6 ? 100 : bounded;
}
