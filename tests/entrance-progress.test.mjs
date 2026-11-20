import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceProgress } from '../src/entranceProgress.ts';

test('an early RAF timestamp cannot create a negative percentage', () => {
  assert.equal(advanceProgress(0, 100, -8), 0);
});
test('progress is monotonic and never exceeds completed readiness tasks', () => {
  let value = 0;
  for (const target of [0, 20, 60, 100]) {
    for (let frame = 0; frame < 80; frame++) {
      const next = advanceProgress(value, target, 16);
      assert.ok(next >= value && next <= target);
      value = next;
    }
  }
  assert.equal(value, 100);
});
test('unfinished assets do not release the intro at 100 percent', () => {
  let value = 0;
  for (let frame = 0; frame < 1000; frame++) value = advanceProgress(value, 80, 16);
  assert.ok(value <= 80);
});
test('background-tab time jumps do not overshoot and reduced motion settles faster', () => {
  const normal = advanceProgress(0, 100, 10000);
  assert.ok(normal > 0 && normal < 100);
  assert.ok(advanceProgress(0, 100, 16, true) > advanceProgress(0, 100, 16));
});
