import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accepted,
  createLeanletKernel,
} from '../packages/leanlet/dist/index.js';

function definition(id, options = {}) {
  return {
    manifest: {
      id,
      version: '1.0.0',
      task: 'test',
      providers: ['javascript'],
      estimatedResidentBytes: options.residentBytes ?? 1,
      network: options.network ?? 'deny',
    },
    load: options.load,
    run: options.run ?? ((input) => accepted(input)),
    dispose: options.dispose,
  };
}

void test('kernel registers and executes a typed bounded capability', async () => {
  const events = [];
  const kernel = createLeanletKernel();
  kernel.subscribe((event) => events.push(event.type));
  kernel.register(
    definition('double', {
      load: () => ({ factor: 2 }),
      run: (input, state) => accepted(input * state.factor, { score: 1 }),
    }),
  );

  const result = await kernel.run('double', 6);
  assert.equal(result.status, 'accepted');
  assert.equal(result.output, 12);
  assert.equal(result.provenance.leanletId, 'double');
  assert.ok(result.timing.totalMs >= 0);
  assert.deepEqual(events.slice(0, 4), [
    'registered',
    'queued',
    'started',
    'loaded',
  ]);
  await kernel.destroy();
});

void test('kernel evicts an idle runtime to respect the resident budget', async () => {
  const disposed = [];
  const kernel = createLeanletKernel({
    budget: { maxResidentBytes: 10, maxConcurrentRuns: 1 },
  });
  kernel.register(
    definition('first', {
      residentBytes: 8,
      load: () => ({ id: 'first' }),
      dispose: (state) => disposed.push(state.id),
    }),
  );
  kernel.register(
    definition('second', {
      residentBytes: 8,
      load: () => ({ id: 'second' }),
    }),
  );

  await kernel.run('first', 1);
  await kernel.run('second', 2);
  assert.deepEqual(disposed, ['first']);
  assert.equal(
    kernel.inspect().leanlets.find((item) => item.id === 'first').state,
    'unloaded',
  );
  await kernel.destroy();
});

void test('kernel enforces its declared network policy', async () => {
  const kernel = createLeanletKernel({ policy: { network: 'deny' } });
  kernel.register(
    definition('networked', {
      network: 'application-managed',
    }),
  );
  const result = await kernel.run('networked', 1);
  assert.deepEqual(result.status, 'abstained');
  assert.equal(result.reason, 'policy-denied');
  await kernel.destroy();
});

void test('kernel rejects duplicate ids and resolves queued cancellation', async () => {
  let release;
  let markStarted;
  const started = new Promise((resolve) => {
    markStarted = resolve;
  });
  const kernel = createLeanletKernel({
    budget: { maxConcurrentRuns: 1 },
  });
  kernel.register(
    definition('slow', {
      run: async (input) => {
        markStarted();
        await new Promise((resolve) => {
          release = resolve;
        });
        return accepted(input);
      },
    }),
  );
  assert.throws(
    () => kernel.register(definition('slow')),
    /already registered/,
  );

  const first = kernel.run('slow', 1);
  await started;
  const controller = new AbortController();
  const second = kernel.run('slow', 2, { signal: controller.signal });
  controller.abort();
  release();
  assert.equal((await first).status, 'accepted');
  assert.deepEqual(await second, { status: 'abstained', reason: 'cancelled' });
  await kernel.destroy();
});

void test('kernel schedules queued work by priority and then deadline', async () => {
  const order = [];
  let release;
  let markStarted;
  const started = new Promise((resolve) => {
    markStarted = resolve;
  });
  const kernel = createLeanletKernel({
    budget: { maxConcurrentRuns: 1 },
  });
  kernel.register(
    definition('scheduled', {
      run: async (input) => {
        order.push(input);
        if (input === 'blocking') {
          markStarted();
          await new Promise((resolve) => {
            release = resolve;
          });
        }
        return accepted(input);
      },
    }),
  );

  const blocking = kernel.run('scheduled', 'blocking');
  await started;
  const low = kernel.run('scheduled', 'low', { priority: 0 });
  const high = kernel.run('scheduled', 'high', { priority: 10 });
  release();
  await Promise.all([blocking, low, high]);
  assert.deepEqual(order, ['blocking', 'high', 'low']);
  await kernel.destroy();
});

void test('kernel coalesces identical work without coupling caller cancellation', async () => {
  let runs = 0;
  let release;
  let markStarted;
  const started = new Promise((resolve) => {
    markStarted = resolve;
  });
  const kernel = createLeanletKernel();
  kernel.register(
    definition('embedding', {
      run: async (input) => {
        runs += 1;
        markStarted();
        await new Promise((resolve) => {
          release = resolve;
        });
        return accepted(input);
      },
    }),
  );

  const first = kernel.run('embedding', 'same-input', {
    coalesceKey: 'sha256:abc',
  });
  const controller = new AbortController();
  const second = kernel.run('embedding', 'same-input', {
    coalesceKey: 'sha256:abc',
    signal: controller.signal,
  });
  controller.abort();
  assert.deepEqual(await second, { status: 'abstained', reason: 'cancelled' });
  await started;
  release();
  assert.equal((await first).status, 'accepted');
  assert.equal(runs, 1);
  assert.equal(kernel.inspect().telemetry.coalescedRuns, 1);
  await kernel.destroy();
});

