'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CopyCheck,
  Eye,
  Gauge,
  Languages,
  MessageSquareText,
  MousePointerClick,
  RotateCcw,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { LEANLET_MODELS, type LeanletModelId } from 'leanlet-ai';

type ProfileOption = {
  id: string;
  name: string;
  detail: string;
};

function CaseProfilePicker({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: ProfileOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="case-profile-picker" htmlFor={id}>
      <span>{label}</span>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name} · {option.detail}
          </option>
        ))}
      </select>
    </label>
  );
}

const visionModelOrder: LeanletModelId[] = [
  'mobilenet-v4-medium',
  'mobileclip-s0-fp16',
  'mobileclip-s0',
  'mobileclip-s0-compact',
  'mobilenet-v4-small',
];

const INTENTS = {
  Shipping: [
    'track',
    'package',
    'delivery',
    'late',
    'arrive',
    'where',
    'courier',
  ],
  Returns: ['return', 'refund', 'wrong', 'broken', 'replace', 'exchange'],
  Payments: ['payment', 'charged', 'card', 'invoice', 'billing', 'pay'],
  Product: ['size', 'color', 'stock', 'available', 'spec', 'compatible'],
} as const;

const intentProfiles: ProfileOption[] = [
  { id: 'keywords', name: 'Keyword scorer', detail: '< 3 KB' },
  { id: 'weighted', name: 'Weighted terms', detail: '< 4 KB' },
  { id: 'conservative', name: 'Conservative route', detail: '< 3 KB' },
];

function softmax(values: number[]) {
  const max = Math.max(...values);
  const exp = values.map((value) => Math.exp(value - max));
  const total = exp.reduce((sum, value) => sum + value, 0);
  return exp.map((value) => value / total);
}

function IntentDemo() {
  const [text, setText] = useState(
    'Where is my package? It was due yesterday.',
  );
  const [profile, setProfile] = useState('keywords');
  const predictions = useMemo(() => {
    const input = text.toLowerCase();
    const entries = Object.entries(INTENTS);
    const tuning =
      profile === 'weighted'
        ? { base: 0.1, match: 1.8 }
        : profile === 'conservative'
          ? { base: 0.45, match: 1 }
          : { base: 0.2, match: 1.35 };
    const probabilities = softmax(
      entries.map(
        ([, words]) =>
          tuning.base +
          words.reduce(
            (sum, word) => sum + (input.includes(word) ? tuning.match : 0),
            0,
          ),
      ),
    );
    return entries
      .map(([label], index) => ({ label, score: probabilities[index] }))
      .sort((a, b) => b.score - a.score);
  }, [profile, text]);
  return (
    <div className="case-demo-body">
      <CaseProfilePicker
        id="intent-profile"
        label="Local profile"
        options={intentProfiles}
        value={profile}
        onChange={setProfile}
      />
      <label className="micro-label" htmlFor="intent-input">
        Customer message
      </label>
      <textarea
        id="intent-input"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
      />
      <div className="micro-result">
        <span>Route to</span>
        <strong>{predictions[0].label}</strong>
        <b>{Math.round(predictions[0].score * 100)}%</b>
      </div>
      <div className="mini-bars">
        {predictions.slice(0, 3).map((item) => (
          <span key={item.label}>
            <i>{item.label}</i>
            <em>
              <b style={{ width: `${Math.max(4, item.score * 100)}%` }} />
            </em>
          </span>
        ))}
      </div>
    </div>
  );
}

const rankItems = [
  { id: 'focus', name: 'Deep focus', meta: 'Long-form · quiet' },
  { id: 'discover', name: 'Discover', meta: 'Novel · exploratory' },
  { id: 'quick', name: 'Quick wins', meta: 'Short · actionable' },
] as const;

const rankingProfiles: ProfileOption[] = [
  { id: 'balanced', name: 'Balanced decay', detail: '1 KB' },
  { id: 'responsive', name: 'Responsive decay', detail: '1 KB' },
  { id: 'stable', name: 'Stable decay', detail: '1 KB' },
];

