'use client';

import {
  AlertOctagon,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clipboard,
  Clock3,
  FileText,
  Gauge,
  Languages,
  Link2,
  ListChecks,
  LoaderCircle,
  LockKeyhole,
  Network,
  Play,
  RotateCcw,
  ScanText,
  ShieldCheck,
  Sparkles,
  UserRoundSearch,
  Workflow,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LeanletFlowTrace, LeanletKernelEvent, LeanletKernelSnapshot } from 'leanlet-ai';
import {
  SAFE_SHARE_SAMPLES,
  createSafeShare,
  type SafeShareDecision,
  type SafeShareFinding,
} from '@/lib/safe-share';
import {
  DEFAULT_LANGUAGE_MODEL,
  LANGUAGE_MODEL_PROFILES,
  languageModelProfile,
  type LanguageModelId,
} from '@/lib/language-model';

type Runtime = ReturnType<typeof createSafeShare>;

const capabilityNodes = [
  { id: 'safeshare.secrets', label: 'Secrets', icon: LockKeyhole },
  { id: 'safeshare.personal-data', label: 'Personal data', icon: UserRoundSearch },
  { id: 'safeshare.links', label: 'Links', icon: Link2 },
  { id: 'safeshare.language', label: 'Language', icon: Languages },
  { id: 'safeshare.urgency', label: 'Tone', icon: Gauge },
  { id: 'safeshare.readability', label: 'Readability', icon: ScanText },
] as const;

function Logo() {
  return (
    <span className="studio-logo">
      <span className="logo-mark" aria-hidden="true"><i /><i /><i /></span>
      <span>Leanlet</span><b>SafeShare</b>
    </span>
  );
}

function formatMs(value?: number) {
  if (value === undefined) return '—';
  return value < 1 ? '<1 ms' : `${Math.round(value)} ms`;
}

function dispositionLabel(disposition: SafeShareDecision['disposition']) {
  if (disposition === 'block') return 'Hold before sharing';
  if (disposition === 'review') return 'Review before sharing';
  return 'Ready to share';
}

function FindingIcon({ finding }: { finding: SafeShareFinding }) {
  if (finding.severity === 'block') return <AlertOctagon />;
  if (finding.severity === 'review') return <ListChecks />;
  return <CheckCircle2 />;
}

