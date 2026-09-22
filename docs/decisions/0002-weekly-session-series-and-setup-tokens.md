# ADR 0002: Weekly Session Series and One-Time Account Setup

## Context & Problem
Weekly teaching assignments were stored only as manually recreated Session rows, while account creation had no safe credential bootstrap.

## Decision Made
Keep Session as the immutable occurrence and add SessionSeries with bounded, idempotent materialization plus hashed one-time setup tokens.

## Alternatives Rejected & Reason
A background daemon adds operational state; recurring dashboard algorithms duplicate behavior; plaintext or reversible passwords violate the security boundary.

## Consequences / Trade-offs
Future reads perform bounded materialization, safe future exceptions are replaceable, and setup links must be delivered once without logging raw tokens.
