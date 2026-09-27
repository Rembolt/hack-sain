# Northflow Dashboard

Northflow is a client-side Next.js dashboard for Northwind Utilities complaint operations. It analyzes the complaints CSV and the monthly KPI CSV locally in the browser.

## Requirements

- Node.js 20 or newer
- npm
- The project folder: `hack-sain/northwind-dashboard`

No backend or database is required for the current dashboard. CSV files are parsed in the browser and are not uploaded by the app.

## Run The App

Open a Command Prompt or VS Code terminal and run:

```bat
cd /d C:\CODES\HackTheHill_3\hack-sain\northwind-dashboard
npm install
npm run dev
```

Open the URL printed by Next.js, normally:

```text
http://localhost:3000
```

The development server reloads the page when source files change.

## Stop The App

In the terminal running Next.js, press:

```text
Ctrl+C
```

## Validation And Production Run

```bat
cd /d C:\CODES\HackTheHill_3\hack-sain\northwind-dashboard
npm run lint
npm run build
npm run start
```

`npm run start` requires a successful `npm run build` first.

## Use The Dashboard

1. Open the dashboard in the browser.
2. Select **Upload complaints CSV**.
3. Choose `northwind_complaints.csv`.
4. Use the left navigation tabs:
   - **Overview**: top-level complaint metrics.
   - **Complaint Source**: category, region, source system, and channel breakdowns.
   - **Complaint Handling**: resolution actions, priority, transfer flags, reopened cases, and information-only cases.
   - **Monthly KPIs**: upload and analyze `northwind_monthly_kpis.csv`.
5. Upload the monthly KPI file separately from the button in the Monthly KPIs section.

The dashboard does not show sample totals before a file is loaded. It displays an error when required columns are missing or the CSV cannot be parsed.

## Complaints CSV

The current dashboard uploader validates these columns:

```text
complaint_id
status
channel
category
priority
region
source_system
transferred_between_systems
sla_days
sla_breach
days_to_close
reopened
resolvable_by_information_only
resolution_action
bill_correction_value
```

Additional columns, including `date_opened`, `date_closed`, and `account_id`, are allowed and preserved by the CSV parser, but they are not currently used in the displayed calculations.

### Complaint Calculations

- **Complaints analyzed**: number of valid rows with a `complaint_id`.
- **Open complaints**: rows with a blank `days_to_close`, or a status of `Open`, `In progress`, or `Pending`.
- **Average days to close**: average `days_to_close` for non-open complaints only.
- **Average SLA target**: average numeric value in `sla_days`.
- **SLA breaches**: count of rows where `sla_breach` is exactly `1`, with its percentage of all analyzed complaints.
- **Transferred between systems**: count of rows where `transferred_between_systems` is exactly `1`.
- **Reopened complaints**: count of rows where `reopened` is exactly `1`.
- **Information-only resolvable**: count of rows where `resolvable_by_information_only` is exactly `1`.
- **Bill correction value**: sum of numeric `bill_correction_value`, displayed in CAD.
- **Breakdowns**: counts grouped by category, region, source system, channel, priority, and resolution action.

## Monthly KPI CSV

The Monthly KPIs uploader validates these columns:

```text
month
complaints_opened
complaints_closed
avg_days_to_close
first_contact_resolution_rate
inbound_calls
cost_to_serve_per_account
regulator_satisfaction_score_of_5
```

The monthly view intentionally does not display opened and closed complaint totals because those measures are already covered in the main complaint dashboard. It currently displays:

- **Cost to serve per account** by month as a line chart, with CAD/account on the y-axis.
- **Regulator satisfaction** by month as a line chart, with a score out of 5 on the y-axis.
- **Average time to close** by month as a line chart, with days on the y-axis.
- **First-contact resolution** by month as a line chart, with percentage on the y-axis.
- Latest regulator satisfaction score and latest cost to serve per account cards.

Monthly rows are sorted by the `YYYY-MM` value in `month`. The rate field is expected as a decimal, so `0.62` displays as `62%`.

## Project Structure

```text
hack-sain/
  README-Dashboard.md
  northwind-dashboard/
    src/app/page.tsx       Dashboard UI and browser-side CSV calculations
    src/app/globals.css    Dashboard styles and responsive layouts
    src/app/layout.tsx     Page metadata and global layout
    public/                Static assets
    package.json           Scripts and dependencies
```

## Notes

- Use only the synthetic Northwind challenge data.
- Do not upload real customer data.
- The dashboard currently has no persistence: refreshing the page clears the loaded CSV results.
- The uploaded file is processed locally in the browser.