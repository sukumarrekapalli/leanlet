'use client';

import { useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Boxes,
  Check,
  ChevronRight,
  CircleGauge,
  ExternalLink,
  FileCheck2,
  GitFork,
  Package,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import { NpmMark } from '@/components/npm-mark';

const sections = [
  ['overview', 'Overview'],
  ['architecture', 'Architecture'],
  ['installation', 'Installation'],
  ['choose', 'Choose an API'],
  ['first-leanlet', 'First Leanlet'],
  ['kernel', 'Kernel'],
  ['leanlets', 'Leanlet definitions'],
  ['flows', 'Flows'],
  ['scheduling', 'Scheduling'],
  ['results', 'Results and errors'],
  ['assets', 'Assets and budgets'],
  ['vision', 'Vision runtime'],
  ['language-models', 'Language identification'],
  ['evaluation', 'Evaluation'],
  ['observability', 'Observability'],
  ['production', 'Production guide'],
  ['browser-support', 'Browser support'],
  ['limitations', 'Limitations'],
  ['open-source', 'Project'],
] as const;

function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="logo-mark" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span className="text-[17px] font-semibold tracking-[-0.035em]">
        Leanlet
      </span>
    </span>
  );
}

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="docs-code">
      <button type="button" onClick={() => void copy()} aria-label="Copy code">
        {copied ? 'Copied' : 'Copy'}
      </button>
      <pre>
        <code>{children}</code>
      </pre>
    </div>
  );
}

function ArchitectureDiagram() {
  return (
    <div
      className="docs-architecture"
      aria-label="Leanlet runtime architecture"
    >
      <div className="architecture-app">
        <span>APPLICATION</span>
        <strong>UI event or application workflow</strong>
        <small>Typed inputs · acceptance policy · fallback</small>
      </div>
      <ArrowRight />
      <div className="architecture-kernel">
        <header>
          <span>LEANLET KERNEL</span>
          <b>one resource boundary</b>
        </header>
        <div>
          <article>
            <CircleGauge />
            <strong>Scheduler</strong>
            <small>priority · deadline · concurrency</small>
          </article>
          <article>
            <Boxes />
            <strong>Lifecycle</strong>
            <small>lazy load · reuse · idle eviction</small>
          </article>
          <article>
            <ShieldCheck />
            <strong>Policy</strong>
            <small>providers · network class · budget</small>
          </article>
          <article>
            <Activity />
            <strong>Events</strong>
            <small>queue · load · run · abstain</small>
          </article>
        </div>
      </div>
      <ArrowRight />
      <div className="docs-architecture-flow">
        <span>FLOW</span>
        <div>
          <i>vision</i>
          <i>text</i>
          <i>rules</i>
          <i>signal</i>
        </div>
        <strong>Fusion + application decision</strong>
      </div>
    </div>
  );
}

