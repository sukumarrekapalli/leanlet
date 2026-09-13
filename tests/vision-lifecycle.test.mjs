import assert from 'node:assert/strict';
import test from 'node:test';

class FakeWorker {
  static instances = [];
  messages = [];
  terminated = false;
  onmessage;
  onerror;

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(message) {
    this.messages.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  emit(data) {
    this.onmessage?.({ data });
  }
}

globalThis.Worker = FakeWorker;
const { VisionLeanlet } = await import('../packages/leanlet/dist/index.js');

void test('vision request cancellation rejects and notifies the worker', async () => {
  const classifier = new VisionLeanlet({ model: 'mobilenet-v4-small' });
  const worker = FakeWorker.instances.at(-1);
  const controller = new AbortController();
  const pending = classifier.classify(new Blob(['image']), {
    signal: controller.signal,
  });
  const classify = worker.messages.find(
    (message) => message.type === 'classify',
  );
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.ok(
    worker.messages.some(
      (message) =>
        message.type === 'cancel' && message.requestId === classify.requestId,
    ),
  );
  classifier.destroy();
});

void test('vision worker crashes reject work and emit an error event', async () => {
  const classifier = new VisionLeanlet({ model: 'mobilenet-v4-small' });
  const worker = FakeWorker.instances.at(-1);
  const events = [];
  classifier.subscribe((event) => events.push(event));
  const pending = classifier.classify(new Blob(['image']));
  worker.onerror({ message: 'worker crashed' });
  await assert.rejects(pending, /worker crashed/);
  assert.equal(events.at(-1).type, 'error');
  assert.equal(events.at(-1).message, 'worker crashed');
  classifier.destroy();
});

void test('vision rejects use after destroy', async () => {
  const classifier = new VisionLeanlet({ model: 'mobilenet-v4-small' });
  classifier.destroy();
  await assert.rejects(
    classifier.classify(new Blob(['image'])),
    /was destroyed/,
  );
  assert.throws(() => classifier.warmup(), /was destroyed/);
});
