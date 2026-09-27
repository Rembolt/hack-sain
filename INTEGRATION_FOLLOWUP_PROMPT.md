# NorthFlow teammate integration follow-up prompt

Use this prompt after the frontend skeleton exists and before or when the teammate model/analytics work becomes available.

```text
You are responsible for making the existing NorthFlow frontend integration-ready for model and analytics work being developed by another teammate.

Before changing files:

1. Read `AGENTS.md` completely.
2. Use `$northflow-builder` as the active skill and read its product-contract reference.
3. Inspect the existing `frontend/` implementation, tests, Git status, and any teammate-provided files or documentation.
4. Preserve working prototype behavior and unrelated changes.

Context:

- The current frontend may use local deterministic calculations, generated JSON, or reference fixtures.
- The teammate's model and analytics interface is not finalized.
- Do not invent or freeze an external function signature, API route, transport, deployment model, or payload format prematurely.
- The goal is to create a clean integration seam now so a later adapter can connect the teammate's implementation without rewriting UI components.

Tasks:

1. Audit coupling
   - Identify every place where UI components directly read generated data, call simulation functions, depend on calibration constants, or construct explanation text.
   - Identify assumptions that would make integration difficult.
   - Do not rewrite working code unless the change creates a meaningful integration boundary.

2. Define internal UI view models
   - Define the smallest stable internal shapes the UI actually needs for baseline evidence, assumptions, scenario outcomes, explanation facts, complaint context, provenance, and provider status.
   - These are frontend view models, not declarations of the teammate's future external schema.
   - Preserve nulls, evidence classification, units, horizons, and scenario-versus-observed labels.

3. Add a flexible provider boundary
   - Route model and analytics access through a small provider/adapter layer.
   - Keep the current working implementation as a `reference` provider.
   - Allow a future teammate adapter to map any reasonable source form—local TypeScript module, generated JSON, Python-produced artifact, HTTP API, or server action—into the frontend view models.
   - Do not make presentation components aware of the transport or external payload structure.
   - Do not select a final transport until the teammate provides enough information.

4. Add payload validation and provenance
   - Validate data at the adapter boundary.
   - Surface unavailable, loading, stale, malformed, and partial-result states.
   - Carry provider identity, version when available, generation time when available, and evidence/source metadata.
   - Never label reference fixtures as trained-model output or production analytics.

5. Preserve fallback behavior
   - The prototype must remain runnable with the current reference provider.
   - A failure or absence of the teammate module must produce an honest unavailable/fallback state rather than breaking the page.
   - Do not silently switch between providers without exposing provenance in developer-facing diagnostics.

6. Create integration documentation
   - Add a concise `frontend/docs/teammate-integration.md` or equivalent.
   - Document the internal view models, adapter responsibilities, current reference provider, unresolved decisions, and exact steps for adding a teammate adapter.
   - Clearly separate required fields from optional fields and current assumptions from confirmed teammate decisions.
   - Include an integration checklist, but do not present speculative signatures as final.

7. Add contract-focused tests
   - Test the reference provider through the same boundary the teammate adapter will use.
   - Test missing, partial, malformed, stale, and nullable payloads.
   - Test that switching providers does not change component-level interfaces.
   - Keep numerical model validation separate; the teammate remains responsible for validating their model and analytics.

8. Prepare a teammate handoff
   - Report which frontend inputs are required, which are optional, and what remains undecided.
   - List the minimum questions for the teammate: execution environment, invocation method, input assumptions, output fields, latency, error behavior, versioning, and provenance.
   - Do not block the frontend on questions that can be handled by an adapter later.

Constraints:

- Do not recreate or compete with the teammate's model or analytics implementation.
- Do not expose Northwind account-level data to external services.
- Do not change product claims or evidence semantics.
- Do not couple charts or components to an external schema.
- Do not add a backend merely to anticipate a possible future API.
- Keep the design and current demo behavior intact unless an integration change requires otherwise.

Verification:

- Run existing tests, lint, and production build.
- Confirm the reference provider still supports the complete demo.
- Confirm components consume internal view models rather than raw external payloads.
- Confirm provider absence and malformed results produce usable states.
- Report files changed, checks run, open integration questions, and the exact next step once the teammate shares an interface or artifact.
```