export default function Docs() {
  return (
    <main className="docs-root">
      <header className="site-header">
        <div className="shell flex h-16 items-center justify-between">
          <a href="../">
            <Logo />
          </a>
          <span className="docs-divider">Documentation</span>
          <nav className="ml-auto hidden items-center gap-6 text-sm text-[#59667e] sm:flex">
            <a href="./api/">API reference</a>
            <a href="./migrate/">Migration</a>
            <a href="#production">Production</a>
          </nav>
          <a
            className="nav-install ml-5 hidden lg:inline-flex"
            href="https://www.npmjs.com/package/leanlet-ai"
            target="_blank"
            rel="noreferrer"
          >
            <NpmMark /> npm
          </a>
          <a className="nav-cta ml-2" href="../studio/">
            SafeShare <ArrowRight className="size-3.5" />
          </a>
        </div>
      </header>

      <div className="docs-layout shell">
        <aside className="docs-sidebar">
          <a className="docs-back" href="../">
            <ArrowLeft /> Back to Leanlet
          </a>
          <div className="docs-version">
            <small>Documentation</small>
            <strong>0.3.0 beta</strong>
            <span><a href="./migrate/">0.2 migration</a></span>
          </div>
          <p>Learn</p>
          {sections.slice(0, 5).map(([id, label]) => (
            <a href={`#${id}`} key={id}>
              {label}
            </a>
          ))}
          <p>Framework API</p>
          {sections.slice(5, 11).map(([id, label]) => (
            <a href={`#${id}`} key={id}>
              {label}
            </a>
          ))}
          <p>Operations</p>
          {sections.slice(11, 18).map(([id, label]) => (
            <a href={`#${id}`} key={id}>
              {label}
            </a>
          ))}
          <p>Project</p>
          <a href="#open-source">Project</a>
          <a href="./api/">Complete API reference</a>
        </aside>

        <article className="docs-content">
          <section id="overview" className="docs-intro">
            <div className="docs-badge">v0.3.0-beta.1 guide</div>
            <h1>Scoped intelligence, coordinated in the browser.</h1>
            <p>
              Leanlet is a TypeScript runtime for applications that combine
              small, bounded capabilities under one resource and policy
              boundary. A capability can be a compact model, a worker, a
              deterministic rule, or a local statistical method. Flows compose
              their typed results; the application remains responsible for the
              final product decision.
            </p>
            <div className="docs-callout blue">
              <ShieldCheck />
              <div>
                <strong>Local inference is a deployment property</strong>
                <p>
                  Leanlet’s vision runtime reads application-served static
                  assets and performs inference in a browser worker. It adds no
                  inference endpoint or telemetry. Application analytics, remote
                  fallbacks, and asset delivery remain separate trust
                  boundaries.
                </p>
              </div>
            </div>
            <div className="docs-principles">
              <article>
                <strong>Bounded</strong>
                <span>
                  Declare cost, providers, inputs, outputs, and failure states.
                </span>
              </article>
              <article>
                <strong>Composable</strong>
                <span>
                  Join independent evidence through an explicit application
                  flow.
                </span>
              </article>
              <article>
                <strong>Inspectable</strong>
                <span>
                  Observe queue, load, run, abstention, eviction, and
                  provenance.
                </span>
              </article>
            </div>
          </section>

          <section id="architecture">
            <p className="docs-kicker">System model</p>
            <h2>Architecture</h2>
            <p>
              The kernel is an in-page control plane. Leanlets are data-plane
              capabilities. A flow declares which Leanlets it may call and how
              their evidence becomes a result. This keeps model-specific code
              out of application orchestration while avoiding a generic
              autonomous agent inside the product.
            </p>
            <ArchitectureDiagram />
            <h3>Responsibility boundaries</h3>
            <div className="docs-table architecture-table">
              <div>
                <span>Layer</span>
                <span>Owns</span>
                <span>Does not own</span>
              </div>
              <div>
                <strong>Application</strong>
                <span>UX, consent, thresholds, fallback, persistence</span>
                <span>Runtime scheduling internals</span>
              </div>
              <div>
                <strong>Flow</strong>
                <span>Allowed dependencies, parallelism, fusion logic</span>
                <span>Global resource ownership</span>
              </div>
              <div>
                <strong>Kernel</strong>
                <span>
                  Registry, queue, deadlines, lifecycle, declared budgets
                </span>
                <span>Model quality or business correctness</span>
              </div>
              <div>
                <strong>Leanlet</strong>
                <span>One typed capability and its runtime state</span>
                <span>Unrelated application decisions</span>
              </div>
            </div>
          </section>

          <section id="installation">
            <p className="docs-kicker">Start</p>
            <h2>Installation</h2>
            <Code>{`npm install leanlet-ai`}</Code>
            <p>
              The core package contains framework and vision runtime code, not
              model weights. Install only the profile your feature has
              evaluated:
            </p>
            <Code>{`npx leanlet models list
npx leanlet models add mobilenet-v4-small --dir public/leanlet-assets`}</Code>
            <p>
              Point <code>assetBase</code> at the deployed directory containing{' '}
              <code>models/</code> and <code>wasm/</code>. Use a versioned path
              when changing a model or runtime artifact.
            </p>
          </section>

          <section id="choose">
            <p className="docs-kicker">Adoption model</p>
            <h2>Choose the smallest API that solves the problem</h2>
            <p>
              Leanlet has two deliberate levels. They are not competing
              architectures, and the managed level is not required for a single
              capability.
            </p>
            <div className="docs-table architecture-table">
              <div><span>Start with</span><span>Use it when</span><span>Add later when</span></div>
              <div><strong><code>defineLeanlet</code></strong><span>One capability needs lazy load, run, and teardown.</span><span>You need scheduling, policy, structured abstention, or shared budgets.</span></div>
              <div><strong><code>VisionLeanlet</code></strong><span>You need the bundled image adapter and its model profiles.</span><span>Vision participates in a larger decision with other capabilities.</span></div>
              <div><strong><code>LeanletKernel</code></strong><span>Several capabilities compete for browser resources or need one policy boundary.</span><span>A product decision needs explicit orchestration.</span></div>
              <div><strong><code>defineFlow</code></strong><span>Several typed signals combine into one application-owned result.</span><span>Never required for independent calls.</span></div>
            </div>
            <p>
              A practical rule: begin with one Leanlet. Introduce a kernel when
              resource ownership becomes shared. Introduce a flow when evidence
              must be coordinated. Existing simple Leanlets can continue to run
              alongside managed ones during an incremental migration.
            </p>
          </section>

          <section id="first-leanlet">
            <p className="docs-kicker">Five-minute start</p>
            <h2>Build one local capability—no kernel required</h2>
            <Code>{`import { defineLeanlet } from 'leanlet-ai';

const readingEstimate = defineLeanlet<string, { words: number; minutes: number }>({
  id: 'text.reading-estimate',
  infer(text) {
    const words = text.match(/[\\p{L}\\p{N}]+/gu)?.length ?? 0;
    return { words, minutes: Math.max(0.1, words / 225) };
  },
});

const estimate = await readingEstimate.run(message);
await readingEstimate.destroy();`}</Code>
            <p>
              <code>load</code> is optional and lazy. Simultaneous first runs
              share the same load promise. <code>warmup()</code> starts loading
              early; <code>destroy()</code> disposes initialized state and is
              idempotent. Runs after destruction reject.
            </p>
            <div className="docs-callout blue">
              <ShieldCheck />
              <div><strong>This is the complete simple lifecycle</strong><p>There is no hidden global runtime, queue, worker, or network behavior. Your <code>infer</code> function decides the method and your application owns the output semantics.</p></div>
            </div>
            <p><a className="docs-inline-link" href="./api/#simple">Read the complete <code>defineLeanlet</code> contract <ArrowRight /></a></p>
          </section>

          <section id="kernel">
            <p className="docs-kicker">Control plane</p>
            <h2>Create a kernel</h2>
            <Code>{`import { createLeanletKernel } from 'leanlet-ai';

const kernel = createLeanletKernel({
  budget: {
    maxConcurrentRuns: 2,
    maxResidentBytes: 192 * 1024 * 1024,
    defaultDeadlineMs: 2_000,
  },
  policy: {
    network: 'static-assets',
    allowedProviders: ['javascript', 'wasm-single'],
  },
});`}</Code>
            <p>
              Keep one kernel per application resource boundary, not one per
              request. Loaded capability state is reused across runs. Idle
              loaded runtimes are evicted in least-recently-used order when a
              declared resident-memory limit would be exceeded.
            </p>
            <div className="docs-callout amber">
              <ShieldCheck />
              <div>
                <strong>Policy metadata is not a JavaScript sandbox</strong>
                <p>
                  The kernel rejects a capability whose declared network class
                  or provider is not allowed. A custom Leanlet is ordinary
                  application code and can still call browser APIs. Enforce hard
                  network isolation with CSP, permissions, origin design, and
                  code review.
                </p>
              </div>
            </div>
          </section>

          <section id="leanlets">
            <p className="docs-kicker">Capability contract</p>
            <h2>Define and register a Leanlet</h2>
            <Code>{`import { accepted, abstained, type KernelLeanletDefinition } from 'leanlet-ai';

const languageRoute: KernelLeanletDefinition<string, DetectedLanguage, LanguageModel> = {
  manifest: {
    id: 'language.route', version: '1.0.0', task: 'language-routing',
    providers: ['javascript'], network: 'static-assets',
    estimatedResidentBytes: 37 * 1024 * 1024,
  },
  load: () => createLanguageModel(),
  async run(text, model) {
    const result = await model.detect(text);
    return result.reliable
      ? accepted({ code: result.code, score: result.score })
      : abstained('low-score', result.candidates);
  },
  dispose: (model) => model.destroy(),
};

kernel.register(languageRoute);
const result = await kernel.run<string, DetectedLanguage>('language.route', input);`}</Code>
            <p>
              <code>load</code> runs lazily once per loaded lifetime and may
              return model, worker, index, or cache state. <code>run</code>{' '}
              receives that state plus an <code>AbortSignal</code>, deadline,
              selected provider, request ID, and diagnostic emitter.{' '}
              <code>dispose</code> releases the loaded state during eviction,
              explicit disposal, or kernel shutdown.
            </p>
            <div className="api-list">
              <div>
                <code>kernel.register(definition)</code>
                <span>Adds one stable, unique capability ID.</span>
              </div>
              <div>
                <code>kernel.prewarm(id)</code>
                <span>Loads state before the first user-triggered run.</span>
              </div>
              <div>
                <code>kernel.run(id, input, options)</code>
                <span>
                  Schedules valid registered work and resolves to a structured
                  result; programmer or configuration misuse throws synchronously.
                </span>
              </div>
              <div>
                <code>kernel.dispose(id)</code>
                <span>Releases idle loaded state but keeps registration.</span>
              </div>
              <div>
                <code>kernel.unregister(id)</code>
                <span>
                  Disposes and removes an idle capability with no queued
                  requests.
                </span>
              </div>
              <div>
                <code>kernel.inspect()</code>
                <span>
                  Returns current queue, runtime states, declared memory, and
                  counters.
                </span>
              </div>
              <div>
                <code>kernel.destroy()</code>
                <span>
                  Rejects queued work, aborts active work, waits for cooperative
                  settlement, then disposes.
                </span>
              </div>
            </div>
          </section>

          <section id="flows">
            <p className="docs-kicker">Composition</p>
            <h2>Coordinate independent intelligence</h2>
            <Code>{`import { defineFlow } from 'leanlet-ai';

const preflight = defineFlow<string, Decision>({
  id: 'content.preflight', version: '1.0.0',
  uses: ['content.secrets', 'content.links', 'policy.release'],
  async run(input, context) {
    const [secrets, links] = await Promise.all([
      context.run('content.secrets', input),
      context.run('content.links', input),
    ]);
    return context.run('policy.release', { secrets, links });
  },
});

const { result, trace } = await preflight.run(kernel, draft, {
  signal: navigationSignal, deadlineMs: 3_000,
});`}</Code>
            <p>
              <code>uses</code> is enforced at runtime: a flow cannot call an
              undeclared Leanlet. Parallel branches share the kernel’s
              concurrency budget. The trace records branch completion order,
              status, and timing; it is not a static DAG or a durable workflow
              log.
            </p>
          </section>

          <section id="scheduling">
            <p className="docs-kicker">Performance</p>
            <h2>Spend browser resources once</h2>
            <p>
              The kernel combines lazy loading, runtime reuse, bounded
              concurrency, priority ordering, earliest-deadline ordering, and
              idle eviction. Request coalescing prevents duplicate work when
              several components ask for the same expensive result at the same
              time.
            </p>
            <Code>{`const result = await kernel.run('image.embedding', image, {
  priority: 5,
  deadlineMs: 800,
  coalesceKey: contentHash,
  signal: componentSignal,
});`}</Code>
            <div className="docs-performance">
              <article>
                <strong>1 computation</strong>
                <span>
                  Concurrent requests with the same Leanlet ID and key share
                  queued or active work.
                </span>
              </article>
              <article>
                <strong>Independent waits</strong>
                <span>
                  A coalesced caller may cancel its wait without cancelling work
                  needed by other callers.
                </span>
              </article>
              <article>
                <strong>Measured effect</strong>
                <span>
                  <code>inspect().telemetry.coalescedRuns</code> exposes avoided
                  duplicate executions.
                </span>
              </article>
            </div>
            <p>
              Keys are application-defined. Use a stable content hash or
              immutable record revision; never coalesce inputs that merely look
              similar. Priority is numeric and descending. Equal-priority
              requests with the earliest absolute deadline run first. This
              scheduler is in-memory and scoped to one page context.
            </p>
          </section>

          <section id="results">
            <p className="docs-kicker">Control flow</p>
            <h2>Accepted, abstained, or failed</h2>
            <p>
              A run returns a discriminated union. Consumers must handle all
              three states; uncertainty is not encoded as an exception.
            </p>
            <div className="docs-table result-table">
              <div>
                <span>Status</span>
                <span>Meaning</span>
                <span>Typical action</span>
              </div>
              <div>
                <strong>accepted</strong>
                <span>The capability produced an output.</span>
                <span>
                  Apply an application threshold or continue the flow.
                </span>
              </div>
              <div>
                <strong>abstained</strong>
                <span>
                  Cancelled, timed out, over budget, denied, unsupported, or
                  below threshold.
                </span>
                <span>
                  Use a deterministic fallback, ask the user, or route
                  elsewhere.
                </span>
              </div>
              <div>
                <strong>failed</strong>
                <span>Load, execution, disposal, or provider failure.</span>
                <span>
                  Inspect the error code and retry only when marked recoverable.
                </span>
              </div>
            </div>
            <p>
              Accepted results include capability/version/provider provenance
              and queue, load, run, and total timing. A <code>score</code> is
              capability evidence; it is not automatically a probability. Use{' '}
              <code>calibratedConfidence</code> only when the capability’s
              evaluation procedure supports that claim.
            </p>
          </section>

          <section id="assets">
            <p className="docs-kicker">Supply chain</p>
            <h2>Plan assets before runtime</h2>
            <Code>{`import { planLeanletAssets } from 'leanlet-ai';

const plan = planLeanletAssets(manifests, {
  maxBytes: 80 * 1024 * 1024,
  requireHashes: true,
});

if (!plan.withinBudget) throw new Error('Browser asset budget exceeded');`}</Code>
            <p>
              Asset planning deduplicates identical paths and detects
              conflicting sizes or hashes. <code>maxBytes</code> reports whether
              a release fits; it does not throw. <code>requireHashes</code>{' '}
              rejects unverified manifests. Runtime resident bytes are declared
              estimates used for scheduling—not heap measurements supplied by
              the browser.
            </p>
            <h3>Manifest fields</h3>
            <div className="api-list">
              <div>
                <code>id + version</code>
                <span>
                  Stable capability identity and independently releasable
                  contract version.
                </span>
              </div>
              <div>
                <code>task</code>
                <span>Human-readable bounded purpose, not a prompt.</span>
              </div>
              <div>
                <code>providers</code>
                <span>Execution providers the implementation can use.</span>
              </div>
              <div>
                <code>network</code>
                <span>
                  Declared requirement: deny, static-assets, or
                  application-managed.
                </span>
              </div>
              <div>
                <code>estimatedResidentBytes</code>
                <span>
                  Conservative loaded-state estimate for admission and eviction.
                </span>
              </div>
              <div>
                <code>assets</code>
                <span>
                  Path, byte size, SHA-256, license, and source revision.
                </span>
              </div>
            </div>
          </section>

          <section id="vision">
            <p className="docs-kicker">Bundled adapter</p>
            <h2>VisionLeanlet</h2>
            <Code>{`import { VisionLeanlet } from 'leanlet-ai';

const vision = new VisionLeanlet({
  model: 'mobileclip-s0-compact',
  categories: ['Electronics', 'Clothing', 'Home', 'Other'],
  assetBase: '/leanlet-assets/v1/', threads: 1,
});

const result = await vision.classify(file, { signal });
console.log(result.category, result.score, result.elapsedMs);
vision.destroy();`}</Code>
            <p>
              MobileCLIP profiles compare the image with application-provided
              category text. MobileNetV4 profiles use a fixed ImageNet
              vocabulary followed by Leanlet’s product mapping, so they are
              small and fast but unsuitable for arbitrary taxonomies unless
              evaluated for that case.
            </p>
            <div className="docs-table">
              <div>
                <span>Profile</span>
                <span>Download</span>
                <span>Use</span>
              </div>
              <div>
                <strong>
                  mobilenet-v4-small<small>ultra-light</small>
                </strong>
                <span>~3.9 MB</span>
                <span>Known objects; fixed vocabulary.</span>
              </div>
              <div>
                <strong>
                  mobilenet-v4-medium<small>balanced</small>
                </strong>
                <span>~10 MB</span>
                <span>Larger fixed-vocabulary baseline.</span>
              </div>
              <div>
                <strong>
                  mobileclip-s0-compact<small>quantized</small>
                </strong>
                <span>~55 MB</span>
                <span>Custom category text with a smaller encoder.</span>
              </div>
              <div>
                <strong>
                  mobileclip-s0-fp16<small>balanced</small>
                </strong>
                <span>~66 MB</span>
                <span>Custom categories; browser support must be tested.</span>
              </div>
              <div>
                <strong>
                  mobileclip-s0<small>accuracy profile</small>
                </strong>
                <span>~89 MB</span>
                <span>
                  Custom categories with the largest current footprint.
                </span>
              </div>
            </div>
            <p>
              Sizes exclude the shared ONNX Runtime payload. Cancellation stops
              result delivery and asks the worker to discard the request; an
              active backend inference call may finish before the worker can
              observe it.
            </p>
          </section>

          <section id="language-models">
            <p className="docs-kicker">Reference adapter</p>
            <h2>Language identification without a language routing table</h2>
            <p>
              SafeShare and the language case use ELD 2.1.0, an Apache-2.0
              statistical n-gram detector, inside a dedicated module worker.
              The adapter does not inspect Unicode scripts, maintain vocabulary
              lists, or default unmatched input to English. It leaves the model’s
              60-language set unrestricted and converts an unreliable detection
              into a visible review state.
            </p>
            <p>
              The compact example below shows the Leanlet result contract with an
              in-page ELD import. The reference application adds a module-worker
              RPC wrapper around the same detector to keep loading and detection
              off the UI thread.
            </p>
            <Code>{`import { accepted, abstained, type KernelLeanletDefinition } from 'leanlet-ai';
import { eld } from 'eld/extrasmall';

const language: KernelLeanletDefinition<string, { code: string; score: number }, typeof eld> = {
  manifest: {
    id: 'text.language', version: '1.0.0', task: 'language-identification',
    providers: ['javascript'], network: 'static-assets',
    estimatedResidentBytes: 37 * 1024 * 1024,
  },
  load: () => eld,
  run: (text, model) => {
    const result = model.detect(text);
    const score = result.getScores()[result.language] ?? 0;
    if (!result.language || !result.isReliable())
      return abstained('low-score', Object.entries(result.getScores()));
    return accepted({ code: result.language, score });
  },
};

kernel.register(language);`}</Code>
            <div className="docs-callout amber">
              <ShieldCheck />
              <div>
                <strong>Reliability is not the same as a calibrated probability</strong>
                <p>
                  ELD’s score and <code>isReliable()</code> are model signals. Keep
                  an uncertain state, evaluate your real language distribution,
                  and avoid using a top candidate as proof when the detector
                  reports insufficient evidence.
                </p>
              </div>
            </div>
            <div className="docs-table">
              <div><span>Profile</span><span>Packaged data</span><span>Declared resident estimate</span></div>
              <div><strong>eld-extrasmall<small>default</small></strong><span>~294 KB gzip</span><span>37 MB</span></div>
              <div><strong>eld-small</strong><span>~477 KB gzip</span><span>54 MB</span></div>
              <div><strong>eld-medium</strong><span>~586 KB gzip</span><span>71 MB</span></div>
              <div><strong>eld-large<small>largest profile</small></strong><span>~1.28 MB gzip</span><span>138 MB</span></div>
            </div>
            <h3>Model selection and coverage</h3>
            <ul>
              <li>Each profile has an independent worker build entry; the browser requests only the selected worker asset.</li>
              <li>Switching profiles destroys the old worker before creating and prewarming the new one.</li>
              <li>No language subset is configured; all 60 languages contained in the profile remain candidates.</li>
              <li>Languages outside that set are unsupported. Short, mixed, or weak text can also be uncertain.</li>
              <li>Use the same input corpus to compare profiles; a larger database is not automatically sufficient for your domain.</li>
            </ul>
          </section>

          <section id="evaluation">
            <p className="docs-kicker">Release evidence</p>
            <h2>Evaluate the capability, policy, and device</h2>
            <Code>{`import { evaluateClassification } from 'leanlet-ai';

const report = await evaluateClassification(
  labeledCases,
  (input) => kernel.run('product.category', input),
  (output) => output.category,
);

console.table(report.labels);
// coverage, accuracy, acceptedAccuracy, macroF1, p50, p95`}</Code>
            <p>
              Overall accuracy can hide abstention and minority-class failures.
              Gate releases on coverage, accepted accuracy, per-label precision
              and recall, macro F1, latency percentiles, asset bytes, and peak
              behavior on each supported device class. Keep evaluation data
              representative of actual input capture, compression, languages,
              and failure modes.
            </p>
          </section>

          <section id="observability">
            <p className="docs-kicker">Runtime evidence</p>
            <h2>Observe without changing semantics</h2>
            <Code>{`const unsubscribe = kernel.subscribe((event) => {
  // registered, queued, coalesced, started, loaded, completed,
  // abstained, failed, disposed, diagnostic
  appMetrics.record(event);
});

const snapshot = kernel.inspect();
unsubscribe();`}</Code>
            <p>
              Listener failures are isolated from inference and scheduling.
              Events are live process signals, not durable audit records. If you
              export them, remove raw inputs and identifiers according to your
              privacy policy. For the vision adapter, <code>debug: true</code>{' '}
              adds console diagnostics; use the <code>leanlet-vision</code>{' '}
              worker in browser developer tools when diagnosing model loading.
            </p>
          </section>

          <section id="production">
            <p className="docs-kicker">Operational guide</p>
            <h2>Production checklist</h2>
            <div className="checklist">
              {[
                'Define a narrow task, input schema, output schema, and explicit abstention path.',
                'Pin model source revision and record license, SHA-256, bytes, and intended use.',
                'Set conservative concurrency, deadline, and resident-byte budgets per device tier.',
                'Evaluate representative inputs and publish per-label and device-class release gates.',
                'Use versioned asset paths and immutable cache headers for content-addressed files.',
                'Treat low scores, unsupported browsers, missing assets, and worker failures separately.',
                'Abort work on navigation and destroy the application kernel during teardown.',
                'Constrain custom Leanlet code with CSP, origin policy, dependency review, and tests.',
                'Measure cold load, warm run, memory pressure, UI responsiveness, and battery impact.',
                'Roll out behind a product flag and preserve a non-AI path for critical interactions.',
              ].map((item) => (
                <div key={item}>
                  <Check />
                  {item}
                </div>
              ))}
            </div>
            <h3>Versioning</h3>
            <p>
              Version capability code and asset revisions independently. A flow
              version identifies orchestration behavior; each result preserves
              the producing Leanlet version. Treat taxonomy, thresholds,
              calibration, and preprocessing changes as releasable behavior
              changes even when the model file is unchanged.
            </p>
          </section>

          <section id="browser-support">
            <p className="docs-kicker">Compatibility</p>
            <h2>Browser and deployment requirements</h2>
            <ul>
              <li>
                ES modules, Web Workers, WebAssembly, AbortController, and
                modern JavaScript.
              </li>
              <li>
                Model, configuration, tokenizer, and WASM files reachable from{' '}
                <code>assetBase</code>.
              </li>
              <li>
                <code>application/wasm</code> for WebAssembly responses and a
                CSP that permits the module worker and asset fetches.
              </li>
              <li>
                Cross-origin isolation only when enabling WASM threads; the
                default single-threaded provider does not require it.
              </li>
              <li>
                Device-level tests on current and previous supported Chrome,
                Edge, Firefox, and Safari releases, including mobile.
              </li>
            </ul>
            <Code>{`Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp`}</Code>
            <p>
              Those headers are a common route to cross-origin isolation, but
              they can break third-party embeds whose responses do not satisfy
              COEP. Enable multiple runtime threads only after measuring a real
              benefit.
            </p>
          </section>

          <section id="limitations">
            <p className="docs-kicker">Current boundary</p>
            <h2>What Leanlet does not promise</h2>
            <ul>
              <li>
                It does not make a model accurate, fair, calibrated, or suitable
                for a business decision.
              </li>
              <li>
                It does not cryptographically sandbox application-supplied
                JavaScript capabilities.
              </li>
              <li>
                It does not measure exact browser heap or accelerator memory;
                budgets use declared estimates.
              </li>
              <li>
                It does not provide durable jobs, cross-tab scheduling, server
                execution, or distributed consensus.
              </li>
              <li>
                It does not guarantee hard interruption of a native WASM/WebGPU
                call; running cancellation and deadlines are cooperative.
              </li>
              <li>
                It does not include model weights in npm or make upstream model
                licensing decisions for the application.
              </li>
            </ul>
            <p>
              These boundaries are intentional. Leanlet coordinates scoped local
              intelligence; it does not replace application architecture,
              browser security controls, or empirical model evaluation.
            </p>
          </section>

          <section id="open-source">
            <p className="docs-kicker">Project</p>
            <h2>Extend the framework</h2>
            <p>
              Leanlet framework code is Apache-2.0 licensed. New adapters should
              preserve the same manifest, result, lifecycle, cancellation, and
              provenance contracts. Model assets retain upstream licenses and
              notices; review <code>MODEL_LICENSES.md</code> before
              distribution.
            </p>
            <div className="docs-links">
              <a href="../studio/">
                <Workflow /> SafeShare reference app
              </a>
              <a
                href="https://www.npmjs.com/package/leanlet-ai"
                target="_blank"
                rel="noreferrer"
              >
                <NpmMark /> leanlet-ai on npm
              </a>
              <a
                href="https://github.com/sukumarrekapalli/leanlet"
                target="_blank"
                rel="noreferrer"
              >
                <GitFork /> Source on GitHub
              </a>
              <a
                href="https://github.com/sukumarrekapalli/leanlet/issues"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink /> Issues
              </a>
              <a href="#assets">
                <Package /> Asset contract
              </a>
              <a href="#production">
                <FileCheck2 /> Production checklist
              </a>
            </div>
          </section>

          <div className="docs-next">
            <span>Reference application</span>
            <a href="../studio/">
              Open SafeShare <ChevronRight />
            </a>
          </div>
        </article>

        <aside className="docs-toc">
          <p>On this page</p>
          {sections.map(([id, label]) => (
            <a href={`#${id}`} key={id}>
              {label}
            </a>
          ))}
        </aside>
      </div>
    </main>
  );
}
