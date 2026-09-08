'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowRight, Box, ChevronRight, CircleGauge, Code2, Cpu,
  ImagePlus, Layers3, LockKeyhole, PackageCheck, RotateCcw, ScanSearch,
  ShieldCheck, Sparkles, Upload, WifiOff, Workflow, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CategoryResult, LeanletWorkerEvent } from '@/lib/leanlet-types';
import { VisionLeanlet } from '@/lib/vision-leanlet';

const facts = [
  { icon: WifiOff, label: 'Zero API calls' },
  { icon: LockKeyhole, label: 'Images stay private' },
  { icon: Zap, label: 'Runs with WebAssembly' },
];

const principles = [
  { number: '01', title: 'Start with the task', text: 'Find the narrow decision where learned intelligence beats a rule—not a reason to add a chatbot.' },
  { number: '02', title: 'Fit the smallest model', text: 'Choose and quantize a focused model against a real quality target and a strict device budget.' },
  { number: '03', title: 'Ship it with software', text: 'Run inference in a worker. Keep inputs private, latency local, and the experience available without an AI service.' },
  { number: '04', title: 'Measure the boundary', text: 'Expose confidence, test failures, and fall back to normal product logic when the model is uncertain.' },
];

const capabilityCards = [
  ['Visual sorting', 'Product categories, recycling, plant or part recognition', ScanSearch],
  ['Text signals', 'Intent, sentiment, language and sensitive-data detection', Layers3],
  ['Audio cues', 'Wake words, sound events and small command vocabularies', Workflow],
  ['Smart defaults', 'Local ranking and personalization without a user profile server', Sparkles],
] as const;

type RuntimeState = 'idle' | 'loading' | 'ready' | 'running' | 'error';

