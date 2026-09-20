import assert from 'node:assert/strict';
import test from 'node:test';
import { probeRuntimeCapabilities } from '../packages/leanlet/dist/kernel.js';

void test('capability probe reports an unavailable WebGPU API without throwing', async () => {
  const profile = await probeRuntimeCapabilities({
    navigator: {},
    webAssembly: true,
    workers: false,
    sharedArrayBuffer: false,
    crossOriginIsolated: false,
  });

  assert.deepEqual(profile, {
    schemaVersion: 1,
    webAssembly: true,
    workers: false,
    sharedArrayBuffer: false,
    crossOriginIsolated: false,
    webgpu: {
      available: false,
      features: [],
      reason: 'api-unavailable',
    },
  });
});

void test('capability probe exposes standardized features but no adapter identity', async () => {
  const profile = await probeRuntimeCapabilities({
    navigator: {
      gpu: {
        requestAdapter: async () => ({
          features: new Set(['shader-f16', 'timestamp-query']),
          vendor: 'not-part-of-the-contract',
        }),
      },
    },
  });

  assert.equal(profile.webgpu.available, true);
  assert.deepEqual(profile.webgpu.features, ['shader-f16', 'timestamp-query']);
  assert.equal('vendor' in profile.webgpu, false);
});

void test('capability probe normalizes missing adapters and probe failures', async () => {
  const unavailable = await probeRuntimeCapabilities({
    navigator: { gpu: { requestAdapter: async () => null } },
  });
  const failed = await probeRuntimeCapabilities({
    navigator: {
      gpu: {
        requestAdapter: async () => {
          throw new Error('driver failed');
        },
      },
    },
  });

  assert.equal(unavailable.webgpu.reason, 'adapter-unavailable');
  assert.equal(failed.webgpu.reason, 'probe-failed');
});
