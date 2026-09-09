/// <reference lib="webworker" />

import {
  AutoProcessor,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  CLIPVisionModelWithProjection,
  dot,
  env,
  pipeline,
  RawImage,
  softmax,
} from '@huggingface/transformers';
import {
  DEFAULT_CATEGORY_PROMPTS,
  DEFAULT_PRODUCT_CATEGORIES,
  LEANLET_MODELS,
} from './models.js';
import type { CategoryResult, LeanletModelId, Prediction } from './types.js';

type Disposable = { dispose?: () => Promise<void> };
type ImageNetPipeline = ((...args: unknown[]) => Promise<Prediction[]>) &
  Disposable;
type MobileClipRuntime = {
  kind: 'mobileclip';
  tokenizer: CallableFunction;
  textModel: CallableFunction & Disposable;
  processor: CallableFunction;
  visionModel: CallableFunction & Disposable;
};
type ImageNetRuntime = { kind: 'imagenet'; classifier: ImageNetPipeline };
type Runtime = MobileClipRuntime | ImageNetRuntime;
type WorkerRequest = {
  type: 'configure' | 'warmup' | 'classify';
  assetBase?: string;
  model?: LeanletModelId;
  categories?: readonly string[];
  threads?: number;
  debug?: boolean;
  file?: Blob;
  requestId?: string;
};

const IMAGE_NET_ALIASES: Record<string, string[]> = {
  Electronics: [
    'phone',
    'telephone',
    'cellular',
    'computer',
    'laptop',
    'keyboard',
    'mouse',
    'monitor',
    'screen',
    'ipod',
    'radio',
    'television',
    'remote control',
    'digital clock',
    'camera',
    'projector',
    'microphone',
    'loudspeaker',
    'modem',
  ],
  'Fashion & Accessories': [
    'shoe',
    'sandal',
    'boot',
    'loafer',
    'sneaker',
    'jersey',
    'sweatshirt',
    'cardigan',
    'gown',
    'kimono',
    'abaya',
    'apron',
    'bikini',
    'brassiere',
    'bow tie',
    'miniskirt',
    'jean',
    'backpack',
    'purse',
    'handbag',
    'wallet',
    'sunglass',
  ],
  'Home & Furniture': [
    'chair',
    'sofa',
    'couch',
    'table',
    'lamp',
    'bed',
    'wardrobe',
    'bookcase',
    'cabinet',
    'curtain',
    'clock',
    'vase',
    'pillow',
    'quilt',
    'doormat',
  ],
  'Kitchen & Appliances': [
    'stove',
    'refrigerator',
    'microwave',
    'toaster',
    'dishwasher',
    'espresso',
    'coffee',
    'kettle',
    'blender',
    'frying pan',
    'wok',
    'plate',
    'bowl',
    'cup',
    'mug',
    'bottle',
  ],
  'Food & Grocery': [
    'food',
    'fruit',
    'vegetable',
    'apple',
    'orange',
    'lemon',
    'banana',
    'strawberry',
    'pineapple',
    'pizza',
    'burger',
    'hotdog',
    'sandwich',
    'bread',
    'cheese',
    'chocolate',
    'ice cream',
    'pretzel',
    'burrito',
    'wine',
    'beer',
  ],
  'Beauty & Personal Care': [
    'perfume',
    'lotion',
    'hair spray',
    'lipstick',
    'powder',
    'soap',
    'shampoo',
    'toothbrush',
    'toothpaste',
    'comb',
    'razor',
  ],
  'Sports & Outdoors': [
    'ball',
    'racket',
    'ski',
    'snowboard',
    'bicycle',
    'bike',
    'helmet',
    'dumbbell',
    'barbell',
    'golf',
    'tent',
    'sleeping bag',
  ],
  Automotive: [
    'car',
    'truck',
    'van',
    'motorcycle',
    'scooter',
    'wheel',
    'tire',
    'seat belt',
    'speedboat',
    'minivan',
    'limousine',
  ],
  'Books & Office': [
    'book',
    'notebook',
    'binder',
    'pencil',
    'pen',
    'envelope',
    'paper',
    'printer',
    'stapler',
    'desk',
    'file',
  ],
  'Tools & Hardware': [
    'hammer',
    'drill',
    'screwdriver',
    'wrench',
    'saw',
    'chain saw',
    'tool',
    'padlock',
    'paintbrush',
    'plunger',
    'lawn mower',
  ],
  'Toys & Kids': [
    'toy',
    'teddy',
    'doll',
    'puzzle',
    'kite',
    'balloon',
    'crib',
    'stroller',
    'diaper',
  ],
  'Jewelry & Watches': ['watch', 'necklace', 'ring', 'bracelet', 'earring'],
};

