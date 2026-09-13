# Performance engineering

Leanlet optimizes for bounded user-perceived work, not maximum benchmark
throughput. Browser AI competes with rendering, interaction, battery, memory,
and network transfer.

## Measure separately

- cold asset transfer and verification;
- runtime/session initialization;
- warm inference;
- queue delay;
- end-to-end flow latency;
- main-thread long tasks and input responsiveness;
- declared versus observed process memory pressure;
- battery and thermal behavior on representative mobile devices.

Kernel timing reports queue, load, run, and total milliseconds for each run.
These measurements use the page's monotonic clock. They are operational
telemetry, not controlled benchmark results.

## Request coalescing

Use `coalesceKey` when identical concurrent requests are common. The mechanism
is deliberately in-flight only: completed results are not retained. This avoids
cache invalidation and privacy semantics inside the kernel while eliminating
duplicate work during render bursts, route transitions, or component fan-out.

Track `kernel.inspect().telemetry.coalescedRuns` and compare actual model-run
counts before claiming an improvement. Coalescing adds little value when inputs
are unique or calls are sequential.

Run `npm run benchmark:kernel` for a reproducible synthetic sanity check. It is
not a device or model benchmark; its purpose is to verify that concurrent
identical requests execute once and to expose the avoided-execution counter.

## Runtime reuse and prewarming

Create a long-lived kernel and reuse loaded state. Prewarm only after a useful
intent signal such as opening a feature, selecting a tool, or idling after the
critical page path. Immediate prewarming of every capability defeats the
framework's asset and memory boundaries.

## Concurrency

More concurrency is not always faster in a browser. Parallel CPU/WASM work can
increase contention and UI latency. Start with one or two active runs on mobile,
then measure. Flow branches may be expressed with `Promise.all`; the kernel
still limits how many execute concurrently.

## Asset budgets

Keep model assets out of the initial application bundle. Version and cache them
as static assets, disclose first-use transfer in the UI, and select profiles by
measured quality per byte rather than parameter count alone.
