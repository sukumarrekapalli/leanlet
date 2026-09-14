# Migrating from Leanlet 0.2 to 0.3

The public stable release is 0.2.0. Version 0.3.0-beta.3 is a prerelease. Test
it with an exact pin:

```bash
npm install leanlet-ai@0.3.0-beta.3 --save-exact
```

## Compatibility summary

- `defineLeanlet`, its definition shape, and its returned methods remain.
- `VisionLeanlet` constructor options and methods remain.
- Existing model profile IDs remain.
- `CategoryResult.score` is new; `confidence` remains as a deprecated alias.
- `LeanletEvent` adds `cancelled`. Update exhaustive TypeScript switches.
- Kernel, flow, asset-planning, and evaluation APIs are additive and opt-in.

Existing 0.2-style single-capability code can remain unchanged. Add a kernel
only when several capabilities need shared resource, policy, lifecycle,
structured-result, or observability controls.

## Required review points

1. Update exhaustive `LeanletEvent` switches with a `cancelled` case.
2. Prefer `result.score` in new code. Re-evaluate application thresholds; a
   score is not a calibrated probability.
3. Exercise already-aborted and later-aborted `classify()` calls. Cancellation
   rejects the caller and requests worker discard, but an active backend call
   may finish.
4. Regenerate each shipped model profile into a new immutable asset path using
   the 0.3 CLI, which verifies pinned files before replacement.
5. Run browser/device evaluation for cold load, warm inference, task quality,
   responsiveness, and teardown.

See the [web migration guide](https://sukumarrekapalli.github.io/leanlet/docs/migrate/)
and [complete API reference](API.md).
