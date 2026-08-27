from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if old not in text:
        raise RuntimeError(f'{path}: expected text was not found')
    file.write_text(text.replace(old, new, count), encoding='utf-8')


replace(
    'src/app/selectors.ts',
    "return [...value].slice(0, maximumCharacters).join('');",
    'return value.slice(0, maximumCharacters);',
)
replace(
    'src/app/selectors.ts',
    "    state.scenario.volunteers\n      .filter(({ status }) => status === 'available')\n      .map((volunteer) =>",
    '    state.scenario.volunteers.map((volunteer) =>',
)
replace(
    'src/app/selectors.ts',
    "    workflowState: state.workflowState as AssignmentDraftView['workflowState'],",
    '    workflowState: state.workflowState,',
)
replace(
    'src/app/selectors.ts',
    "      assignment === undefined ||\n      assignment.status !== 'committed' ||",
    "      assignment?.status !== 'committed' ||",
)
replace(
    'src/app/store.ts',
    '      return Object.freeze({ ok: true, state }) as StoreDispatchResult;',
    '      return Object.freeze({ ok: true, state });',
)

persistence = Path('src/persistence/local-storage.ts')
text = persistence.read_text(encoding='utf-8')
text = text.replace("const ACTORS = new Set(['human', 'agent', 'system']);\n", '', 1)
anchor = "  'CONTACTS_ACCESSED',\n]);\n\n"
helpers = """  'CONTACTS_ACCESSED',
]);

function isAuditEventType(value: unknown): value is AuditEventType {
  return typeof value === 'string' && AUDIT_EVENT_TYPES.has(value as AuditEventType);
}

function isAuditActor(value: unknown): value is AuditEvent['actor'] {
  return value === 'human' || value === 'agent' || value === 'system';
}

function isNullablePositiveInteger(value: unknown): value is number | null {
  return value === null || isPositiveInteger(value);
}

"""
if anchor not in text:
    raise RuntimeError('src/persistence/local-storage.ts: audit helper anchor missing')
text = text.replace(anchor, helpers, 1)
for old, new in [
    (
        "      typeof entry.type !== 'string' ||\n      !AUDIT_EVENT_TYPES.has(entry.type as AuditEventType) ||\n      !ACTORS.has(String(entry.actor)) ||",
        "      !isAuditEventType(entry.type) ||\n      !isAuditActor(entry.actor) ||",
    ),
    (
        "      !(entry.draftVersion === null || isPositiveInteger(entry.draftVersion)) ||",
        "      !isNullablePositiveInteger(entry.draftVersion) ||",
    ),
    ('      [...entry.safeSummary].length > 160 ||', '      entry.safeSummary.length > 160 ||'),
    ("        actor: entry.actor as AuditEvent['actor'],", '        actor: entry.actor,'),
    ('        draftVersion: entry.draftVersion as number | null,', '        draftVersion: entry.draftVersion,'),
]:
    if old not in text:
        raise RuntimeError(f'src/persistence/local-storage.ts: missing replacement: {old}')
    text = text.replace(old, new, 1)
persistence.write_text(text, encoding='utf-8')

replace(
    'tests/app/store.test.ts',
    '      persistence: { save() {} },',
    '      persistence: { save: () => undefined },',
)

test = Path('tests/persistence/local-storage.test.ts')
text = test.read_text(encoding='utf-8')
for old, new in [
    (
        "function setEnvelope(storage: MemoryStorage, envelope: unknown): void {\n  storage.values.set(DOMHAMSTER_STORAGE_KEY, JSON.stringify(envelope));\n}\n\n",
        """function setEnvelope(storage: MemoryStorage, envelope: unknown): void {
  storage.values.set(DOMHAMSTER_STORAGE_KEY, JSON.stringify(envelope));
}

interface StoredEnvelope {
  savedAt: string;
  state: {
    auditHistory: Array<{ type: string }>;
    committedPlan: { assignments: Array<{ status: string }> };
  };
}

function storedEnvelope(storage: MemoryStorage): StoredEnvelope {
  const raw = storage.values.get(DOMHAMSTER_STORAGE_KEY);
  if (raw === undefined) throw new Error('TEST_EXPECTED_STORED_ENVELOPE');
  return JSON.parse(raw) as StoredEnvelope;
}

""",
    ),
    (
        "    ['READY', (deps: CommandDependencies) => readyState()],",
        "    ['READY', (deps: CommandDependencies) => { void deps; return readyState(); }],",
    ),
    (
        ")('round-trips %s without persisting private scenario fields', (_name, makeState) => {",
        ")('round-trips %s without persisting private scenario fields', async (_name, makeState) => {",
    ),
    ("  it('uses the frozen key and versioned fixture envelope', () => {", "  it('uses the frozen key and versioned fixture envelope', async () => {"),
    ("  it('rejects non-canonical timestamps instead of accepting permissive Date.parse input', () => {", "  it('rejects non-canonical timestamps instead of accepting permissive Date.parse input', async () => {"),
    ("  it('rejects crafted audit event types', () => {", "  it('rejects crafted audit event types', async () => {"),
    ("  it('resets a crafted committed plan that violates assignment invariants', () => {", "  it('resets a crafted committed plan that violates assignment invariants', async () => {"),
    ('    (reviewState) => {', '    async (reviewState) => {'),
    ("  it('throws only a sanitized persistence error when a write is rejected', () => {", "  it('throws only a sanitized persistence error when a write is rejected', async () => {"),
]:
    if old not in text:
        raise RuntimeError(f'tests/persistence/local-storage.test.ts: missing replacement: {old}')
    text = text.replace(old, new, 1)
text = text.replace('    stateRepository.save(', '    await stateRepository.save(')
text = text.replace('      stateRepository.save(', '      await stateRepository.save(')
text = text.replace('await await ', 'await ')
parse = 'const envelope = JSON.parse(storage.values.get(DOMHAMSTER_STORAGE_KEY)!);'
if text.count(parse) != 4:
    raise RuntimeError(f'expected four unsafe JSON.parse sites, found {text.count(parse)}')
text = text.replace(parse, 'const envelope = storedEnvelope(storage);')
test.write_text(text, encoding='utf-8')
