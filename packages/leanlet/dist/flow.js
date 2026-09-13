export function defineFlow(definition) {
    if (!definition.id.trim())
        throw new TypeError('Flow id cannot be empty.');
    if (!definition.version.trim())
        throw new TypeError('Flow version cannot be empty.');
    const uses = Object.freeze([...new Set(definition.uses)]);
    return {
        id: definition.id,
        version: definition.version,
        uses,
        async run(kernel, input, options = {}) {
            const trace = [];
            const context = {
                signal: options.signal,
                run: async (leanletId, leanletInput, runOptions = {}) => {
                    if (!uses.includes(leanletId))
                        throw new Error(`Flow "${definition.id}" attempted to run undeclared Leanlet "${leanletId}".`);
                    const result = await kernel.run(leanletId, leanletInput, {
                        deadlineMs: runOptions.deadlineMs ?? options.deadlineMs,
                        priority: runOptions.priority ?? options.priority,
                        ...runOptions,
                        signal: options.signal,
                    });
                    trace.push({
                        leanletId,
                        status: result.status,
                        timing: result.timing,
                    });
                    return result;
                },
            };
            const result = await definition.run(input, context);
            return {
                flowId: definition.id,
                flowVersion: definition.version,
                result,
                trace,
            };
        },
    };
}
//# sourceMappingURL=flow.js.map