# NorthFlow builder agent prompt

You are the implementation owner for the NorthFlow hackathon prototype in this repository.

Before changing files:

1. Read `AGENTS.md` completely.
2. Read `.agents/skills/northflow-builder/SKILL.md` completely and follow it as the active build skill.
3. Read `.agents/skills/northflow-builder/references/product-contract.md` completely.
4. Inspect the repository and current working tree. Preserve unrelated and untracked work.

## Objective

Implement a runnable, design-neutral NorthFlow web prototype under `frontend/` using Next.js App Router, React, TypeScript, Tailwind CSS, npm, and Vitest.

The first milestone is the transparent simulation workflow, not the 3D neighborhood. The prototype must prove:

1. The observed Northwind problem exists in the supplied final data.
2. Each NorthFlow intervention changes only the part of the operating model it is intended to change.
3. Every operational and financial result can be traced to source evidence, a visible assumption, and deterministic arithmetic.

Do not stop at a plan or static mockup. Implement, test, and build a working vertical slice.

## Repository and data boundaries

- Put all prototype application code and tests in `frontend/`.
- Read only the seven CSV files in `resources_final/`.
- Keep the raw CSVs outside the frontend's public assets.
- Do not use `resources/`, `analysis/`, or numbers embedded in prototype images.
- Do not add a backend, hosted database, telemetry service, or external AI/API call.
- Do not delete or overwrite the existing prototype assets.

## Required implementation

### 1. Frontend scaffold

Create a conventional Next.js App Router project in `frontend/` with:

- TypeScript strict mode;
- Tailwind CSS;
- ESLint;
- Vitest;
- npm scripts for development, data preparation, tests, lint, and production build; and
- a committed lockfile.

Use a single main route for the coherent `Problem -> Evidence -> Explore -> Trace -> Simulate -> Value` journey. The initial vertical slice may prioritize Problem, Evidence, Simulate, and Value while keeping the remaining sections as functional, honest placeholders.

### 2. Data preparation and contracts

Build a reproducible TypeScript preparation step that:

- parses the authoritative CSVs;
- normalizes fields and preserves nulls;
- validates unique keys, six regions, dates, enums, and numeric ranges;
- performs and verifies every required join;
- derives the simulation calibration from source records;
- writes compact browser JSON under `frontend/public/data/`;
- splits complaint events by month;
- emits a source manifest and reconciliation summary; and
- fails clearly when a contract is violated.

Do not parse CSVs independently in components.

### 3. Pure simulation engine

Implement typed, deterministic functions with no React imports. Follow the product contract formulas exactly and return unrounded values.

Support these independent controls:

- estimated-read complaints prevented, 0–60%, default 30%;
- information-only complaints deflected, 0–60%, default 25%;
- cross-system transfers removed, 0–100%, default 50%; and
- closure capacity recovered, 0–15%, default 0%.

Expose the intermediate calculations required to explain why results changed.

### 4. Automated tests

Test source reconciliation, join coverage, null preservation, zero assumptions, default results, slider boundaries, reset behavior, overlap handling, monotonic behavior, capacity independence, transfer independence, non-negative backlog, selectors, and stable schematic coordinates.

Use numeric tolerances for unrounded expected-value results and exact comparisons for identifiers and counts.

### 5. Working simulation page

Implement:

- observed baseline evidence;
- baseline/scenario comparison;
- four accessible range controls with displayed values;
- reset to observed baseline;
- reset to demonstration defaults;
- complaint-flow before/after visualization;
- 12-month baseline and scenario backlog chart;
- handling-cost impact for the observed 24-month population;
- projected case-mix cycle time with the correct limitation;
- a dynamic `Why this changed` panel driven by simulator intermediates; and
- loading, empty, and contract-error states.

Every projected result must visibly say `Scenario, not forecast.`

Do not label the approximately $455,000 result as annual savings or ROI. Do not claim that 43.8 days directly falls to 25.6 days.

### 6. Complaint context and trace

Add the initial complaint selection for `NW-108365`, with its observed details and June 2025 Barrowdale context. Visually distinguish:

- the observed `SYS-01` complaint association;
- contextual `SYS-06` and regional meter/staffing information; and
- the proposed verified feedback loop.

Never present the regional systems association as an observed transaction path.

### 7. Visualization boundary

Create a lightweight schematic or placeholder map module that is dynamically imported and cannot block the simulator. Provide a keyboard-accessible complaint list and text details.

Do not add Three.js or spend time on final 3D polish in this milestone. Keep the visualization adapter replaceable so 3D can be introduced later.

### 8. Presentation system

Create reusable design tokens for background, surfaces, text, evidence connectors, health/warning/risk states, borders, shadows, and region colors. Use the requested soft sky-blue enterprise direction provisionally without locking a final layout.

Use ChizuCode only as a structural reference for App Router, Tailwind composition, dynamic browser-only visualizations, and interaction/loading states. Do not copy its backend, RAG, graph dependencies, brand palette, or monolithic component structure.

## Acceptance criteria

The work is complete only when:

- data preparation reconciles all 25,416 complaints to meter, staffing, and source-system records;
- the zero-assumption scenario reproduces the baseline;
- the default scenario produces approximately 2,847 prevented complaints, 11.2% reduction, $455,000 handling-cost avoidance, 25.6 case-mix days, and 480 backlog after 12 months;
- the unchanged trajectory reaches 2,010 after 12 months;
- open complaints never show a zero-day duration or fabricated resolution;
- the UI explains why each changed metric changed;
- the UI remains usable if the map module fails or has not loaded;
- tests, lint, and the production build pass; and
- the final handoff lists commands run, files created, test results, known limitations, and the challenge brief's AI-assistance compliance conflict.

Make reasonable implementation decisions within these constraints. Ask for user input only when a missing choice would materially change the product or require additional authority.
