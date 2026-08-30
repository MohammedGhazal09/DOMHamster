type Brand<Value, Name extends string> = Value & { readonly __brand: Name };

export type RequestId = Brand<string, 'RequestId'>;
export type VolunteerId = Brand<string, 'VolunteerId'>;
export type PlanId = Brand<string, 'PlanId'>;
export type AuditEventId = Brand<string, 'AuditEventId'>;

export type RequestType = 'delivery' | 'transport' | 'setup' | 'translation' | 'check_in';
export type Priority = 'high' | 'medium' | 'low';
export type Zone = 'north' | 'center' | 'east' | 'south' | 'west';
export type Skill = 'lifting' | 'driving' | 'food_handling' | 'setup';
export type Language = 'AR' | 'EN' | 'UR';
export type RequestStatus = 'open' | 'assigned';
export type VolunteerStatus = 'available';
export type TimeOfDay = `${number}${number}:${number}${number}`;
export type WorkflowState =
  'READY' | 'DRAFT_INVALID' | 'DRAFT_VALID' | 'AWAITING_APPROVAL' | 'APPROVED' | 'COMMITTED';

export interface TimeWindow {
  readonly start: TimeOfDay;
  readonly end: TimeOfDay;
}

export interface Request {
  readonly id: RequestId;
  readonly type: RequestType;
  readonly priority: Priority;
  readonly zone: Zone;
  readonly timeWindow: TimeWindow;
  readonly durationMinutes: number;
  readonly requiredSkills: readonly Skill[];
  readonly requiredLanguages: readonly Language[];
  readonly status: RequestStatus;
  readonly untrustedNote: string;
}

export interface Volunteer {
  readonly id: VolunteerId;
  readonly zone: Zone;
  readonly skills: readonly Skill[];
  readonly languages: readonly Language[];
  readonly capacity: number;
  readonly availability: TimeWindow;
  readonly status: VolunteerStatus;
}

export interface PrivateContact {
  readonly recipientAlias: string;
  readonly fictionalLocation: string;
  readonly fictionalContactChannel: string;
}

export interface Scenario {
  readonly id: string;
  readonly date: string;
  readonly timezone: 'Asia/Riyadh';
  readonly maxAssignmentsPerVolunteer: number;
  readonly requests: readonly Request[];
  readonly volunteers: readonly Volunteer[];
  readonly privateContacts: Readonly<Record<string, PrivateContact>>;
}

export interface Assignment {
  readonly requestId: RequestId;
  readonly volunteerId: VolunteerId | null;
  readonly startTime: TimeOfDay | null;
  readonly durationMinutes: number;
  readonly status: 'planned' | 'committed' | 'unassigned';
  readonly lockedByHuman: boolean;
}

export interface ValidationIssue {
  readonly code: string;
  readonly severity: 'error' | 'warning';
  readonly message: string;
  readonly requestIds: readonly RequestId[];
  readonly volunteerId?: VolunteerId;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationIssue[];
  readonly warnings: readonly ValidationIssue[];
}

export interface Draft {
  readonly id: PlanId;
  readonly version: number;
  readonly assignments: readonly Assignment[];
  readonly validation: ValidationResult;
}

export interface ApprovalRecord {
  readonly draftVersion: number;
  readonly status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired';
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly decidedAt?: string;
}

export interface CommittedPlan {
  readonly id: PlanId;
  readonly draftVersion: number;
  readonly assignments: readonly Assignment[];
  readonly committedAt: string;
}

export interface AuditEvent {
  readonly id: AuditEventId;
  readonly sequence: number;
  readonly type: string;
  readonly actor: 'human' | 'agent' | 'system';
  readonly workflowState: WorkflowState;
  readonly timestamp: string;
  readonly draftVersion: number | null;
  readonly safeSummary: string;
}

interface BaseAppState {
  readonly scenario: Scenario;
  readonly auditHistory: readonly AuditEvent[];
}

export interface ReadyState extends BaseAppState {
  readonly workflowState: 'READY';
  readonly draft: null;
  readonly approval: null;
  readonly committedPlan: null;
}

export interface DraftState extends BaseAppState {
  readonly workflowState: 'DRAFT_INVALID' | 'DRAFT_VALID';
  readonly draft: Draft;
  readonly approval: null;
  readonly committedPlan: null;
}

export interface AwaitingApprovalState extends BaseAppState {
  readonly workflowState: 'AWAITING_APPROVAL';
  readonly draft: Draft;
  readonly approval: ApprovalRecord & { readonly status: 'pending' };
  readonly committedPlan: null;
}

export interface ApprovedState extends BaseAppState {
  readonly workflowState: 'APPROVED';
  readonly draft: Draft;
  readonly approval: ApprovalRecord & { readonly status: 'approved' };
  readonly committedPlan: null;
}

export interface CommittedState extends BaseAppState {
  readonly workflowState: 'COMMITTED';
  readonly draft: null;
  readonly approval: null;
  readonly committedPlan: CommittedPlan;
}

export type AppState =
  ReadyState | DraftState | AwaitingApprovalState | ApprovedState | CommittedState;

export function requestId(value: string): RequestId {
  if (!/^R-\d{3}$/.test(value)) {
    throw new TypeError('DOMHAMSTER_INVALID_REQUEST_ID');
  }
  return value as RequestId;
}

export function volunteerId(value: string): VolunteerId {
  if (!/^V-\d{2}$/.test(value)) {
    throw new TypeError('DOMHAMSTER_INVALID_VOLUNTEER_ID');
  }
  return value as VolunteerId;
}
