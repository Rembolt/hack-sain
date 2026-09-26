import pandas as pd, numpy as np, json

D = "resources/Northwind_Challenge_Data/"
c = pd.read_csv(D + "northwind_complaints.csv", parse_dates=["date_opened", "date_closed"])
m = pd.read_csv(D + "northwind_meter_reads.csv")
k = pd.read_csv(D + "northwind_monthly_kpis.csv")
p = pd.read_csv(D + "northwind_ai_pilot_2025.csv")
pd.set_option("display.width", 250)
pd.set_option("display.max_columns", 30)
c["ym"] = c.date_opened.dt.to_period("M").astype(str)
c["legacy"] = c.region.isin(["Barrowdale", "Dunmoor"])

print("source x region\n", pd.crosstab(c.source_system, c.region))
print("\nsource x transfer\n", pd.crosstab(c.source_system, c.transferred_between_systems))

print("\ntransfer effect within category")
t = c.groupby(["category", "transferred_between_systems"])[["sla_breach", "days_to_close", "reopened"]].mean().unstack().round(3)
print(t)

print("\nmonthly trend: days_to_close by transfer")
print(c.groupby(["ym", "transferred_between_systems"]).days_to_close.mean().unstack().round(1))

print("\nsmart vs est-read over time per region")
for r, g in m.groupby("region"):
    print(r, g.smart_meter_penetration.iloc[0], g.smart_meter_penetration.iloc[-1],
          g.estimated_read_rate.head(6).mean().round(3), g.estimated_read_rate.tail(6).mean().round(3),
          np.corrcoef(g.smart_meter_penetration, g.estimated_read_rate)[0, 1].round(3) if g.smart_meter_penetration.std() > 0 else None)

m["exc_per_1k"] = m.billing_exceptions_raised / m.accounts * 1000
print("\nexceptions per 1k accounts by region")
print(m.groupby("region")[["estimated_read_rate", "exc_per_1k", "billing_exceptions_raised"]].mean().round(2))
print("exceptions per est-read account",
      (m.billing_exceptions_raised / (m.accounts * m.estimated_read_rate)).groupby(m.region).mean().round(4))

# meter-driven complaint categories per 10k accounts
meter_cats = ["Billing - estimated read", "Metering - no read taken"]
acc = m.groupby("region").agg(accounts=("accounts", "first"), est=("estimated_read_rate", "mean"))
mc = c[c.category.isin(meter_cats)].groupby("region").size()
acc["meter_complaints"] = mc
acc["meter_per_10k_yr"] = mc / acc.accounts * 1e4 / 2
print(acc.round(2))
print("corr est vs meter complaints/10k", np.corrcoef(acc.est, acc.meter_per_10k_yr)[0, 1].round(3))

# excess meter-driven complaints in legacy regions vs smart-region baseline mix
share = pd.crosstab(c.legacy, c.category.isin(meter_cats), normalize="index")
print("\nmeter-cat share legacy vs not\n", share)
base = share.loc[False, True]
leg_n = c.legacy.sum()
leg_meter = c[c.legacy & c.category.isin(meter_cats)].shape[0]
print("legacy meter complaints", leg_meter, "expected at baseline share", round(leg_n * base), "excess", leg_meter - round(leg_n * base))

# backlog arithmetic
k["net"] = k.complaints_opened - k.complaints_closed
print("\nnet backlog added", k.net.sum(), "opened", k.complaints_opened.sum(), "closed", k.complaints_closed.sum())
print(k[["month", "complaints_opened", "complaints_closed", "net"]].assign(cum=k.net.cumsum()).to_string())
print("opened growth", k.complaints_opened.iloc[:3].mean(), k.complaints_opened.iloc[-3:].mean())
print("closed growth", k.complaints_closed.iloc[1:4].mean(), k.complaints_closed.iloc[-3:].mean())
print("calls growth", k.inbound_calls.iloc[:3].mean(), k.inbound_calls.iloc[-3:].mean())

