import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accepted,
  createLeanletKernel,
  defineCapabilityRoute,
} from '../packages/leanlet/dist/kernel.js';

const capabilities = (webgpu = false, features = []) => ({
  schemaVersion: 1,
  webAssembly: true,
  workers: true,
  sharedArrayBuffer: false,
  crossOriginIsolated: false,
  webgpu: webgpu
    ? { available: true, features }
    : { available: false, features: [], reason: 'api-unavailable' },
});

const definition = (id, run) => ({
  manifest: {
    id,
    version: '1.0.0',
    task: 'route-test',
    providers: ['javascript'],
    network: 'deny',
  },
  run,
});

void test('route skips incompatible candidates and records the selected fallback', async () => {
  const kernel = createLeanletKernel();
  kernel.register(definition('gpu', () => accepted('gpu')));
  kernel.register(definition('cpu', () => accepted('cpu')));
  const route = defineCapabilityRoute({
    id: 'generate',
    candidates: [
      { leanletId: 'gpu', requires: { webgpuFeatures: ['shader-f16'] } },
      { leanletId: 'cpu', requires: { webAssembly: true } },
    ],
  });

  const outcome = await route.run(kernel, 'input', {
    capabilities: capabilities(false),
  });

  assert.equal(outcome.result.status, 'accepted');
  assert.equal(outcome.result.output, 'cpu');
  assert.equal(outcome.selectedLeanletId, 'cpu');
  assert.equal(outcome.fallbackUsed, true);
  assert.deepEqual(outcome.attempts[0], {
    leanletId: 'gpu',
    status: 'incompatible',
    missing: ['webgpu'],
  });
  await kernel.destroy();
});

void test('route fallback occurs only for explicitly listed statuses', async () => {
  const kernel = createLeanletKernel();
  kernel.register(
    definition('primary', () => ({
      status: 'failed',
      recoverable: true,
      error: new Error('runtime unavailable'),
    })),
  );
  kernel.register(definition('fallback', () => accepted('fallback')));
  const stopped = defineCapabilityRoute({
    id: 'stopped',
    candidates: [{ leanletId: 'primary' }, { leanletId: 'fallback' }],
  });
  const continued = defineCapabilityRoute({
    id: 'continued',
    candidates: [
      { leanletId: 'primary', continueOn: ['failed'] },
      { leanletId: 'fallback' },
    ],
  });

  const first = await stopped.run(kernel, null, {
    capabilities: capabilities(),
  });
  const second = await continued.run(kernel, null, {
    capabilities: capabilities(),
  });

  assert.equal(first.result.status, 'failed');
  assert.equal(first.attempts.length, 1);
  assert.equal(second.result.status, 'accepted');
  assert.equal(second.selectedLeanletId, 'fallback');
  assert.deepEqual(
    second.attempts.map((attempt) => attempt.status),
    ['failed', 'accepted'],
  );
  await kernel.destroy();
});

void test('route preserves cancellation before attempting a fallback', async () => {
  const kernel = createLeanletKernel();
  kernel.register(definition('one', () => accepted('one')));
  const route = defineCapabilityRoute({
    id: 'cancelled',
    candidates: [{ leanletId: 'one' }],
  });
  const controller = new AbortController();
  controller.abort();

  const outcome = await route.run(kernel, null, {
    capabilities: capabilities(),
    signal: controller.signal,
  });

  assert.deepEqual(outcome.result, {
    status: 'abstained',
    reason: 'cancelled',
  });
  assert.equal(outcome.attempts.length, 0);
  await kernel.destroy();
});

void test('route returns an inspectable abstention when no candidate is compatible', async () => {
  const kernel = createLeanletKernel();
  kernel.register(definition('gpu', () => accepted('gpu')));
  const route = defineCapabilityRoute({
    id: 'no-match',
    candidates: [{ leanletId: 'gpu', requires: { webgpu: true } }],
  });

  const outcome = await route.run(kernel, null, {
    capabilities: capabilities(false),
  });

  assert.equal(outcome.result.status, 'abstained');
  assert.equal(outcome.result.reason, 'unsupported-input');
  assert.equal(outcome.attempts[0].status, 'incompatible');
  await kernel.destroy();
});
