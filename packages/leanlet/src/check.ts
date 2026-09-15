import type {
  KernelRunOptions,
  LeanletKernel,
  LeanletProvenance,
  LeanletTiming,
} from './core.js';

export type LeanletCheckVerdict = 'pass' | 'review' | 'fail';

export type LeanletCheckDecision<Evidence = unknown> = {
  verdict: LeanletCheckVerdict;
  message: string;
  evidence?: Evidence;
  score?: number;
};

export type LeanletCheckDefinition<Subject, LeanletInput, LeanletOutput, Evidence = unknown> = {
  /** Stable application-level identity for policy, UI, and telemetry. */
  id: string;
  version: string;
  description?: string;
  /** Registered Leanlet that owns the computation for this check. */
  leanletId: string;
  /** Converts application data into the narrow input accepted by the Leanlet. */
  prepare(subject: Subject): LeanletInput;
  /** Converts accepted Leanlet output into an application check decision. */
  decide(output: LeanletOutput, subject: Subject): LeanletCheckDecision<Evidence>;
};

export type DefinedLeanletCheck<Subject, LeanletInput, LeanletOutput, Evidence = unknown> =
  Readonly<LeanletCheckDefinition<Subject, LeanletInput, LeanletOutput, Evidence>>;

export type LeanletCheckResult<Evidence = unknown> =
  | ({
      status: 'completed';
      checkId: string;
      checkVersion: string;
      leanletId: string;
      timing?: LeanletTiming;
      provenance?: LeanletProvenance;
    } & LeanletCheckDecision<Evidence>)
  | {
      status: 'abstained';
      checkId: string;
      checkVersion: string;
      leanletId: string;
      reason: string;
      candidates?: unknown[];
      timing?: LeanletTiming;
      provenance?: LeanletProvenance;
    }
  | {
      status: 'failed';
      checkId: string;
      checkVersion: string;
      leanletId: string;
      message: string;
      recoverable: boolean;
      timing?: LeanletTiming;
      provenance?: LeanletProvenance;
    };

function required(value: string, field: string) {
  if (!value.trim()) throw new TypeError(`Check ${field} must not be empty.`);
}

/** Defines an inspectable application check without coupling it to a model runtime. */
export function defineCheck<Subject, LeanletInput, LeanletOutput, Evidence = unknown>(
  definition: LeanletCheckDefinition<Subject, LeanletInput, LeanletOutput, Evidence>,
): DefinedLeanletCheck<Subject, LeanletInput, LeanletOutput, Evidence> {
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
export async function runCheck<Subject, LeanletInput, LeanletOutput, Evidence = unknown>(
  kernel: LeanletKernel,
  check: DefinedLeanletCheck<Subject, LeanletInput, LeanletOutput, Evidence>,
  subject: Subject,
  options?: KernelRunOptions,
): Promise<LeanletCheckResult<Evidence>> {
  const result = await kernel.run<LeanletInput, LeanletOutput>(
    check.leanletId,
    check.prepare(subject),
    options,
  );
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
