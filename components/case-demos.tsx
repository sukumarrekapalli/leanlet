'use client';

import { useMemo, useState } from 'react';
import { Activity, ArrowRight, BrainCircuit, Eye, Gauge, MessageSquareText, MousePointerClick, RotateCcw, Sparkles } from 'lucide-react';

const INTENTS = {
  Shipping: ['track', 'package', 'delivery', 'late', 'arrive', 'where', 'courier'],
  Returns: ['return', 'refund', 'wrong', 'broken', 'replace', 'exchange'],
  Payments: ['payment', 'charged', 'card', 'invoice', 'billing', 'pay'],
  Product: ['size', 'color', 'stock', 'available', 'spec', 'compatible'],
} as const;

function softmax(values: number[]) {
  const max = Math.max(...values);
  const exp = values.map((value) => Math.exp(value - max));
  const total = exp.reduce((sum, value) => sum + value, 0);
  return exp.map((value) => value / total);
}

function IntentDemo() {
  const [text, setText] = useState('Where is my package? It was due yesterday.');
  const predictions = useMemo(() => {
    const input = text.toLowerCase();
    const entries = Object.entries(INTENTS);
    const probabilities = softmax(entries.map(([, words]) => .2 + words.reduce((sum, word) => sum + (input.includes(word) ? 1.35 : 0), 0)));
    return entries.map(([label], index) => ({ label, score: probabilities[index] })).sort((a, b) => b.score - a.score);
  }, [text]);
  return <div className="case-demo-body"><label className="micro-label" htmlFor="intent-input">Customer message</label><textarea id="intent-input" value={text} onChange={(event) => setText(event.target.value)} rows={3} /><div className="micro-result"><span>Route to</span><strong>{predictions[0].label}</strong><b>{Math.round(predictions[0].score * 100)}%</b></div><div className="mini-bars">{predictions.slice(0,3).map((item) => <span key={item.label}><i>{item.label}</i><em><b style={{width:`${Math.max(4,item.score*100)}%`}} /></em></span>)}</div></div>;
}

const rankItems = [
  { id: 'focus', name: 'Deep focus', meta: 'Long-form · quiet' },
  { id: 'discover', name: 'Discover', meta: 'Novel · exploratory' },
  { id: 'quick', name: 'Quick wins', meta: 'Short · actionable' },
] as const;

function RankingDemo() {
  const [scores, setScores] = useState<Record<string, number>>({ focus: .51, discover: .29, quick: .2 });
  const ranked = [...rankItems].sort((a,b) => scores[b.id] - scores[a.id]);
  const choose = (id: string) => setScores((current) => {
    const next = Object.fromEntries(Object.entries(current).map(([key,value]) => [key, value * .82]));
    next[id] = (next[id] ?? 0) + .28;
    const total = Object.values(next).reduce((sum,value) => sum + value, 0);
    return Object.fromEntries(Object.entries(next).map(([key,value]) => [key, value / total]));
  });
  return <div className="case-demo-body"><div className="rank-head"><span className="micro-label">Your local ranking</span><button type="button" onClick={() => setScores({ focus:.51, discover:.29, quick:.2 })}><RotateCcw /> Reset</button></div><div className="rank-list">{ranked.map((item,index) => <button key={item.id} type="button" onClick={() => choose(item.id)}><i>0{index+1}</i><span><strong>{item.name}</strong><small>{item.meta}</small></span><b>{Math.round(scores[item.id]*100)}%</b></button>)}</div><p className="micro-foot"><MousePointerClick /> Choose an item. The online model adapts without a profile server.</p></div>;
}

function AnomalyDemo() {
  const [value, setValue] = useState(67);
  const z = Math.abs(value - 42) / 9;
  const anomaly = z >= 2.25;
  const history = [39,43,47,40,44,41,45,38,42,46,43,value];
  return <div className="case-demo-body"><div className="sensor-value"><span><i className={anomaly ? 'alert' : ''} /> Live sensor</span><strong>{value}<small>°C</small></strong></div><div className="spark-bars">{history.map((item,index) => <i key={index} className={index === history.length-1 && anomaly ? 'alert' : ''} style={{height:`${Math.max(12,item)}%`}} />)}</div><label className="micro-label" htmlFor="sensor-range">Change latest reading</label><input id="sensor-range" type="range" min="20" max="90" value={value} onChange={(event) => setValue(Number(event.target.value))} /><div className={`anomaly-result ${anomaly ? 'alert' : ''}`}><Activity /><span><strong>{anomaly ? 'Anomaly detected' : 'Within baseline'}</strong><small>deviation {z.toFixed(2)}σ · threshold 2.25σ</small></span></div></div>;
}

export function CasesSection() {
  return <section id="cases" className="cases-section"><div className="shell py-20 lg:py-28">
    <div className="section-heading"><div><p className="section-kicker">Scoped intelligence patterns</p><h2>One philosophy. Many useful shapes.</h2></div><p>Not every capability needs a foundation model. These live examples run locally with bounded inputs, inspectable outputs, and purpose-fit runtimes.</p></div>
    <div className="cases-grid">
      <article className="case-card case-vision"><header><span><Eye /> Vision</span><b>89 MB · zero-shot</b></header><div className="vision-graphic"><span /><span /><span /><i><Sparkles /></i></div><div className="case-copy"><p className="micro-label">Product taxonomy</p><h3>Route catalog images into the categories your app already uses.</h3><p>MobileCLIP compares pixels with your labels in a dedicated worker.</p><a href="#demo">Open vision demo <ArrowRight /></a></div></article>
      <article className="case-card"><header><span><MessageSquareText /> Text</span><b>&lt; 3 KB · linear</b></header><div className="case-copy compact"><p className="micro-label">Intent routing</p><h3>Turn a short message into an application action.</h3></div><IntentDemo /></article>
      <article className="case-card"><header><span><BrainCircuit /> Behavior</span><b>1 KB · online</b></header><div className="case-copy compact"><p className="micro-label">Adaptive ranking</p><h3>Learn a useful order from interaction on this device.</h3></div><RankingDemo /></article>
      <article className="case-card"><header><span><Gauge /> Time series</span><b>&lt; 1 KB · statistical</b></header><div className="case-copy compact"><p className="micro-label">Anomaly detection</p><h3>Spot a meaningful deviation before sending any telemetry.</h3></div><AnomalyDemo /></article>
    </div>
    <div className="cases-principle"><Sparkles /><p><strong>The model is not the product.</strong> Leanlet standardizes the boundary—input, runtime, confidence, fallback, and lifecycle—so each feature can use the smallest intelligence that meets its evidence bar.</p></div>
  </div></section>;
}
