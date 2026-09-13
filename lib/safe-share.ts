import {
  accepted,
  createLeanletKernel,
  defineFlow,
  type KernelLeanletDefinition,
  type LeanletResult,
} from 'leanlet-ai';
import {
  DEFAULT_LANGUAGE_MODEL,
  createLanguageDetector,
  languageModelProfile,
  type LanguageDetection,
  type LanguageDetector,
  type LanguageModelId,
} from './language-model.ts';

export type FindingKind = 'secret' | 'personal-data' | 'link' | 'language' | 'tone';
export type FindingSeverity = 'info' | 'review' | 'block';

export type SafeShareFinding = {
  id: string;
  kind: FindingKind;
  severity: FindingSeverity;
  label: string;
  detail: string;
  start?: number;
  end?: number;
  replacement?: string;
};

export type SafeShareInput = {
  text: string;
};

export type SafeShareDecision = {
  disposition: 'pass' | 'review' | 'block';
  headline: string;
  explanation: string;
  language: string;
  languageCode?: string;
  languageScore: number;
  languageReliable: boolean;
  languageCandidate?: string;
  languageWarning?: string;
  languageModel: LanguageModelId;
  readingMinutes: number;
  readingLevel: string;
  redactedText: string;
  findings: SafeShareFinding[];
  counts: { block: number; review: number; info: number };
};

type LanguageSignal = LanguageDetection;

type ReadabilitySignal = {
  words: number;
  sentences: number;
  readingMinutes: number;
  readingLevel: string;
  averageWordsPerSentence: number;
};

type DetectorOutput = { findings: SafeShareFinding[] };
type RedactionInput = { text: string; findings: SafeShareFinding[] };
type PolicyInput = {
  text: string;
  language: LanguageSignal;
  readability: ReadabilitySignal;
  findings: SafeShareFinding[];
  redactedText: string;
};

export const SAFE_SHARE_SAMPLES = [
  {
    id: 'support-handoff',
    label: 'Support handoff',
    text: `Urgent: please send the customer export to priya@example.com today.

The temporary token is sk-demo-4L7mQ9vX2pR8nT6k and the dashboard is http://internal.local/admin.

Customer phone: +91 98765 43210. Do not delay this again.`,
  },
  {
    id: 'release-note',
    label: 'Release note',
    text: `Version 2.4 is ready for review. It improves keyboard navigation, reduces startup work, and adds an export option.

Known limitation: the first analysis downloads static model assets. Please report regressions through the public issue tracker.`,
  },
  {
    id: 'multilingual-note',
    label: 'Multilingual note',
    text: `ఉత్పత్తి వివరాలను విడుదలకు ముందు తనిఖీ చేయండి.

Questions can be sent to team@example.org.`,
  },
  {
    id: 'kannada-note',
    label: 'Kannada note',
    text: `ಕನ್ನಡ ಭಾಷೆಯು ಕರ್ನಾಟಕದಲ್ಲಿ ಮಾತನಾಡುವ ಪ್ರಮುಖ ದ್ರಾವಿಡ ಭಾಷೆಯಾಗಿದೆ. ಇದು ಸಮೃದ್ಧ ಸಾಹಿತ್ಯ ಮತ್ತು ಸಾಂಸ್ಕೃತಿಕ ಇತಿಹಾಸವನ್ನು ಹೊಂದಿದೆ.`,
  },
] as const;

function hashText(value: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

function collectMatches(
  text: string,
  expression: RegExp,
  create: (match: RegExpExecArray, index: number) => Omit<SafeShareFinding, 'id'>,
) {
  const findings: SafeShareFinding[] = [];
  let match: RegExpExecArray | null;
  expression.lastIndex = 0;
  while ((match = expression.exec(text))) {
    findings.push({ id: `${findings.length}-${match.index}`, ...create(match, findings.length) });
    if (match[0].length === 0) expression.lastIndex += 1;
  }
  return findings;
}

function detectPersonalData(text: string): DetectorOutput {
  const email = collectMatches(
    text,
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    (match) => ({
      kind: 'personal-data',
      severity: 'review',
      label: 'Email address',
      detail: 'A directly contactable identifier is present.',
      start: match.index,
      end: match.index + match[0].length,
      replacement: '[EMAIL]',
    }),
  );
  const phone = collectMatches(
    text,
    /(?:\+?\d[\d ().-]{8,}\d)/g,
    (match) => ({
      kind: 'personal-data',
      severity: 'review',
      label: 'Possible phone number',
      detail: 'A phone-shaped numeric sequence is present.',
      start: match.index,
      end: match.index + match[0].length,
      replacement: '[PHONE]',
    }),
  );
  return { findings: [...email, ...phone] };
}

function detectSecrets(text: string): DetectorOutput {
  const patterns: Array<[RegExp, string, string]> = [
    [/\bsk-[A-Za-z0-9_-]{16,}\b/g, 'API credential', '[API_KEY]'],
    [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, 'GitHub credential', '[GITHUB_TOKEN]'],
    [/\bAKIA[A-Z0-9]{16}\b/g, 'AWS access key ID', '[AWS_KEY]'],
    [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, 'JWT', '[TOKEN]'],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, 'Private key', '[PRIVATE_KEY]'],
  ];
  return {
    findings: patterns.flatMap(([expression, label, replacement]) =>
      collectMatches(text, expression, (match) => ({
        kind: 'secret',
        severity: 'block',
        label,
        detail: 'A credential-shaped value should not leave this context.',
        start: match.index,
        end: match.index + match[0].length,
        replacement,
      })),
    ),
  };
}