export default function SafeShareStudio() {
  const runtimeRef = useRef<Runtime | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [text, setText] = useState<string>(SAFE_SHARE_SAMPLES[0].text);
  const [activeSample, setActiveSample] = useState<string>(SAFE_SHARE_SAMPLES[0].id);
  const [decision, setDecision] = useState<SafeShareDecision>();
  const [trace, setTrace] = useState<LeanletFlowTrace[]>([]);
  const [events, setEvents] = useState<LeanletKernelEvent[]>([]);
  const [snapshot, setSnapshot] = useState<LeanletKernelSnapshot>();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [languageModel, setLanguageModel] =
    useState<LanguageModelId>(DEFAULT_LANGUAGE_MODEL);
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    const runtime = createSafeShare(languageModel);
    runtimeRef.current = runtime;
    const unsubscribe = runtime.kernel.subscribe((event) => {
      setEvents((current) => [event, ...current].slice(0, 24));
      setSnapshot(runtime.kernel.inspect());
    });
    void runtime.kernel
      .prewarm('safeshare.language', { deadlineMs: 30_000 })
      .then(() => {
        if (active) {
          setModelStatus('ready');
          setSnapshot(runtime.kernel.inspect());
        }
      })
      .catch((caught: unknown) => {
        if (active) {
          setModelStatus('error');
          setError(
            caught instanceof Error ? caught.message : 'The language model did not load.',
          );
        }
      });
    return () => {
      active = false;
      abortRef.current?.abort();
      unsubscribe();
      void runtime.kernel.destroy();
      runtimeRef.current = null;
    };
  }, [languageModel]);

  const completedIds = useMemo(
    () => new Set(trace.filter((item) => item.status === 'accepted').map((item) => item.leanletId)),
    [trace],
  );
  const startedIds = useMemo(
    () => new Set(events.filter((event) => event.type === 'started').map((event) => event.leanletId)),
    [events],
  );
  const criticalPathMs = trace.reduce(
    (maximum, item) => Math.max(maximum, item.timing?.totalMs ?? 0),
    0,
  );

  const chooseSample = (id: string) => {
    const sample = SAFE_SHARE_SAMPLES.find((item) => item.id === id);
    if (!sample) return;
    abortRef.current?.abort();
    setActiveSample(id);
    setText(sample.text);
    setDecision(undefined);
    setTrace([]);
    setEvents([]);
    setError(undefined);
  };

  const chooseLanguageModel = (modelId: LanguageModelId) => {
    abortRef.current?.abort();
    setModelStatus('loading');
    setDecision(undefined);
    setTrace([]);
    setEvents([]);
    setError(undefined);
    setLanguageModel(modelId);
  };

  const run = async () => {
    const runtime = runtimeRef.current;
    if (!runtime || !text.trim()) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setDecision(undefined);
    setTrace([]);
    setEvents([]);
    setError(undefined);
    try {
      const outcome = await runtime.flow.run(
        runtime.kernel,
        { text },
        { signal: controller.signal, deadlineMs: 15_000, priority: 5 },
      );
      if (outcome.result.status === 'failed') throw outcome.result.error;
      if (outcome.result.status === 'abstained')
        throw new Error(`Preflight abstained: ${outcome.result.reason}`);
      setDecision(outcome.result.output);
      setTrace(outcome.trace);
      setSnapshot(runtime.kernel.inspect());
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError(caught instanceof Error ? caught.message : 'The local preflight did not complete.');
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setRunning(false);
      }
    }
  };

  const copySanitized = async () => {
    if (!decision) return;
    await navigator.clipboard.writeText(decision.redactedText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };

  return (
    <main className="studio-root">
      <header className="studio-header">
        <a href="../" className="studio-back"><ArrowLeft /> Framework</a>
        <Logo />
        <div className="studio-local"><span /> Local runtime · no inference API</div>
      </header>

      <section className="studio-hero">
        <p className="studio-eyebrow"><Sparkles /> Working reference application</p>
        <h1>Inspect sensitive text<br />before it leaves the browser.</h1>
        <p>
          SafeShare coordinates eight bounded Leanlets into one private content preflight.
          The checks, redaction, and release policy execute in this page—without an inference API.
        </p>
        <div className="studio-facts">
          <span><b>8</b> scoped capabilities</span>
          <span><b>4</b> concurrent slots</span>
          <span><b>0</b> inference API calls</span>
          <span><b>1</b> cached model asset</span>
        </div>
      </section>

      <section className="studio-workbench" aria-label="SafeShare local preflight demo">
        <div className="studio-editor-panel">
          <div className="studio-panel-title">
            <div><FileText /><span><small>INPUT</small><strong>Content to preflight</strong></span></div>
            <button type="button" onClick={() => chooseSample(SAFE_SHARE_SAMPLES[0].id)}><RotateCcw /> Reset</button>
          </div>
          <div className="studio-samples" aria-label="Sample content">
            {SAFE_SHARE_SAMPLES.map((sample) => (
              <button
                type="button"
                className={activeSample === sample.id ? 'active' : ''}
                onClick={() => chooseSample(sample.id)}
                key={sample.id}
              >
                {sample.label}
              </button>
            ))}
          </div>
          <label className="studio-model-picker" htmlFor="studio-language-model">
            <span>
              <strong>Language model</strong>
              <small>
                {modelStatus === 'loading'
                  ? 'Loading in a dedicated worker…'
                  : modelStatus === 'ready'
                    ? 'Ready in a dedicated worker'
                    : 'Model load failed'}
              </small>
            </span>
            <select
              id="studio-language-model"
              value={languageModel}
              onChange={(event) => chooseLanguageModel(event.target.value as LanguageModelId)}
            >
              {LANGUAGE_MODEL_PROFILES.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} · {profile.detail}
                </option>
              ))}
            </select>
          </label>
          <label className="studio-textarea-label">
            <span>Message, note, or generated content</span>
            <textarea
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setActiveSample('custom');
                setDecision(undefined);
                setTrace([]);
              }}
              spellCheck="false"
            />
            <small>{text.length.toLocaleString()} characters · content stays in this tab</small>
          </label>
          <button className="studio-run" type="button" onClick={() => void run()} disabled={running || modelStatus !== 'ready' || !text.trim()}>
            {running || modelStatus === 'loading' ? <LoaderCircle className="spin" /> : <Play />}
            {modelStatus === 'loading'
              ? 'Loading language model'
              : running
                ? 'Running local preflight'
                : 'Run local preflight'}
            {!running && modelStatus === 'ready' && <ArrowRight />}
          </button>
          <p className="studio-caveat">
            This reference policy demonstrates composition. Its inspectable pattern checks are not a
            replacement for an organization’s complete DLP or security controls.
          </p>
        </div>

        <div className="studio-result-panel">
          <div className="studio-panel-title">
            <div><ShieldCheck /><span><small>OUTPUT</small><strong>Release decision</strong></span></div>
            {decision && <span className={`studio-disposition ${decision.disposition}`}>{dispositionLabel(decision.disposition)}</span>}
          </div>
          {!decision && !running && !error && (
            <div className="studio-empty"><Workflow /><strong>Ready for a local run</strong><p>Choose a sample or edit the text, then run the coordinated preflight.</p></div>
          )}
          {running && (
            <div className="studio-empty running"><LoaderCircle className="spin" /><strong>Coordinating capabilities</strong><p>The scheduler is executing independent checks in parallel.</p></div>
          )}
          {error && <div className="studio-error"><AlertOctagon /><span><strong>Preflight failed</strong>{error}</span></div>}
          {decision && (
            <div className="studio-decision">
              <div className={`studio-decision-head ${decision.disposition}`}>
                {decision.disposition === 'pass' ? <CheckCircle2 /> : <AlertOctagon />}
                <div><small>LOCAL POLICY</small><h2>{decision.headline}</h2><p>{decision.explanation}</p></div>
              </div>
              <div className="studio-metrics">
                <span><b>{decision.counts.block}</b> blocking</span>
                <span><b>{decision.counts.review}</b> review</span>
                <span title={`Model score ${Math.round(decision.languageScore * 100)}%`}><b>{decision.language}</b>{decision.languageReliable ? 'language' : 'language · low confidence'}</span>
                <span><b>{decision.readingLevel}</b> readability</span>
              </div>
              {!decision.languageReliable && (
                <div className="studio-quality-warning" role="status">
                  <AlertOctagon />
                  <div>
                    <strong>Language output needs review</strong>
                    <p>{decision.languageWarning}</p>
                  </div>
                </div>
              )}
              <div className="studio-findings">
                <div className="studio-subhead"><strong>Signals</strong><span>{decision.findings.length} found</span></div>
                {decision.findings.length === 0 ? (
                  <div className="studio-no-findings"><Check /> No configured risk signals found.</div>
                ) : decision.findings.map((finding) => (
                  <article className={finding.severity} key={`${finding.id}-${finding.label}`}>
                    <FindingIcon finding={finding} />
                    <div><strong>{finding.label}</strong><p>{finding.detail}</p></div>
                    <span>{finding.severity}</span>
                  </article>
                ))}
              </div>
              <div className="studio-sanitized">
                <div className="studio-subhead"><strong>Sanitized draft</strong><button type="button" onClick={() => void copySanitized()}><Clipboard /> {copied ? 'Copied' : 'Copy'}</button></div>
                <pre>{decision.redactedText}</pre>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="studio-runtime-section">
        <div className="studio-runtime-copy">
          <p className="studio-eyebrow"><Network /> Actual execution</p>
          <h2>Independent signals.<br />One explicit decision.</h2>
          <p>
            Six read-only checks fan out under a concurrency budget. Their typed findings feed a
            deterministic redactor, then a release policy. Every boundary can be tested, replaced,
            observed, or allowed to abstain independently.
          </p>
          <a href="../docs/#flows">Read the flow specification <ArrowRight /></a>
        </div>
        <div className="studio-flow" aria-label="SafeShare execution graph">
          <div className="studio-flow-input"><FileText /><span>Content</span></div>
          <div className="studio-flow-line" />
          <div className="studio-capability-grid">
            {capabilityNodes.map((node) => {
              const Icon = node.icon;
              const complete = completedIds.has(node.id);
              const active = running && startedIds.has(node.id) && !complete;
              return (
                <div className={complete ? 'complete' : active ? 'active' : ''} key={node.id}>
                  <Icon /><span>{node.label}</span>{complete && <Check />}
                </div>
              );
            })}
          </div>
          <div className="studio-flow-line" />
          <div className="studio-flow-tail">
            <div className={completedIds.has('safeshare.redactor') ? 'complete' : ''}><ScanText /><span>Redactor</span></div>
            <ArrowRight />
            <div className={completedIds.has('safeshare.policy') ? 'complete' : ''}><ShieldCheck /><span>Policy</span></div>
          </div>
          <div className="studio-flow-stats">
            <span><Clock3 /> Flow span {formatMs(criticalPathMs)}</span>
            <span><Gauge /> {snapshot?.telemetry.completedRuns ?? 0} completed runs</span>
            <span><Network /> inference API: none</span>
            <span><Languages /> {languageModelProfile(languageModel).name}</span>
          </div>
        </div>
      </section>

      <section className="studio-learn">
        <small>WHAT THIS DEMONSTRATES</small>
        <h2>Local intelligence is a system design choice,<br />not a single-model trick.</h2>
        <div>
          <article><b>01</b><strong>Use the smallest sufficient method</strong><p>Regex, statistics, compact models, and WASM modules can share the same lifecycle contract.</p></article>
          <article><b>02</b><strong>Compose evidence, not hidden authority</strong><p>Each capability returns typed evidence. A visible product policy makes the final decision.</p></article>
          <article><b>03</b><strong>Escalate deliberately</strong><p>A local pass, review, or abstention can decide when a larger service is actually justified.</p></article>
        </div>
      </section>

      <footer className="studio-footer">
        <Logo />
        <span>SafeShare reference application · Leanlet 0.3 beta</span>
        <a href="../docs/">Build your first Leanlet <ArrowRight /></a>
      </footer>
    </main>
  );
}
