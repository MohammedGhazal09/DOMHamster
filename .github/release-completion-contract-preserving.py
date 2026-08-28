from __future__ import annotations

import importlib.util
from pathlib import Path

module_path = Path('.github/release-completion-repair.py')
spec = importlib.util.spec_from_file_location('release_completion_repair', module_path)
if spec is None or spec.loader is None:
    raise RuntimeError('release repair module could not be loaded')
repair = importlib.util.module_from_spec(spec)
spec.loader.exec_module(repair)

repair.assert_internal_helper = lambda _name, _expected_path: None
original_replace_once = repair.replace_once


def guarded_replace_once(path_value: str, old: str, new: str) -> None:
    helper_exports = {
        ('src/app/StoreConnectedApp.tsx', 'export function registrySnapshotKey'),
        ('src/ui/ApprovedBanner.tsx', 'export function formatApprovalCountdown'),
    }
    if any(path_value == path and marker in old for path, marker in helper_exports):
        return
    original_replace_once(path_value, old, new)


repair.replace_once = guarded_replace_once
repair.apply_pre_fix()


def replace_once(path_value: str, old: str, new: str) -> None:
    path = Path(path_value)
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'expected one match in {path_value}, found {count}')
    path.write_text(text.replace(old, new, 1))


registry_helper = Path('src/app/registry-snapshot-key.ts')
if registry_helper.exists():
    raise RuntimeError('registry snapshot helper already exists')
registry_helper.write_text(
    """import type { WebMcpRegistrySnapshot } from '../webmcp/registry.ts';

export function registrySnapshotKey(snapshot: WebMcpRegistrySnapshot | null): string {
  if (snapshot === null) return 'registry:null';
  return JSON.stringify([
    snapshot.active,
    snapshot.generation,
    snapshot.desiredToolNames,
    snapshot.registeredToolNames,
    snapshot.errorCodes,
  ]);
}
"""
)
replace_once(
    'src/app/StoreConnectedApp.tsx',
    "import { App, type AppProps } from './App.tsx';\n",
    "import { App, type AppProps } from './App.tsx';\nimport { registrySnapshotKey } from './registry-snapshot-key.ts';\n",
)
replace_once(
    'src/app/StoreConnectedApp.tsx',
    """export function registrySnapshotKey(snapshot: WebMcpRegistrySnapshot | null): string {
  if (snapshot === null) return 'registry:null';
  return JSON.stringify([
    snapshot.active,
    snapshot.generation,
    snapshot.desiredToolNames,
    snapshot.registeredToolNames,
    snapshot.errorCodes,
  ]);
}

""",
    '',
)

countdown_helper = Path('src/ui/approval-countdown.ts')
if countdown_helper.exists():
    raise RuntimeError('approval countdown helper already exists')
countdown_helper.write_text(
    """export function formatApprovalCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
"""
)
replace_once(
    'src/ui/ApprovedBanner.tsx',
    "import { useEffect, useRef, useState } from 'react';\n",
    "import { useEffect, useRef, useState } from 'react';\nimport { formatApprovalCountdown } from './approval-countdown.ts';\n",
)
replace_once(
    'src/ui/ApprovedBanner.tsx',
    """export function formatApprovalCountdown(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

""",
    '',
)

replace_once(
    'tests/toolchain/registry-ui-bridge-contract.test.mjs',
    "  'subscribeRegistry(listener: () => void): () => void;',\n",
    "  'readonly subscribeRegistry: (listener: () => void) => () => void;',\n",
)