function detectLinks(text: string): DetectorOutput {
  return {
    findings: collectMatches(text, /https?:\/\/[^\s<>()]+/gi, (match) => {
      const clean = match[0].replace(/[.,;!?]+$/, '');
      let severity: FindingSeverity = 'info';
      let label = 'External link';
      let detail = 'A link is included in the text.';
      try {
        const url = new URL(clean);
        const internal =
          url.hostname === 'localhost' ||
          url.hostname.endsWith('.local') ||
          /^(?:10\.|127\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname);
        if (internal) {
          severity = 'review';
          label = 'Private or local link';
          detail = 'The destination may not be reachable or appropriate for the recipient.';
        } else if (url.protocol === 'http:') {
          severity = 'review';
          label = 'Unencrypted link';
          detail = 'This URL uses HTTP rather than HTTPS.';
        }
      } catch {
        severity = 'review';
        label = 'Malformed link';
        detail = 'The URL could not be parsed reliably.';
      }
      return {
        kind: 'link',
        severity,
        label,
        detail,
        start: match.index,
        end: match.index + clean.length,
      };
    }),
  };
}

function detectUrgency(text: string): DetectorOutput {
  const terms = [
    'urgent',
    'immediately',
    'do not delay',
    'asap',
    'right now',
    'final warning',
  ];
  const lower = text.toLocaleLowerCase();
  const matched = terms.filter((term) => lower.includes(term));
  const excessiveMarks = (text.match(/!/g)?.length ?? 0) >= 3;
  if (!matched.length && !excessiveMarks) return { findings: [] };
  return {
    findings: [
      {
        id: 'tone-urgency',
        kind: 'tone',
        severity: 'review',
        label: 'High-pressure wording',
        detail: matched.length
          ? `Matched: ${matched.slice(0, 3).join(', ')}.`
          : 'Repeated exclamation marks can read as high pressure.',
      },
    ],
  };
}

function readabilityOf(text: string): ReadabilitySignal {
  const words = text.trim().match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) ?? [];
  const sentences = Math.max(1, (text.match(/[.!?]+(?:\s|$)/g) ?? []).length);
  const averageWordsPerSentence = words.length / sentences;
  const readingLevel =
    averageWordsPerSentence > 24
      ? 'Dense'
      : averageWordsPerSentence > 16
        ? 'Moderate'
        : 'Direct';
  return {
    words: words.length,
    sentences,
    readingMinutes: Math.max(0.1, words.length / 225),
    readingLevel,
    averageWordsPerSentence,
  };
}

function redact({ text, findings }: RedactionInput) {
  const ranges = findings
    .filter(
      (finding): finding is SafeShareFinding & { start: number; end: number; replacement: string } =>
        finding.start !== undefined && finding.end !== undefined && Boolean(finding.replacement),
    )
    .sort((left, right) => right.start - left.start);
  let output = text;
  let boundary = text.length + 1;
  for (const finding of ranges) {
    if (finding.end > boundary) continue;
    output = `${output.slice(0, finding.start)}${finding.replacement}${output.slice(finding.end)}`;
    boundary = finding.start;
  }
  return output;
}

function definition<Input, Output>(
  id: string,
  task: string,
  bytes: number,
  run: (input: Input) => Output,
): KernelLeanletDefinition<Input, Output> {
  return {
    manifest: {
      id,
      version: '1.0.0',
      task,
      providers: ['javascript'],
      estimatedResidentBytes: bytes,
      network: 'deny',
    },
    run: (input) => accepted(run(input)),
  };
}

const personalData = definition('safeshare.personal-data', 'pii-patterns', 4_096, detectPersonalData);
const secrets = definition('safeshare.secrets', 'credential-patterns', 4_096, detectSecrets);
const links = definition('safeshare.links', 'url-risk', 3_072, detectLinks);
const urgency = definition('safeshare.urgency', 'tone-signal', 2_048, detectUrgency);
const readability = definition('safeshare.readability', 'readability-signal', 2_048, readabilityOf);
const redactor = definition('safeshare.redactor', 'deterministic-redaction', 2_048, redact);

function languageDefinition(
  modelId: LanguageModelId,
  detectorFactory: (id: LanguageModelId) => LanguageDetector,
): KernelLeanletDefinition<string, LanguageSignal, LanguageDetector> {
  const profile = languageModelProfile(modelId);
  return {
    manifest: {
      id: 'safeshare.language',
      version: '2.0.0',
      task: 'language-identification',
      providers: ['javascript'],
      assets: [
        {
          path: `eld/${modelId.replace('eld-', '')}`,
          bytes: profile.estimatedTransferBytes,
          license: 'Apache-2.0',
        },
      ],
      estimatedResidentBytes: profile.estimatedResidentBytes,
      network: 'static-assets',
    },
    load: async () => {
      const detector = detectorFactory(modelId);
      await detector.warmup();
      return detector;
    },
    run: async (input, detector, context) =>
      accepted(await detector.detect(input, context.signal)),
    dispose: (detector) => detector.destroy(),
  };
}