void test('destroy aborts active cooperative runs before disposing state', async () => {
  let disposed = false;
  let markStarted;
  const started = new Promise((resolve) => {
    markStarted = resolve;
  });
  const kernel = createLeanletKernel();
  kernel.register(
    definition('cooperative', {
      load: () => ({ loaded: true }),
      run: (_input, _state, context) =>
        new Promise((resolve) => {
          markStarted();
          context.signal.addEventListener(
            'abort',
            () => resolve({ status: 'abstained', reason: 'cancelled' }),
            { once: true },
          );
        }),
      dispose: () => {
        disposed = true;
      },
    }),
  );
  const run = kernel.run('cooperative', null);
  await started;
  await kernel.destroy();
  assert.equal((await run).status, 'abstained');
  assert.equal(disposed, true);
});

void test('concurrent first runs share one lifecycle load', async () => {
  let loads = 0;
  let releaseLoad;
  const kernel = createLeanletKernel({
    budget: { maxConcurrentRuns: 2 },
  });
  kernel.register(
    definition('shared-runtime', {
      load: async () => {
        loads += 1;
        await new Promise((resolve) => {
          releaseLoad = resolve;
        });
        return { ready: true };
      },
      run: (input, state) => accepted({ input, ready: state.ready }),
    }),
  );

  const first = kernel.run('shared-runtime', 1);
  const second = kernel.run('shared-runtime', 2);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(loads, 1);
  releaseLoad();
  assert.equal((await first).status, 'accepted');
  assert.equal((await second).status, 'accepted');
  await kernel.destroy();
});

void test('kernel reports budget admission and unsupported providers as results', async () => {
  const kernel = createLeanletKernel({
    budget: { maxResidentBytes: 10 },
    policy: { allowedProviders: ['javascript'] },
  });
  kernel.register(definition('too-large', { residentBytes: 11 }));
  kernel.register({
    manifest: {
      id: 'gpu-only',
      version: '1.0.0',
      task: 'test',
      providers: ['webgpu'],
      network: 'deny',
    },
    run: (input) => accepted(input),
  });

  const overBudget = await kernel.run('too-large', 1);
  assert.equal(overBudget.status, 'abstained');
  assert.equal(overBudget.reason, 'budget-exceeded');
  const unsupported = await kernel.run('gpu-only', 1);
  assert.equal(unsupported.status, 'failed');
  assert.equal(unsupported.error.code, 'UNSUPPORTED_PROVIDER');
  assert.equal(unsupported.recoverable, false);
  await kernel.destroy();
});

void test('queued work abstains when its deadline expires', async () => {
  let release;
  let markStarted;
  const started = new Promise((resolve) => {
    markStarted = resolve;
  });
  const kernel = createLeanletKernel({
    budget: { maxConcurrentRuns: 1 },
  });
  kernel.register(
    definition('deadline', {
      run: async (input) => {
        if (input === 'blocking') {
          markStarted();
          await new Promise((resolve) => {
            release = resolve;
          });
        }
        return accepted(input);
      },
    }),
  );
  const blocking = kernel.run('deadline', 'blocking');
  await started;
  const expiring = kernel.run('deadline', 'late', { deadlineMs: 1 });
  await new Promise((resolve) => setTimeout(resolve, 5));
  release();
  await blocking;
  const result = await expiring;
  assert.equal(result.status, 'abstained');
  assert.equal(result.reason, 'deadline-exceeded');
  await kernel.destroy();
});

void test('kernel rejects invalid budgets, manifests, and run options', async () => {
  assert.throws(
    () => createLeanletKernel({ budget: { maxConcurrentRuns: 1.5 } }),
    /positive integer/,
  );
  assert.throws(
    () => createLeanletKernel({ budget: { maxResidentBytes: Number.NaN } }),
    /finite, non-negative/,
  );
  assert.throws(
    () => createLeanletKernel({ budget: { defaultDeadlineMs: Infinity } }),
    /finite, positive/,
  );

  const kernel = createLeanletKernel();
  assert.throws(() => kernel.register(definition('')), /id cannot be empty/);
  assert.throws(
    () =>
      kernel.register({
        ...definition('bad-provider'),
        manifest: {
          ...definition('bad-provider').manifest,
          providers: ['unknown'],
        },
      }),
    /unknown provider/,
  );
  assert.throws(
    () =>
      kernel.register({
        ...definition('bad-asset'),
        manifest: {
          ...definition('bad-asset').manifest,
          assets: [{ path: 'model.onnx', bytes: -1 }],
        },
      }),
    /bytes must be finite and non-negative/,
  );
  kernel.register(definition('valid'));
  assert.throws(
    () => kernel.run('valid', 1, { deadlineMs: 0 }),
    /deadlineMs must be a finite, positive number/,
  );
  assert.throws(
    () => kernel.run('valid', 1, { priority: Number.NaN }),
    /priority must be a finite number/,
  );
  assert.throws(
    () => kernel.run('valid', 1, { coalesceKey: '' }),
    /coalesceKey cannot be empty/,
  );
  await kernel.destroy();
});

void test('destroy clears state even when a dispose callback fails', async () => {
  const kernel = createLeanletKernel();
  kernel.register(
    definition('broken-dispose', {
      load: () => ({ ready: true }),
      dispose: () => {
        throw new Error('release failed');
      },
    }),
  );
  await kernel.run('broken-dispose', null);
  await assert.rejects(() => kernel.destroy(), /release failed/);
  assert.equal(kernel.inspect().destroyed, true);
  assert.equal(kernel.inspect().leanlets.length, 0);
});
