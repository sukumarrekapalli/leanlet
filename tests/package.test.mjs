import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const exec = promisify(execFile);

void test('package metadata uses the public npm identity', async () => {
  const metadata = JSON.parse(
    await readFile('packages/leanlet/package.json', 'utf8'),
  );
  assert.equal(metadata.name, 'leanlet-ai');
  assert.equal(metadata.version, '0.3.0-beta.6');
  assert.equal(metadata.license, 'Apache-2.0');
  assert.equal(metadata.bin.leanlet, 'bin/leanlet.mjs');
  assert.deepEqual(metadata.exports['./kernel'], {
    types: './dist/kernel.d.ts',
    import: './dist/kernel.js',
  });
  assert.deepEqual(metadata.exports['./manifest'], {
    types: './dist/manifest.d.ts',
    import: './dist/manifest.js',
  });
  assert.equal(
    metadata.exports['./manifest-schema'],
    './schemas/leanlet-manifest-v1.schema.json',
  );
  assert.ok(metadata.files.includes('schemas'));
  assert.equal(metadata.dependencies, undefined);
  assert.equal(
    metadata.peerDependencies['@huggingface/transformers'],
    '^3.8.1',
  );
  assert.equal(
    metadata.peerDependenciesMeta['@huggingface/transformers'].optional,
    true,
  );
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

void test('manifest CLI validates files and exposes the shipped schema', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'leanlet-manifest-'));
  try {
    const valid = join(directory, 'valid.json');
    const invalid = join(directory, 'invalid.json');
    await writeFile(
      valid,
      JSON.stringify({
        id: 'text.summary',
        version: '1.0.0',
        task: 'summary',
        providers: ['javascript'],
      }),
    );
    await writeFile(
      invalid,
      JSON.stringify({ id: '', providers: ['remote-api'] }),
    );

    const accepted = await exec(process.execPath, [
      'packages/leanlet/bin/leanlet.mjs',
      'manifest',
      'validate',
      valid,
    ]);
    assert.match(accepted.stdout, /text\.summary@1\.0\.0/);

    await assert.rejects(
      exec(process.execPath, [
        'packages/leanlet/bin/leanlet.mjs',
        'manifest',
        'validate',
        invalid,
      ]),
      (error) => {
        assert.equal(error.code, 1);
        assert.match(error.stderr, /\/version \[required\]/);
        assert.match(error.stderr, /\/providers\/0 \[unsupported-value\]/);
        return true;
      },
    );

    const schema = await exec(process.execPath, [
      'packages/leanlet/bin/leanlet.mjs',
      'manifest',
      'schema',
    ]);
    const parsed = JSON.parse(schema.stdout);
    assert.deepEqual(parsed.required, ['id', 'version', 'task', 'providers']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
