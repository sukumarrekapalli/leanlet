# Manifest contracts and CI validation

A Leanlet manifest declares the bounded task, supported execution providers,
network requirement, resident-memory estimate, and immutable assets of one
capability. It is metadata for admission, planning, provenance, and review. It
does not execute code or prove that a model is accurate.

## Minimal manifest

```json
{
  "id": "text.embedding",
  "version": "1.0.0",
  "task": "embedding",
  "providers": ["wasm-single"],
  "network": "static-assets",
  "estimatedResidentBytes": 4000000,
  "assets": [
    {
      "path": "models/embedding.onnx",
      "bytes": 3000000,
      "sha256": "<release hash>",
      "license": "Apache-2.0",
      "sourceRevision": "<immutable revision>"
    }
  ]
}
```

`id`, `version`, `task`, and at least one supported provider are required.
Unknown properties are allowed for namespaced application metadata, but
Leanlet ignores them. Do not place secrets, user content, access tokens, or
mutable runtime state in a manifest.

## Command-line validation

Validate a file in local development or CI:

```bash
npx leanlet manifest validate ./leanlet-manifest.json
```

The command exits with status `0` for a valid contract and `1` for malformed
JSON or validation issues. Each issue contains a JSON Pointer, stable code, and
message, making failures usable in automated checks.

Export the exact schema shipped by the installed package:

```bash
npx leanlet manifest schema > leanlet-manifest.schema.json
```

The raw artifact is also exported as `leanlet-ai/manifest-schema` for tools
that resolve package exports.

## Runtime validation

```ts
import {
  parseLeanletManifest,
  validateLeanletManifest,
} from 'leanlet-ai/manifest';

const validation = validateLeanletManifest(untrustedJson);
if (!validation.valid) {
  for (const issue of validation.issues) {
    console.error(issue.path, issue.code, issue.message);
  }
  return;
}

const manifest = parseLeanletManifest(untrustedJson);
```

`validateLeanletManifest()` is non-throwing. `parseLeanletManifest()` throws
`LeanletManifestValidationError`, whose `issues` property contains the same
structured diagnostics. `LeanletKernel.register()` calls the parser before
registration, so build-time and runtime validation share one implementation.

Validation is deliberately side-effect free: it performs no network access,
asset integrity check, provider initialization, model load, or device probe.

## CI example

```yaml
- name: Validate Leanlet manifests
  run: |
    for file in manifests/*.json; do
      npx leanlet manifest validate "$file"
    done
```

After contract validation, use `planLeanletAssets()` to enforce asset budgets
and required hashes. Model-quality, latency, and device-support gates remain
separate release evidence.

## Compatibility policy

The schema version is exposed as `LEANLET_MANIFEST_SCHEMA_VERSION`. Version 1
allows unknown properties so applications can attach namespaced annotations
without changing Leanlet runtime behavior. New required fields or narrower
accepted values require a new schema version and migration guidance.
