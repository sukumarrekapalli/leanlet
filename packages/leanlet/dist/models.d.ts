import type { LeanletModelId } from './types.js';
export type LeanletModelDefinition = {
    id: LeanletModelId;
    name: string;
    shortName: string;
    model: string;
    task: 'zero-shot-image-classification' | 'image-classification';
    sizeMB: number;
    tier: 'Recommended' | 'Balanced' | 'Ultra-light';
    strength: string;
    limitation: string;
    sourceRevision: string;
    textDtype?: 'q8' | 'fp16' | 'fp32';
    visionDtype?: 'q8' | 'fp16' | 'fp32';
};
export declare const DEFAULT_PRODUCT_CATEGORIES: readonly ["Electronics", "Fashion & Accessories", "Home & Furniture", "Kitchen & Appliances", "Food & Grocery", "Beauty & Personal Care", "Sports & Outdoors", "Automotive", "Books & Office", "Tools & Hardware", "Toys & Kids", "Jewelry & Watches", "Health & Medical", "Industrial & Construction", "Other product"];
export declare const DEFAULT_CATEGORY_PROMPTS: Record<string, string>;
export declare const LEANLET_MODELS: Record<LeanletModelId, LeanletModelDefinition>;
export declare function getLeanletModel(id: LeanletModelId): LeanletModelDefinition;
//# sourceMappingURL=models.d.ts.map