function RankingDemo() {
  const [profile, setProfile] = useState('balanced');
  const [scores, setScores] = useState<Record<string, number>>({
    focus: 0.51,
    discover: 0.29,
    quick: 0.2,
  });
  const ranked = [...rankItems].sort((a, b) => scores[b.id] - scores[a.id]);
  const rankingTuning =
    profile === 'responsive'
      ? { decay: 0.68, boost: 0.42 }
      : profile === 'stable'
        ? { decay: 0.9, boost: 0.16 }
        : { decay: 0.82, boost: 0.28 };
  const choose = (id: string) =>
    setScores((current) => {
      const next = Object.fromEntries(
        Object.entries(current).map(([key, value]) => [
          key,
          value * rankingTuning.decay,
        ]),
      );
      next[id] = (next[id] ?? 0) + rankingTuning.boost;
      const total = Object.values(next).reduce((sum, value) => sum + value, 0);
      return Object.fromEntries(
        Object.entries(next).map(([key, value]) => [key, value / total]),
      );
    });
  return (
    <div className="case-demo-body">
      <CaseProfilePicker
        id="ranking-profile"
        label="Local profile"
        options={rankingProfiles}
        value={profile}
        onChange={setProfile}
      />
      <div className="rank-head">
        <span className="micro-label">Your local ranking</span>
        <button
          type="button"
          onClick={() => setScores({ focus: 0.51, discover: 0.29, quick: 0.2 })}
        >
          <RotateCcw /> Reset
        </button>
      </div>
      <div className="rank-list">
        {ranked.map((item, index) => (
          <button key={item.id} type="button" onClick={() => choose(item.id)}>
            <i>0{index + 1}</i>
            <span>
              <strong>{item.name}</strong>
              <small>{item.meta}</small>
            </span>
            <b>{Math.round(scores[item.id] * 100)}%</b>
          </button>
        ))}
      </div>
      <p className="micro-foot">
        <MousePointerClick /> Choose an item. The online model adapts without a
        profile server.
      </p>
    </div>
  );
}

function AnomalyDemo() {
  const [value, setValue] = useState(67);
  const [profile, setProfile] = useState('zscore');
  const anomalyProfiles: ProfileOption[] = [
    { id: 'zscore', name: 'Z-score', detail: '< 1 KB' },
    { id: 'robust', name: 'Robust deviation', detail: '< 1 KB' },
    { id: 'sensitive', name: 'Sensitive threshold', detail: '< 1 KB' },
  ];
  const profileConfig =
    profile === 'robust'
      ? { scale: 6.5, threshold: 2.8, label: 'robust deviation' }
      : profile === 'sensitive'
        ? { scale: 8, threshold: 1.7, label: 'sensitive threshold' }
        : { scale: 9, threshold: 2.25, label: 'z-score' };
  const z = Math.abs(value - 42) / profileConfig.scale;
  const anomaly = z >= profileConfig.threshold;
  const history = [39, 43, 47, 40, 44, 41, 45, 38, 42, 46, 43, value];
  return (
    <div className="case-demo-body">
      <CaseProfilePicker
        id="anomaly-profile"
        label="Local profile"
        options={anomalyProfiles}
        value={profile}
        onChange={setProfile}
      />
      <div className="sensor-value">
        <span>
          <i className={anomaly ? 'alert' : ''} /> Live sensor
        </span>
        <strong>
          {value}
          <small>°C</small>
        </strong>
      </div>
      <div className="spark-bars">
        {history.map((item, index) => (
          <i
            key={index}
            className={index === history.length - 1 && anomaly ? 'alert' : ''}
            style={{ height: `${Math.max(12, item)}%` }}
          />
        ))}
      </div>
      <label className="micro-label" htmlFor="sensor-range">
        Change latest reading
      </label>
      <input
        id="sensor-range"
        type="range"
        min="20"
        max="90"
        value={value}
        onChange={(event) => setValue(Number(event.target.value))}
      />
      <div className={`anomaly-result ${anomaly ? 'alert' : ''}`}>
        <Activity />
        <span>
          <strong>{anomaly ? 'Anomaly detected' : 'Within baseline'}</strong>
          <small>
            {profileConfig.label} {z.toFixed(2)}σ · threshold{' '}
            {profileConfig.threshold}σ
          </small>
        </span>
      </div>
    </div>
  );
}

