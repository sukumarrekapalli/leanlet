# Leanlet architecture

This document defines the architectural boundary of Leanlet 0.3. Public APIs
may evolve during the beta, but changes should preserve these responsibilities.

## System model

```text
application event
      │
      ▼
┌──────────────────────────────────────────────────────────────┐
│ LeanletKernel                                                │
│ registry · admission · priority/deadline queue · lifecycle  │
│ declared memory budget · provider/network policy · events   │
└───────────────┬───────────────────────────────┬──────────────┘
                │                               │
       ┌────────▼────────┐             ┌────────▼────────┐
       │ Flow A          │             │ Flow B          │
       │ declared uses   │             │ declared uses   │
       └───┬────┬────┬───┘             └───────┬─────────┘
           │    │    │                         │
           ▼    ▼    ▼                         ▼
        model  rule  index                  statistic
           └────┬────┘                         │
                └──────── typed results ────────┘
                              │
                              ▼
                   application acceptance policy
```

The kernel is a control plane within one JavaScript page context. It is not a
model runner, security sandbox, durable job manager, or cross-tab coordinator.
Each Leanlet implementation owns its execution logic and loaded state.

## Core invariants

1. A capability ID is unique within a kernel.
2. A flow may invoke only the capability IDs declared in `uses`.
3. Every run resolves to `accepted`, `abstained`, or `failed`.
4. Loaded state is shared across runs and disposed exactly at an explicit
   lifecycle boundary, subject to cooperative implementations.
5. The number of active runs never exceeds `maxConcurrentRuns`.
6. Admission uses declared resident bytes. The browser does not expose a
   portable, exact per-runtime memory measurement.
7. A capability whose declared network class or provider exceeds kernel policy
   is not executed.
8. Observability listeners cannot change run or scheduling semantics.
9. Coalescing shares computation only for an exact application-provided key.
10. Cancellation of one coalesced waiter does not cancel shared computation.

## Scheduling

Queued work is ordered by numeric priority descending. Requests with equal
priority are ordered by earliest absolute deadline, then insertion time. This
is intentionally deterministic. It does not currently implement aging or
weighted fairness, so applications should use a small, documented priority
range and avoid a permanent stream of high-priority work.

When a run would load a capability beyond the declared resident budget, the
kernel disposes idle loaded runtimes in least-recently-used order. Active
runtimes are never evicted. If enough room cannot be made, the run abstains with
`budget-exceeded`.

## Performance mechanism: in-flight coalescing

Applications often request the same embedding, classification, or index lookup
from more than one component. `coalesceKey` makes those requests share one
queued or active computation. This reduces model invocations and queue pressure
without adding a semantic cache or storing outputs after the work settles.

The application owns key correctness. Good keys are content hashes or immutable
record revisions. A mutable object ID without its revision can produce a stale
or incorrect shared result.

## Cancellation and shutdown

Kernel cancellation is cooperative. The kernel aborts the signal passed to the
Leanlet. Implementations must observe it before and during divisible work.
Native WebAssembly or GPU calls may not be interruptible. The bundled vision
adapter cancels result delivery and asks its worker to discard the request, but
an active backend call may complete first.

`destroy()` rejects queued work, aborts active controllers, waits for active
promises to settle, then disposes loaded state. An implementation that ignores
its signal and never settles can therefore delay shutdown.

## Policy and trust

Network and provider policy are admission controls over manifest declarations.
They do not sandbox custom JavaScript. Applications requiring hard isolation
must also use Content Security Policy, origin boundaries, browser permissions,
dependency review, and platform controls.

## Stable extension seams

- `KernelLeanletDefinition`: adapters for ONNX, WebGPU, WASM, workers, rules,
  indexes, and application-managed services.
- `LeanletManifest`: asset, provenance, cost, and provider declarations.
- `defineFlow`: typed application orchestration and evidence fusion.
- `LeanletResult`: uncertainty and failure semantics independent of adapter.
- event subscription and inspection: observability without adapter coupling.
- asset planning and evaluation: build-time and release-time evidence.

Future schedulers, persistent caches, WebGPU adapters, cross-tab brokers, and
development tooling should target these seams rather than expand the kernel
into an autonomous agent or application framework.
