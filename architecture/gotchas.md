# Gotchas

## 2026-09-20 — Protected table viewport audit
What broke / almost broke: A local visual-audit request to `/admin/accounts` renders the expected `Unauthorized` error without a signed-in test session.
Root cause: Admin table routes correctly enforce server-side authorization.
Check before touching protected table UI again: Use an authorized test account or authenticated browser context for visual screenshots; retain the unauthenticated rejection.

## 2026-09-20 — Timer selector was coupled to attendance expiry
What broke / almost broke: The existing timer selected only sessions whose `deadline` had not passed, then described an empty timing state as an immediate-session condition.
Root cause: A check-in deadline is an attendance boundary, not the definition of a future or currently running session.
Check before touching timing: Select next/current sessions by effective start/end time; leave the existing deadline validation independent and ensure one-off effective occurrences do not mutate recurring base times.