const searchDocuments = [
  {
    title: 'Reset a workspace password',
    text: 'account login password reset recovery access',
  },
  {
    title: 'Export monthly invoices',
    text: 'billing invoices export download monthly finance',
  },
  {
    title: 'Invite a team member',
    text: 'team member invite workspace access collaborator',
  },
  {
    title: 'Configure notification rules',
    text: 'alerts notifications rules email preferences',
  },
];

const searchProfiles: ProfileOption[] = [
  { id: 'terms', name: 'Term overlap', detail: '< 3 KB' },
  { id: 'characters', name: 'Character n-gram', detail: '< 4 KB' },
  { id: 'prefix', name: 'Prefix matching', detail: '< 2 KB' },
];

const terms = (value: string) =>
  new Set(value.toLowerCase().match(/[a-z0-9]+/g) ?? []);
const overlap = (left: string, right: string) => {
  const a = terms(left);
  const b = terms(right);
  const matches = [...a].filter((term) => b.has(term)).length;
  return matches / Math.max(1, Math.sqrt(a.size * b.size));
};
const characterOverlap = (left: string, right: string) => {
  const grams = (value: string) => {
    const normalized = `  ${value.toLowerCase().replace(/[^a-z0-9]/g, '')}  `;
    return new Set(
      Array.from({ length: Math.max(0, normalized.length - 2) }, (_, index) =>
        normalized.slice(index, index + 3),
      ),
    );
  };
  const a = grams(left);
  const b = grams(right);
  const matches = [...a].filter((term) => b.has(term)).length;
  return (2 * matches) / Math.max(1, a.size + b.size);
};
const prefixOverlap = (left: string, right: string) => {
  const queryTerms = [...terms(left)];
  const documentTerms = [...terms(right)];
  const matches = queryTerms.filter((query) =>
    documentTerms.some((document) => document.startsWith(query.slice(0, 4))),
  ).length;
  return matches / Math.max(1, queryTerms.length);
};

