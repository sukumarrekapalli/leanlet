import assert from 'node:assert/strict';
import test from 'node:test';
import {
  defineLeanlet,
  getLeanletModel,
  LEANLET_MODELS,
} from '../packages/leanlet/dist/index.js';

void test('defineLeanlet loads once and disposes its context', async () => {
  let loads = 0;
  let disposed = false;
  const leanlet = defineLeanlet({
    id: 'double',
    load() {
      loads += 1;
      return { factor: 2 };
    },
    infer(input, context) {
      return input * context.factor;
    },
    dispose() {
      disposed = true;
    },
  });

  assert.equal(await leanlet.run(3), 6);
  assert.equal(await leanlet.run(4), 8);
  assert.equal(loads, 1);
  await leanlet.destroy();
  assert.equal(disposed, true);
  await assert.rejects(() => leanlet.run(5), /destroyed/);
});

void test('the registry exposes five supported profiles', () => {
  assert.deepEqual(Object.keys(LEANLET_MODELS).sort(), [
    'mobileclip-s0',
    'mobileclip-s0-compact',
    'mobileclip-s0-fp16',
    'mobilenet-v4-medium',
    'mobilenet-v4-small',
  ]);
  assert.equal(getLeanletModel('mobileclip-s0').visionDtype, 'fp32');
  assert.equal(getLeanletModel('mobileclip-s0-fp16').visionDtype, 'fp16');
  assert.equal(getLeanletModel('mobileclip-s0-compact').visionDtype, 'q8');
  assert.equal(getLeanletModel('mobilenet-v4-medium').sizeMB, 10);
  assert.equal(getLeanletModel('mobilenet-v4-small').sizeMB, 3.9);
});
