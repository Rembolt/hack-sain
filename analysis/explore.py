import pandas as pd

D = "resources/Northwind_Challenge_Data/"
c = pd.read_csv(D + "northwind_complaints.csv", parse_dates=["date_opened", "date_closed"])
m = pd.read_csv(D + "northwind_meter_reads.csv")
pd.set_option("display.width", 250)
pd.set_option("display.max_columns", 30)

print(c.shape)
print(c.dtypes)
for col in ["status", "channel", "category", "priority", "region", "source_system",
            "resolution_action", "transferred_between_systems", "sla_days", "reopened",
            "resolvable_by_information_only", "sla_breach"]:
    print("\n==", col)
    print(c[col].value_counts(dropna=False))

print("\nDate range", c.date_opened.min(), c.date_opened.max())
print("Open cases:", (c.status == "Open").sum() if "Open" in c.status.unique() else c.date_closed.isna().sum())

def grp(key):
    g = c.groupby(key).agg(
        n=("complaint_id", "count"),
        breach=("sla_breach", "mean"),
        days=("days_to_close", "mean"),
        transfer=("transferred_between_systems", "mean"),
        reopen=("reopened", "mean"),
        info=("resolvable_by_information_only", "mean"),
        billval=("bill_correction_value", "sum"),
    ).sort_values("n", ascending=False)
    g["share"] = g.n / g.n.sum()
    return g

for k in ["category", "region", "source_system", "channel", "priority", "resolution_action",
          "transferred_between_systems"]:
    print("\n#### by", k)
    print(grp(k).round(3))

print("\n#### category x region (counts)")
print(pd.crosstab(c.category, c.region, margins=True))

c["billing"] = c.category.str.startswith("Billing")
c["legacy"] = c.region.isin(["Barrowdale", "Dunmoor"])
print("\n#### legacy vs not")
print(grp("legacy").round(3))
print(pd.crosstab(c.legacy, c.category, normalize="index").round(3).T)

print("\n#### transfer effect on breach/days")
print(c.groupby("transferred_between_systems")[["sla_breach", "days_to_close", "reopened"]].mean())

print("\n#### source system x region")
print(pd.crosstab(c.source_system, c.region))

c["ym"] = c.date_opened.dt.to_period("M")
print("\n#### monthly by category")
print(pd.crosstab(c.ym, c.category))
print("\n#### monthly by region")
print(pd.crosstab(c.ym, c.region))

print("\n#### open by category / region")
op = c[c.date_closed.isna()]
print(len(op))
print(op.category.value_counts())
print(op.region.value_counts())
print(op.transferred_between_systems.mean())

print("\n#### per-10k accounts complaint rate, est-read")
acc = m.groupby("region").agg(accounts=("accounts", "first"), est=("estimated_read_rate", "mean"),
                              smart=("smart_meter_penetration", "mean"), exc=("billing_exceptions_raised", "sum"))
cnt = c.groupby("region").size().rename("complaints")
er = c[c.category == "Billing - estimated read"].groupby("region").size().rename("est_read_complaints")
acc = acc.join(cnt).join(er)
acc["per_10k_per_yr"] = acc.complaints / acc.accounts * 1e4 / 2
acc["estread_per_10k_yr"] = acc.est_read_complaints / acc.accounts * 1e4 / 2
print(acc.round(3))

# monthly correlation est-read rate vs complaints per region
m["ym"] = pd.PeriodIndex(m.month, freq="M")
cm = c.groupby(["ym", "region"]).size().rename("complaints").reset_index()
cbm = c[c.billing].groupby(["ym", "region"]).size().rename("billing_complaints").reset_index()
mm = m.merge(cm, on=["ym", "region"]).merge(cbm, on=["ym", "region"])
print("\ncorr est_read vs complaints", mm[["estimated_read_rate", "billing_exceptions_raised", "complaints", "billing_complaints", "smart_meter_penetration"]].corr().round(3))
for r, g in mm.groupby("region"):
    print(r, g[["estimated_read_rate", "billing_complaints"]].corr().iloc[0, 1].round(3))

print("\n#### bill correction value")
print(c.bill_correction_value.describe())
print(c.groupby("category").bill_correction_value.agg(["count", "sum", "mean"]))

print("\n#### info-only by category")
print(pd.crosstab(c.category, c.resolvable_by_information_only, normalize="index").round(3))

print("\n#### repeat accounts")
vc = c.account_id.value_counts()
print(vc.describe(), (vc > 1).sum())

print("\n#### days_to_close by year-half")
c["q"] = c.date_opened.dt.to_period("Q")
print(c.groupby("q")[["days_to_close", "sla_breach", "transferred_between_systems"]].mean().round(3))
print(pd.crosstab(c.q, c.billing, normalize="index").round(3))
print(pd.crosstab(c.q, c.legacy, normalize="index").round(3))