const policy = definition<PolicyInput, SafeShareDecision>(
  'safeshare.policy',
  'release-policy',
  2_048,
  ({ language: detected, readability: reading, findings, redactedText }) => {
    const policyFindings = detected.reliable
      ? findings
      : [
          ...findings,
          {
            id: 'language-low-confidence',
            kind: 'language' as const,
            severity: 'review' as const,
            label: 'Language needs confirmation',
            detail:
              detected.warning ??
              'The selected language model could not make a dependable identification.',
          },
        ];
    const counts = {
      block: policyFindings.filter((finding) => finding.severity === 'block').length,
      review: policyFindings.filter((finding) => finding.severity === 'review').length,
      info: policyFindings.filter((finding) => finding.severity === 'info').length,
    };
    const disposition = counts.block ? 'block' : counts.review ? 'review' : 'pass';
    return {
      disposition,
      headline:
        disposition === 'block'
          ? 'Remove sensitive credentials before sharing'
          : disposition === 'review'
            ? 'Review the highlighted context'
            : 'No blocking signals found',
      explanation:
        disposition === 'block'
          ? 'The local policy found at least one credential-shaped value.'
          : disposition === 'review'
            ? 'No credential was found, but one or more contextual checks need a person.'
            : 'The configured local checks found no reason to hold this text.',
      language: detected.language,
      languageCode: detected.code,
      languageScore: detected.score,
      languageReliable: detected.reliable,
      languageCandidate: detected.candidate,
      languageWarning: detected.warning,
      languageModel: detected.modelId,
      readingMinutes: reading.readingMinutes,
      readingLevel: reading.readingLevel,
      redactedText,
      findings: [...policyFindings].sort((left, right) => {
        const rank = { block: 0, review: 1, info: 2 };
        return rank[left.severity] - rank[right.severity];
      }),
      counts,
    };
  },
);

function outputOf<Output>(result: LeanletResult<Output>) {
  if (result.status === 'accepted') return result.output;
  if (result.status === 'failed') throw result.error;
  throw new Error(`Required Leanlet abstained: ${result.reason}`);
}

export function createSafeShare(
  modelId: LanguageModelId = DEFAULT_LANGUAGE_MODEL,
  detectorFactory: (id: LanguageModelId) => LanguageDetector = createLanguageDetector,
) {
  const selectedLanguageModel = languageModelProfile(modelId);
  const kernel = createLeanletKernel({
    budget: {
      maxConcurrentRuns: 4,
      maxResidentBytes: selectedLanguageModel.estimatedResidentBytes + 128 * 1024,
      defaultDeadlineMs: 15_000,
    },
    policy: { network: 'static-assets', allowedProviders: ['javascript'] },
  });
  kernel
    .register(languageDefinition(modelId, detectorFactory))
    .register(personalData)
    .register(secrets)
    .register(links)
    .register(urgency)
    .register(readability)
    .register(redactor)
    .register(policy);

  const flow = defineFlow<SafeShareInput, SafeShareDecision>({
    id: 'safeshare.preflight',
    version: '1.0.0',
    uses: [
      'safeshare.language',
      'safeshare.personal-data',
      'safeshare.secrets',
      'safeshare.links',
      'safeshare.urgency',
      'safeshare.readability',
      'safeshare.redactor',
      'safeshare.policy',
    ],
    async run({ text }, context) {
      const key = hashText(text);
      const [languageResult, personalResult, secretResult, linkResult, urgencyResult, readingResult] =
        await Promise.all([
          context.run<string, LanguageSignal>('safeshare.language', text, { coalesceKey: key }),
          context.run<string, DetectorOutput>('safeshare.personal-data', text, { coalesceKey: key }),
          context.run<string, DetectorOutput>('safeshare.secrets', text, { coalesceKey: key }),
          context.run<string, DetectorOutput>('safeshare.links', text, { coalesceKey: key }),
          context.run<string, DetectorOutput>('safeshare.urgency', text, { coalesceKey: key }),
          context.run<string, ReadabilitySignal>('safeshare.readability', text, { coalesceKey: key }),
        ]);
      const detected = outputOf(languageResult);
      const reading = outputOf(readingResult);
      const findings = [personalResult, secretResult, linkResult, urgencyResult].flatMap(
        (result) => outputOf(result).findings,
      );
      const redactedText = outputOf(
        await context.run<RedactionInput, string>(
          'safeshare.redactor',
          { text, findings },
          { coalesceKey: key },
        ),
      );
      return context.run<PolicyInput, SafeShareDecision>(
        'safeshare.policy',
        { text, language: detected, readability: reading, findings, redactedText },
        { coalesceKey: key },
      );
    },
  });

  return { kernel, flow };
}
