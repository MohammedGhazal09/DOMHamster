import { sha256Hex } from '../src/domain/canonical-json.ts';
import { CANONICAL_SCENARIO } from '../src/domain/seed.ts';

console.log(await sha256Hex(CANONICAL_SCENARIO));
