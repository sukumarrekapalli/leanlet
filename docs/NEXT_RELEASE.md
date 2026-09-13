# Next release working plan

This is an engineering tracker, not a delivery promise. Reassess priorities
after 0.3.0-beta.1 usage feedback and issue reports.

## Proposed 0.3.0-beta.2 — conformance and integration

1. Define an adapter conformance suite for load sharing, cancellation,
   deadlines, disposal, events, provenance, and abstention.
2. Publish capability-manifest JSON Schema and validation tooling for CI.
3. Add framework-owned adapters for worker RPC and small ONNX sessions so
   applications do not repeat glue code.
4. Add Playwright browser integration tests across Chromium, Firefox, and
   WebKit with desktop and constrained mobile profiles.
5. Add reproducible cold-load, warm-run, long-task responsiveness, and memory
   pressure measurement fixtures.
6. Add examples for React, Angular, Vue, and framework-free TypeScript without
   coupling the core package to any UI framework.

## Packaging priority

Separate the dependency-light kernel from the vision adapter. The target is a
core install that does not pull the approximately 47 MB installed
`@huggingface/transformers` dependency tree, while a documented vision entry or
adapter package installs it explicitly. Preserve the 0.2/0.3 root import through
a compatibility window and publish measured bundle/install impact.

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
