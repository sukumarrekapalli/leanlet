'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppWindow,
  ArrowRight,
  Box,
  Check,
  ChevronRight,
  Code2,
  Cpu,
  Database,
  FileText,
  Gauge,
  GitFork,
  ImagePlus,
  Layers3,
  LockKeyhole,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Upload,
  WifiOff,
  Workflow,
  Zap,
} from 'lucide-react';
import {
  DEFAULT_PRODUCT_CATEGORIES,
  LEANLET_MODELS,
  VisionLeanlet,
  type CategoryResult,
  type LeanletEvent,
  type LeanletModelId,
} from 'leanlet-ai';
import { CasesSection } from '@/components/case-demos';
import { NpmMark } from '@/components/npm-mark';

type RuntimeState = 'idle' | 'loading' | 'ready' | 'running' | 'error';
const modelOrder: LeanletModelId[] = [
  'mobilenet-v4-medium',
  'mobileclip-s0-fp16',
  'mobileclip-s0',
  'mobileclip-s0-compact',
  'mobilenet-v4-small',
];

const DEFAULT_DEMO_MODEL: LeanletModelId = 'mobilenet-v4-medium';

const platformFeatures = [
  {
    icon: Layers3,
    title: 'Model registry',
    text: 'Choose a supported profile or register your own ONNX model without changing product UI.',
  },
  {
    icon: Workflow,
    title: 'Worker runtime',
    text: 'Inference stays off the main thread. Lifecycle, progress, errors, and cleanup are handled.',
  },
  {
    icon: Code2,
    title: 'Typed contracts',
    text: 'A small TypeScript API returns ranked labels, confidence, timing, and the model used.',
  },
  {
    icon: Box,
    title: 'Static deployment',
    text: 'Models and WebAssembly ship as normal assets on a CDN, edge host, or GitHub Pages.',
  },
];

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

