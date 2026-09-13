import type { LeanletAsset, LeanletManifest } from './core.js';
export type LeanletAssetPlan = {
    assets: LeanletAsset[];
    totalBytes: number;
    verifiedBytes: number;
    unverifiedAssets: string[];
    duplicateReferences: number;
    withinBudget: boolean;
    budgetBytes?: number;
};
export declare function planLeanletAssets(manifests: readonly LeanletManifest[], options?: {
    maxBytes?: number;
    requireHashes?: boolean;
}): LeanletAssetPlan;
//# sourceMappingURL=asset-plan.d.ts.map