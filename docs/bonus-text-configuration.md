# Bonus: Text Configuration

## Goal

The feature should let an internal admin or customer administrator describe account setup in text and convert it into concrete, reviewable configuration changes.

Example input:

```txt
JIP, 20 sester, nikdo nesmi slouzit dve nocni po sobe, export do EGJE.
```

Expected change set:

- account department context: `JIP`
- worker placeholders: `20`
- generator rule: maximum `1` consecutive night
- feature toggle: enable `EGJE export`

## Boundary Between LLM And Deterministic Code

The LLM should not write to the database directly.

Recommended production flow:

1. UI collects free text.
2. API stores the original request text as a draft.
3. LLM extracts structured intent into a strict JSON schema.
4. Deterministic code validates the schema with Zod.
5. Domain validation checks account permissions, allowed modules, rule ranges, plan limits, and missing context.
6. A deterministic change builder converts intent into a before/after diff.
7. User reviews the diff and resolves clarifications.
8. API applies the approved changes in one transaction.
9. Audit log stores original text, structured intent, approved diff, actor, and timestamp.

In the app, React sends text to the Worker endpoint `POST /api/text-configuration/analyze`. If `OPENAI_API_KEY` is configured, the Worker asks the LLM for strict structured JSON, then validates the result with the same Zod and domain rules. If no key is configured or the model call fails, the Worker and browser can fall back to `features/text-configuration/engine/textConfigurationEngine.ts`, which keeps local review and deployment demos usable without secrets.

The Worker AI layer is separated like a production module:

- `src/worker/ai/client.ts`: reads `OPENAI_API_KEY` and `OPENAI_MODEL`
- `src/worker/ai/prompts.ts`: owns the extraction instructions
- `src/worker/ai/schemas.ts`: owns the OpenAI JSON schema boundary
- `src/worker/ai/analyze-text-configuration.ts`: runs LLM extraction or explicit deterministic fallback

The UI shows whether the current analysis came from `LLM` or `Fallback`, including the model name or fallback reason.

## Validation

Validation has multiple layers:

- JSON/schema validation: required fields, enums, numbers, supported modules.
- Domain validation: safe ranges, supported generator rules, account target exists, plan allows requested module.
- Permission validation: actor can change features, security policy, and generator settings.
- Persistence validation: transaction can be applied without violating database constraints.

LLM confidence is only a signal. It cannot override deterministic validation.

## Ambiguity Handling

Ambiguous input must produce clarification questions instead of guessed writes.

Examples:

- `export` without module name: ask which export module.
- `nocni po sobe` without a number: ask maximum allowed consecutive nights.
- no target account or department: ask where to apply settings.
- unusually large worker count: allow review but ask whether workers should come from HR import.

Blocking clarifications disable apply. Non-blocking clarifications are warnings.

## Preview Before Save

The user must see an exact diff before saving:

```txt
Target: Feature toggles
Before: Disabled or inherited
After: Enabled EGJE export
Risk: Medium
Source: LLM extraction
```

High-risk changes should be visually marked and may require stronger confirmation in production.

## Testing Strategy

Unit tests:

- text examples map to expected structured intent
- unsupported module creates blocking clarification
- vague night rule creates blocking clarification
- strict one-night rule creates high-risk change
- valid sample creates expected four changes

Schema tests:

- invalid enum is rejected
- worker count must be positive and within maximum
- unsupported generator rule is rejected

Domain tests:

- missing account target blocks apply
- high-risk setting requires permission
- blocked clarifications prevent saving
- allowed clarifications do not block saving

Integration tests:

- analyze text
- fall back to deterministic analysis when the LLM is unavailable
- show extraction source and model/fallback status in the UI
- show structured intent
- show preview diff
- block apply when ambiguous
- apply valid preview
- write audit event
- persist applied text configuration history

Production tests:

- prompt regression dataset with real anonymized requests
- golden outputs for common customer setup phrases
- adversarial prompt-injection cases
- idempotency tests for repeated apply calls
- transaction rollback tests

## Prototype Scope

The current app implements:

- a text input workspace
- server-side LLM extraction when `OPENAI_API_KEY` is configured
- deterministic extraction fallback for local/demo mode
- Zod-backed structured intent validation
- ambiguity and validation messages
- before/after preview cards
- disabled apply when the request is unsafe
- persisted apply history in the shared admin snapshot and D1 table
- synchronization into the shared Customer Accounts data store

Production should harden apply into a dedicated transaction endpoint with actor identity, role checks, idempotency keys, and append-only audit logs.