# open backlog age
asof = pd.Timestamp("2026-09-30")
op = c[c.status == "Open"].copy()
op["age"] = (asof - op.date_opened).dt.days
print("\nopen age\n", op.age.describe())
print((op.age > op.sla_days).mean(), "open already beyond SLA")
print(op.groupby("category").size().sort_values(ascending=False))
print("open transferred share", op.transferred_between_systems.mean())

# pilot
p["escalations"] = p.assistant_sessions * p.escalated_to_agent_rate
p["contained"] = p.assistant_sessions * p.fully_contained_rate
p["complaints_after"] = p.assistant_sessions * p.complaint_raised_after_session_rate
p["repeat"] = p.assistant_sessions * p.repeat_contact_within_7_days_rate
print("\npilot\n", p.round(0).to_string())
print(p[["assistant_sessions", "escalations", "contained", "complaints_after", "repeat"]].sum().round(0))
print("pilot cost per contained session", 640000 * 0.75 / p.contained.sum())

# costs
UC = dict(call=7.4, comp=68, comp_t=121, corr=34, visit=92, meter=148, fte=46000, pen=2.4e6, compn=40)
n_t = c.transferred_between_systems.sum()
n_nt = len(c) - n_t
print("\ncomplaint handling cost 2y", n_nt * UC["comp"] + n_t * UC["comp_t"], "transfer premium", n_t * (UC["comp_t"] - UC["comp"]))
by = c.groupby("category").agg(n=("complaint_id", "count"), t=("transferred_between_systems", "sum"),
                                ncorr=("resolution_action", lambda s: (s == "Bill corrected and re-issued").sum()),
                                visit=("resolution_action", lambda s: (s == "Meter visit required").sum()),
                                compn=("resolution_action", lambda s: (s == "Compensation payment issued").sum()),
                                value=("bill_correction_value", "sum"))
by["handling"] = (by.n - by.t) * UC["comp"] + by.t * UC["comp_t"]
by["rework"] = by.ncorr * UC["corr"] + by.visit * UC["visit"] + by.compn * UC["compn"]
by["total"] = by.handling + by.rework
print(by.sort_values("total", ascending=False))
print(by[["handling", "rework", "total", "value"]].sum())
print("resolution action x category\n", pd.crosstab(c.category, c.resolution_action))

exc_total = m.billing_exceptions_raised.sum()
print("\nbilling exceptions 2y", exc_total, "x $34 =", exc_total * 34)
print("exceptions legacy", m[m.region.isin(["Barrowdale", "Dunmoor"])].billing_exceptions_raised.sum())

# annual last-12-month numbers
l12 = k.tail(12)
print("\nLast 12m calls", l12.inbound_calls.sum(), "cost", l12.inbound_calls.sum() * 7.4)
print("first 12m calls", k.head(12).inbound_calls.sum())
print("cost to serve change", k.cost_to_serve_per_account.iloc[0], k.cost_to_serve_per_account.iloc[-1],
      "x 1.8M accts annual delta?", (k.cost_to_serve_per_account.iloc[-1] - k.cost_to_serve_per_account.iloc[0]) * 1.8e6)
print(k[["complaints_opened", "avg_days_to_close", "first_contact_resolution_rate", "inbound_calls",
         "cost_to_serve_per_account", "regulator_satisfaction_score_of_5"]].corr().round(3))

# regulator score slope
x = np.arange(24)
s = np.polyfit(x, k.regulator_satisfaction_score_of_5, 1)
print("reg slope per month", s)
print("breach by quarter & priority")
c["q"] = c.date_opened.dt.to_period("Q")
print(pd.crosstab(c.q, c.priority, values=c.sla_breach, aggfunc="mean").round(3))
print("channel regulator referral by category")
print(pd.crosstab(c.category, c.channel == "Regulator referral", normalize="index").round(3))
print("reopen x resolution\n", c.groupby("resolution_action").reopened.mean().round(3))
print("info-only resolved but transferred:", c[(c.resolvable_by_information_only == 1)].transferred_between_systems.mean())
print("info-only total", (c.resolvable_by_information_only == 1).sum())