function SearchDemo() {
  const [query, setQuery] = useState('How do I add somebody to my workspace?');
  const [profile, setProfile] = useState('terms');
  const ranked = useMemo(
    () =>
      searchDocuments
        .map((document) => ({
          ...document,
          score:
            profile === 'characters'
              ? characterOverlap(query, document.text)
              : profile === 'prefix'
                ? prefixOverlap(query, document.text)
                : overlap(
                    query
                      .replace('somebody', 'member')
                      .replace('add', 'invite'),
                    document.text,
                  ),
        }))
        .sort((a, b) => b.score - a.score),
    [profile, query],
  );
  return (
    <div className="case-demo-body">
      <CaseProfilePicker
        id="search-profile"
        label="Local profile"
        options={searchProfiles}
        value={profile}
        onChange={setProfile}
      />
      <label className="micro-label" htmlFor="search-input">
        Documentation query
      </label>
      <input
        id="search-input"
        className="micro-input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="micro-list">
        {ranked.slice(0, 3).map((item, index) => (
          <div key={item.title}>
            <i>0{index + 1}</i>
            <span>
              <strong>{item.title}</strong>
              <small>similarity {item.score.toFixed(2)}</small>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const languageSignals = {
  English: ['the', 'is', 'my', 'how', 'where', 'please'],
  Spanish: ['el', 'la', 'mi', 'cómo', 'dónde', 'por favor'],
  French: ['le', 'la', 'mon', 'comment', 'où', 'merci'],
  German: ['der', 'die', 'das', 'mein', 'wie', 'bitte'],
  Portuguese: ['o', 'a', 'meu', 'como', 'onde', 'obrigado'],
  Italian: ['il', 'la', 'mio', 'come', 'dove', 'grazie'],
} as const;

const scriptLanguages: Array<[string, RegExp]> = [
  ['Telugu', /\p{Script=Telugu}/u],
  ['Kannada', /\p{Script=Kannada}/u],
  ['Tamil', /\p{Script=Tamil}/u],
  ['Malayalam', /\p{Script=Malayalam}/u],
  ['Bengali', /\p{Script=Bengali}/u],
  ['Gujarati', /\p{Script=Gujarati}/u],
  ['Hindi / Devanagari', /\p{Script=Devanagari}/u],
  ['Punjabi / Gurmukhi', /\p{Script=Gurmukhi}/u],
  ['Arabic', /\p{Script=Arabic}/u],
  ['Russian / Cyrillic', /\p{Script=Cyrillic}/u],
  ['Korean', /\p{Script=Hangul}/u],
  ['Japanese', /[\p{Script=Hiragana}\p{Script=Katakana}]/u],
  ['Chinese', /\p{Script=Han}/u],
  ['Thai', /\p{Script=Thai}/u],
];

const languageProfiles: ProfileOption[] = [
  { id: 'script-vocabulary', name: 'Script + vocabulary', detail: '< 2 KB' },
  { id: 'script', name: 'Writing system', detail: '< 1 KB' },
  { id: 'vocabulary', name: 'Latin vocabulary', detail: '< 2 KB' },
];

function hasLanguageSignal(input: string, signal: string) {
  const words: string[] = input.toLocaleLowerCase().match(/\p{L}+/gu) ?? [];
  if (signal.includes(' ')) return input.toLocaleLowerCase().includes(signal);
  return words.includes(signal);
}

function detectLanguage(text: string, profile: string) {
  const scriptMatch =
    profile === 'vocabulary'
      ? undefined
      : scriptLanguages.find(([, pattern]) => pattern.test(text));
  if (scriptMatch)
    return { language: scriptMatch[0], score: 1, evidence: 'writing system' };

  if (profile === 'script')
    return {
      language: 'Unknown',
      score: 0,
      evidence: 'no writing-system match',
    };

  const ranked = Object.entries(languageSignals)
    .map(([language, signals]) => ({
      language,
      score: signals.reduce(
        (score, signal) => score + (hasLanguageSignal(text, signal) ? 1 : 0),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score)[0];

  return {
    ...ranked,
    evidence: ranked.score ? 'word signals' : 'no signal',
  };
}

function LanguageDemo() {
  const [text, setText] = useState('¿Dónde está mi pedido?');
  const [profile, setProfile] = useState('script-vocabulary');
  const result = useMemo(() => detectLanguage(text, profile), [profile, text]);
  return (
    <div className="case-demo-body">
      <CaseProfilePicker
        id="language-profile"
        label="Local profile"
        options={languageProfiles}
        value={profile}
        onChange={setProfile}
      />
      <label className="micro-label" htmlFor="language-input">
        Short message
      </label>
      <textarea
        id="language-input"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={3}
      />
      <div className="micro-result">
        <span>Detected language</span>
        <strong>{result.score ? result.language : 'Unknown'}</strong>
        <b>{result.evidence}</b>
      </div>
      <p className="micro-foot">
        These are inspectable local profiles. Use a dedicated language-ID model
        when languages share scripts or coverage must be broader.
      </p>
    </div>
  );
}

function ForecastDemo() {
  const [latest, setLatest] = useState(34);
  const [profile, setProfile] = useState('linear');
  const forecastProfiles: ProfileOption[] = [
    { id: 'linear', name: 'Linear trend', detail: '< 1 KB' },
    { id: 'average', name: 'Moving average', detail: '< 1 KB' },
    { id: 'damped', name: 'Damped trend', detail: '< 1 KB' },
  ];
  const values = [19, 21, 22, 25, 27, 30, latest];
  const count = values.length;
  const sumX = values.reduce((sum, _, index) => sum + index, 0);
  const sumY = values.reduce((sum, value) => sum + value, 0);
  const sumXY = values.reduce((sum, value, index) => sum + index * value, 0);
  const sumXX = values.reduce((sum, _, index) => sum + index * index, 0);
  const slope = (count * sumXY - sumX * sumY) / (count * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / count;
  const linearNext = intercept + slope * count;
  const movingAverage =
    values.slice(-3).reduce((sum, value) => sum + value, 0) / 3;
  const next = Math.round(
    profile === 'average'
      ? movingAverage
      : profile === 'damped'
        ? values.at(-1)! + slope * 0.55
        : linearNext,
  );
  return (
    <div className="case-demo-body">
      <CaseProfilePicker
        id="forecast-profile"
        label="Local profile"
        options={forecastProfiles}
        value={profile}
        onChange={setProfile}
      />
      <div className="sensor-value">
        <span>Seven local samples</span>
        <strong>
          {next}
          <small>next</small>
        </strong>
      </div>
      <div className="spark-bars forecast-bars">
        {[...values, next].map((item, index) => (
          <i
            key={index}
            className={index === values.length ? 'projected' : ''}
            style={{ height: `${Math.max(12, item * 2)}%` }}
          />
        ))}
      </div>
      <label className="micro-label" htmlFor="forecast-range">
        Adjust latest sample
      </label>
      <input
        id="forecast-range"
        type="range"
        min="10"
        max="45"
        value={latest}
        onChange={(event) => setLatest(Number(event.target.value))}
      />
      <p className="micro-foot">
        <TrendingUp /> Least-squares trend computed in this page.
      </p>
    </div>
  );
}

const normalized = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');
const trigrams = (value: string) => {
  const clean = `  ${normalized(value)}  `;
  return new Set(
    Array.from({ length: Math.max(0, clean.length - 2) }, (_, index) =>
      clean.slice(index, index + 3),
    ),
  );
};
const similarity = (left: string, right: string) => {
  const a = trigrams(left);
  const b = trigrams(right);
  const common = [...a].filter((item) => b.has(item)).length;
  return (2 * common) / Math.max(1, a.size + b.size);
};

const matchingProfiles: ProfileOption[] = [
  { id: 'trigram', name: 'Character trigrams', detail: '< 2 KB' },
  { id: 'tokens', name: 'Token overlap', detail: '< 2 KB' },
  { id: 'strict', name: 'Normalized key', detail: '< 1 KB' },
];

function MatchingDemo() {
  const [candidate, setCandidate] = useState(
    'Acme Wireless Headphones - Black',
  );
  const [profile, setProfile] = useState('trigram');
  const canonical = 'ACME wireless headphone black';
  const score =
    profile === 'tokens'
      ? overlap(candidate, canonical)
      : profile === 'strict'
        ? Number(normalized(candidate) === normalized(canonical))
        : similarity(candidate, canonical);
  return (
    <div className="case-demo-body">
      <CaseProfilePicker
        id="matching-profile"
        label="Local profile"
        options={matchingProfiles}
        value={profile}
        onChange={setProfile}
      />
      <label className="micro-label" htmlFor="match-input">
        Incoming record
      </label>
      <input
        id="match-input"
        className="micro-input"
        value={candidate}
        onChange={(event) => setCandidate(event.target.value)}
      />
      <div className="match-target">
        <span>Candidate record</span>
        <strong>{canonical}</strong>
      </div>
      <div className={`anomaly-result ${score < 0.65 ? 'alert' : ''}`}>
        <CopyCheck />
        <span>
          <strong>{score >= 0.65 ? 'Likely match' : 'Needs review'}</strong>
          <small>
            character similarity {Math.round(score * 100)}% · threshold 65%
          </small>
        </span>
      </div>
    </div>
  );
}

export function CasesSection({
  visionModel,
  onVisionModelChange,
}: {
  visionModel: LeanletModelId;
  onVisionModelChange: (model: LeanletModelId) => void;
}) {
  const selectedVisionModel = LEANLET_MODELS[visionModel];
  return (
    <section id="cases" className="cases-section">
      <div className="shell py-20 lg:py-28">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Scoped intelligence patterns</p>
            <h2>Small runtimes for bounded tasks.</h2>
          </div>
          <p>
            Switch an execution profile within every card. Vision uses the
            shipped model registry; the remaining examples expose the local
            algorithm being evaluated, with a narrow input and explicit output.
          </p>
        </div>
        <div className="cases-grid">
          <article className="case-card case-vision">
            <header>
              <span>
                <Eye /> Vision
              </span>
              <b>
                {selectedVisionModel.sizeMB} MB · {selectedVisionModel.tier}
              </b>
            </header>
            <div className="vision-graphic">
              <span />
              <span />
              <span />
              <i>
                <Sparkles />
              </i>
            </div>
            <div className="case-copy">
              <p className="micro-label">Product taxonomy</p>
              <h3>
                Route catalog images into the categories your app already uses.
              </h3>
              <p>
                MobileCLIP compares pixels with your labels in a dedicated
                worker.
              </p>
              <CaseProfilePicker
                id="vision-profile"
                label="Vision model"
                options={visionModelOrder.map((id) => ({
                  id,
                  name: LEANLET_MODELS[id].shortName,
                  detail: `${LEANLET_MODELS[id].sizeMB} MB`,
                }))}
                value={visionModel}
                onChange={(model) =>
                  onVisionModelChange(model as LeanletModelId)
                }
              />
              <a href="#demo">
                Open vision demo <ArrowRight />
              </a>
            </div>
          </article>
          <article className="case-card">
            <header>
              <span>
                <MessageSquareText /> Text
              </span>
              <b>&lt; 3 KB · linear</b>
            </header>
            <div className="case-copy compact">
              <p className="micro-label">Intent routing</p>
              <h3>Turn a short message into an application action.</h3>
            </div>
            <IntentDemo />
          </article>
          <article className="case-card">
            <header>
              <span>
                <BrainCircuit /> Behavior
              </span>
              <b>1 KB · online</b>
            </header>
            <div className="case-copy compact">
              <p className="micro-label">Adaptive ranking</p>
              <h3>Learn a useful order from interaction on this device.</h3>
            </div>
            <RankingDemo />
          </article>
          <article className="case-card">
            <header>
              <span>
                <Gauge /> Time series
              </span>
              <b>&lt; 1 KB · statistical</b>
            </header>
            <div className="case-copy compact">
              <p className="micro-label">Anomaly detection</p>
              <h3>Spot a meaningful deviation before sending any telemetry.</h3>
            </div>
            <AnomalyDemo />
          </article>
          <article className="case-card">
            <header>
              <span>
                <Search /> Retrieval
              </span>
              <b>&lt; 3 KB · lexical</b>
            </header>
            <div className="case-copy compact">
              <p className="micro-label">Local search</p>
              <h3>Rank a small application corpus without a search request.</h3>
            </div>
            <SearchDemo />
          </article>
          <article className="case-card">
            <header>
              <span>
                <Languages /> Language
              </span>
              <b>&lt; 2 KB · rules</b>
            </header>
            <div className="case-copy compact">
              <p className="micro-label">Language routing</p>
              <h3>Select a locale or fallback before a form is submitted.</h3>
            </div>
            <LanguageDemo />
          </article>
          <article className="case-card">
            <header>
              <span>
                <TrendingUp /> Forecasting
              </span>
              <b>&lt; 1 KB · regression</b>
            </header>
            <div className="case-copy compact">
              <p className="micro-label">Short-horizon trend</p>
              <h3>Estimate the next value from a small local series.</h3>
            </div>
            <ForecastDemo />
          </article>
          <article className="case-card">
            <header>
              <span>
                <CopyCheck /> Matching
              </span>
              <b>&lt; 2 KB · similarity</b>
            </header>
            <div className="case-copy compact">
              <p className="micro-label">Record matching</p>
              <h3>
                Flag likely duplicates while a user edits structured data.
              </h3>
            </div>
            <MatchingDemo />
          </article>
        </div>
        <div className="cases-principle">
          <Sparkles />
          <p>
            <strong>Choose the runtime after defining the task.</strong> Leanlet
            provides a consistent boundary for input, execution, confidence,
            fallback, and lifecycle. Teams still need representative evaluation
            data to decide whether a rule, compact model, or remote service
            meets the feature’s requirements.
          </p>
        </div>
      </div>
    </section>
  );
}
