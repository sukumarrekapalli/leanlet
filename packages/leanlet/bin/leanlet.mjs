#!/usr/bin/env node

import { createReadStream, createWriteStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { mkdir, rename, unlink, copyFile } from 'node:fs/promises';
import { dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODELS = {
  'mobileclip-s0': {
    label: 'MobileCLIP-S0 Accuracy (~89 MB)',
    repository: 'Xenova/mobileclip_s0',
    revision: '757d59c9c6870a76a4b0306f05f5061bca15c39f',
    hashes: {
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

const WASM_FILES = [
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.jsep.wasm',
  'ort-wasm-simd-threaded.jsep.mjs',
];

function usage() {
  console.log(`Leanlet asset manager

Usage:
  leanlet models list
  leanlet models add <profile> [--dir public/leanlet]

Model assets retain their upstream licenses. Review each model license before
redistributing the generated public directory.`);
}

async function download(url, target) {
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
  for (const file of WASM_FILES)
    await copyFile(join(ortDist, file), join(wasmTarget, file));
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
    await download(
      `https://huggingface.co/${definition.repository}/resolve/${definition.revision}/${file}`,
      target,
    );
    if (
      definition.hashes[file] &&
      (await hashFile(target)) !== definition.hashes[file]
    ) {
      await unlink(target).catch(() => undefined);
      throw new Error(
        `Integrity check failed for ${file}. The downloaded file was removed.`,
      );
    }
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