function StatusPill({ runtime }: { runtime: RuntimeState }) {
  return (
    <span className={`status-pill status-${runtime}`}>
      <i />
      {runtime === 'idle' ? 'Not loaded' : runtime}
    </span>
  );
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const leanletRef = useRef<VisionLeanlet | null>(null);
  const [selectedModel, setSelectedModel] =
    useState<LeanletModelId>(DEFAULT_DEMO_MODEL);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [runtime, setRuntime] = useState<RuntimeState>('idle');
  const [status, setStatus] = useState('Loads only when you run it');
  const [progress, setProgress] = useState(0);
  const [loadSeconds, setLoadSeconds] = useState(0);
  const [result, setResult] = useState<CategoryResult | null>(null);
  const busy = runtime === 'loading' || runtime === 'running';
  const model = LEANLET_MODELS[selectedModel];
  const estimatedFirstLoadMB = Math.ceil(model.sizeMB + 22);

  useEffect(() => {
    const leanlet = new VisionLeanlet({
      model: DEFAULT_DEMO_MODEL,
      categories: DEFAULT_PRODUCT_CATEGORIES,
    });
    leanletRef.current = leanlet;
    const unsubscribe = leanlet.subscribe((event: LeanletEvent) => {
      if (event.type === 'status') {
        setRuntime(event.state);
        setStatus(event.message);
        if (event.progress !== undefined)
          setProgress((current) => Math.max(current, event.progress ?? 0));
      } else if (event.type === 'result') setResult(event.result);
      else {
        setRuntime('error');
        setStatus(event.message);
      }
    });
    return () => {
      unsubscribe();
      leanlet.destroy();
      leanletRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const timer = window.setInterval(
      () => setLoadSeconds(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [busy, selectedModel]);

  const chooseModel = (model: LeanletModelId) => {
    if (model === selectedModel) return;
    setSelectedModel(model);
    leanletRef.current?.setModel(model);
    setResult(null);
    setRuntime('idle');
    setProgress(0);
    setLoadSeconds(0);
    setStatus('Loads only when you run it');
  };

  const acceptFile = useCallback((next?: File) => {
    if (!next || !next.type.startsWith('image/')) return;
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(next);
    });
    setFile(next);
    setFileName(next.name);
    setResult(null);
    setLoadSeconds(0);
  }, []);

  useEffect(() => {
    let active = true;
    fetch(new URL('samples/smartphone.png', document.baseURI))
      .then((response) => response.blob())
      .then((blob) => {
        if (active)
          acceptFile(
            new File([blob], 'smartphone-sample.png', { type: 'image/png' }),
          );
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [acceptFile]);

  const classify = () => {
    if (!file || !leanletRef.current) return;
    setResult(null);
    setRuntime(runtime === 'idle' ? 'loading' : 'running');
    setStatus(
      runtime === 'idle'
        ? `Loading ${LEANLET_MODELS[selectedModel].shortName}`
        : 'Classifying inside this browser',
    );
    void leanletRef.current.classify(file).catch(() => undefined);
  };

  return (
    <main id="top" className="min-h-screen bg-white text-[#0b1220]">
      <header className="site-header">
        <div className="shell flex h-16 items-center justify-between">
          <a href="#top" aria-label="Leanlet home">
            <Logo />
          </a>
          <nav
            className="hidden items-center gap-7 text-sm text-[#4b5871] md:flex"
            aria-label="Primary navigation"
          >
            <a href="#platform">Platform</a>
            <a href="#cases">Use cases</a>
            <a href="#models">Models</a>
            <a href="./docs/">Docs</a>
          </nav>
          <div className="flex items-center gap-2">
            <a
              className="nav-install hidden sm:inline-flex"
              href="https://www.npmjs.com/package/leanlet-ai"
              target="_blank"
              rel="noreferrer"
              aria-label="Leanlet package on npm"
            >
              <NpmMark /> leanlet-ai
            </a>
            <a className="nav-cta" href="./docs/">
              Get started <ArrowRight className="size-3.5" />
            </a>
          </div>
        </div>
      </header>

      <section className="hero-grid border-b border-[#dfe5ef]">
        <div className="shell grid gap-12 pb-16 pt-20 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pb-24 lg:pt-28">
          <div>
            <div className="eyebrow">
              <Sparkles className="size-3.5" /> Open framework · browser-native
              AI
            </div>
            <h1 className="mt-7 max-w-[760px] text-[clamp(3.5rem,7vw,7.2rem)] font-semibold leading-[.91] tracking-[-.07em]">
              On-device AI,
              <br />
              <span className="text-[#2762ff]">built into the web.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#536078] sm:text-xl">
              Leanlet helps product teams run bounded, task-specific inference
              inside supported browsers. Assets can be cached with the app, and
              inference does not require a hosted model endpoint.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="#demo" className="primary-button">
                Try it in your browser <ArrowRight />
              </a>
              <a href="./docs/" className="secondary-button">
                <FileText /> Read documentation
              </a>
            </div>
            <a
              className="npm-available"
              href="https://www.npmjs.com/package/leanlet-ai"
              target="_blank"
              rel="noreferrer"
            >
              <NpmMark />
              <span>
                <strong>Available on npm</strong>
                <small>npm install leanlet-ai</small>
              </span>
              <ArrowRight />
            </a>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-[#5e6b82]">
              <span className="hero-proof">
                <WifiOff /> No inference API
              </span>
              <span className="hero-proof">
                <LockKeyhole /> Inputs stay local
              </span>
              <span className="hero-proof">
                <Zap /> WASM + Web Workers
              </span>
            </div>
          </div>
          <div
            className="hero-console"
            aria-label="Leanlet architecture preview"
          >
            <div className="console-top">
              <span className="flex gap-1.5">
                <i />
                <i />
                <i />
              </span>
              <span>product-classifier.ts</span>
              <span className="console-live">
                <i /> local
              </span>
            </div>
            <pre>
              <code>
                <span className="code-purple">import</span>{' '}
                {'{ VisionLeanlet }'} <span className="code-purple">from</span>
                {'\n'}{' '}
                <span className="code-green">&apos;leanlet-ai&apos;</span>
                {'\n\n'}
                <span className="code-blue">const</span> vision ={' '}
                <span className="code-purple">new</span> {'VisionLeanlet({'}
                {`\n  `}model:{' '}
                <span className="code-green">&apos;mobileclip-s0&apos;</span>,
                {`\n  `}categories: catalog.categories,{`\n`}
                {'}'}){`\n\n`}
                <span className="code-blue">const</span> result ={' '}
                <span className="code-purple">await</span>
                {'\n'} vision.classify(product.image){`\n\n`}
                routeTo(result.category)
              </code>
            </pre>
            <div className="console-result">
              <span>
                <Check /> Electronics
              </span>
              <span>confidence 0.72</span>
              <span>0 inference requests</span>
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="bg-[#f6f8fc] py-20 lg:py-28">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Live product classifier</p>
              <h2>Choose the model for the job.</h2>
            </div>
            <p>
              Each listed profile runs in this page. Compare quality, loading,
              memory, and latency on the browsers and devices you support.
            </p>
          </div>
          <div
            className="model-picker"
            role="radiogroup"
            aria-label="Supported models"
          >
            {modelOrder.map((id) => {
              const item = LEANLET_MODELS[id];
              const active = id === selectedModel;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-label={`${item.name}, ${item.sizeMB} megabytes`}
                  aria-checked={active}
                  onClick={() => chooseModel(id)}
                  className={active ? 'model-option active' : 'model-option'}
                >
                  <span className="model-radio">
                    <i />
                  </span>
                  <span className="min-w-0">
                    <strong>{item.shortName}</strong>
                    <small>{item.strength}</small>
                  </span>
                  <span className="model-meta">
                    <b>
                      {id === DEFAULT_DEMO_MODEL ? 'Quick demo' : item.tier}
                    </b>
                    <em>{item.sizeMB} MB</em>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="demo-panel">
            <div className="demo-toolbar">
              <div>
                <span className="demo-label">Vision / Product taxonomy</span>
                <strong>{model.name}</strong>
              </div>
              <div className="flex items-center gap-3">
                <span className="hidden text-xs text-[#758198] sm:block">
                  {DEFAULT_PRODUCT_CATEGORIES.length} candidate categories
                </span>
                <StatusPill runtime={runtime} />
              </div>
            </div>
            <div className="grid lg:grid-cols-[1.05fr_.95fr]">
              <div className="demo-upload-wrap">
                <input
                  ref={inputRef}
                  className="sr-only"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(event) => acceptFile(event.target.files?.[0])}
                />
                <button
                  type="button"
                  aria-label="Choose a product image"
                  onClick={() => inputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    acceptFile(event.dataTransfer.files?.[0]);
                  }}
                  className={`demo-dropzone ${dragging ? 'dragging' : ''}`}
                >
                  {preview ? (
                    <>
                      {/* oxlint-disable-next-line next/no-img-element */}
                      <img
                        src={preview}
                        alt="Product selected for local classification"
                      />
                      <span className="file-chip">
                        <span className="truncate">{fileName}</span>
                        <b>Change image</b>
                      </span>
                    </>
                  ) : (
                    <span className="upload-empty">
                      <i>
                        <ImagePlus />
                      </i>
                      <strong>Drop a product image here</strong>
                      <small>or choose a photo from this device</small>
                      <b>
                        <Upload /> Choose image
                      </b>
                    </span>
                  )}
                </button>
              </div>
              <div className="result-panel" aria-live="polite">
                <div className="result-content">
                  {result ? (
                    <>
                      <p className="demo-label">Best matching category</p>
                      <h3>{result.category}</h3>
                      <div className="confidence-row">
                        <span>Model confidence</span>
                        <strong>{Math.round(result.confidence * 100)}%</strong>
                      </div>
                      <div className="prediction-list">
                        {result.predictions.slice(0, 4).map((prediction) => (
                          <div key={prediction.label}>
                            <span>{prediction.label}</span>
                            <b>{Math.round(prediction.score * 100)}%</b>
                            <i>
                              <em
                                style={{
                                  width: `${Math.max(2, prediction.score * 100)}%`,
                                }}
                              />
                            </i>
                          </div>
                        ))}
                      </div>
                      <p className="runtime-note">
                        <Cpu /> {result.elapsedMs} ms on this device ·{' '}
                        {LEANLET_MODELS[result.modelId].shortName}
                      </p>
                    </>
                  ) : runtime === 'error' ? (
                    <div className="empty-result error-result">
                      <i>
                        <Cpu />
                      </i>
                      <p className="demo-label">Runtime error</p>
                      <h3>The local model could not start.</h3>
                      <small>{status}</small>
                    </div>
                  ) : busy ? (
                    <div className="empty-result">
                      <i className="loading-icon">
                        <Cpu />
                      </i>
                      <p className="demo-label">{status}</p>
                      <h3>Loading the selected runtime in this browser.</h3>
                      <p className="load-detail">
                        <b>{loadSeconds}s elapsed</b>
                        <span>
                          First use may transfer about {estimatedFirstLoadMB} MB
                          including the shared runtime. Keep this tab open;
                          later runs can use the browser cache.
                        </span>
                      </p>
                      {runtime === 'loading' && (
                        <span className="load-track">
                          <i style={{ width: `${Math.max(progress, 5)}%` }} />
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="empty-result">
                      <i>
                        <ScanSearch />
                      </i>
                      <p className="demo-label">Ready when you are</p>
                      <h3>
                        {model.task === 'zero-shot-image-classification'
                          ? 'Classify against your real taxonomy.'
                          : 'Run a fast fixed-vocabulary preview.'}
                      </h3>
                      <small>{model.limitation}</small>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={classify}
                  disabled={!file || busy}
                  className="run-button"
                >
                  <span>
                    {busy
                      ? status
                      : result
                        ? 'Run again locally'
                        : preview
                          ? 'Classify on this device'
                          : 'Add an image to begin'}
                  </span>
                  {busy ? (
                    <RotateCcw className="animate-spin" />
                  ) : (
                    <ArrowRight />
                  )}
                </button>
                <p className="privacy-line">
                  <ShieldCheck /> Model files are cached after first use.
                  Inference creates no API request.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="py-20 lg:py-28">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="section-kicker">The framework</p>
              <h2>A defined boundary for browser inference.</h2>
            </div>
            <p>
              Leanlet separates application code from model infrastructure, so
              teams can evaluate, replace, and govern embedded models without
              rebuilding the experience around them.
            </p>
          </div>
          <div className="feature-grid">
            {platformFeatures.map(({ icon: Icon, title, text }, index) => (
              <article key={title}>
                <span>0{index + 1}</span>
                <Icon />
                <h3>{title}</h3>
                <p>{text}</p>
                <a href="./docs/">
                  Explore in docs <ChevronRight />
                </a>
              </article>
            ))}
          </div>
          <div className="runtime-map" id="how-it-works">
            <div className="runtime-map-heading">
              <div>
                <p className="section-kicker light">How it works</p>
                <h3>Static assets enter. Inference stays in the browser.</h3>
              </div>
              <p>
                Leanlet downloads the selected model and ONNX runtime from the
                application origin. It does not send the input to an inference
                endpoint.
              </p>
            </div>
            <div className="runtime-map-canvas">
              <article className="origin-node">
                <Box />
                <span>Application origin</span>
                <strong>JavaScript · model · WASM</strong>
                <small>Network transfer on first use or asset update</small>
              </article>
              <div className="map-arrow inbound">
                <span>versioned assets</span>
                <ArrowRight />
              </div>
              <div className="browser-boundary">
                <header>
                  <span>
                    <AppWindow /> User&apos;s browser
                  </span>
                  <b>No inference API</b>
                </header>
                <div className="browser-flow">
                  <article>
                    <span>01</span>
                    <strong>Application UI</strong>
                    <small>Image, text, or structured input</small>
                  </article>
                  <ArrowRight />
                  <article>
                    <span>02</span>
                    <strong>Leanlet contract</strong>
                    <small>Typed input, lifecycle, cancellation</small>
                  </article>
                  <ArrowRight />
                  <article>
                    <span>03</span>
                    <strong>Dedicated worker</strong>
                    <small>Work stays off the UI thread</small>
                  </article>
                  <ArrowRight />
                  <article>
                    <span>04</span>
                    <strong>ONNX + WASM</strong>
                    <small>Selected model executes locally</small>
                  </article>
                </div>
                <div className="browser-return">
                  <div>
                    <Code2 />
                    <span>
                      <strong>Typed result</strong>
                      <small>Ranked output · score · timing</small>
                    </span>
                  </div>
                  <ArrowRight />
                  <div>
                    <ShieldCheck />
                    <span>
                      <strong>Application decision</strong>
                      <small>Threshold · fallback · user correction</small>
                    </span>
                  </div>
                  <div className="cache-node">
                    <Database />
                    <span>
                      <strong>Browser HTTP cache</strong>
                      <small>Reuse follows the site&apos;s cache headers</small>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="runtime-map-legend">
              <span>
                <i className="network-dot" /> Network: static asset delivery
              </span>
              <span>
                <i className="local-dot" /> Local: input processing and
                inference
              </span>
              <span>
                <i className="app-dot" /> Application-owned: acceptance and
                fallback
              </span>
            </div>
          </div>
        </div>
      </section>

      <CasesSection
        visionModel={selectedModel}
        onVisionModelChange={chooseModel}
      />

      <section
        id="models"
        className="border-y border-[#dfe5ef] bg-[#f8faff] py-20 lg:py-28"
      >
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Supported model profiles</p>
              <h2>Accuracy is a product decision.</h2>
            </div>
            <p>
              Leanlet makes the cost visible. Load only the chosen profile and
              set a confidence threshold backed by your own evaluation data.
            </p>
          </div>
          <div
            className="model-table"
            role="table"
            aria-label="Leanlet supported model comparison"
          >
            <div className="model-table-head" role="row">
              <span>Profile</span>
              <span>Category system</span>
              <span>Download</span>
              <span>Use when</span>
            </div>
            {modelOrder.map((id) => {
              const item = LEANLET_MODELS[id];
              return (
                <div className="model-table-row" role="row" key={id}>
                  <span>
                    <b>{item.shortName}</b>
                    <small>{item.tier}</small>
                  </span>
                  <span>
                    {item.task === 'zero-shot-image-classification'
                      ? 'Custom / zero-shot'
                      : 'Fixed ImageNet'}
                  </span>
                  <span>{item.sizeMB} MB</span>
                  <span>{item.strength}</span>
                </div>
              );
            })}
          </div>
          <div className="evidence-note">
            <Gauge />
            <div>
              <strong>Model selection guidance</strong>
              <p>
                Open-vocabulary profiles compare an image directly with
                application-defined labels and are the right default for
                changing taxonomies. Fixed-vocabulary classifiers are much
                smaller, but should only be used when their trained label set
                matches the product requirement.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 lg:py-28">
        <div className="shell grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center lg:gap-20">
          <div>
            <p className="section-kicker">Install the runtime</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-.045em] sm:text-5xl">
              A small API your application can own.
            </h2>
            <p className="mt-6 text-lg leading-8 text-[#5d6980]">
              The npm package supplies model selection, worker isolation,
              lifecycle events, ranked results, and explicit cleanup. Your app
              supplies its categories, assets, thresholds, and fallback.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="./docs/#installation" className="primary-button">
                Installation guide <ArrowRight />
              </a>
              <a href="./docs/#api" className="secondary-button">
                API reference
              </a>
            </div>
          </div>
          <div className="install-card">
            <div className="install-command">
              <span>$</span>
              <code>npm install leanlet-ai</code>
              <span>v0.2.0</span>
            </div>
            <pre>
              <code>
                <span className="code-purple">import</span>{' '}
                {'{ VisionLeanlet }'} <span className="code-purple">from</span>{' '}
                <span className="code-green">&apos;leanlet-ai&apos;</span>
                {'\n\n'}
                <span className="code-blue">const</span> classifier ={' '}
                <span className="code-purple">new</span> {'VisionLeanlet({'}
                {`\n  `}model:{' '}
                <span className="code-green">&apos;mobileclip-s0&apos;</span>,
                {`\n  `}categories: [
                <span className="code-green">&apos;Electronics&apos;</span>,{' '}
                <span className="code-green">&apos;Clothing&apos;</span>,{' '}
                <span className="code-green">&apos;Home&apos;</span>],{`\n`}
                {'}'}){`\n\n`}
                <span className="code-blue">const</span> result ={' '}
                <span className="code-purple">await</span>{' '}
                classifier.classify(file){`\n`}console.log(result.category,
                result.confidence)
              </code>
            </pre>
          </div>
        </div>
      </section>

      <section id="principles" className="principles-section">
        <div className="shell py-20 lg:py-28">
          <div className="section-heading dark">
            <div>
              <p className="section-kicker light">Lean AI principles</p>
              <h2>Use intelligence where it earns its place.</h2>
            </div>
            <p>
              Leanlet is deliberately not a chatbot framework. It is
              infrastructure for bounded decisions that make software quietly
              more capable.
            </p>
          </div>
          <div className="principles-grid">
            {[
              [
                '01',
                'Start with the task',
                'Define one observable decision, representative data, and a quality budget.',
              ],
              [
                '02',
                'Fit the smallest model',
                'Measure accuracy, first-load cost, memory, and latency on real target devices.',
              ],
              [
                '03',
                'Design the fallback',
                'Confidence is not certainty. Keep deterministic behavior for unsupported and uncertain cases.',
              ],
              [
                '04',
                'Keep it replaceable',
                'Version models independently and preserve a stable application-facing contract.',
              ],
            ].map(([num, title, text]) => (
              <article key={num}>
                <span>{num}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="shell">
          <div>
            <p className="section-kicker">
              Build intrinsically intelligent software
            </p>
            <h2>
              Ship the capability.
              <br />
              Skip the dependency.
            </h2>
          </div>
          <div>
            <p>
              Start with the product classifier, bring your own taxonomy, then
              build the next leanlet your application actually needs.
            </p>
            <a href="./docs/" className="primary-button">
              Start building <ArrowRight />
            </a>
          </div>
        </div>
      </section>
      <footer>
        <div className="shell footer-grid">
          <div>
            <Logo />
            <p>Task-specific AI infrastructure for the open web.</p>
          </div>
          <div>
            <strong>Framework</strong>
            <a href="#platform">Platform</a>
            <a href="#models">Models</a>
            <a href="./docs/#api">API</a>
          </div>
          <div>
            <strong>Resources</strong>
            <a href="./docs/">Documentation</a>
            <a href="./docs/#production">Production guide</a>
            <a href="./docs/#browser-support">Browser support</a>
          </div>
          <div>
            <strong>Project</strong>
            <a
              href="https://www.npmjs.com/package/leanlet-ai"
              target="_blank"
              rel="noreferrer"
            >
              <NpmMark /> Available on npm
            </a>
            <a
              href="https://github.com/sukumarrekapalli/leanlet"
              target="_blank"
              rel="noreferrer"
            >
              <GitFork /> Open source
            </a>
            <span>Apache-2.0 · v0.2.0</span>
          </div>
        </div>
        <div className="shell footer-bottom">
          <span>© 2026 Leanlet</span>
          <span>Private by architecture. Useful by design.</span>
        </div>
      </footer>
    </main>
  );
}
