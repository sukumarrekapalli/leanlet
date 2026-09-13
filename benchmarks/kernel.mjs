import { performance } from 'node:perf_hooks';
import {
  accepted,
  createLeanletKernel,
} from '../packages/leanlet/dist/index.js';

const requests = 24;

async function scenario(coalesce) {
  let executions = 0;
  const kernel = createLeanletKernel({
    budget: { maxConcurrentRuns: 2 },
  });
  kernel.register({
    manifest: {
      id: 'benchmark.embedding',
      version: '1.0.0',
      task: 'synthetic-cpu-work',
      providers: ['javascript'],
      network: 'deny',
    },
    async run(input) {
      executions += 1;
      await new Promise((resolve) => setTimeout(resolve, 2));
      let checksum = 0;
      for (let index = 0; index < 100_000; index += 1)
        checksum = (checksum + index * input.length) % 1_000_003;
      return accepted(checksum);
    },
  });
  const started = performance.now();
  await Promise.all(
    Array.from({ length: requests }, () =>
      kernel.run(
        'benchmark.embedding',
        'identical input',
        coalesce ? { coalesceKey: 'sha256:example' } : undefined,
      ),
    ),
  );
  const elapsedMs = performance.now() - started;
  const telemetry = kernel.inspect().telemetry;
  await kernel.destroy();
  return { elapsedMs, executions, telemetry };
}

const baseline = await scenario(false);
const coalesced = await scenario(true);

console.table({
  baseline: {
    requests,
    executions: baseline.executions,
    elapsedMs: baseline.elapsedMs.toFixed(2),
    avoided: baseline.telemetry.coalescedRuns,
  },
  coalesced: {
    requests,
    executions: coalesced.executions,
    elapsedMs: coalesced.elapsedMs.toFixed(2),
    avoided: coalesced.telemetry.coalescedRuns,
  },
});
