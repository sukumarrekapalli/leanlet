import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accepted,
  createLeanletKernel,
  defineFlow,
  evaluateClassification,
  planLeanletAssets,
} from '../packages/leanlet/dist/index.js';

void test('flow records a trace and rejects undeclared capability use', async () => {
  const kernel = createLeanletKernel();
  kernel.register({
    manifest: {
      id: 'upper',
      version: '1.0.0',
      task: 'text',
      providers: ['javascript'],
    },
    run: (input) => accepted(input.toUpperCase()),
  });
  const flow = defineFlow({
    id: 'normalize',
    version: '1.0.0',
    uses: ['upper'],
    async run(input, context) {
      return context.run('upper', input);
    },
  });
  const result = await flow.run(kernel, 'leanlet');
  assert.equal(result.result.output, 'LEANLET');
  assert.deepEqual(
    result.trace.map((step) => step.leanletId),
    ['upper'],
  );

  const invalid = defineFlow({
    id: 'invalid',
    version: '1.0.0',
    uses: [],
    run: (input, context) => context.run('upper', input),
  });
  await assert.rejects(() => invalid.run(kernel, 'x'), /undeclared Leanlet/);
  await kernel.destroy();
});

void test('flow propagates outer deadlines to dependency runs', async () => {
  const kernel = createLeanletKernel({
    budget: { defaultDeadlineMs: 1_000 },
  });
  kernel.register({
    manifest: {
      id: 'slow',
      version: '1.0.0',
      task: 'test',
      providers: ['javascript'],
    },
    async run(_input, _state, context) {
      await new Promise((resolve) => setTimeout(resolve, 15));
      return context.signal.aborted
        ? { status: 'abstained', reason: 'deadline-exceeded' }
        : accepted('late');
    },
  });
  const flow = defineFlow({
    id: 'deadline',
    version: '1.0.0',
    uses: ['slow'],
    run: (input, context) => context.run('slow', input),
  });
  const outcome = await flow.run(kernel, 'input', { deadlineMs: 2 });
  assert.equal(outcome.result.status, 'abstained');
  assert.equal(outcome.result.reason, 'deadline-exceeded');
  await kernel.destroy();
});

void test('asset planner deduplicates shared assets and enforces hashes', () => {
  const manifest = (id, assets) => ({
    id,
    version: '1.0.0',
    task: 'test',
    providers: ['wasm-single'],
    assets,
  });
  const shared = {
    path: 'wasm/runtime.wasm',
    bytes: 100,
    sha256: 'abc',
  };
  const plan = planLeanletAssets(
    [manifest('one', [shared]), manifest('two', [shared])],
    { maxBytes: 100, requireHashes: true },
  );
  assert.equal(plan.totalBytes, 100);
  assert.equal(plan.duplicateReferences, 1);
  assert.equal(plan.withinBudget, true);
  assert.throws(
    () =>
      planLeanletAssets([manifest('bad', [{ path: 'model.onnx', bytes: 1 }])], {
        requireHashes: true,
      }),
    /unverified files/,
  );
});

void test('classification evaluation reports coverage and per-label quality', async () => {
  const cases = [
    { id: '1', input: 'phone', expected: 'electronics' },
    { id: '2', input: 'shirt', expected: 'clothing' },
    { id: '3', input: 'unknown', expected: 'clothing' },
  ];
  const metrics = await evaluateClassification(
    cases,
    async (input) => {
      if (input === 'unknown')
        return { status: 'abstained', reason: 'low-score' };
      return accepted({
        label: input === 'phone' ? 'electronics' : 'clothing',
      });
    },
    (output) => output.label,
  );
  assert.equal(metrics.total, 3);
  assert.equal(metrics.accepted, 2);
  assert.equal(metrics.abstained, 1);
  assert.equal(metrics.acceptedAccuracy, 1);
  assert.equal(metrics.accuracy, 2 / 3);
  assert.equal(metrics.labels.clothing.recall, 0.5);
});
