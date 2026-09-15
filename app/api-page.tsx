'use client';

import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { NpmMark } from '@/components/npm-mark';

const sections = [
  ['api-overview', 'API overview'],
  ['simple', 'defineLeanlet'],
  ['kernel', 'LeanletKernel'],
  ['definition', 'Kernel definition'],
  ['manifest', 'Manifest'],
  ['context', 'Run context'],
  ['results', 'Results'],
  ['run-options', 'Run options'],
  ['custom-models', 'Custom models'],
  ['checks', 'Application checks'],
  ['flows', 'Flows'],
  ['events', 'Events and snapshots'],
  ['assets', 'Asset planning'],
  ['evaluation', 'Evaluation'],
  ['vision', 'VisionLeanlet'],
  ['models', 'Model catalog'],
  ['errors', 'Errors'],
  ['exports', 'Export index'],
] as const;

function Logo() {
  return <span className="inline-flex items-center gap-2.5"><span className="logo-mark" aria-hidden="true"><i /><i /><i /></span><span className="text-[17px] font-semibold tracking-[-0.035em]">Leanlet</span></span>;
}

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="docs-code">
      <button type="button" onClick={() => { void navigator.clipboard.writeText(children); setCopied(true); window.setTimeout(() => setCopied(false), 1_400); }}>{copied ? 'Copied' : 'Copy'}</button>
      <pre><code>{children}</code></pre>
    </div>
  );
}

function Signature({ children }: { children: string }) {
  return <pre className="api-signature"><code>{children}</code></pre>;
}

function Fields({ rows }: { rows: Array<[string, string, string]> }) {
  return (
    <div className="api-fields">
      <div><span>Name</span><span>Type</span><span>Meaning</span></div>
      {rows.map(([name, type, meaning]) => <div key={name}><code>{name}</code><code>{type}</code><span>{meaning}</span></div>)}
    </div>
  );
}

