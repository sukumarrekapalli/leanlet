function required(value, field) {
    if (!value.trim())
        throw new TypeError(`Check ${field} must not be empty.`);
}
/** Defines an inspectable application check without coupling it to a model runtime. */
export function defineCheck(definition) {
    required(definition.id, 'id');
    required(definition.version, 'version');
    required(definition.leanletId, 'leanletId');
    if (typeof definition.prepare !== 'function')
        throw new TypeError('Check prepare must be a function.');
    if (typeof definition.decide !== 'function')
        throw new TypeError('Check decide must be a function.');
    return Object.freeze({ ...definition });
}
/**
 * Delegates a check to its registered Leanlet through the kernel, preserving
 * scheduling, policy, lifecycle, cancellation, timing, and provenance.
 */
export async function runCheck(kernel, check, subject, options) {
    const result = await kernel.run(check.leanletId, check.prepare(subject), options);
    const identity = {
        checkId: check.id,
        checkVersion: check.version,
        leanletId: check.leanletId,
    };
    if (result.status === 'accepted') {
        const decision = check.decide(result.output, subject);
        if (!['pass', 'review', 'fail'].includes(decision.verdict))
            throw new TypeError(`Check "${check.id}" returned an invalid verdict.`);
        return {
            status: 'completed',
            ...identity,
            ...decision,
            timing: result.timing,
            provenance: result.provenance,
        };
    }
    if (result.status === 'abstained')
        return {
            status: 'abstained',
            ...identity,
            reason: result.reason,
            candidates: result.candidates,
            timing: result.timing,
            provenance: result.provenance,
        };
    return {
        status: 'failed',
        ...identity,
        message: result.error.message,
        recoverable: result.recoverable,
        timing: result.timing,
        provenance: result.provenance,
    };
}
//# sourceMappingURL=check.js.map