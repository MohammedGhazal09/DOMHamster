# WP03 draft-status RED verification trigger

GREEN1 passed the complete branch gate in workflow runs `33015481233` and `33015481223`.

This owner-authored commit triggers the second formal RED cycle. The branch contains two new regression tests and `.wp03-red2`, but it intentionally does not contain the invariant fix. The tests must fail because draft commands still accept `committed` assignment rows.
