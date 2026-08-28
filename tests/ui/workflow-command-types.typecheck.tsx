import { DEFAULT_READY_STATE } from '../../src/app/default-state.ts';
import type { WorkflowCommandHandler } from '../../src/ui/workflow-commands.ts';

const synchronousHandler: WorkflowCommandHandler = () => undefined;
const acceptedHandler: WorkflowCommandHandler = () => ({
  ok: true,
  state: DEFAULT_READY_STATE,
});
const rejectedHandler: WorkflowCommandHandler = () => ({
  ok: false,
  state: DEFAULT_READY_STATE,
  error: {
    code: 'PERSISTENCE_WRITE_FAILED',
    message: 'PERSISTENCE_WRITE_FAILED',
  },
});
const asynchronousHandler: WorkflowCommandHandler = async () => ({
  ok: true,
  state: DEFAULT_READY_STATE,
});
const asynchronousNoResultHandler: WorkflowCommandHandler = async () => {
  await Promise.resolve();
};

// @ts-expect-error Numeric callback results are not valid workflow command outcomes.
const invalidHandler: WorkflowCommandHandler = () => 42;

// @ts-expect-error Successful store results must include the resulting immutable state.
const incompleteSuccess: WorkflowCommandHandler = () => ({ ok: true });

void [
  synchronousHandler,
  acceptedHandler,
  rejectedHandler,
  asynchronousHandler,
  asynchronousNoResultHandler,
  invalidHandler,
  incompleteSuccess,
];
