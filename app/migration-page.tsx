'use client';

import { ArrowLeft, ArrowRight, Check, Info, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { NpmMark } from '@/components/npm-mark';

const sections = [
  ['migration-overview', 'Version status'],
  ['compatibility', 'Compatibility matrix'],
  ['upgrade', 'Upgrade steps'],
  ['events', 'Event union change'],
  ['score', 'Score terminology'],
  ['managed', 'Adopt managed APIs'],
  ['assets', 'Asset changes'],
  ['rollback', 'Rollout and rollback'],
] as const;

function Logo() {
  return <span className="inline-flex items-center gap-2.5"><span className="logo-mark" aria-hidden="true"><i /><i /><i /></span><span className="text-[17px] font-semibold tracking-[-0.035em]">Leanlet</span></span>;
}

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return <div className="docs-code"><button type="button" onClick={() => { void navigator.clipboard.writeText(children); setCopied(true); window.setTimeout(() => setCopied(false), 1_400); }}>{copied ? 'Copied' : 'Copy'}</button><pre><code>{children}</code></pre></div>;
}

export default function MigrationGuide() {
  return (
    <main className="docs-root">
      <header className="site-header"><div className="shell flex h-16 items-center justify-between">
        <a href="../../"><Logo /></a><span className="docs-divider">Migration</span>
        <nav className="ml-auto hidden items-center gap-6 text-sm text-[#59667e] sm:flex"><a href="../">Guide</a><a href="../api/">API</a><a href="#upgrade">Upgrade</a></nav>
        <a className="nav-install ml-5 hidden lg:inline-flex" href="https://www.npmjs.com/package/leanlet-ai" target="_blank" rel="noreferrer"><NpmMark /> npm</a>
        <a className="nav-cta ml-2" href="../../studio/">SafeShare <ArrowRight className="size-3.5" /></a>
      </div></header>
      <div className="docs-layout shell">
        <aside className="docs-sidebar">
          <a className="docs-back" href="../"><ArrowLeft /> Documentation</a>
          <div className="docs-version"><small>Migration path</small><strong>0.2 → 0.3</strong><span>Managed APIs are opt-in</span></div>
          <p>Guide</p>{sections.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}
        </aside>
        <article className="docs-content migration-guide">
          <section id="migration-overview" className="docs-intro">
            <div className="docs-badge">Compatibility guide</div>
            <h1>Keep the simple path. Add control when you need it.</h1>
            <p>Leanlet 0.3 adds a managed kernel, flows, resource planning, evaluation, and stronger lifecycle behavior. Existing 0.2 applications do not need to adopt those concepts to upgrade.</p>
            <div className="version-cards">
              <article><small>PUBLIC STABLE</small><strong>0.2.0</strong><span>Single-capability API and vision adapter</span></article>
              <ArrowRight />
              <article className="current"><small>PRERELEASE</small><strong>0.3.0-beta.1</strong><span>Additive managed runtime and compatibility fixes</span></article>
            </div>
            <div className="docs-callout amber"><TriangleAlert /><div><strong>Use the npm <code>next</code> tag during beta</strong><p>Do not move a production application to the beta implicitly. Pin the prerelease, run your existing tests, and evaluate the selected model assets on supported devices.</p></div></div>
          </section>

          <section id="compatibility">
            <p className="docs-kicker">At a glance</p><h2>Compatibility matrix</h2>
            <div className="docs-table compatibility-table">
              <div><span>0.2 surface</span><span>0.3 status</span><span>Action</span></div>
              <div><strong><code>defineLeanlet</code></strong><span>Compatible</span><span>None required.</span></div>
              <div><strong><code>VisionLeanlet</code></strong><span>Compatible methods/options</span><span>Review cancellation and new event member.</span></div>
              <div><strong><code>CategoryResult.confidence</code></strong><span>Retained, deprecated</span><span>Move new code to <code>score</code>.</span></div>
              <div><strong><code>LeanletEvent</code></strong><span>Adds <code>cancelled</code></span><span>Update exhaustive switches.</span></div>
              <div><strong>Model profile IDs</strong><span>Retained</span><span>Re-evaluate accuracy/assets as usual.</span></div>
              <div><strong>Kernel and flows</strong><span>New, opt-in</span><span>Adopt only for shared control.</span></div>
            </div>
          </section>

          <section id="upgrade">
            <p className="docs-kicker">Minimal upgrade</p><h2>Upgrade without adopting the kernel</h2>
            <Code>{`npm install leanlet-ai@next --save-exact
npm ls leanlet-ai`}</Code>
            <ol className="migration-steps">
              <li><b>1</b><div><strong>Pin the beta</strong><p>Use an exact prerelease version while testing. A prerelease range can admit later beta behavior.</p></div></li>
              <li><b>2</b><div><strong>Build with your current TypeScript settings</strong><p>The package remains ESM and uses browser APIs for the vision adapter.</p></div></li>
              <li><b>3</b><div><strong>Run lifecycle and browser tests</strong><p>Exercise model changes, navigation cancellation, worker errors, asset paths, CSP, and teardown.</p></div></li>
              <li><b>4</b><div><strong>Deploy behind your normal release control</strong><p>Compare cold asset load, warm inference, UI responsiveness, and task metrics by device class.</p></div></li>
            </ol>
            <Code>{`// This 0.2-style code remains valid in 0.3.
import { defineLeanlet } from 'leanlet-ai';

const detector = defineLeanlet({
  id: 'language.route',
  infer: (text: string) => existingLanguageModel.detect(text),
});

const route = await detector.run(message);
await detector.destroy();`}</Code>
          </section>

          <section id="events">
            <p className="docs-kicker">Source compatibility</p><h2>Handle the cancelled event</h2>
            <p><code>LeanletEvent</code> adds a public <code>cancelled</code> member. Normal listeners remain compatible. An exhaustive switch using a <code>never</code> assertion will correctly fail to compile until the new case is handled.</p>
            <Code>{`vision.subscribe(event => {
  switch (event.type) {
    case 'status': updateProgress(event); break;
    case 'result': render(event.result); break;
    case 'error': report(event.message); break;
    case 'cancelled': clearPending(event.requestId); break; // new in 0.3
    default: assertNever(event);
  }
});`}</Code>
            <p>For <code>VisionLeanlet.classify</code>, an already-aborted signal rejects immediately with an <code>AbortError</code>. Later cancellation rejects the caller and sends a discard request to the worker. The active inference backend may finish before observing cancellation.</p>
          </section>

          <section id="score">
            <p className="docs-kicker">Terminology</p><h2>Prefer score over confidence</h2>
            <p>The old <code>confidence</code> field implied probability calibration that the adapter does not provide. 0.3 adds <code>score</code> and retains <code>confidence</code> as the same numeric value for source compatibility.</p>
            <Code>{`const result = await vision.classify(image);

// 0.3 terminology
if (result.score >= acceptanceThreshold) use(result.category);

// Still present during compatibility window, but deprecated:
console.log(result.confidence);`}</Code>
            <div className="docs-callout blue"><Info /><div><strong>A threshold is application policy</strong><p>Choose thresholds with representative labeled data for each taxonomy, profile, capture condition, and device class. Do not copy the demo threshold into a production decision.</p></div></div>
          </section>

          <section id="managed">
            <p className="docs-kicker">Optional adoption</p><h2>Move to managed execution incrementally</h2>
            <p>Do not wrap every helper merely to use the kernel. Adopt it when two or more expensive or policy-sensitive capabilities compete for page resources, share loaded state, need structured abstention, or participate in a composed decision.</p>
            <Code>{`import { accepted, createLeanletKernel } from 'leanlet-ai';

const kernel = createLeanletKernel({
  budget: { maxConcurrentRuns: 2, maxResidentBytes: 96_000_000 },
  policy: { network: 'deny', allowedProviders: ['javascript', 'wasm-single'] },
});

kernel.register({
  manifest: {
    id: 'language.route', version: '1.0.0', task: 'language-routing',
    providers: ['javascript'], network: 'deny', estimatedResidentBytes: 2048,
  },
  run: text => accepted(detectLanguage(text)),
});

const result = await kernel.run('language.route', message);
await kernel.destroy();`}</Code>
            <h3>When to add a flow</h3>
            <p>Add <code>defineFlow</code> only when the product result depends on several Leanlets. The flow should expose orchestration and fusion—not hide application policy in a generic agent loop.</p>
          </section>

          <section id="assets">
            <p className="docs-kicker">Release inputs</p><h2>Regenerate and version static assets</h2>
            <Code>{`npx leanlet models list
npx leanlet models add mobileclip-s0-compact --dir public/leanlet-assets-v3`}</Code>
            <p>The 0.3 asset CLI verifies pinned upstream files before replacing local files. Keep model assets out of the npm bundle, deploy them under an immutable/versioned base path, preserve upstream notices, and point <code>assetBase</code> at the directory containing <code>models/</code> and <code>wasm/</code>.</p>
            <p>Changing package code does not automatically migrate an existing asset directory. Re-run the CLI for the profile and release path you intend to ship, then verify its network responses and model initialization in the deployed origin.</p>
          </section>

          <section id="rollback">
            <p className="docs-kicker">Operations</p><h2>Rollout and rollback</h2>
            <div className="checklist">
              {[
                'Keep 0.2 and 0.3 asset paths separate and immutable.',
                'Record package version, capability version, model revision, taxonomy, and thresholds together.',
                'Use an application flag to select the new runtime path.',
                'Compare task quality, abstention, p50/p95 latency, cold bytes, and UI responsiveness.',
                'Rollback by restoring the application bundle and its matching assetBase; do not mutate cached assets in place.',
              ].map((item) => <div key={item}><Check />{item}</div>)}
            </div>
          </section>
          <div className="docs-next"><span>Complete contract</span><a href="../api/">Open API reference <ArrowRight /></a></div>
        </article>
        <aside className="docs-toc"><p>On this page</p>{sections.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}</aside>
      </div>
    </main>
  );
}
