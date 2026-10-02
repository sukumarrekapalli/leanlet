import type { LeanletManifest } from './core.js';
export declare const LEANLET_MANIFEST_SCHEMA_VERSION: 1;
export type LeanletManifestValidationIssueCode = 'invalid-type' | 'required' | 'empty' | 'unsupported-value' | 'invalid-number' | 'duplicate';
export type LeanletManifestValidationIssue = {
    /** JSON Pointer locating the invalid value. */
    path: string;
    code: LeanletManifestValidationIssueCode;
    message: string;
};
export type LeanletManifestValidationResult = {
    valid: true;
    manifest: LeanletManifest;
    issues: readonly [];
} | {
    valid: false;
    issues: readonly LeanletManifestValidationIssue[];
};
/**
 * JSON Schema representation of the public manifest contract.
 *
 * Unknown properties are allowed so applications can attach namespaced
 * build-time metadata. Leanlet ignores properties outside its documented
 * runtime contract.
 */
export declare const leanletManifestSchema: Readonly<{
    readonly $schema: "https://json-schema.org/draft/2020-12/schema";
    readonly $id: "https://sukumarrekapalli.github.io/leanlet/schemas/manifest-v1.json";
    readonly title: "Leanlet capability manifest";
    readonly type: "object";
    readonly required: readonly ["id", "version", "task", "providers"];
    readonly properties: {
        readonly id: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly version: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly task: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly description: {
            readonly type: "string";
            readonly minLength: 1;
        };
        readonly estimatedResidentBytes: {
            readonly type: "number";
            readonly minimum: 0;
        };
        readonly providers: {
            readonly type: "array";
            readonly minItems: 1;
            readonly uniqueItems: true;
            readonly items: {
                readonly enum: readonly ["javascript", "wasm-single", "wasm-threaded", "webgpu", "webnn"];
            };
        };
        readonly network: {
            readonly enum: readonly ["deny", "static-assets", "application-managed"];
        };
        readonly assets: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly required: readonly ["path", "bytes"];
                readonly properties: {
                    readonly path: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly bytes: {
                        readonly type: "number";
                        readonly minimum: 0;
                    };
                    readonly sha256: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly license: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                    readonly sourceRevision: {
                        readonly type: "string";
                        readonly minLength: 1;
                    };
                };
                readonly additionalProperties: true;
            };
        };
    };
    readonly additionalProperties: true;
}>;
export declare class LeanletManifestValidationError extends TypeError {
    readonly issues: readonly LeanletManifestValidationIssue[];
    constructor(issues: readonly LeanletManifestValidationIssue[]);
}
/** Validates untrusted JSON without registering or loading a capability. */
export declare function validateLeanletManifest(value: unknown): LeanletManifestValidationResult;
/** Parses untrusted JSON and throws one structured error when invalid. */
export declare function parseLeanletManifest(value: unknown): LeanletManifest;
//# sourceMappingURL=manifest.d.ts.map