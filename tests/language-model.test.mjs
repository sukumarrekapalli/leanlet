import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LANGUAGE_MODEL_PROFILES,
} from '../lib/language-model.ts';
import { createInProcessLanguageDetector } from '../lib/language-model.node.ts';

const cases = [
  ['kn', 'ಕನ್ನಡ ಭಾಷೆಯ ವಿಶೇಷತೆಗಳು'],
  ['te', 'ఉత్పత్తి వివరాలను విడుదలకు ముందు తనిఖీ చేయండి.'],
  ['en', 'Please review the release notes before sharing them with the team.'],
];

void test('every selectable language profile identifies Kannada, Telugu, and English', async () => {
  for (const profile of LANGUAGE_MODEL_PROFILES) {
    const detector = createInProcessLanguageDetector(profile.id);
    try {
      await detector.warmup();
      for (const [expected, input] of cases) {
        const result = await detector.detect(input);
        assert.equal(result.code, expected, `${profile.id} should identify ${expected}`);
        assert.equal(result.reliable, true, `${profile.id}/${expected} should be reliable`);
        assert.equal(result.modelId, profile.id);
        assert.ok(result.score > 0);
      }
    } finally {
      detector.destroy();
    }
  }
});

void test('ambiguous short input is not promoted to a language claim', async () => {
  const detector = createInProcessLanguageDetector('eld-extrasmall');
  try {
    const result = await detector.detect('hello');
    assert.equal(result.language, 'Uncertain');
    assert.equal(result.reliable, false);
    assert.ok(result.candidate);
    assert.match(result.warning, /Low-confidence result/);
  } finally {
    detector.destroy();
  }
});