export default function ApiReference() {
  return (
    <main className="docs-root">
      <header className="site-header">
        <div className="shell flex h-16 items-center justify-between">
          <a href="../../"><Logo /></a><span className="docs-divider">API Reference</span>
          <nav className="ml-auto hidden items-center gap-6 text-sm text-[#59667e] sm:flex"><a href="../">Guide</a><a href="../migrate/">Migration</a><a href="#exports">Exports</a></nav>
          <a className="nav-install ml-5 hidden lg:inline-flex" href="https://www.npmjs.com/package/leanlet-ai" target="_blank" rel="noreferrer"><NpmMark /> npm</a>
          <a className="nav-cta ml-2" href="../../studio/">SafeShare <ArrowRight className="size-3.5" /></a>
        </div>
      </header>

      <div className="docs-layout shell">
        <aside className="docs-sidebar">
          <a className="docs-back" href="../"><ArrowLeft /> Documentation</a>
          <div className="docs-version"><small>Reference version</small><strong>0.3.0 beta</strong><span>Prerelease API</span></div>
          <p>Package surface</p>
          {sections.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}
        </aside>

        <article className="docs-content api-reference">
          <section id="api-overview" className="docs-intro">
            <div className="docs-badge">Source candidate · 0.3.0-beta.4</div>
            <h1>Complete TypeScript API reference.</h1>
            <p>
              This page documents every public value and type exported by Leanlet 0.3. Start with
              <code> defineLeanlet</code> for one local capability. Add a kernel only when multiple
              capabilities need shared scheduling, policy, lifecycle, provenance, or budgets.
            </p>
            <div className="docs-callout blue"><ShieldCheck /><div><strong>Contract status</strong><p>0.3 is a beta. npm tag <code>next</code> currently resolves to beta.2; custom-model and application-check contracts shown here are source candidates for beta.4. The 0.2 API remains available and the managed APIs are additive.</p></div></div>
            <Code>{`npm install leanlet-ai

import {
  defineLeanlet,          // minimal lifecycle helper
  createLeanletKernel,    // managed multi-capability runtime
  defineFlow,             // typed orchestration
  VisionLeanlet,          // browser vision adapter
} from 'leanlet-ai';`}</Code>
          </section>

          <section id="simple">
            <p className="docs-kicker">Minimal API</p><h2>defineLeanlet</h2>
            <Signature>{`defineLeanlet<Input, Output, Context = undefined>(
  definition: LeanletDefinition<Input, Output, Context>
): ScopedLeanlet<Input, Output>`}</Signature>
            <p>Creates one lazy, lifecycle-aware capability. It has no queue, manifest, policy, structured result, flow trace, or resource budget. Use it when those controls are unnecessary.</p>
            <Fields rows={[
              ['id', 'string', 'Application-unique identifier exposed as scoped.id.'],
              ['load?', '() => Context | Promise<Context>', 'Runs at most once, lazily, before warmup or the first run.'],
              ['infer', '(input, context) => Output | Promise<Output>', 'Produces the capability output. Errors reject the run promise.'],
              ['dispose?', '(context) => void | Promise<void>', 'Runs once during destroy only if loading began.'],
            ]} />
            <Code>{`const tokenizer = defineLeanlet<string, string[], Segmenter>({
  id: 'text.tokens',
  load: () => new Intl.Segmenter('en', { granularity: 'word' }),
  infer: (text, segmenter) =>
    [...segmenter.segment(text)].filter(x => x.isWordLike).map(x => x.segment),
});

await tokenizer.warmup();            // optional
const tokens = await tokenizer.run('Runs entirely here.');
await tokenizer.destroy();           // idempotent
// warmup/run after destroy reject.`}</Code>
            <Fields rows={[
              ['id', 'readonly string', 'The definition ID.'],
              ['warmup()', 'Promise<void>', 'Initializes and retains context without inference.'],
              ['run(input)', 'Promise<Output>', 'Initializes if needed, then calls infer. Concurrent first calls share loading.'],
              ['destroy()', 'Promise<void>', 'Marks destroyed, disposes initialized context, and is safe to call again.'],
            ]} />
          </section>

          <section id="kernel">
            <p className="docs-kicker">Managed API</p><h2>LeanletKernel</h2>
            <Signature>{`createLeanletKernel(options?: LeanletKernelOptions): LeanletKernel
new LeanletKernel(options?: LeanletKernelOptions)`}</Signature>
            <Fields rows={[
              ['budget.maxConcurrentRuns', 'number = 2', 'Maximum active load/run operations. Must be a positive integer.'],
              ['budget.maxResidentBytes', 'number = 268435456', 'Maximum sum of declared bytes for loaded state. Must be non-negative.'],
              ['budget.defaultDeadlineMs', 'number = 5000', 'Queue + load + run deadline when a request does not override it.'],
              ['policy.network', "'deny' | 'static-assets' | 'application-managed'", 'Highest declared network class admitted. Default: static-assets.'],
              ['policy.allowedProviders', 'LeanletExecutionProvider[]', 'Providers eligible for selection. Defaults to all provider identifiers.'],
              ['selectProvider?', '(manifest, allowed) => provider | undefined', 'Custom provider selection. The result must be both declared and allowed.'],
            ]} />
            <h3>Methods</h3>
            <div className="api-methods">
              <article><Signature>{`register<I, O, S>(definition): this`}</Signature><p>Registers one definition. Throws <code>DUPLICATE_ID</code> for a reused ID and <code>DESTROYED</code> after shutdown.</p></article>
              <article><Signature>{`has(id: string): boolean`}</Signature><p>Returns whether an ID is currently registered.</p></article>
              <article><Signature>{`run<I, O>(id, input, options?): Promise<LeanletResult<O>>`}</Signature><p>Validates synchronously, queues work, loads lazily, then resolves a structured result. See run options and result semantics below.</p></article>
              <article><Signature>{`prewarm(id, options?): Promise<void>`}</Signature><p>Loads and retains state. Throws when policy, provider, registration, destruction, or full concurrency prevents prewarming.</p></article>
              <article><Signature>{`dispose(id): Promise<void>`}</Signature><p>Releases loaded state and preserves registration. Throws if the capability is active.</p></article>
              <article><Signature>{`unregister(id): Promise<void>`}</Signature><p>Disposes then removes an ID. Rejects while matching work is queued or active.</p></article>
              <article><Signature>{`subscribe(listener): () => void`}</Signature><p>Receives synchronous runtime events. Listener exceptions are isolated. The return value unsubscribes.</p></article>
              <article><Signature>{`inspect(): LeanletKernelSnapshot`}</Signature><p>Returns a point-in-time in-memory snapshot; it does not retain history.</p></article>
              <article><Signature>{`destroy(): Promise<void>`}</Signature><p>Idempotently settles queued work, requests cooperative cancellation, waits for active work, disposes loaded state, and clears listeners.</p></article>
            </div>
          </section>

          <section id="definition">
            <p className="docs-kicker">Managed capability</p><h2>KernelLeanletDefinition</h2>
            <Signature>{`type KernelLeanletDefinition<Input, Output, State = undefined> = {
  manifest: LeanletManifest;
  load?: (context: LeanletRunContext) => State | Promise<State>;
  run: (input: Input, state: State, context: LeanletRunContext)
    => LeanletResult<Output> | Promise<LeanletResult<Output>>;
  dispose?: (state: State) => void | Promise<void>;
};`}</Signature>
            <p><code>load</code> is shared by simultaneous first runs and reused until disposal or eviction. <code>run</code> should check <code>context.signal</code> around expensive cooperative steps. <code>dispose</code> must release workers, GPU buffers, WASM sessions, indexes, and event handlers owned by the loaded state. Registration rejects empty identity fields, empty/unknown provider lists, unknown network classes, invalid resident estimates, and invalid asset paths or sizes.</p>
            <Code>{`const sentiment: KernelLeanletDefinition<string, 'positive' | 'negative', Model> = {
  manifest: {
    id: 'text.sentiment', version: '1.2.0', task: 'sentiment',
    providers: ['wasm-single'], network: 'static-assets',
    estimatedResidentBytes: 18_000_000,
  },
  load: context => loadModel('/assets/sentiment.onnx', context.signal),
  async run(text, model, context) {
    if (context.signal.aborted) return abstained('cancelled');
    const prediction = await model.run(text);
    return prediction.score >= .72
      ? accepted(prediction.label, { score: prediction.score })
      : abstained('low-score', prediction.alternatives);
  },
  dispose: model => model.release(),
};`}</Code>
          </section>

          <section id="manifest">
            <p className="docs-kicker">Declared contract</p><h2>LeanletManifest</h2>
            <Fields rows={[
              ['id', 'string', 'Stable registry key. Uniqueness is enforced within a kernel.'],
              ['version', 'string', 'Capability contract/implementation version included in provenance.'],
              ['task', 'string', 'Bounded purpose used for inspection; it is not executed as a prompt.'],
              ['description?', 'string', 'Human-facing explanation.'],
              ['providers', 'readonly provider[]', 'Supported execution mechanisms in preference order by default.'],
              ['network?', "'deny' | 'static-assets' | 'application-managed'", 'Declared requirement. Omitted means deny.'],
              ['estimatedResidentBytes?', 'number', 'Conservative loaded-state estimate. Omitted means zero to the scheduler.'],
              ['assets?', 'readonly LeanletAsset[]', 'Static release inputs for planning and supply-chain records.'],
            ]} />
            <h3>LeanletAsset</h3>
            <Fields rows={[
              ['path', 'string', 'Application-relative or logical asset path.'],
              ['bytes', 'number', 'Release byte size used by the planner.'],
              ['sha256?', 'string', 'Expected content digest. The planner records it; the CLI verifies downloaded assets.'],
              ['license?', 'string', 'SPDX expression or upstream license label.'],
              ['sourceRevision?', 'string', 'Immutable upstream revision or release identifier.'],
            ]} />
          </section>

          <section id="context">
            <p className="docs-kicker">Per execution</p><h2>LeanletRunContext</h2>
            <Fields rows={[
              ['requestId', 'readonly string', 'Kernel-generated UUID for correlation.'],
              ['signal', 'readonly AbortSignal', 'Aborts at caller cancellation, deadline, or kernel destruction. Work must cooperate.'],
              ['deadline', 'readonly number', 'Absolute high-resolution timestamp in the same time domain as performance.now().'],
              ['provider', 'readonly provider', 'Provider selected for this run/load.'],
              ['emit(detail)', '(Record<string, unknown>) => void', 'Publishes a diagnostic event without changing result semantics.'],
            ]} />
            <p>Admission policy is metadata enforcement, not a JavaScript sandbox. A JavaScript Leanlet can call browser APIs unless the application also enforces CSP, origin, permission, and code-review boundaries.</p>
          </section>

          <section id="results">
            <p className="docs-kicker">Discriminated union</p><h2>LeanletResult&lt;Output&gt;</h2>
            <Code>{`if (result.status === 'accepted') {
  use(result.output, result.score, result.provenance, result.timing);
} else if (result.status === 'abstained') {
  fallback(result.reason, result.candidates);
} else {
  report(result.error.code, result.recoverable);
}`}</Code>
            <Fields rows={[
              ['accepted.output', 'Output', 'Typed output.'],
              ['accepted.score?', 'number', 'Capability-defined evidence; not inherently a probability.'],
              ['accepted.calibratedConfidence?', 'number', 'Only for values backed by a documented calibration procedure.'],
              ['abstained.reason', 'reason union', 'cancelled, deadline-exceeded, budget-exceeded, low-score, unsupported-input, or policy-denied.'],
              ['abstained.candidates?', 'unknown[]', 'Optional evidence for a fallback or review UI.'],
              ['failed.error', 'LeanletError', 'Typed framework/runtime error.'],
              ['failed.recoverable', 'boolean', 'Whether retry may be reasonable; applications still choose retry policy.'],
              ['timing?', 'LeanletTiming', 'queuedMs, loadMs, runMs, and totalMs added by the kernel.'],
              ['provenance?', 'LeanletProvenance', 'leanletId, leanletVersion, and selected provider.'],
            ]} />
            <h3>Result constructors</h3>
            <Signature>{`accepted<Output>(output, { score?, calibratedConfidence? }?): LeanletResult<Output>
abstained(reason, candidates?): LeanletResult<never>`}</Signature>
          </section>

          <section id="run-options">
            <p className="docs-kicker">Scheduling request</p><h2>KernelRunOptions</h2>
            <Fields rows={[
              ['signal?', 'AbortSignal', 'Cancels this caller. For coalesced work, cancellation does not cancel other callers.'],
              ['deadlineMs?', 'number', 'Relative queue + load + run deadline. Defaults to the kernel budget.'],
              ['priority?', 'number = 0', 'Finite number. Higher values queue first; ties use earliest deadline then FIFO.'],
              ['coalesceKey?', 'string', 'Shares queued/active computation for the same Leanlet ID and exact key.'],
            ]} />
            <p>Coalescing does not compare inputs. The application is responsible for a collision-resistant key representing all behaviorally relevant input and options. Results are shared only while the matching computation is queued or active.</p>
          </section>

          <section id="custom-models">
            <p className="docs-kicker">Custom adapter</p><h2>defineModelPack / defineModelLeanlet</h2>
            <Signature>{`defineModelPack(pack: LeanletModelPack): LeanletModelPack
defineModelLeanlet<Input, Output, State>(definition: ModelLeanletDefinition<Input, Output, State>): DefinedModelLeanlet<Input, Output, State>`}</Signature>
            <p><code>LeanletModelPack</code> declares model ID, immutable revision, format, license, providers, assets, and estimated resident bytes, with optional source, languages, parameter count, quantization, and context length. <code>defineModelLeanlet</code> maps its load/run/dispose adapter into the managed kernel contract. Metadata is frozen; the adapter still owns runtime correctness and asset verification.</p>
          </section>

          <section id="checks">
            <p className="docs-kicker">Delegated policy</p><h2>defineCheck / runCheck</h2>
            <Signature>{`defineCheck<Subject, LeanletInput, LeanletOutput, Evidence>(definition): DefinedLeanletCheck
runCheck(kernel, check, subject, options?): Promise<LeanletCheckResult<Evidence>>`}</Signature>
            <p>A check declares <code>id</code>, <code>version</code>, target <code>leanletId</code>, <code>prepare(subject)</code>, and <code>decide(output, subject)</code>. Accepted output becomes a completed <code>pass</code>, <code>review</code>, or <code>fail</code> decision. Leanlet abstention and failure remain distinct results; kernel timing and provenance are preserved.</p>
          </section>

          <section id="flows">
            <p className="docs-kicker">Composition</p><h2>defineFlow</h2>
            <Signature>{`defineFlow<Input, Output>(definition: LeanletFlowDefinition<Input, Output>): LeanletFlow<Input, Output>`}</Signature>
            <Fields rows={[
              ['id', 'string', 'Non-empty flow identity.'],
              ['version', 'string', 'Non-empty orchestration behavior version.'],
              ['uses', 'readonly string[]', 'Allowed Leanlet IDs; duplicates are removed and the list is frozen.'],
              ['run', '(input, context) => LeanletResult<Output>', 'Application-owned orchestration and decision logic.'],
              ['context.signal', 'AbortSignal | undefined', 'Outer cancellation signal.'],
              ['context.run(id, input, options?)', 'Promise<LeanletResult<T>>', 'Runs a declared dependency and appends its completion to the trace.'],
            ]} />
            <p><code>flow.run(kernel, input, options)</code> resolves <code>{`{ flowId, flowVersion, result, trace }`}</code>. Outer deadline and priority become dependency defaults; each dependency may override them. Trace order is completion order, not declaration order, and it is not a durable workflow history. Calling an ID absent from <code>uses</code> or throwing inside flow code rejects the flow promise.</p>
            <div className="docs-callout amber"><ShieldCheck /><div><strong>Deadlines become cooperative after execution starts</strong><p>The kernel enforces deadlines while queued and aborts the run context at the deadline. A WASM, GPU, or JavaScript operation that does not observe the signal can still finish, and a definition that ignores the aborted signal can still return a result.</p></div></div>
          </section>

          <section id="events">
            <p className="docs-kicker">Observability</p><h2>Events and snapshots</h2>
            <p>Lifecycle events: <code>registered</code>, <code>unregistered</code>, <code>loaded</code>, <code>disposed</code>. Request events: <code>queued</code>, <code>coalesced</code>, <code>started</code>, <code>completed</code>, <code>abstained</code>, <code>failed</code>. A Leanlet can emit <code>diagnostic</code> details.</p>
            <Fields rows={[
              ['destroyed', 'boolean', 'Whether kernel shutdown began.'],
              ['activeRuns', 'number', 'Currently admitted load/run operations.'],
              ['queuedRuns', 'number', 'Waiting requests.'],
              ['declaredResidentBytes', 'number', 'Sum of estimates for loaded definitions, not measured browser heap.'],
              ['telemetry.completedRuns', 'number', 'Settled accepted, abstained, or failed executions.'],
              ['telemetry.coalescedRuns', 'number', 'Callers attached to existing keyed work.'],
              ['telemetry.evictions', 'number', 'Idle loaded states disposed to make declared room.'],
              ['leanlets[]', 'snapshot item[]', 'ID, version, task, load state, active runs, and estimate per registration.'],
            ]} />
          </section>

          <section id="assets">
            <p className="docs-kicker">Release planning</p><h2>planLeanletAssets</h2>
            <Signature>{`planLeanletAssets(
  manifests: readonly LeanletManifest[],
  options?: { maxBytes?: number; requireHashes?: boolean }
): LeanletAssetPlan`}</Signature>
            <p>Deduplicates paths, merges a missing hash from another identical reference, and throws <code>LOAD_FAILED</code> for conflicting sizes/hashes or required missing hashes. <code>maxBytes</code> sets <code>withinBudget</code>; it does not throw.</p>
            <p>The plan returns sorted assets, total and verified bytes, unverified paths, duplicate-reference count, budget status, and the optional budget value.</p>
          </section>

          <section id="evaluation">
            <p className="docs-kicker">Offline evaluation</p><h2>evaluateClassification</h2>
            <Signature>{`evaluateClassification<Input, Output, Label extends string>(
  cases: readonly { id: string; input: Input; expected: Label }[],
  run: (input: Input) => Promise<LeanletResult<Output>>,
  labelOf: (output: Output) => Label,
): Promise<ClassificationEvaluationMetrics<Label>>`}</Signature>
            <p>Cases execute sequentially. The report contains total/accepted/abstained/failed, coverage, overall accuracy, accepted-only accuracy, macro F1, p50/p95 latency, and per-label support, predicted count, correct count, precision, recall, and F1. Empty denominators return zero.</p>
          </section>

          <section id="vision">
            <p className="docs-kicker">Browser adapter</p><h2>VisionLeanlet</h2>
            <Fields rows={[
              ['new VisionLeanlet(options?)', 'constructor', 'Creates and configures one module worker immediately. Requires Worker support.'],
              ['model', 'getter', 'Returns the active LeanletModelDefinition.'],
              ['classify(blob, options?)', 'Promise<CategoryResult>', 'Runs image classification; per-call categories and signal are optional.'],
              ['warmup()', 'void', 'Asks the worker to load the configured runtime/model. Progress arrives via events.'],
              ['setModel(id)', 'void', 'Terminates the worker, rejects pending work, changes profile, and creates a new worker.'],
              ['subscribe(listener)', '() => void', 'Observes status, result, cancelled, and error events.'],
              ['destroy()', 'void', 'Idempotently terminates the worker and rejects pending work.'],
            ]} />
            <h3>VisionLeanletOptions</h3>
            <Fields rows={[
              ['model?', 'LeanletModelId', 'Default: mobileclip-s0.'],
              ['categories?', 'readonly string[]', 'Default retail taxonomy. Used directly by zero-shot profiles.'],
              ['assetBase?', 'string', 'Base URL containing models/ and wasm/. Default: document base directory.'],
              ['threads?', 'number', 'Clamped to 1–4. Default: 1. Threads require compatible isolation/deployment.'],
              ['workerUrl?', 'URL', 'Explicit built module-worker URL for unusual bundlers.'],
              ['debug?', 'boolean', 'Default false. Writes worker lifecycle diagnostics to DevTools.'],
              ['classify.categories?', 'readonly string[]', 'Overrides configured categories for one request.'],
              ['classify.signal?', 'AbortSignal', 'Cancels result delivery and sends cancellation to the worker. Active backend calls may finish.'],
            ]} />
            <h3>CategoryResult</h3>
            <p><code>category</code>, relative <code>score</code>, deprecated <code>confidence</code> alias, ranked <code>predictions</code>, <code>elapsedMs</code>, and <code>modelId</code>. Scores are relative to the supplied candidates and are not calibrated probabilities.</p>
          </section>

          <section id="models">
            <p className="docs-kicker">Vision profiles</p><h2>Model catalog exports</h2>
            <p><code>LEANLET_MODELS</code> maps each <code>LeanletModelId</code> to its name, upstream model ID, task, approximate asset size, tier, strengths, limitations, immutable source revision, and optional text/vision dtype. <code>getLeanletModel(id)</code> returns that entry.</p>
            <p><code>DEFAULT_PRODUCT_CATEGORIES</code> is the built-in retail category list. <code>DEFAULT_CATEGORY_PROMPTS</code> expands those category names for the zero-shot adapter. Fixed-vocabulary MobileNet profiles do not follow arbitrary prompt text.</p>
          </section>

          <section id="errors">
            <p className="docs-kicker">Framework errors</p><h2>LeanletError</h2>
            <Signature>{`new LeanletError(code: LeanletErrorCode, message: string, cause?: unknown)`}</Signature>
            <Fields rows={[
              ['DUPLICATE_ID', 'configuration', 'Registration reused an ID.'],
              ['NOT_REGISTERED', 'configuration', 'No definition exists for the requested ID.'],
              ['DESTROYED', 'lifecycle', 'An operation targeted a destroyed kernel.'],
              ['BUDGET_EXCEEDED', 'resource', 'Declared resident or prewarm concurrency budget prevents admission.'],
              ['LOAD_FAILED', 'runtime/supply', 'Initialization, policy prewarm, asset conflict, or hash requirement failed.'],
              ['RUN_FAILED', 'runtime', 'Definition execution threw.'],
              ['DISPOSE_FAILED', 'lifecycle', 'Unsafe disposal/unregistration or dispose callback failure.'],
              ['UNSUPPORTED_PROVIDER', 'compatibility', 'Provider selection returned no declared, allowed provider.'],
            ]} />
          </section>

          <section id="exports">
            <p className="docs-kicker">Package index</p><h2>All public exports</h2>
            <div className="export-grid">
              <article><strong>Values</strong><code>VisionLeanlet</code><code>LeanletError</code><code>LeanletKernel</code><code>accepted</code><code>abstained</code><code>createLeanletKernel</code><code>defineLeanlet</code><code>defineFlow</code><code>defineModelPack</code><code>defineModelLeanlet</code><code>defineCheck</code><code>runCheck</code><code>planLeanletAssets</code><code>evaluateClassification</code><code>LEANLET_MODELS</code><code>getLeanletModel</code><code>DEFAULT_PRODUCT_CATEGORIES</code><code>DEFAULT_CATEGORY_PROMPTS</code></article>
              <article><strong>Kernel types</strong><code>KernelLeanletDefinition</code><code>KernelRunOptions</code><code>LeanletManifest</code><code>LeanletAsset</code><code>LeanletResult</code><code>LeanletRunContext</code><code>LeanletTiming</code><code>LeanletProvenance</code><code>LeanletKernelOptions</code><code>LeanletKernelBudget</code><code>LeanletKernelPolicy</code><code>LeanletKernelEvent</code><code>LeanletKernelSnapshot</code><code>LeanletExecutionProvider</code><code>LeanletErrorCode</code></article>
              <article><strong>Flow, model, check, and utility types</strong><code>LeanletFlow</code><code>LeanletFlowContext</code><code>LeanletFlowDefinition</code><code>LeanletFlowResult</code><code>LeanletFlowTrace</code><code>LeanletModelPack</code><code>ModelLeanletDefinition</code><code>DefinedModelLeanlet</code><code>LeanletCheckDefinition</code><code>LeanletCheckDecision</code><code>LeanletCheckResult</code><code>LeanletCheckVerdict</code><code>DefinedLeanletCheck</code><code>LeanletAssetPlan</code><code>ClassificationEvaluationCase</code><code>ClassificationEvaluationMetrics</code></article>
              <article><strong>Simple and vision types</strong><code>LeanletDefinition</code><code>ScopedLeanlet</code><code>LeanletModelDefinition</code><code>LeanletModelId</code><code>VisionLeanletOptions</code><code>ClassifyOptions</code><code>CategoryResult</code><code>Prediction</code><code>LeanletStatus</code><code>LeanletEvent</code></article>
            </div>
          </section>

          <div className="docs-next"><span>Compatibility</span><a href="../migrate/">Migrate from 0.2 <ArrowRight /></a></div>
        </article>

        <aside className="docs-toc"><p>On this page</p>{sections.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}</aside>
      </div>
    </main>
  );
}
