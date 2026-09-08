/// <reference lib="webworker" />

import { env, pipeline, RawImage } from '@huggingface/transformers';
import type { CategoryResult, Prediction } from '../lib/leanlet-types';

const MODEL = 'onnx-community/mobilenetv4_conv_small.e2400_r224_in1k';

const taxonomy: Record<string, string[]> = {
  Electronics: ['computer', 'laptop', 'notebook', 'keyboard', 'mouse', 'monitor', 'screen', 'telephone', 'phone', 'ipod', 'radio', 'television', 'remote control', 'digital clock', 'digital watch', 'camera', 'projector', 'microphone', 'loudspeaker', 'modem'],
  'Fashion & Accessories': ['shoe', 'sandal', 'boot', 'loafer', 'sneaker', 'jersey', 'sweatshirt', 'cardigan', 'gown', 'kimono', 'abaya', 'apron', 'bikini', 'brassiere', 'bow tie', 'miniskirt', 'jean', 'backpack', 'purse', 'handbag', 'wallet', 'sunglass', 'watch', 'necklace'],
  'Home & Furniture': ['chair', 'sofa', 'couch', 'table', 'lamp', 'bed', 'wardrobe', 'bookcase', 'cabinet', 'curtain', 'clock', 'vase', 'pillow', 'quilt', 'doormat', 'shower curtain', 'window shade'],
  'Kitchen & Appliances': ['stove', 'refrigerator', 'microwave', 'toaster', 'dishwasher', 'espresso', 'coffee', 'kettle', 'blender', 'crock pot', 'frying pan', 'wok', 'spatula', 'plate', 'bowl', 'cup', 'mug', 'bottle', 'can opener'],
  'Food & Grocery': ['food', 'fruit', 'vegetable', 'apple', 'orange', 'lemon', 'banana', 'strawberry', 'pineapple', 'pizza', 'burger', 'hotdog', 'sandwich', 'bread', 'cheese', 'chocolate', 'ice cream', 'pretzel', 'burrito', 'guacamole', 'wine', 'beer', 'packet', 'carton'],
  'Sports & Outdoors': ['ball', 'racket', 'ski', 'snowboard', 'bicycle', 'bike', 'helmet', 'dumbbell', 'barbell', 'golf', 'tent', 'sleeping bag', 'backpack', 'swimsuit', 'running shoe'],
  'Automotive': ['car', 'truck', 'van', 'motorcycle', 'scooter', 'wheel', 'tire', 'seat belt', 'speedboat', 'minivan', 'limousine'],
  'Books & Office': ['book', 'notebook', 'binder', 'pencil', 'pen', 'envelope', 'paper', 'printer', 'stapler', 'desk', 'file'],
  'Beauty & Personal Care': ['perfume', 'lotion', 'hair spray', 'lipstick', 'powder', 'soap', 'shampoo', 'toothbrush', 'toothpaste', 'comb', 'razor'],
  'Tools & Hardware': ['hammer', 'drill', 'screwdriver', 'wrench', 'saw', 'chain saw', 'nail', 'screw', 'tool', 'padlock', 'paintbrush', 'plunger', 'lawn mower'],
  'Toys & Kids': ['toy', 'teddy', 'doll', 'puzzle', 'kite', 'balloon', 'crib', 'stroller', 'diaper'],
};

type Classifier = (image: RawImage, options: { topk: number }) => Promise<Prediction[]>;
type PipelineFactory = (task: 'image-classification', model: string, options: object) => Promise<Classifier>;
let classifierPromise: Promise<Classifier> | null = null;
let assetBase = '/';

function send(message: unknown) {
  self.postMessage(message);
}

function loadModel() {
  if (!classifierPromise) {
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.localModelPath = `${assetBase}models/`;
    const wasm = env.backends.onnx.wasm;
    if (!wasm) throw new Error('WebAssembly is unavailable in this browser.');
    wasm.wasmPaths = `${assetBase}wasm/`;
    wasm.numThreads = 1;

    const createPipeline = pipeline as unknown as PipelineFactory;
    classifierPromise = createPipeline('image-classification', MODEL, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: (item: { status?: string; progress?: number; file?: string }) => {
        const value = typeof item.progress === 'number' ? Math.round(item.progress) : undefined;
        send({ type: 'status', state: 'loading', message: item.file?.endsWith('.onnx') ? 'Loading the 3.9 MB model' : 'Preparing the local runtime', progress: value });
      },
    });
    void classifierPromise
      .then(() => send({ type: 'status', state: 'ready', message: 'Model ready on this device', progress: 100 }))
      .catch(() => { classifierPromise = null; });
  }
  return classifierPromise;
}

function normalize(label: string) {
  return label.toLowerCase().replaceAll('_', ' ');
}

function categoryFor(predictions: Prediction[]) {
  const scores = new Map<string, number>();
  for (const prediction of predictions) {
    const label = normalize(prediction.label);
    for (const [category, words] of Object.entries(taxonomy)) {
      if (words.some((word) => label.includes(word))) {
        scores.set(category, (scores.get(category) ?? 0) + prediction.score);
      }
    }
  }
  const best = [...scores.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ?? ['Other product', predictions[0]?.score ?? 0];
}

self.onmessage = async (event: MessageEvent<{ type: string; assetBase?: string; file?: File }>) => {
  if (event.data.type === 'configure' && event.data.assetBase) {
    assetBase = event.data.assetBase;
    return;
  }
  if (event.data.type === 'warmup') {
    try { await loadModel(); } catch (error) { send({ type: 'error', message: error instanceof Error ? error.message : 'Could not load the model.' }); }
    return;
  }
  if (event.data.type !== 'classify' || !event.data.file) return;

  try {
    send({ type: 'status', state: 'running', message: 'Looking at pixels locally' });
    const model = await loadModel();
    const image = await RawImage.fromBlob(event.data.file);
    const started = performance.now();
    const predictions = await model(image, { topk: 12 });
    const elapsedMs = Math.round(performance.now() - started);
    const [category, confidence] = categoryFor(predictions);
    const result: CategoryResult = { category, confidence: Math.min(confidence, 0.99), object: predictions[0]?.label ?? 'Unknown object', predictions: predictions.slice(0, 5), elapsedMs };
    send({ type: 'result', result });
    send({ type: 'status', state: 'ready', message: 'Ready for another image', progress: 100 });
  } catch (error) {
    send({ type: 'error', message: error instanceof Error ? error.message : 'Classification failed.' });
  }
};

export {};
