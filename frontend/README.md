# NorthFlow prototype

NorthFlow is a local-only Next.js prototype for an ML-assisted billing reliability layer. It explains the proposed risk-and-confidence workflow, shows how verified complaint resolutions could create feedback, and keeps possible business impact in a separate deterministic scenario engine.

## Run locally

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The `predev` hook regenerates browser-safe JSON from the seven authoritative CSV files in `../resources_final/` before the development server starts.

- `/` is the product story: problem evidence, proposed risk workflow, the `NW-108365` complaint trace, verified feedback loop, and default-scenario value summary. Detailed record exploration is collapsed behind **Inspect records**.
- `/dashboard` is the scenario workspace: observed baseline, recommended scenario, four outcome cards, backlog trajectory, dynamic explanation, and a collapsed **Adjust assumptions** panel.

Month, region, complaint selection, scenario assumptions, and comparison mode are encoded in URL parameters and shared between routes. A direct `/dashboard?...` link restores the same state.

## Verify

```bash
npm run prepare:data
npm test
npm run lint
npm run check:scenarios
npm run build
```

Raw CSV files stay outside the public application. Generated data is split by month under `public/data/` and is reproducible rather than committed.

## Scope

This milestone implements the evidence, complaint exploration and trace, deterministic simulation, backlog, and value workflow. The map is deliberately schematic and uses stable illustrative positions derived from `complaint_id + region`; it is not geolocation. One house is one complaint event. Category colour, SLA ring, transfer, reopen, open-state, and selected-state marks are evidence semantics; `account_id` never affects position. True 3D is deferred.

The simulator is accessed through the typed contract in `src/integrations/contracts.ts`. `reference-provider.ts` wraps the current local deterministic engine and declares provenance explicitly. A teammate-owned analytics implementation can replace it through `analytics-provider.ts` without changing route components or assuming an external API transport. Browser payloads are validated at the data-provider boundary before entering shared state.

The same integration contract defines the frontend-normalized `NormalizedModelResult`, `ModelAdapter`, and `VerifiedFeedbackRecord`. These internal shapes cover case identity, risk, confidence, reason codes, recommended action, model version/provenance, confirmed outcome, verified correction, verification source, and timestamp. They do not prescribe the teammate model's external transport, function signature, or raw payload.

The scenario neighborhood is an illustrative, seeded allocation among eligible complaint events. It is not a household prediction; aggregate numeric results from the scenario engine are authoritative.

The supplied challenge brief warns that AI-assisted analysis or building may be disqualifying. This repository does not claim organizer approval; the team must resolve competition eligibility before submission.
