from pathlib import Path

path = Path('tests/persistence/local-storage.test.ts')
text = path.read_text(encoding='utf-8')

replacements = [
    (
        "    envelope.state.auditHistory[0].type = 'CRAFTED_EVENT';",
        """    const firstAuditEvent = envelope.state.auditHistory[0];
    if (firstAuditEvent === undefined) throw new Error('TEST_EXPECTED_AUDIT_EVENT');
    firstAuditEvent.type = 'CRAFTED_EVENT';""",
    ),
    (
        "    envelope.state.committedPlan.assignments[0].status = 'planned';",
        """    const firstAssignment = envelope.state.committedPlan.assignments[0];
    if (firstAssignment === undefined) throw new Error('TEST_EXPECTED_ASSIGNMENT');
    firstAssignment.status = 'planned';""",
    ),
]

for old, new in replacements:
    if old not in text:
        raise RuntimeError(f'missing expected TypeScript fixture mutation: {old}')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
