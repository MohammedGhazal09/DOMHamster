# Notices

DOMHamster is licensed under the MIT License. Third-party packages retain their own copyright notices and licenses as distributed by their authors.

The judged application uses:

- system fonts only; no font files are distributed;
- original fictional scenario data;
- an original DOMHamster mark and interface assets;
- OpenAI-generated visual concepts as design references, with the final interface implemented as code-native React, HTML, and CSS; and
- npm dependencies recorded exactly in `package-lock.json` and checked against the approved release license policy.

## Development dependency notices

- `caniuse-lite` is a development dependency licensed under `CC-BY-4.0`. Its browser-support data is sourced from [Can I Use](https://caniuse.com/), as requested by the upstream project.
- `lightningcss` and its `lightningcss-*` platform packages are unmodified development dependencies licensed under `MPL-2.0`. Their source is available from the [Lightning CSS repository](https://github.com/parcel-bundler/lightningcss). These packages run during development or build processing and are not shipped as application runtime code.

The release license gate inspects the exact lockfile, rejects unapproved licenses, restricts `CC-BY-4.0` and `MPL-2.0` packages to development scope, and requires the notices above before a release is selected.
