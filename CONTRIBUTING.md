# Contributing to Leanlet

Leanlet accepts focused fixes, tests, documentation, adapters, and measured
performance improvements. Open an issue before a large API or architecture
change.

## Development

Requirements: Node.js 22 or newer.

```bash
npm ci
npm run check
npm run lint
npm test
npm run build
npm pack ./packages/leanlet --dry-run
```

Changes to public behavior need tests and documentation. Adapter changes should
include failure, cancellation, and disposal coverage. Performance claims need a
reproducible benchmark description, target device/browser information, and raw
measurements. Do not add model weights to the npm package.

## Design expectations

- Keep capabilities narrow and independently evaluable.
- Preserve explicit application control over acceptance and fallback.
- Prefer typed deterministic contracts over prompt-shaped interfaces.
- Treat abstention as a normal result.
- Keep observability free of raw user inputs by default.
- Document limitations next to the relevant feature.

By contributing, you agree that your contribution is licensed under Apache-2.0.
