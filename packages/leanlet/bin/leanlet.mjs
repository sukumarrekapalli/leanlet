#!/usr/bin/env node

import { createReadStream, createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { mkdir, rename, unlink, copyFile } from 'node:fs/promises';
import { dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MOBILECLIP_SHARED_HASHES = {
  'config.json':
    '8e33c1f2634a33de3e38715f9809ef86742aacbe31c310c66fc2636755458d56',
  'preprocessor_config.json':
    'b031f09fbd69e22a605b6cc7433993249ee893b7fc1b79321f669cd015493dd4',
  'tokenizer.json':
    '72ed5c96db5729294468543e4bc75fce14ca63f58e37300290189ba1c1e52b85',
  'tokenizer_config.json':
    'a7d9d24f248071b792e4a3b56ab0539c2f40eec8da56d6fd91fb3a50058acebd',
  LICENSE: '18e4e6b95d7272051fabdad125ba0467549c181ef20b7fa0eafbac3825471483',
};

const MODELS = {
  'mobileclip-s0': {
    label: 'MobileCLIP-S0 Accuracy (~89 MB)',
    repository: 'Xenova/mobileclip_s0',
    revision: '757d59c9c6870a76a4b0306f05f5061bca15c39f',
    hashes: {
      ...MOBILECLIP_SHARED_HASHES,
      'onnx/text_model_quantized.onnx':
        'b8557b10e5c23a0126c6d2e6eba48d240484979007917d128953b31618a04211',
      'onnx/vision_model.onnx':
        '17d3c037b1d488c10c50e09f6009ea5a198caef4e0e8f4ea5617b7cb2d067ac0',
    },
    files: [
      'config.json',
      'preprocessor_config.json',
      'tokenizer.json',
      'tokenizer_config.json',
      'onnx/text_model_quantized.onnx',
      'onnx/vision_model.onnx',
      'LICENSE',
    ],
  },
  'mobileclip-s0-compact': {
    label: 'MobileCLIP-S0 Compact (~55 MB)',
    repository: 'Xenova/mobileclip_s0',
    revision: '757d59c9c6870a76a4b0306f05f5061bca15c39f',
    hashes: {
      ...MOBILECLIP_SHARED_HASHES,
      'onnx/text_model_quantized.onnx':
        'b8557b10e5c23a0126c6d2e6eba48d240484979007917d128953b31618a04211',
      'onnx/vision_model_quantized.onnx':
        'fcbd153d1aa1314fb72ea39b20c37e0572e7e7b05359b51f3efee5d682658472',
    },
    files: [
      'config.json',
      'preprocessor_config.json',
      'tokenizer.json',
      'tokenizer_config.json',
      'onnx/text_model_quantized.onnx',
      'onnx/vision_model_quantized.onnx',
      'LICENSE',
    ],
  },
  'mobileclip-s0-fp16': {
    label: 'MobileCLIP-S0 FP16 vision (~66 MB)',
    repository: 'Xenova/mobileclip_s0',
    revision: '757d59c9c6870a76a4b0306f05f5061bca15c39f',
    hashes: {
      ...MOBILECLIP_SHARED_HASHES,
      'onnx/text_model_quantized.onnx':
        'b8557b10e5c23a0126c6d2e6eba48d240484979007917d128953b31618a04211',
      'onnx/vision_model_fp16.onnx':
        '22b1d36ecc6837e8205aee05003440a25e1c1ee0c7e2945dbb9dd597211c59dc',
    },
    files: [
      'config.json',
      'preprocessor_config.json',
      'tokenizer.json',
      'tokenizer_config.json',
      'onnx/text_model_quantized.onnx',
      'onnx/vision_model_fp16.onnx',
      'LICENSE',
    ],
  },
  'mobilenet-v4-small': {
    label: 'MobileNetV4 Small (3.9 MB)',
    repository: 'onnx-community/mobilenetv4_conv_small.e2400_r224_in1k',
    revision: '3ba07f12712fa58fd6b3d661f9909c9e332c5005',
    hashes: {
      'config.json':
        'ae99506e66f8e19bc73809e5b4c3ae31fc7c2bca53752dc7cb89c1e47831a335',
      'preprocessor_config.json':
        '21bb2bccbd790ded22ca9ac77758578bae4d90d8fc578a612097bd38e9d40b2f',
      'onnx/model_quantized.onnx':
        '270717121efb0960d60feb712574d55fa27b585f3c4afc14741d81ea980bcd9a',
    },
    files: [
      'config.json',
      'preprocessor_config.json',
      'onnx/model_quantized.onnx',
    ],
  },
  'mobilenet-v4-medium': {
    label: 'MobileNetV4 Medium (10 MB)',
    repository: 'onnx-community/mobilenetv4_conv_medium.e500_r224_in1k',
    revision: 'dc8d9ef543f3c84172e9ec8c4ce50c7edab85224',
    hashes: {
      'config.json':
        '6752d778e19cb680c2b58bf9e86a8310b0d40b4f34c7c006746f6a05a7af10d5',
      'preprocessor_config.json':
        '8cbe02e67288c92403d7bffec8719f9315c5f21200fff2a9b0eefe2194855961',
      'onnx/model_quantized.onnx':
        'baf68809effbdbce4be45b86c5b540b89a88b77d91ce70cd96ec24778bdf7c4c',
    },
    files: [
      'config.json',
      'preprocessor_config.json',
      'onnx/model_quantized.onnx',
    ],
  },
};

const WASM_FILES = {
  'ort-wasm-simd-threaded.wasm':
    'f061472c6e77d6d50d079aacdc0ff9b63fee287ddd2cbf46cf62438d3891de2b',
  'ort-wasm-simd-threaded.mjs':
    '43c25054b6b9ac000f786c65545ff83a45f871e0e310e8c2f4d48a363bb66db4',
  'ort-wasm-simd-threaded.jsep.wasm':
    'c46655e8a94afc45338d4cb2b840475f88e5012d524509916e505079c00bfa39',
  'ort-wasm-simd-threaded.jsep.mjs':
    '08fb86ec433c78bfb032c5d84a68b8e8e5a8d81268fa39e24314179a5767a5b9',
};

function usage() {
  console.log(`Leanlet asset manager

Usage:
  leanlet models list
  leanlet models add <profile> [--dir public/leanlet]

Model assets retain their upstream licenses. Review each model license before
redistributing the generated public directory.`);
}

async function download(url, target, expectedHash) {
  await mkdir(dirname(target), { recursive: true });
  const temporary = `${target}.leanlet-download`;
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok || !response.body)
    throw new Error(`Download failed (${response.status}): ${url}`);
  const stream = createWriteStream(temporary);
  try {
    for await (const chunk of response.body) {
      if (!stream.write(chunk))
        await new Promise((resolveDrain) => stream.once('drain', resolveDrain));
    }
    await new Promise((resolveClose, reject) =>
      stream.end((error) => (error ? reject(error) : resolveClose())),
    );
    if ((await hashFile(temporary)) !== expectedHash)
      throw new Error(`Integrity check failed for ${url}.`);
    await rename(temporary, target);
  } catch (error) {
    stream.destroy();
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

async function copyWasm(targetRoot) {
  const ortEntry = fileURLToPath(import.meta.resolve('onnxruntime-web'));
  const ortDist = dirname(ortEntry);
  const wasmTarget = join(targetRoot, 'wasm');
  await mkdir(wasmTarget, { recursive: true });
  for (const [file, expectedHash] of Object.entries(WASM_FILES)) {
    const target = join(wasmTarget, file);
    const temporary = `${target}.leanlet-copy`;
    await copyFile(join(ortDist, file), temporary);
    if ((await hashFile(temporary)) !== expectedHash) {
      await unlink(temporary).catch(() => undefined);
      throw new Error(`Integrity check failed for runtime asset ${file}.`);
    }
    await rename(temporary, target);
  }
}

async function hashFile(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

async function addModel(profile, targetRoot) {
  const definition = MODELS[profile];
  if (!definition)
    throw new Error(`Unknown profile "${profile}". Run "leanlet models list".`);
  const root = resolve(targetRoot);
  if (root === parse(root).root)
    throw new Error('Refusing to install assets at a filesystem root.');
  console.log(`Installing ${definition.label} into ${root}`);
  for (const file of definition.files) {
    const target = join(root, 'models', definition.repository, file);
    console.log(`  ${file}`);
    const expectedHash = definition.hashes[file];
    if (!expectedHash)
      throw new Error(`No integrity hash is pinned for ${profile}/${file}.`);
    await download(
      `https://huggingface.co/${definition.repository}/resolve/${definition.revision}/${file}`,
      target,
      expectedHash,
    );
  }
  await copyWasm(root);
  console.log(
    `Done. Configure VisionLeanlet with assetBase pointing to this directory.`,
  );
}

const args = process.argv.slice(2);
if (args[0] !== 'models') {
  usage();
  process.exitCode = args.length ? 1 : 0;
} else if (args[1] === 'list')
  Object.entries(MODELS).forEach(([id, model]) =>
    console.log(`${id.padEnd(27)} ${model.label}`),
  );
else if (args[1] === 'add' && args[2]) {
  const dirIndex = args.indexOf('--dir');
  await addModel(
    args[2],
    dirIndex >= 0 && args[dirIndex + 1] ? args[dirIndex + 1] : 'public/leanlet',
  );
} else {
  usage();
  process.exitCode = 1;
}
