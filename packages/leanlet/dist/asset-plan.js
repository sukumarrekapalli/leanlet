import { LeanletError } from './core.js';
export function planLeanletAssets(manifests, options = {}) {
    const assets = new Map();
    let duplicateReferences = 0;
    for (const manifest of manifests) {
        for (const asset of manifest.assets ?? []) {
            const existing = assets.get(asset.path);
            if (!existing) {
                assets.set(asset.path, { ...asset });
                continue;
            }
            duplicateReferences += 1;
            if (existing.bytes !== asset.bytes ||
                (existing.sha256 && asset.sha256 && existing.sha256 !== asset.sha256))
                throw new LeanletError('LOAD_FAILED', `Asset "${asset.path}" has conflicting definitions.`);
            if (!existing.sha256 && asset.sha256)
                existing.sha256 = asset.sha256;
        }
    }
    const planned = [...assets.values()].sort((a, b) => a.path.localeCompare(b.path));
    const totalBytes = planned.reduce((sum, asset) => sum + asset.bytes, 0);
    const verifiedBytes = planned
        .filter((asset) => asset.sha256)
        .reduce((sum, asset) => sum + asset.bytes, 0);
    const unverifiedAssets = planned
        .filter((asset) => !asset.sha256)
        .map((asset) => asset.path);
    if (options.requireHashes && unverifiedAssets.length)
        throw new LeanletError('LOAD_FAILED', `Asset plan contains unverified files: ${unverifiedAssets.join(', ')}.`);
    return {
        assets: planned,
        totalBytes,
        verifiedBytes,
        unverifiedAssets,
        duplicateReferences,
        withinBudget: options.maxBytes === undefined || totalBytes <= options.maxBytes,
        budgetBytes: options.maxBytes,
    };
}
//# sourceMappingURL=asset-plan.js.map