# NorthFlow product contract

Read this reference before changing NorthFlow data integration, simulation state, evidence presentation, or headline values.

## Ownership note

This document defines the frontend integration contract and reference acceptance values. The frontend builder is creating a skeleton while teammates deliver the real model and analytics components.

- Consume teammate outputs through typed adapters when they are available.
- Use the formulas below only as an isolated reference scenario provider or as validation expectations unless ownership of the analytics engine is explicitly reassigned.
- Do not present reference fixtures as trained-model output, production analytics, or prediction accuracy.
- Keep payload provenance visible to developers so the active provider can be identified during integration.

## Authoritative sources

Use only:

- `resources_final/northwind_complaints.csv`
- `resources_final/northwind_meter_reads.csv`
- `resources_final/northwind_contact_centre_staffing.csv`
- `resources_final/northwind_monthly_kpis.csv`
- `resources_final/northwind_systems.csv`
- `resources_final/northwind_unit_costs.csv`
- `resources_final/northwind_ai_pilot_2025.csv`

The challenge brief is `resources_final/Northwind_Challenge_Brief.docx`.

## Required joins

1. Derive complaint month from `complaints.date_opened` as `YYYY-MM`.
2. Join complaints to meter context on `region + month`.
3. Join complaints to staffing context on `region + month`.
4. Join complaint `source_system` to `systems.system_id`.
5. Split `meter_reads.systems_serving_region` on `/` and join each ID to `systems.system_id`.

Expected reconciliations:

- 25,416 unique complaint IDs.
- Six regions and 24 months.
- 25,416 meter-context matches.
- 25,416 staffing-context matches.
- 25,416 source-system matches.
- 288 valid regional-system references after splitting.

## Source roles and discrepancy

Use monthly KPIs for company-level backlog and current trend. Use complaint records for event-level/category analysis.

- Complaint records: 25,416.
- KPI complaints opened: 25,504.
- Difference: 88.
- Complaint records currently open: 1,599.
- KPI cumulative opened minus closed: 1,758.
- Backlog difference: 159.

Do not hide, overwrite, or silently reconcile these differences.

Latest complaint cohorts are censored. Use the September 2026 KPI of 43.8 days as the current company headline.

## Complaint calibration

```text
N    = 25,416 total complaints
E    = 4,833 estimated-read complaints
I    = 5,865 information-only complaints
EI   =   928 estimated-read and information-only overlap

T    = 8,870 transferred complaints
TE   = 1,702 transferred estimated-read complaints
TI   = 2,015 transferred information-only complaints
TEI  =   328 transferred complaints in both categories
```

Observed cycle-time inputs:

```text
nonTransferredAverageDays = 22.966
transferredAverageDays    = 38.245
```

Official monthly/backlog inputs:

```text
openingBacklog       = 1,758
monthlyOpened        = 1,139
monthlyClosed        = 1,118
currentKpiCloseDays  = 43.8
```

Cost inputs used in the main simulator:

```text
normalHandlingCost   = 68
transferredCost      = 121
transferPremium      = 53
```

The `121` transferred cost equals `68 + 53`. Other costs may be shown separately only when a documented scenario uses them. Regulatory penalties must remain outside the main saving total.

## Assumptions

```ts
type SimulationAssumptions = {
  estimationPreventionRate: number;  // 0.00 to 0.60, default 0.30
  informationDeflectionRate: number; // 0.00 to 0.60, default 0.25
  transferReductionRate: number;     // 0.00 to 1.00, default 0.50
  capacityRecoveryRate: number;      // 0.00 to 0.15, default 0.00
};
```

## Formulas

```text
preventedByEstimation = E * estimationPreventionRate

remainingInformationCases =
  I - (EI * estimationPreventionRate)

preventedByInformation =
  remainingInformationCases * informationDeflectionRate

totalPrevented =
  preventedByEstimation + preventedByInformation

remainingComplaints =
  N - totalPrevented
```

```text
transfersBeforeBridge =
  T
  - (TE * estimationPreventionRate)
  - ((TI - TEI * estimationPreventionRate) * informationDeflectionRate)

remainingTransfers =
  transfersBeforeBridge * (1 - transferReductionRate)
```

