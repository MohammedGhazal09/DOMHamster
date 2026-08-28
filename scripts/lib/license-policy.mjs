export const APPROVED_LICENSE_IDS = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BlueOak-1.0.0',
  'CC-BY-4.0',
  'CC0-1.0',
  'ISC',
  'MIT',
  'MIT-0',
  'MPL-2.0',
  'Python-2.0',
  'Unlicense',
]);

const DEVELOPMENT_ONLY_LICENSE_IDS = new Set(['CC-BY-4.0', 'MPL-2.0']);
const SPDX_OPERATORS = new Set(['AND', 'OR', 'WITH']);

function licenseIdentifiers(expression) {
  const tokens = expression.match(/[A-Za-z0-9.-]+/gu) ?? [];
  return tokens.filter((token) => !SPDX_OPERATORS.has(token));
}

function packageName(path) {
  const marker = 'node_modules/';
  const index = path.lastIndexOf(marker);
  return index < 0 ? path : path.slice(index + marker.length);
}

function noticeFragments(path, licenseId) {
  const name = packageName(path);
  if (licenseId === 'CC-BY-4.0' && name === 'caniuse-lite') {
    return ['caniuse-lite', 'CC-BY-4.0', 'caniuse.com'];
  }
  if (licenseId === 'MPL-2.0' && /^lightningcss(?:-|$)/u.test(name)) {
    return ['lightningcss', 'MPL-2.0', 'github.com/parcel-bundler/lightningcss'];
  }
  return [name, licenseId];
}

function noticeContainsAll(notice, fragments) {
  const normalizedNotice = notice.toLowerCase();
  return fragments.every((fragment) => normalizedNotice.includes(fragment.toLowerCase()));
}

export function auditLockfileLicenses(lockfile, notice) {
  const problems = [];
  for (const [path, entry] of Object.entries(lockfile.packages ?? {})) {
    if (path === '' || (entry.dev === undefined && entry.license === undefined)) continue;

    const license = entry.license;
    if (typeof license !== 'string' || license.trim() === '') {
      problems.push(`${path}:missing-license`);
      continue;
    }

    for (const licenseId of licenseIdentifiers(license)) {
      if (!APPROVED_LICENSE_IDS.has(licenseId)) {
        problems.push(`${path}:${license}`);
        break;
      }
      if (DEVELOPMENT_ONLY_LICENSE_IDS.has(licenseId) && entry.dev !== true) {
        problems.push(`${path}:development-only-license:${licenseId}`);
        continue;
      }
      if (
        DEVELOPMENT_ONLY_LICENSE_IDS.has(licenseId) &&
        !noticeContainsAll(notice, noticeFragments(path, licenseId))
      ) {
        problems.push(`${path}:notice-missing:${licenseId}`);
      }
    }
  }
  return problems.sort();
}
