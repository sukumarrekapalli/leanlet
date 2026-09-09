/**
 * Defines a small, lifecycle-aware intelligence boundary. The model can be a
 * neural network, a statistical estimator, or an online learner; application
 * code receives the same load → run → dispose contract.
 */
export function defineLeanlet(definition) {
    let contextPromise;
    let destroyed = false;
    const context = () => {
        if (destroyed)
            return Promise.reject(new Error(`Leanlet "${definition.id}" has been destroyed.`));
        contextPromise ??= Promise.resolve(definition.load?.());
        return contextPromise;
    };
    return {
        id: definition.id,
        async warmup() { await context(); },
        async run(input) { return definition.infer(input, await context()); },
        async destroy() {
            if (destroyed)
                return;
            destroyed = true;
            if (contextPromise && definition.dispose)
                await definition.dispose(await contextPromise);
            contextPromise = undefined;
        },
    };
}
//# sourceMappingURL=scoped-leanlet.js.map