let assetBase = '/';
let modelId: LeanletModelId = 'mobileclip-s0';
let categories: readonly string[] = DEFAULT_PRODUCT_CATEGORIES;
let threads = 1;
let debug = false;
let runtimePromise: Promise<Runtime> | null = null;
let textCache: { key: string; embeddings: number[][] } | null = null;

function send(message: unknown) {
  self.postMessage(message);
}

function log(message: string, details?: unknown) {
  if (debug) console.debug(`[leanlet:vision-worker] ${message}`, details ?? '');
}

function logError(message: string, error: unknown) {
  if (debug) console.error(`[leanlet:vision-worker] ${message}`, error);
}

function cleanCategories(input?: readonly string[]) {
  if (!input) return categories;
  const unique = [
    ...new Set(input.map((item) => item.trim()).filter(Boolean)),
  ].slice(0, 50);
  return unique.length >= 2 ? unique : categories;
}

async function resetPipeline() {
  if (!runtimePromise) return;
  try {
    const runtime = await runtimePromise;
    if (runtime.kind === 'mobileclip') {
      await runtime.textModel.dispose?.();
      await runtime.visionModel.dispose?.();
    } else {
      await runtime.classifier.dispose?.();
    }
  } catch {
    /* Worker termination remains the hard cleanup path. */
  }
  runtimePromise = null;
  textCache = null;
}

function loadModel() {
  if (runtimePromise) return runtimePromise;
  const definition = LEANLET_MODELS[modelId];
  log('Loading model', { modelId, assetBase, threads });
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = `${assetBase}models/`;
  const wasm = env.backends.onnx.wasm;
  if (!wasm) throw new Error('WebAssembly is unavailable in this browser.');
  wasm.wasmPaths = `${assetBase}wasm/`;
  wasm.numThreads = threads;

  send({
    type: 'status',
    state: 'loading',
    message: `Loading ${definition.shortName} locally`,
    modelId,
  });
  const onProgress = (item: {
    status?: string;
    progress?: number;
    file?: string;
  }) => {
    const progress =
      typeof item.progress === 'number' ? Math.round(item.progress) : undefined;
    const message = item.file?.endsWith('.onnx')
      ? `Downloading ${definition.sizeMB} MB model assets once`
      : `Preparing ${definition.shortName}`;
    send({ type: 'status', state: 'loading', message, progress, modelId });
  };

  if (definition.task === 'zero-shot-image-classification') {
    const textOptions = {
      dtype: definition.textDtype ?? 'q8',
      device: 'wasm' as const,
      progress_callback: onProgress,
    };
    const visionOptions = {
      dtype: definition.visionDtype ?? 'q8',
      device: 'wasm' as const,
      progress_callback: onProgress,
    };
    runtimePromise = Promise.all([
      AutoTokenizer.from_pretrained(definition.model, {
        progress_callback: onProgress,
      }),
      CLIPTextModelWithProjection.from_pretrained(
        definition.model,
        textOptions,
      ),
      AutoProcessor.from_pretrained(definition.model, {
        progress_callback: onProgress,
      }),
      CLIPVisionModelWithProjection.from_pretrained(
        definition.model,
        visionOptions,
      ),
    ]).then(([tokenizer, textModel, processor, visionModel]) => ({
      kind: 'mobileclip' as const,
      tokenizer: tokenizer as unknown as CallableFunction,
      textModel: textModel as unknown as CallableFunction & Disposable,
      processor: processor as unknown as CallableFunction,
      visionModel: visionModel as unknown as CallableFunction & Disposable,
    }));
  } else {
    runtimePromise = (
      pipeline as unknown as (
        task: string,
        model: string,
        options: Record<string, unknown>,
      ) => Promise<ImageNetPipeline>
    )(definition.task, definition.model, {
      dtype: 'q8',
      device: 'wasm',
      progress_callback: onProgress,
    }).then((classifier) => ({ kind: 'imagenet' as const, classifier }));
  }
  void runtimePromise
    .then(() => {
      log('Model ready', { modelId });
      send({
        type: 'status',
        state: 'ready',
        message: `${definition.shortName} ready on this device`,
        progress: 100,
        modelId,
      });
    })
    .catch((error) => {
      runtimePromise = null;
      logError('Model load failed', error);
    });
  return runtimePromise;
}

