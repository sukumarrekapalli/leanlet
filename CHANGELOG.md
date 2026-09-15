# Changelog

All notable changes are documented here. The project follows semantic
versioning; prerelease APIs may change between beta releases.

## 0.3.0-beta.4 (release candidate)

- Added `defineModelPack()` for immutable model identity, revision, format,
  licensing, language coverage, provider, asset, context, quantization, and
  declared-memory metadata.
- Added `defineModelLeanlet()` to adapt application-supplied models to the
  existing kernel lifecycle without requiring a framework-owned inference
  backend.
- Added contract tests covering provider selection, provenance, resource
  declarations, immutability, and invalid model metadata.
- Added `defineCheck()` and `runCheck()` for typed application checks delegated
  to registered Leanlets with explicit verdicts and preserved abstention,
  timing, failure, and provenance.

## 0.3.0-beta.3

- Made `@huggingface/transformers` an optional peer instead of an unconditional
  runtime dependency. Kernel-only and custom-adapter consumers no longer install
  the vision dependency tree.
- Retained the root vision entry for backward compatibility; applications using
  the built-in vision adapter now install the optional peer explicitly.

## 0.3.0-beta.2

- Added the focused `leanlet-ai/kernel` package entry so non-vision bundles can
  import orchestration without reaching vision adapter code.

## 0.3.0-beta.1

- Added `LeanletKernel` with typed registration, lazy loading, runtime reuse,
  bounded concurrency, deadlines, provider/network admission, declared-memory
  eviction, inspection, and lifecycle events.
- Added priority and earliest-deadline scheduling.
- Added in-flight request coalescing with independent caller cancellation.
- Added explicit typed flows with declared dependencies and execution traces.
- Added asset planning and classification evaluation utilities.
- Added cooperative cancellation and worker error propagation to
  `VisionLeanlet`.
- Added `score`; retained `confidence` as a deprecated 0.2 compatibility alias.
- Added SafeShare, a working browser-only reference application that coordinates
  secret, personal-data, link, language, tone, readability, redaction, and
  release-policy capabilities.
- Added a versioned learning guide, complete 0.3 API reference, and 0.2 → 0.3
  compatibility guide.
- Added runtime validation for kernel budgets, manifests, assets, and run
  options; shutdown now clears state even when disposal reports a failure.
- Flow-level deadlines and priorities now propagate to dependency runs unless a
  dependency overrides them.

## 0.2.0

- Published the initial `leanlet-ai` package and vision model profiles.
