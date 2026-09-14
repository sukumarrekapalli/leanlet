import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import test from 'node:test';

const exec = promisify(execFile);

void test('package metadata uses the public npm identity', async () => {
  const metadata = JSON.parse(
    await readFile('packages/leanlet/package.json', 'utf8'),
  );
  assert.equal(metadata.name, 'leanlet-ai');
  assert.equal(metadata.version, '0.3.0-beta.2');
  assert.equal(metadata.license, 'Apache-2.0');
  assert.equal(metadata.bin.leanlet, 'bin/leanlet.mjs');
  assert.deepEqual(metadata.exports['./kernel'], {
    types: './dist/kernel.d.ts',
    import: './dist/kernel.js',
  });
});

void test('kernel-only entry does not pull the vision implementation', async () => {
  const kernelEntry = await readFile('packages/leanlet/dist/kernel.js', 'utf8');
  assert.doesNotMatch(kernelEntry, /vision|transformers|onnx/i);
});

void test('asset CLI lists every supported profile', async () => {
  const { stdout } = await exec(process.execPath, [
    'packages/leanlet/bin/leanlet.mjs',
    'models',
    'list',
  ]);
  for (const profile of [
    'mobileclip-s0',
    'mobileclip-s0-fp16',
    'mobileclip-s0-compact',
    'mobilenet-v4-medium',
    'mobilenet-v4-small',
  ])
    assert.match(stdout, new RegExp(`^${profile}\\s`, 'm'));
});
