export const LEANLET_MANIFEST_SCHEMA_VERSION = 1;
const EXECUTION_PROVIDERS = new Set([
    'javascript',
    'wasm-single',
    'wasm-threaded',
    'webgpu',
    'webnn',
]);
const NETWORK_CLASSES = new Set([
    'deny',
    'static-assets',
    'application-managed',
]);
/**
 * JSON Schema representation of the public manifest contract.
 *
 * Unknown properties are allowed so applications can attach namespaced
 * build-time metadata. Leanlet ignores properties outside its documented
 * runtime contract.
 */
export const leanletManifestSchema = Object.freeze({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://sukumarrekapalli.github.io/leanlet/schemas/manifest-v1.json',
    title: 'Leanlet capability manifest',
    type: 'object',
    required: ['id', 'version', 'task', 'providers'],
    properties: {
        id: { type: 'string', minLength: 1 },
        version: { type: 'string', minLength: 1 },
        task: { type: 'string', minLength: 1 },
        description: { type: 'string', minLength: 1 },
        estimatedResidentBytes: { type: 'number', minimum: 0 },
        providers: {
            type: 'array',
            minItems: 1,
            uniqueItems: true,
            items: {
                enum: ['javascript', 'wasm-single', 'wasm-threaded', 'webgpu', 'webnn'],
            },
        },
        network: {
            enum: ['deny', 'static-assets', 'application-managed'],
        },
        assets: {
            type: 'array',
            items: {
                type: 'object',
                required: ['path', 'bytes'],
                properties: {
                    path: { type: 'string', minLength: 1 },
                    bytes: { type: 'number', minimum: 0 },
                    sha256: { type: 'string', minLength: 1 },
                    license: { type: 'string', minLength: 1 },
                    sourceRevision: { type: 'string', minLength: 1 },
                },
                additionalProperties: true,
            },
        },
    },
    additionalProperties: true,
});
export class LeanletManifestValidationError extends TypeError {
    issues;
    constructor(issues) {
        super(`Invalid Leanlet manifest: ${issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ')}`);
        this.name = 'LeanletManifestValidationError';
        this.issues = Object.freeze([...issues]);
    }
}
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function describe(value) {
    if (typeof value === 'string')
        return value;
    if (value === undefined)
        return 'undefined';
    try {
        return JSON.stringify(value);
    }
    catch {
        return typeof value;
    }
}
function addRequiredString(value, field, issues) {
    const candidate = value[field];
    if (candidate === undefined) {
        issues.push({
            path: `/${field}`,
            code: 'required',
            message: `Leanlet manifest ${field} is required.`,
        });
    }
    else if (typeof candidate !== 'string') {
        issues.push({
            path: `/${field}`,
            code: 'invalid-type',
            message: `Leanlet manifest ${field} must be a string.`,
        });
    }
    else if (!candidate.trim()) {
        issues.push({
            path: `/${field}`,
            code: 'empty',
            message: `Leanlet manifest ${field} cannot be empty.`,
        });
    }
}
function addOptionalString(value, path, label, issues) {
    if (value === undefined)
        return;
    if (typeof value !== 'string') {
        issues.push({
            path,
            code: 'invalid-type',
            message: `${label} must be a string.`,
        });
    }
    else if (!value.trim()) {
        issues.push({ path, code: 'empty', message: `${label} cannot be empty.` });
    }
}
/** Validates untrusted JSON without registering or loading a capability. */
export function validateLeanletManifest(value) {
    const issues = [];
    if (!isRecord(value))
        return {
            valid: false,
            issues: Object.freeze([
                {
                    path: '',
                    code: 'invalid-type',
                    message: 'Leanlet manifest must be an object.',
                },
            ]),
        };
    addRequiredString(value, 'id', issues);
    addRequiredString(value, 'version', issues);
    addRequiredString(value, 'task', issues);
    addOptionalString(value.description, '/description', 'Leanlet manifest description', issues);
    if (!Array.isArray(value.providers)) {
        issues.push({
            path: '/providers',
            code: value.providers === undefined ? 'required' : 'invalid-type',
            message: 'Leanlet manifest providers must be a non-empty array.',
        });
    }
    else {
        if (!value.providers.length)
            issues.push({
                path: '/providers',
                code: 'empty',
                message: 'Leanlet manifest must declare at least one provider.',
            });
        const seen = new Set();
        value.providers.forEach((provider, index) => {
            if (typeof provider !== 'string' ||
                !EXECUTION_PROVIDERS.has(provider))
                issues.push({
                    path: `/providers/${index}`,
                    code: 'unsupported-value',
                    message: `Leanlet manifest declares an unknown provider: ${String(provider)}.`,
                });
            if (seen.has(provider))
                issues.push({
                    path: `/providers/${index}`,
                    code: 'duplicate',
                    message: `Leanlet manifest repeats provider: ${String(provider)}.`,
                });
            seen.add(provider);
        });
    }
    if (value.network !== undefined &&
        (typeof value.network !== 'string' || !NETWORK_CLASSES.has(value.network)))
        issues.push({
            path: '/network',
            code: 'unsupported-value',
            message: `Leanlet manifest declares an unknown network class: ${describe(value.network)}.`,
        });
    if (value.estimatedResidentBytes !== undefined &&
        (typeof value.estimatedResidentBytes !== 'number' ||
            !Number.isFinite(value.estimatedResidentBytes) ||
            value.estimatedResidentBytes < 0))
        issues.push({
            path: '/estimatedResidentBytes',
            code: 'invalid-number',
            message: 'Leanlet manifest estimatedResidentBytes must be finite and non-negative.',
        });
    if (value.assets !== undefined && !Array.isArray(value.assets))
        issues.push({
            path: '/assets',
            code: 'invalid-type',
            message: 'Leanlet manifest assets must be an array.',
        });
    else if (Array.isArray(value.assets)) {
        const paths = new Set();
        value.assets.forEach((asset, index) => {
            const base = `/assets/${index}`;
            if (!isRecord(asset)) {
                issues.push({
                    path: base,
                    code: 'invalid-type',
                    message: 'Leanlet manifest asset must be an object.',
                });
                return;
            }
            if (typeof asset.path !== 'string')
                issues.push({
                    path: `${base}/path`,
                    code: asset.path === undefined ? 'required' : 'invalid-type',
                    message: 'Leanlet manifest asset path must be a string.',
                });
            else if (!asset.path.trim())
                issues.push({
                    path: `${base}/path`,
                    code: 'empty',
                    message: 'Leanlet manifest contains an asset with an empty path.',
                });
            else if (paths.has(asset.path))
                issues.push({
                    path: `${base}/path`,
                    code: 'duplicate',
                    message: `Leanlet manifest repeats asset path: ${asset.path}.`,
                });
            else
                paths.add(asset.path);
            if (typeof asset.bytes !== 'number' ||
                !Number.isFinite(asset.bytes) ||
                asset.bytes < 0)
                issues.push({
                    path: `${base}/bytes`,
                    code: 'invalid-number',
                    message: `Leanlet manifest asset "${describe(asset.path ?? '')}" bytes must be finite and non-negative.`,
                });
            addOptionalString(asset.sha256, `${base}/sha256`, 'Asset sha256', issues);
            addOptionalString(asset.license, `${base}/license`, 'Asset license', issues);
            addOptionalString(asset.sourceRevision, `${base}/sourceRevision`, 'Asset sourceRevision', issues);
        });
    }
    if (issues.length)
        return { valid: false, issues: Object.freeze([...issues]) };
    return {
        valid: true,
        manifest: value,
        issues: Object.freeze([]),
    };
}
/** Parses untrusted JSON and throws one structured error when invalid. */
export function parseLeanletManifest(value) {
    const result = validateLeanletManifest(value);
    if (!result.valid)
        throw new LeanletManifestValidationError(result.issues);
    return result.manifest;
}
//# sourceMappingURL=manifest.js.map