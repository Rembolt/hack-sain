# NorthFlow repository guidance

## Purpose

Build NorthFlow, a design-neutral billing-reliability prototype for a five-minute hackathon demonstration. This repository currently provides the frontend skeleton and integration boundary for model and analytics work owned by other teammates.

The application must show why each result changes when real teammate outputs are connected. It must not imply that placeholder fixtures are a trained or validated household bill-prediction model.

## Team ownership boundary

- The frontend builder owns the Next.js shell, interaction state, components, charts, accessibility, design tokens, typed integration contracts, loading/error/empty states, and replaceable adapters.
- Teammates own the real model, analytics pipeline, calibration artifacts, and final analytical outputs unless those modules are explicitly handed to the frontend builder.
- Do not reimplement, rename, or silently supersede teammate model or analytics work.
- If teammate modules are not present, use a clearly named local demo/reference provider behind the same interfaces. Keep fixtures isolated from production adapters and label them as reference scenario data in developer-facing code.
- Do not freeze an external function signature, transport, route, or payload shape before the teammate provides one. Stabilize only the frontend's internal view models and keep external mapping inside adapters.
- The product contract defines expected shapes, evidence rules, and known acceptance values. It is an integration contract, not permission to invent additional analytics.
- Record every temporary fixture and integration seam in the handoff so it can be replaced without rewriting UI components.

## Source authority

- Treat only `resources_final/` as authoritative challenge data.
- Never load data or headline numbers from `resources/`, `analysis/`, or prototype images.
- Keep the authoritative source files at the repository root. Do not copy raw account-level CSVs into a public browser directory.
- Preserve source provenance and reconcile generated data to the source files.
- Do not send Northwind data to an external model, API, analytics service, or hosted database.

## Application boundary

- Put all prototype application code, configuration, generated browser data, and tests under `frontend/`.
- Use Next.js App Router, React, TypeScript, Tailwind CSS, npm, and Vitest.
- The core demo must run without a backend or network request.
- UI components must consume typed providers and must not parse CSV files.
- Only implement a CSV preparation pipeline when the user assigns that work to this agent or the teammate analytics module explicitly requires a compatible local preparation step.
- Keep raw data parsing, domain models, simulation, selectors, visualization, and presentation concerns separate.
- Keep calculations out of React components.
- Preserve unrelated user work and the existing untracked `assets/` directory.

## Product sequence

Implement the proof-of-logic UI and its replaceable provider contract before the map:

1. Observed baseline.
2. Four independent intervention controls.
3. Complaint-flow comparison.
4. Backlog trajectory.
5. Cost and process impact.
6. Dynamic `Why this changed` explanation.
7. Complaint exploration and trace.
8. Lightweight schematic map.
9. True 3D only if the earlier workflow is stable.

Do not make the 3D scene responsible for proving that NorthFlow works.

## Evidence and accuracy

- `complaint_id` is the complaint-event and rendered-house key.
- `account_id` is an anonymized reference, never a geographic or property key.
- Derive complaint month from `date_opened` as `YYYY-MM`.
- A complaint `source_system` relationship is observed.
- Meter, staffing, and regional-system relationships joined by region and month are contextual.
- Scenario results and the verified feedback loop are simulated/proposed.
- Use solid connectors for observed links, dotted connectors for regional context, and green connectors for simulated future links.
- Never show contextual associations as household-level causal facts or transaction logs.
- Never convert missing closure, duration, or resolution values to zero.
- Always disclose: `Schematic customer homes. Operational values come from Northwind's data; locations are illustrative.`
- Label projected outputs: `Scenario, not forecast.`

## Official measures

- Use `northwind_monthly_kpis.csv` for company-level backlog, current closure time, and monthly trend.
- Use `northwind_complaints.csv` for complaint-level categories, transfers, outcomes, and corrections.
- Show the difference between the two sources instead of hiding or reconciling it away.
- Treat the September 2026 KPI of 43.8 days as the current headline.
- Do not compare it directly with the simulator's 25.6-day case-mix result as if both represented the same population.
- Keep regulatory exposure separate from the main savings total.
- Do not call the approximately $455,000 result annual savings or ROI; it applies to the observed 24-month complaint population.

## Frontend guidance

- Use a single coherent `Problem -> Evidence -> Explore -> Trace -> Simulate -> Value` journey on the main route.
- Use design tokens rather than hard-coded styling decisions inside components.
- Use ChizuCode as a structural reference for App Router, Tailwind composition, dynamic client-only visualization loading, and accessible interaction states.
- Do not copy ChizuCode's RAG/backend architecture, graph dependencies, brand styling, or monolithic graph component.
- Prefer semantic HTML and native controls.
- Provide a keyboard-accessible complaint list as an alternative to visual map selection.
- Respect `prefers-reduced-motion` and do not rely on color alone.
- Lazy-load map/visualization code so it cannot block the baseline and simulator.
- Keep the initial visualization lightweight and schematic. Do not add Three.js until explicitly requested or justified by a stable MVP.

## State behavior

Support:

- selected month;
- selected region;
- selected complaint;
- scenario assumptions;
- baseline/scenario comparison;
- no matching records;
- open complaints with unresolved fields;
- reset to the observed baseline; and
- reset to the default demonstration scenario.

Use `NW-108365`, Barrowdale, and June 2025 as the initial demonstration selection. If filtering excludes the selected complaint, clear the selection rather than retaining hidden state.

## Engineering quality

- Prefer pure deterministic functions and immutable inputs for local reference providers.
- Keep all model and analytics access behind typed interfaces so teammate implementations can replace fixtures without component rewrites.
- Round only in presentation code.
- Validate keys, enums, ranges, dates, nulls, and every required join.
- Fail data preparation clearly when a required contract is broken.
- Add automated tests for data reconciliation, simulation invariants, selectors, null behavior, and stable schematic coordinates.
- Run lint, tests, and a production build before handoff.
- Do not claim completion if required checks fail. Report the exact limitation.

## Local skill

For NorthFlow implementation, read and follow `.agents/skills/northflow-builder/SKILL.md`. Read its product contract reference before changing data, simulation, state, or evidence presentation.

## Competition compliance

The supplied challenge brief states that AI-assisted analysis and building may be disqualifying. Do not conceal this conflict or claim organizer approval. Keep the implementation local and report the issue in the final handoff so the team can make the competition-compliance decision.