```text
baselineCost =
  N * 68
  + T * 53

projectedCost =
  remainingComplaints * 68
  + remainingTransfers * 53

handlingCostAvoided =
  baselineCost - projectedCost
```

```text
remainingNonTransfers =
  remainingComplaints - remainingTransfers

projectedAverageDays =
  (
    remainingNonTransfers * 22.966
    + remainingTransfers * 38.245
  ) / remainingComplaints
```

```text
projectedMonthlyOpened =
  1,139 * (remainingComplaints / N)

projectedMonthlyClosed =
  1,118 * (1 + capacityRecoveryRate)
```

```text
backlog[0] = 1,758

backlog[t + 1] = max(
  0,
  backlog[t] + projectedMonthlyOpened - projectedMonthlyClosed
)
```

Round only for display.

## Expected default result

At `0.30 / 0.25 / 0.50 / 0.00`:

```text
preventedByEstimation       = 1,449.90
preventedByInformation      = 1,396.65
totalPrevented              = 2,846.55
complaintReductionRate      = 11.1998%
remainingComplaints         = 22,569.45
transfersBeforeBridge       = 7,880.25
remainingTransfers          = 3,940.125
baselineHandlingCost        = $2,198,398.00
projectedHandlingCost       = $1,743,549.225
handlingCostAvoided         = $454,848.775
projectedAverageDays        = 25.6334
projectedMonthlyOpened      = 1,011.4339
projectedMonthlyClosed      = 1,118.00
backlogAfter12Months        = 479.2066
unchangedBacklogAfter12     = 2,010
```

The simulation's zero-assumption weighted cycle-time baseline is approximately 28.3 days. It is not the same measure as the September KPI of 43.8 days.

## Required invariants

- All-zero assumptions reproduce the baseline.
- Increasing estimation prevention cannot increase complaint volume.
- Increasing information deflection cannot increase complaint volume.
- Changing transfer reduction cannot change complaints prevented or monthly openings.
- Changing capacity cannot change complaints prevented, remaining complaints, or remaining transfers.
- Increasing capacity cannot increase backlog.
- Backlog never becomes negative.
- Overlap is counted once.
- Reset to observed baseline sets all controls to zero.
- Reset to demo defaults sets `0.30 / 0.25 / 0.50 / 0.00`.

## Demonstration complaint

Use `NW-108365` by default:

```text
account_id                     ACC-992258
region                         Barrowdale
date_opened                    2025-06-27
date_closed                    2025-07-28
category                       Billing - estimated read
priority                       P2
channel                        Email
source_system                  SYS-01
transferred_between_systems    true
sla_days                       10
days_to_close                  31
sla_breach                     true
reopened                       false
resolution_action              Bill corrected and re-issued
bill_correction_value          217.52
```

June 2025 Barrowdale context:

```text
accounts                       298,000
estimated_read_rate            63.6%
smart_meter_penetration        0%
billing_exceptions_raised      7,765
systems_serving_region         SYS-01/SYS-06
agent_fte                      65
open_vacancies                 2
attrition_rate_12m             11.2%
complaints_opened_per_agent    2.7
```

The complaint-to-`SYS-01` relationship is observed. The meter environment and `SYS-06` relationship are regional context. The verified feedback loop is proposed/simulated.

## Evidence presentation

Use:

- solid connector: observed association;
- dotted connector: regional context;
- green connector: simulated/proposed future.

Required disclosure:

> Schematic customer homes. Operational values come from Northwind's data; locations are illustrative.

Required simulation label:

> Scenario, not forecast.

Never present:

- account IDs as addresses or properties;
- schematic positions as geolocation;
- regional rates as household readings;
- a regional systems list as a transaction trace;
- scenario output as a forecast;
- invented prediction accuracy, consumption history, or household bill targets.

## Required UI states

- Observed baseline.
- Default scenario.
- Modified scenario.
- Selected month and region.
- Selected complaint.
- No matching records.
- Open complaint with unresolved values.
- Reset to observed baseline.
- Reset to demo defaults.
- Loading and data-contract failure.
