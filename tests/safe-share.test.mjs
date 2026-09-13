import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SAFE_SHARE_SAMPLES,
  createSafeShare,
} from '../lib/safe-share.ts';
import { createInProcessLanguageDetector } from '../lib/language-model.node.ts';

async function preflight(text, modelId) {
  const runtime = createSafeShare(modelId, createInProcessLanguageDetector);
  try {
    return {
      outcome: await runtime.flow.run(runtime.kernel, { text }),
      snapshot: runtime.kernel.inspect(),
    };
  } finally {
    await runtime.kernel.destroy();
  }
}

void test('SafeShare executes the real eight-Leanlet flow and sanitizes blocking input', async () => {
  const { outcome, snapshot } = await preflight(SAFE_SHARE_SAMPLES[0].text);
  assert.equal(outcome.result.status, 'accepted');
  assert.equal(outcome.trace.length, 8);
  assert.equal(snapshot.telemetry.completedRuns, 8);
  assert.equal(snapshot.leanlets.length, 8);

  const decision = outcome.result.output;
  assert.equal(decision.disposition, 'block');
  assert.ok(decision.findings.some((finding) => finding.kind === 'secret'));
  assert.ok(
    decision.findings.some((finding) => finding.label === 'Email address'),
  );
  assert.ok(
    decision.findings.some(
      (finding) => finding.label === 'Possible phone number',
    ),
  );
  assert.ok(
    decision.findings.some(
      (finding) => finding.label === 'Private or local link',
    ),
  );
  assert.ok(
    decision.findings.some(
      (finding) => finding.label === 'High-pressure wording',
    ),
  );
  assert.match(decision.redactedText, /\[API_KEY\]/);
  assert.match(decision.redactedText, /\[EMAIL\]/);
  assert.match(decision.redactedText, /\[PHONE\]/);
  assert.doesNotMatch(decision.redactedText, /priya@example\.com/);
});

void test('SafeShare passes a clean release note and detects Telugu script', async () => {
  const clean = await preflight(SAFE_SHARE_SAMPLES[1].text);
  assert.equal(clean.outcome.result.status, 'accepted');
  assert.equal(clean.outcome.result.output.disposition, 'pass');
  assert.equal(clean.outcome.result.output.counts.block, 0);
  assert.equal(clean.outcome.result.output.counts.review, 0);

  const multilingual = await preflight(SAFE_SHARE_SAMPLES[2].text);
  assert.equal(multilingual.outcome.result.status, 'accepted');
  assert.equal(multilingual.outcome.result.output.language, 'Telugu');
  assert.equal(multilingual.outcome.result.output.disposition, 'review');
  assert.match(multilingual.outcome.result.output.redactedText, /\[EMAIL\]/);
});

void test('SafeShare identifies Kannada with statistical model profiles', async () => {
  const text = 'ಕನ್ನಡ ಭಾಷೆಯ ವಿಶೇಷತೆಗಳು';
  for (const modelId of ['eld-extrasmall', 'eld-small', 'eld-medium', 'eld-large']) {
    const { outcome } = await preflight(text, modelId);
    assert.equal(outcome.result.status, 'accepted');
    assert.equal(outcome.result.output.languageCode, 'kn');
    assert.equal(outcome.result.output.language, 'Kannada');
    assert.equal(outcome.result.output.languageReliable, true);
    assert.equal(outcome.result.output.languageModel, modelId);
  }
});

void test('SafeShare preserves language uncertainty as a review finding', async () => {
  const { outcome } = await preflight('hello');
  assert.equal(outcome.result.status, 'accepted');
  assert.equal(outcome.result.output.language, 'Uncertain');
  assert.equal(outcome.result.output.languageReliable, false);
  assert.equal(outcome.result.output.disposition, 'review');
  assert.ok(
    outcome.result.output.findings.some(
      (finding) => finding.id === 'language-low-confidence',
    ),
  );
});

void test('SafeShare handles custom tokens, public HTTP, and long prose', async () => {
  const jwt = 'eyJabcdefghijk.abcdefghijkl.abcdefghijkl';
  const longSentence = Array.from({ length: 90 }, () => 'word').join(' ');
  const { outcome } = await preflight(
    `${longSentence}. Token ${jwt}. Visit http://example.com/path.`,
  );
  assert.equal(outcome.result.status, 'accepted');
  const decision = outcome.result.output;
  assert.equal(decision.disposition, 'block');
  assert.equal(decision.readingLevel, 'Dense');
  assert.ok(decision.findings.some((finding) => finding.label === 'JWT'));
  assert.ok(
    decision.findings.some((finding) => finding.label === 'Unencrypted link'),
  );
  assert.match(decision.redactedText, /\[TOKEN\]/);
});
