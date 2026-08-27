import type { PublicValidationIssueView } from '../app/selectors.ts';

export function validationIssueDomId(
  issue: PublicValidationIssueView,
  index: number,
): string {
  return `validation-issue-${issue.severity}-${index}-${issue.code
    .toLowerCase()
    .replaceAll('_', '-')}`;
}
