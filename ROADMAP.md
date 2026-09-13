# Leanlet roadmap

The roadmap is directional, not a compatibility or delivery promise.

## 0.3 — Kernel beta

- typed capability manifests and results;
- bounded scheduling, deadlines, lifecycle, and idle eviction;
- in-flight request coalescing;
- explicit flows and completion traces;
- asset planning and classification evaluation helpers;
- SafeShare reference application with eight real, coordinated capabilities.

## Stabilization criteria

- published API compatibility policy and migration guide;
- browser integration suite across Chromium, Firefox, and WebKit;
- reproducible cold/warm performance harness on desktop and mobile tiers;
- adapter conformance test kit;
- model asset integrity verification integrated with the installer;
- release provenance, changelog, and automated package validation.

## Later exploration

- dependency-light core and separately installed vision adapter, with a
  compatibility window for the current root import;
- WebGPU and WebNN adapter contracts based on measured browser support;
- cross-tab runtime brokerage where platform primitives are reliable;
- opt-in persistent result caches with explicit privacy and invalidation policy;
- capability graph analysis and development-time budget tooling;
- calibration reports and device-aware policy profiles.

Features move into the stable API only after implementation, tests, real-browser
evidence, and documentation exist.
