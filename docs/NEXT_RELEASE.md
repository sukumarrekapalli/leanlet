# Next release working plan

This is an engineering tracker, not a delivery promise. Reassess priorities
after 0.3.0-beta.1 usage feedback and issue reports.

## Proposed 0.3.0-beta.2 — conformance and integration

### Milestone 1 — dependency-light core

- Separate the kernel, flow, result, asset-planning, and evaluation contracts
  from the vision adapter.
- Keep the current root import working through a documented compatibility
  window while providing an explicit vision entry or adapter package.
- Ensure a core install does not pull the approximately 47 MB installed
  `@huggingface/transformers` dependency tree.
- Publish measured install and browser-bundle impact before and after the split.

Exit evidence: package-content snapshots, bundle-size checks, compatibility
tests for existing imports, and an upgrade note that includes rollback.

### Milestone 2 — portable adapter contract

- Define a conformance suite for shared loading, cancellation, deadlines,
  disposal, events, provenance, failure, and abstention.
- Publish the capability-manifest JSON Schema plus validation tooling suitable
  for local development and CI.
- Add framework-owned worker-RPC and small ONNX-session primitives so adapter
  authors do not repeat request, cancellation, and lifecycle glue.

Exit evidence: the bundled vision adapter passes the public conformance suite,
and one non-vision reference adapter is implemented only through public APIs.

### Milestone 3 — integration paths and complete examples

- Add React, Angular, Vue, and framework-free TypeScript examples without
  coupling the core package to a UI framework.
- Document application lifecycle placement, route cancellation, worker asset
  paths, CSP requirements, fallback handling, and production build behavior for
  each integration.
- Add a minimal single-Leanlet example and a managed multi-Leanlet example for
  every integration path.

Exit evidence: every example builds in CI and is linked from the learning guide
and package README.

### Milestone 4 — browser and performance evidence

- Add Playwright integration tests across Chromium, Firefox, and WebKit using
  desktop and constrained mobile profiles where the automation environment can
  represent them reliably.
- Add reproducible cold-load, warm-run, long-task responsiveness, coalescing,
  and declared-memory-pressure fixtures.
- Publish raw environment details with benchmark results; do not generalize a
  single machine's timings into universal performance claims.

Exit evidence: a versioned compatibility matrix, retained benchmark artifacts,
documented thresholds, and no unresolved critical lifecycle or scheduling
defects in the tested matrix.

## Proposed 0.4 direction — resource brokerage

- device capability profiles and application-selected budget presets;
- opt-in, versioned result caches with explicit privacy and invalidation;
- a shared worker/session pool for compatible adapters;
- static flow inspection for undeclared dependencies and release asset totals;
- calibration artifacts and acceptance-policy reports;
- cross-tab coordination only if browser primitives prove reliable under tests.

## Promotion gate for 0.3 stable

- no unresolved critical lifecycle or scheduling defects;
- documented compatibility policy and deprecation window;
- adapter conformance kit used by the bundled vision adapter;
- current/previous major browser matrix with mobile evidence;
- reproducible package, asset-integrity, and provenance checks;
- at least one external integration completed without repository-specific code.

## Explicitly out of scope for beta.2

- durable or server-side workflow execution;
- a hosted inference service or model marketplace;
- automatic model-quality guarantees;
- hard sandboxing of application-provided JavaScript;
- cross-tab scheduling before the browser primitives and failure semantics are
  proven by the 0.4 investigation.