function mapImageNet(predictions: Prediction[], allowed: readonly string[]) {
  const scores = new Map<string, number>();
  for (const prediction of predictions) {
    const label = prediction.label.toLowerCase().replaceAll('_', ' ');
    for (const category of allowed) {
      const aliases = IMAGE_NET_ALIASES[category] ?? [];
      if (aliases.some((word) => label.includes(word)))
        scores.set(category, (scores.get(category) ?? 0) + prediction.score);
    }
  }
  const ranked = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, score]) => ({ label, score }));
  if (ranked.length) return ranked;
  const other =
    allowed.find((label) => label.toLowerCase().includes('other')) ??
    allowed.at(-1) ??
    'Other product';
  return [{ label: other, score: predictions[0]?.score ?? 0 }];
}

async function classify(image: RawImage, allowed: readonly string[]) {
  const runtime = await loadModel();
  if (runtime.kind === 'mobileclip') {
    const cacheKey = allowed.join('\u0000');
    if (textCache?.key !== cacheKey) {
      const prompts = allowed.map(
        (category) =>
          `a retail catalog photo showing ${DEFAULT_CATEGORY_PROMPTS[category] ?? category.toLowerCase()}`,
      );
      const textInputs = runtime.tokenizer(prompts, {
        padding: 'max_length',
        truncation: true,
      });
      const { text_embeds: textEmbeds } = await runtime.textModel(textInputs);
      textCache = {
        key: cacheKey,
        embeddings: textEmbeds.normalize().tolist() as number[][],
      };
    }
    const imageInputs = await runtime.processor(image);
    const { image_embeds: imageEmbeds } =
      await runtime.visionModel(imageInputs);
    const imageVector = (imageEmbeds.normalize().tolist() as number[][])[0];
    const probabilities = Array.from(
      softmax(
        textCache.embeddings.map(
          (textVector) => 100 * dot(imageVector, textVector),
        ),
      ),
    );
    return allowed
      .map((label, index) => ({ label, score: probabilities[index] }))
      .sort((a, b) => b.score - a.score);
  }
  const objects = await runtime.classifier(image, { topk: 15 });
  return mapImageNet(objects, allowed);
}

self.onmessage = async ({ data }: MessageEvent<WorkerRequest>) => {
  if (data.type === 'configure') {
    const nextModel = data.model ?? modelId;
    if (nextModel !== modelId) await resetPipeline();
    modelId = nextModel;
    assetBase = data.assetBase
      ? data.assetBase.endsWith('/')
        ? data.assetBase
        : `${data.assetBase}/`
      : assetBase;
    categories = cleanCategories(data.categories);
    threads = Math.max(1, Math.min(data.threads ?? 1, 4));
    debug = data.debug ?? false;
    log('Configured', { modelId, assetBase, threads });
    return;
  }
  if (data.type === 'warmup') {
    try {
      await loadModel();
    } catch (error) {
      send({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Could not load the model.',
        modelId,
      });
    }
    return;
  }
  if (data.type !== 'classify' || !data.file || !data.requestId) return;

  const requestId = data.requestId;
  try {
    const allowed = cleanCategories(data.categories);
    log('Starting classification', { modelId, categoryCount: allowed.length });
    send({
      type: 'status',
      state: 'running',
      message: 'Classifying pixels inside this browser',
      modelId,
    });
    const image = await RawImage.fromBlob(data.file);
    const started = performance.now();
    const predictions = await classify(image, allowed);
    const elapsedMs = Math.round(performance.now() - started);
    const ranked = predictions.slice(0, Math.min(5, predictions.length));
    const best = ranked[0] ?? { label: 'Other product', score: 0 };
    const result: CategoryResult = {
      category: best.label,
      confidence: Math.min(best.score, 0.99),
      predictions: ranked,
      elapsedMs,
      modelId,
    };
    log('Classification complete', {
      modelId,
      category: result.category,
      confidence: result.confidence,
      elapsedMs,
    });
    send({ type: 'result', result, requestId });
    send({
      type: 'status',
      state: 'ready',
      message: `${LEANLET_MODELS[modelId].shortName} ready on this device`,
      progress: 100,
      modelId,
    });
  } catch (error) {
    logError('Classification failed', error);
    send({
      type: 'error',
      message:
        error instanceof Error ? error.message : 'Classification failed.',
      requestId,
      modelId,
    });
  }
};

export {};
