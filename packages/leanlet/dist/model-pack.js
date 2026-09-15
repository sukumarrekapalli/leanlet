function nonEmpty(value, field) {
    if (!value.trim())
        throw new TypeError(`Model pack ${field} must not be empty.`);
}
/**
 * Defines immutable, inspectable metadata for application-supplied model files.
 * Leanlet does not download or execute the model: the adapter owns those details.
 */
export function defineModelPack(value) {
    nonEmpty(value.id, 'id');
    nonEmpty(value.revision, 'revision');
    nonEmpty(value.format, 'format');
    nonEmpty(value.license, 'license');
    if (!value.providers.length)
        throw new TypeError('Model pack providers must not be empty.');
    if (!Number.isFinite(value.estimatedResidentBytes) || value.estimatedResidentBytes < 0)
        throw new TypeError('Model pack estimatedResidentBytes must be finite and non-negative.');
    if (value.parameterCount !== undefined &&
        (!Number.isFinite(value.parameterCount) || value.parameterCount < 0))
        throw new TypeError('Model pack parameterCount must be finite and non-negative.');
    if (value.contextTokens !== undefined &&
        (!Number.isInteger(value.contextTokens) || value.contextTokens < 1))
        throw new TypeError('Model pack contextTokens must be a positive integer.');
    return Object.freeze({
        ...value,
        providers: Object.freeze([...value.providers]),
        assets: Object.freeze(value.assets.map((asset) => Object.freeze({ ...asset }))),
        languages: value.languages
            ? Object.freeze([...value.languages])
            : undefined,
    });
}
/**
 * Adapts a custom model pack to the managed kernel lifecycle. Loading stays lazy,
 * declared assets participate in planning, and the kernel owns budget admission,
 * scheduling, cancellation, provenance, eviction, and disposal.
 */
export function defineModelLeanlet(definition) {
    const model = defineModelPack(definition.model);
    nonEmpty(definition.id, 'Leanlet id');
    nonEmpty(definition.version, 'Leanlet version');
    nonEmpty(definition.task, 'Leanlet task');
    return Object.freeze({
        model,
        manifest: Object.freeze({
            id: definition.id,
            version: definition.version,
            task: definition.task,
            description: definition.description,
            assets: model.assets,
            estimatedResidentBytes: model.estimatedResidentBytes,
            providers: model.providers,
            network: definition.network ?? 'static-assets',
        }),
        load: (context) => definition.load(model, context),
        run: (input, state, context) => definition.run(input, state, context, model),
        dispose: definition.dispose,
    });
}
//# sourceMappingURL=model-pack.js.map