import { CANONICAL_SCENARIO } from '../domain/seed.ts';
import type { ReadyState } from '../domain/types.ts';

export const DEFAULT_READY_STATE = Object.freeze({
  workflowState: 'READY',
  scenario: CANONICAL_SCENARIO,
  draft: null,
  approval: null,
  committedPlan: null,
  auditHistory: Object.freeze([]),
} satisfies ReadyState);
