# Workspace OS feedback

- 2026-09-29: The root Tier-2 schema compatibility checker passes `--from-schema-datasource` without its required schema path to Prisma 5.21.1. This blocks `collect-tier2-evidence.mjs` and the staged commit gate for schema-bearing product changes, even after a direct read-only Prisma diff reports zero drift. The fix belongs to the root OS checker, outside this product-only task.
