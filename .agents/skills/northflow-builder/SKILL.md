---
name: northflow-builder
description: Build or extend the integration-ready NorthFlow Next.js prototype, including typed model and analytics adapters, reference scenario fixtures, evidence-aware UI, complaint exploration, and verification. Use for NorthFlow frontend, integration-contract, chart, trace, simulation-shell, or schematic-map work in this repository.
---

# NorthFlow builder

Build a working, defensible frontend skeleton that can consume model and analytics modules delivered by teammates without requiring component rewrites.

Before implementation, read:

1. The repository `AGENTS.md`.
2. [references/product-contract.md](references/product-contract.md) for authoritative joins, calibration, formulas, states, and acceptance values.

## Working approach

1. Inspect the current repository and working tree. Preserve unrelated and untracked files.
2. Keep the application inside `frontend/` and the final source files in `resources_final/`.
3. Establish typed integration contracts, adapters, and isolated reference fixtures before styling or map work.
4. Implement the smallest complete baseline-to-scenario workflow.
5. Verify source reconciliation, simulator behavior, accessibility, and the production build.

Do not stop after scaffolding or planning when the request asks for implementation. Continue through a runnable vertical slice unless blocked by a required permission, missing source, or failing environment.

## Required architecture

Use these boundaries while adapting filenames to the actual application:

- `data`: provider contracts, payload validation, loading, and provenance.
- `domain`: normalized records and evidence classifications.
- `simulation`: provider interfaces and an optional isolated reference implementation with no UI imports.
- `integrations`: replaceable model and analytics adapters owned at the application boundary.
- `selectors`: filtering, joins, aggregation, and view models.
- `state`: selections, assumptions, comparison mode, and resets.
- `visualization`: charts, system trace, schematic coordinates, and map adapter.
- `presentation`: labels, formatting, tokens, and reusable UI primitives.

Default to a client-side reducer/context for shared demo state. Do not add a global-state dependency unless actual complexity justifies it.

## Model and analytics integration boundary

- Treat teammate model and analytics modules as external inputs to the frontend skeleton.
- Define small typed interfaces for baseline evidence, scenario execution, explanations, complaint context, and provenance.
- Validate incoming payloads at the adapter boundary.
- Keep UI components unaware of whether data came from a local fixture, generated JSON, or a teammate module.
- Do not assume the future teammate integration is an API, local import, server action, generated artifact, or any fixed signature. Map it to internal frontend view models when the actual form is known.
- If teammate artifacts are absent, provide an isolated `reference` or `demo` provider using only the documented product-contract values.
- Never call a fixture `production`, `model output`, or `prediction`.
- Do not build a second analytics pipeline when a teammate implementation already exists.
- Implement raw CSV preparation only when it is explicitly assigned or necessary to adapt an agreed teammate contract.

Recommended boundary:

```text
frontend/
  integrations/
    contracts.ts
    analytics-provider.ts
    model-provider.ts
    reference-provider.ts
  data/
    validate-payload.ts
    provenance.ts
```

## Reference scenario behavior

- Use the formulas from the product contract only for an isolated reference provider when real analytics are not yet available.
- Accept normalized decimal rates and validate their permitted ranges.
- Keep capacity recovery independent from complaint prevention and transfer removal.
- Keep transfer removal independent from complaint volume.
- Avoid double-counting the estimated-read and information-only overlap.
- Return unrounded numeric results.
- Generate explanation facts from the same intermediate results used by the output metrics; do not maintain separate handwritten arithmetic.

The zero-assumption scenario is the reference baseline. The default reference scenario is `30% / 25% / 50% / 0%`. The provider name and provenance must make clear that these are contract-backed scenario calculations, not teammate model predictions.

## First vertical slice

The first runnable page must provide:

- the observed company baseline and unchanged backlog trajectory;
- baseline/scenario comparison;
- four labeled range controls with values and reset actions;
- complaint-flow before/after values;
- a 12-month baseline and scenario backlog chart;
- handling-cost impact with the correct 24-month horizon;
- a `Why this changed` explanation that updates with controls;
- explicit scenario and evidence labels; and
- useful loading, empty, and error states.

Use the visual direction as provisional tokens, not a pixel-locked design. Do not add unsupported model-accuracy, household consumption, household bill-target, or geolocation values.

## Complaint exploration and trace

After the simulator vertical slice is stable:

- add month, region, and complaint selection;
- load one month of complaints at a time;
- use `NW-108365` as the initial selection;
- show observed complaint details separately from joined regional context;
- show `SYS-01` as the complaint's observed source relationship;
- show Barrowdale and `SYS-06` as regional context;
- show the feedback loop as proposed/simulated; and
- provide a text/list alternative to graphical selection.

Generate stable schematic coordinates from a deterministic hash of `complaint_id + region`. Coordinates must remain stable across filters and builds and must not use `account_id`.

## ChizuCode reference boundary

Borrow only suitable frontend patterns from `https://github.com/cheikhwade07/ChizuCode`:

- Next.js App Router organization;
- TypeScript client components;
- Tailwind composition and shared UI utilities;
- dynamic imports with SSR disabled for browser-only visualization; and
- explicit loading and interaction states.

Avoid its backend, external AI services, repository ingestion, RAG chat, graph-specific dependencies, fixed brand colors, and oversized graph component.

## Verification gate

Before handoff:

1. Validate the active provider payload and provenance.
2. Run all unit tests.
3. Run lint.
4. Run the production build.
5. Exercise baseline, default scenario, every slider boundary, and both resets.
6. Confirm open complaints show unresolved values rather than zero.
7. Confirm the application remains usable without the map module.
8. Inspect the main page at desktop and narrow widths.
9. Report remaining limitations and the competition-compliance conflict.

Do not substitute a polished static mockup for a working provider-driven interaction, and do not substitute reference fixtures for teammate model or analytics work.
