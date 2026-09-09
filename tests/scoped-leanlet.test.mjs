import assert from 'node:assert/strict';
import test from 'node:test';
import { defineLeanlet, getLeanletModel } from '../packages/leanlet/dist/index.js';

test('defineLeanlet loads once and disposes its context', async () => {
  let loads = 0;
  let disposed = false;
  const leanlet = defineLeanlet({
    id: 'double',
    load() { loads += 1; return { factor: 2 }; },
    infer(input, context) { return input * context.factor; },
    dispose() { disposed = true; },
  });

  assert.equal(await leanlet.run(3), 6);
  assert.equal(await leanlet.run(4), 8);
  assert.equal(loads, 1);
  await leanlet.destroy();
  assert.equal(disposed, true);
  await assert.rejects(() => leanlet.run(5), /destroyed/);
});

test('the registry exposes accuracy, compact, and ultra-light profiles', () => {
  assert.equal(getLeanletModel('mobileclip-s0').visionDtype, 'fp32');
  assert.equal(getLeanletModel('mobileclip-s0-compact').visionDtype, 'q8');
  assert.equal(getLeanletModel('mobilenet-v4-small').sizeMB, 3.9);
});