function LogoMark({ className = 'size-9' }: { className?: string }) {
  return (
    <span className={`relative grid place-items-center rounded-full bg-[#171914] text-[#d8ff58] ${className}`} aria-hidden="true">
      <span className="size-[42%] border border-current" />
      <span className="absolute right-[22%] top-[22%] size-[12%] bg-current" />
    </span>
  );
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const leanletRef = useRef<VisionLeanlet | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [dragging, setDragging] = useState(false);
  const [runtime, setRuntime] = useState<RuntimeState>('idle');
  const [status, setStatus] = useState('Model sleeps until you need it');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CategoryResult | null>(null);

  useEffect(() => {
    const leanlet = new VisionLeanlet();
    leanletRef.current = leanlet;
    const unsubscribe = leanlet.subscribe((event: LeanletWorkerEvent) => {
      if (event.type === 'status') {
        setRuntime(event.state);
        setStatus(event.message);
        if (event.progress !== undefined) setProgress(event.progress);
      } else if (event.type === 'result') {
        setResult(event.result);
      } else {
        setRuntime('error');
        setStatus(event.message);
      }
    });
    return () => { unsubscribe(); leanlet.destroy(); leanletRef.current = null; };
  }, []);

  const acceptFile = useCallback((next?: File) => {
    if (!next || !next.type.startsWith('image/')) return;
    setPreview((current) => { if (current) URL.revokeObjectURL(current); return URL.createObjectURL(next); });
    setFile(next);
    setFileName(next.name);
    setResult(null);
    setStatus(runtime === 'ready' ? 'Model ready on this device' : 'Model sleeps until you need it');
  }, [runtime]);

  const classify = () => {
    if (!file || !leanletRef.current) return;
    setResult(null);
    setRuntime(runtime === 'idle' ? 'loading' : 'running');
    setStatus(runtime === 'idle' ? 'Loading the local model' : 'Looking at pixels locally');
    leanletRef.current.classify(file);
  };

  const busy = runtime === 'loading' || runtime === 'running';

  return (
    <main className="min-h-screen overflow-hidden bg-[#f3f1e9] text-[#171914]">
      <div className="pointer-events-none fixed inset-0 grain" />
      <nav className="relative z-10 mx-auto flex max-w-[1400px] items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
        <a href="#top" className="flex items-center gap-3" aria-label="Leanlet home">
          <LogoMark />
          <span className="text-lg font-semibold tracking-[-0.035em]">leanlet</span>
        </a>
        <div className="hidden items-center gap-7 text-sm md:flex">
          <a href="#philosophy" className="text-black/55 transition-colors hover:text-black">Philosophy</a>
          <a href="#framework" className="text-black/55 transition-colors hover:text-black">Framework</a>
          <a href="#use-cases" className="text-black/55 transition-colors hover:text-black">Use cases</a>
        </div>
        <a href="#framework" className="flex items-center gap-2 border border-black/10 bg-white/55 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.13em] backdrop-blur transition-colors hover:bg-white">
          <Code2 className="size-3.5" /> Open source
        </a>
      </nav>

      <section id="top" className="relative mx-auto max-w-[1400px] px-5 pb-14 pt-8 sm:px-8 lg:px-12 lg:pb-20 lg:pt-14">
        <div className="grid items-end gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
          <div>
            <p className="mb-6 font-mono text-xs uppercase tracking-[0.18em] text-black/55">Intrinsic intelligence for the open web</p>
            <h1 className="max-w-3xl text-[clamp(3.1rem,7vw,6.8rem)] font-medium leading-[0.87] tracking-[-0.075em]">Ship less AI.<br /><span className="text-[#678f00]">Build smarter.</span></h1>
            <p className="mt-7 max-w-xl text-base leading-7 text-black/60 sm:text-lg">A framework for putting small, task-specific intelligence inside software. No AI everywhere. Just the right model, exactly where it earns its place.</p>
          </div>
          <div className="grid grid-cols-3 border-y border-black/15 py-5">
            {facts.map(({ icon: Icon, label }) => (
              <div key={label} className="border-l border-black/10 px-3 first:border-l-0 sm:px-5"><Icon className="mb-4 size-4 text-[#678f00]" /><p className="max-w-24 text-xs font-medium leading-4 sm:text-sm sm:leading-5">{label}</p></div>
            ))}
          </div>
        </div>

        <div className="mt-12 grid overflow-hidden border border-black/15 bg-[#fcfbf6] shadow-[0_24px_90px_rgba(27,30,20,.08)] lg:grid-cols-[1.12fr_.88fr]">
          <div className="min-h-[440px] border-b border-black/15 p-4 sm:p-7 lg:border-b-0 lg:border-r">
            <input ref={inputRef} className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => acceptFile(event.target.files?.[0])} />
            <button type="button" aria-label="Choose a product image" onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files?.[0]); }} className={`group relative flex h-full min-h-[390px] w-full cursor-pointer overflow-hidden border border-dashed transition-colors ${dragging ? 'border-[#678f00] bg-[#efffc1]' : 'border-black/25 bg-[#eeece3] hover:border-black/50'}`}>
              {preview ? <>{/* oxlint-disable-next-line next/no-img-element */}<img src={preview} alt="Product to classify" className="absolute inset-0 size-full object-contain p-5" /><div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-3 bg-[#171914]/90 px-4 py-3 text-white backdrop-blur"><span className="truncate text-xs">{fileName}</span><span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-[#d8ff58]">Change image</span></div></> : (
                <div className="m-auto flex max-w-sm flex-col items-center px-6 text-center"><span className="mb-6 grid size-16 place-items-center rounded-full border border-black/15 bg-[#fcfbf6] transition-transform group-hover:-translate-y-1"><ImagePlus className="size-6" strokeWidth={1.6} /></span><h2 className="text-2xl font-medium tracking-[-0.03em]">Show the leanlet a product</h2><p className="mt-2 text-sm leading-6 text-black/50">Drop an image here, or tap to use your camera or photo library.</p><span className="mt-6 inline-flex items-center gap-2 bg-[#171914] px-5 py-3 text-xs font-semibold text-white"><Upload className="size-4" /> Choose image</span></div>
              )}
            </button>
          </div>

          <aside className="flex min-h-[440px] flex-col p-6 sm:p-8" aria-live="polite">
            <div className="flex items-center justify-between border-b border-black/10 pb-5">
              <div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45">Demo / vision leanlet</p><p className="mt-1 text-sm font-medium">MobileNetV4 · INT8</p></div>
              <span className="inline-flex items-center gap-1.5 border border-black/10 bg-[#f3f1e9] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider"><span className={`size-1.5 rounded-full ${runtime === 'error' ? 'bg-red-500' : busy ? 'animate-pulse bg-amber-500' : 'bg-[#79a900]'}`} /> {runtime === 'idle' ? 'Not loaded' : runtime}</span>
            </div>

            <div className="flex flex-1 flex-col justify-center py-8">
              {result ? (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">Best matching category</p>
                  <h2 className="mt-3 text-[clamp(2.5rem,5vw,4.5rem)] font-medium leading-[.92] tracking-[-0.06em]">{result.category}</h2>
                  <p className="mt-4 text-sm text-black/55">The model sees <strong className="font-medium text-black">{result.object}</strong>.</p>
                  <div className="mt-7 space-y-3 border-t border-black/10 pt-5">
                    {result.predictions.slice(0, 3).map((prediction) => (
                      <div key={prediction.label} className="grid grid-cols-[1fr_auto] items-center gap-4 text-xs"><span className="truncate capitalize text-black/60">{prediction.label}</span><span className="font-mono">{Math.round(prediction.score * 100)}%</span><span className="col-span-2 -mt-2 h-1 bg-black/[.06]"><span className="block h-full bg-[#678f00]" style={{ width: `${Math.max(2, prediction.score * 100)}%` }} /></span></div>
                    ))}
                  </div>
                  <p className="mt-5 font-mono text-[10px] uppercase tracking-wider text-black/40">Inference {result.elapsedMs} ms · on this device</p>
                </div>
              ) : busy ? (
                <div><span className="mb-6 grid size-14 place-items-center rounded-full bg-[#d8ff58]"><Cpu className="size-5 animate-pulse" /></span><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">{status}</p><p className="mt-3 text-4xl font-medium leading-tight tracking-[-0.045em]">No request left<br />your browser.</p>{runtime === 'loading' && <div className="mt-7 h-1.5 bg-black/[.07]"><span className="block h-full bg-[#678f00] transition-[width]" style={{ width: `${Math.max(progress, 6)}%` }} /></div>}</div>
              ) : (
                <div><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">Result appears here</p><p className="mt-3 text-4xl font-medium leading-tight tracking-[-0.045em] text-black/20">Electronics<br />or clothing?<br />Let 3.9 MB decide.</p></div>
              )}
            </div>

            <Button type="button" onClick={classify} disabled={!file || busy} className="h-auto w-full justify-between rounded-none bg-[#d8ff58] px-5 py-4 text-left text-[#171914] hover:bg-[#cafd36] disabled:bg-black/[.06] disabled:text-black/30">
              <span>{busy ? status : result ? 'Run again locally' : preview ? 'Classify on this device' : 'Add an image to begin'}</span>{busy ? <RotateCcw className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            </Button>
            <p className="mt-3 text-center text-[10px] leading-4 text-black/40">First run downloads assets from this site into browser cache. Later runs reuse them.</p>
          </aside>
        </div>
        <a href="#philosophy" className="mt-8 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-black/45 hover:text-black"><ArrowDown className="size-3" /> Why this matters</a>
      </section>

      <section id="philosophy" className="border-y border-black/15 bg-[#171914] text-[#f3f1e9]">
        <div className="mx-auto grid max-w-[1400px] px-5 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:px-12">
          <div className="border-white/15 py-16 lg:border-r lg:py-24 lg:pr-16"><p className="font-mono text-xs uppercase tracking-[.18em] text-[#d8ff58]">The Leanlet philosophy</p><h2 className="mt-6 text-4xl font-medium leading-[.98] tracking-[-.05em] sm:text-6xl">Intelligence should feel intrinsic—not imposed.</h2><p className="mt-7 max-w-lg leading-7 text-white/55">Most software does not need a giant general model or a chat box. It needs one precise capability, quietly integrated into the product’s natural flow.</p></div>
          <div className="grid sm:grid-cols-2">
            {principles.map((item) => <article key={item.number} className="border-b border-white/15 py-10 sm:border-l sm:p-10 sm:nth-[3]:border-b-0 sm:nth-[4]:border-b-0"><span className="font-mono text-[10px] text-[#d8ff58]">{item.number}</span><h3 className="mt-8 text-xl font-medium tracking-[-.025em]">{item.title}</h3><p className="mt-3 text-sm leading-6 text-white/50">{item.text}</p></article>)}
          </div>
        </div>
      </section>

      <section id="framework" className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
          <div><p className="font-mono text-xs uppercase tracking-[.18em] text-[#678f00]">A framework, not a one-off</p><h2 className="mt-5 text-4xl font-medium leading-none tracking-[-.05em] sm:text-6xl">One small contract.<br />Many lean capabilities.</h2><p className="mt-7 max-w-lg leading-7 text-black/55">Leanlet isolates inference behind a tiny worker interface. Swap the model and taxonomy, keep your application UI. Host everything as ordinary static assets—even on GitHub Pages.</p><div className="mt-8 flex flex-wrap gap-2">{['Model assets', 'Web Worker', 'WASM runtime', 'Typed output', 'Fallback logic'].map((tag) => <span key={tag} className="border border-black/15 bg-white/45 px-3 py-2 font-mono text-[10px] uppercase tracking-wider">{tag}</span>)}</div></div>
          <div className="overflow-hidden border border-black/15 bg-[#20231c] text-white shadow-[14px_14px_0_#d8ff58]">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3"><span className="font-mono text-[10px] uppercase tracking-wider text-white/45">your-app.ts</span><span className="flex gap-1.5"><i className="size-2 rounded-full bg-white/15" /><i className="size-2 rounded-full bg-white/15" /><i className="size-2 rounded-full bg-[#d8ff58]" /></span></div>
            <pre className="overflow-x-auto p-5 text-[12px] leading-7 sm:p-8 sm:text-sm"><code><span className="text-[#d8ff58]">import</span> {'{ VisionLeanlet }'} <span className="text-[#d8ff58]">from</span> <span className="text-[#ffb7dc]">&apos;./leanlet&apos;</span>{'\n\n'}<span className="text-white/45">{'// The model wakes only when the feature needs it.'}</span>{'\n'}<span className="text-[#8be9fd]">const</span> vision = <span className="text-[#d8ff58]">new</span> VisionLeanlet(){'\n\n'}vision.subscribe((event) =&gt; {'{'}{'\n  '}<span className="text-[#d8ff58]">if</span> (event.type === <span className="text-[#ffb7dc]">&apos;result&apos;</span>) render(event.result){'\n'}{'}'}){'\n'}vision.classify(image)</code></pre>
          </div>
        </div>

        <div className="mt-20 border-y border-black/15 py-8">
          <div className="grid gap-4 sm:grid-cols-4">
            {[['01', 'User input', ImagePlus], ['02', 'Dedicated worker', Workflow], ['03', 'Local model', Box], ['04', 'Useful output', PackageCheck]].map(([number, label, Icon], index) => { const StepIcon = Icon as typeof Box; return <div key={label as string} className="relative flex items-center gap-4 sm:border-l sm:border-black/10 sm:px-5 sm:first:border-l-0"><span className="grid size-10 shrink-0 place-items-center border border-black/15 bg-white/45"><StepIcon className="size-4" /></span><div><span className="font-mono text-[9px] text-black/35">{number as string}</span><p className="text-sm font-medium">{label as string}</p></div>{index < 3 && <ChevronRight className="absolute -right-2 hidden size-4 text-black/20 sm:block" />}</div>; })}
          </div>
        </div>
      </section>

      <section id="use-cases" className="bg-[#d8ff58]">
        <div className="mx-auto max-w-[1400px] px-5 py-20 sm:px-8 lg:px-12 lg:py-24">
          <div className="flex flex-col justify-between gap-6 border-b border-black/20 pb-8 md:flex-row md:items-end"><div><p className="font-mono text-xs uppercase tracking-[.18em] text-black/50">Where lean AI earns its place</p><h2 className="mt-4 max-w-3xl text-4xl font-medium leading-none tracking-[-.05em] sm:text-6xl">Small models. Real product work.</h2></div><p className="max-w-sm text-sm leading-6 text-black/55">Use a leanlet when a bounded prediction improves the experience—not because AI is fashionable.</p></div>
          <div className="grid md:grid-cols-2">
            {capabilityCards.map(([title, text, Icon], index) => <article key={title} className={`grid grid-cols-[auto_1fr] gap-5 border-black/20 py-8 md:p-8 ${index % 2 ? 'md:border-l' : ''} ${index < 2 ? 'border-b' : ''}`}><span className="grid size-11 place-items-center rounded-full bg-[#171914] text-[#d8ff58]"><Icon className="size-4" /></span><div><h3 className="text-xl font-medium tracking-[-.03em]">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-black/55">{text}</p></div></article>)}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-5 py-20 text-center sm:px-8 lg:px-12 lg:py-28">
        <LogoMark className="mx-auto size-14" /><p className="mt-8 font-mono text-xs uppercase tracking-[.18em] text-[#678f00]">Start narrow. Ship useful.</p><h2 className="mx-auto mt-5 max-w-4xl text-4xl font-medium leading-[.96] tracking-[-.055em] sm:text-7xl">Make intelligence part of the software—not a service bolted onto it.</h2><div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><a href="#top" className="inline-flex items-center justify-center gap-2 bg-[#171914] px-6 py-4 text-sm font-medium text-white transition-colors hover:bg-black/80">Try the live demo <ArrowRight className="size-4" /></a><a href="#framework" className="inline-flex items-center justify-center gap-2 border border-black/20 px-6 py-4 text-sm font-medium transition-colors hover:bg-white/60"><Code2 className="size-4" /> Explore the framework</a></div>
      </section>

      <footer className="border-t border-black/15 px-5 py-7 sm:px-8 lg:px-12"><div className="mx-auto flex max-w-[1400px] flex-col gap-4 text-xs text-black/45 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><LogoMark className="size-6" /><span className="font-semibold text-black">leanlet</span><span>· intrinsic intelligence for the open web</span></div><div className="flex items-center gap-5"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5" /> No telemetry</span><span className="inline-flex items-center gap-1.5"><CircleGauge className="size-3.5" /> 3.9 MB model</span></div></div></footer>
    </main>
  );
}
