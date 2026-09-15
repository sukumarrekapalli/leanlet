import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accepted,
  createLeanletKernel,
  defineCheck,
  runCheck,
} from '../packages/leanlet/dist/kernel.js';

void test('custom checks delegate computation to registered leanlets', async () => {
  const kernel = createLeanletKernel();
  kernel.register({
    manifest: {
      id: 'copy.length-signal',
      version: '1.0.0',
      task: 'length-signal',
      providers: ['javascript'],
      network: 'deny',
    },
    run: (text) => accepted({ words: text.trim().split(/\s+/u).length }),
  });
  const check = defineCheck({
    id: 'copy.minimum-length',
    version: '1.0.0',
    leanletId: 'copy.length-signal',
    prepare: (draft) => draft.body,
    decide: (output, draft) => ({
      verdict: output.words >= draft.minimum ? 'pass' : 'review',
      message: `${output.words} words`,
      evidence: output,
    }),
  });
  const result = await runCheck(kernel, check, {
    body: 'A deliberately small draft',
    minimum: 3,
  });
  assert.equal(result.status, 'completed');
  assert.equal(result.verdict, 'pass');
  assert.equal(result.provenance.leanletId, 'copy.length-signal');
  await kernel.destroy();
});

void test('custom checks validate identity and preserve abstention', async () => {
  assert.throws(
    () => defineCheck({ id: '', version: '1', leanletId: 'x', prepare: String, decide: () => ({ verdict: 'pass', message: 'ok' }) }),
    /id must not be empty/,
  );
  const kernel = createLeanletKernel();
  kernel.register({
    manifest: { id: 'policy.check', version: '1', task: 'policy', providers: ['javascript'] },
    run: () => ({ status: 'abstained', reason: 'unsupported-input' }),
  });
  const check = defineCheck({
    id: 'policy.application-check',
    version: '1',
    leanletId: 'policy.check',
    prepare: (value) => value,
    decide: () => ({ verdict: 'pass', message: 'unreachable' }),
  });
  const result = await runCheck(kernel, check, 'subject');
  assert.equal(result.status, 'abstained');
  assert.equal(result.reason, 'unsupported-input');
  await kernel.destroy();
});
