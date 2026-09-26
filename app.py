import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go


# ============================================================
# PAGE CONFIGURATION
# ============================================================

st.set_page_config(
    page_title="Northwind Complaints Dashboard",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)


# ============================================================
# CONSTANTS
# ============================================================

DATA_PATH = "resources/Northwind_Challenge_Data/northwind_complaints.csv"


# ============================================================
# DATA LOADING
# ============================================================

@st.cache_data
def load_data(path):
    """
    Load and prepare the Northwind complaints dataset.
    """

    df = pd.read_csv(path)

    # --------------------------------------------------------
    # Convert dates
    # --------------------------------------------------------

    df["date_opened"] = pd.to_datetime(
        df["date_opened"],
        errors="coerce"
    )

    df["date_closed"] = pd.to_datetime(
        df["date_closed"],
        errors="coerce"
    )

    # --------------------------------------------------------
    # Ensure numeric columns are numeric
    # --------------------------------------------------------

    numeric_columns = [
        "transferred_between_systems",
        "sla_days",
        "days_to_close",
        "sla_breach",
        "reopened",
        "resolvable_by_information_only",
        "bill_correction_value"
    ]

    for col in numeric_columns:
        if col in df.columns:
            df[col] = pd.to_numeric(
                df[col],
                errors="coerce"
            )

    # --------------------------------------------------------
    # Derived variables
    # --------------------------------------------------------

    # Whether the complaint has been closed
    df["is_closed"] = df["date_closed"].notna()

    # Transfer category for easier visualization
    df["transfer_status"] = np.where(
        df["transferred_between_systems"] > 0,
        "Transferred",
        "No transfer"
    )

    # Reopened category
    df["reopened_status"] = np.where(
        df["reopened"] == 1,
        "Reopened",
        "Not reopened"
    )

    # SLA category
    df["sla_status"] = np.where(
        df["sla_breach"] == 1,
        "Breached",
        "Within SLA"
    )

    # Information-only category
    df["information_resolution"] = np.where(
        df["resolvable_by_information_only"] == 1,
        "Information only",
        "Other resolution"
    )

    # Month opened
    df["month"] = df["date_opened"].dt.to_period("M").astype(str)

    # Year-month date for Plotly
    df["month_date"] = df["date_opened"].dt.to_period("M").dt.to_timestamp()

    return df


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def percentage(value):
    """Convert decimal to percentage string."""

    if pd.isna(value):
        return "N/A"

    return f"{value * 100:.1f}%"


def safe_mean(series):
    """Return mean while handling empty data."""

    if len(series) == 0:
        return np.nan

    return series.mean()


def format_currency(value):
    """Format number as CAD currency."""

    if pd.isna(value):
        return "$0"

    return f"${value:,.0f}"


# ============================================================
# LOAD DATA
# ============================================================

try:

    df = load_data(DATA_PATH)

except FileNotFoundError:

    st.error(
        f"Could not find the data file at:\n\n"
        f"`{DATA_PATH}`\n\n"
        f"Make sure your project structure is:\n\n"
        f"`data/northwind_complaints.csv`"
    )

    st.stop()


# ============================================================
# SIDEBAR
# ============================================================

st.sidebar.title("🔎 Filters")

st.sidebar.markdown(
    "Use these filters to investigate the complaint population."
)


# ------------------------------------------------------------
# Date filter
# ------------------------------------------------------------

min_date = df["date_opened"].min()
max_date = df["date_opened"].max()

date_range = st.sidebar.date_input(
    "Complaint opened date",
    value=(min_date.date(), max_date.date()),
    min_value=min_date.date(),
    max_value=max_date.date()
)

# Handle single-date selection
if isinstance(date_range, tuple) and len(date_range) == 2:

    start_date = pd.Timestamp(date_range[0])
    end_date = pd.Timestamp(date_range[1])

else:

    start_date = min_date
    end_date = max_date


# ------------------------------------------------------------
# Region filter
# ------------------------------------------------------------

regions = sorted(
    df["region"].dropna().unique()
)

selected_regions = st.sidebar.multiselect(
    "Region",
    options=regions,
    default=regions
)


# ------------------------------------------------------------
# Category filter
# ------------------------------------------------------------

categories = sorted(
    df["category"].dropna().unique()
)

selected_categories = st.sidebar.multiselect(
    "Complaint category",
    options=categories,
    default=categories
)


# ------------------------------------------------------------
# Priority filter
# ------------------------------------------------------------

priorities = sorted(
    df["priority"].dropna().unique()
)

selected_priorities = st.sidebar.multiselect(
    "Priority",
    options=priorities,
    default=priorities
)


# ------------------------------------------------------------
# Channel filter
# ------------------------------------------------------------

channels = sorted(
    df["channel"].dropna().unique()
)

selected_channels = st.sidebar.multiselect(
    "Channel",
    options=channels,
    default=channels
)


# ------------------------------------------------------------
# Source system filter
# ------------------------------------------------------------

systems = sorted(
    df["source_system"].dropna().unique()
)

selected_systems = st.sidebar.multiselect(
    "Source system",
    options=systems,
    default=systems
)


# ============================================================
# APPLY FILTERS
# ============================================================

filtered_df = df[
    (df["date_opened"] >= start_date)
    & (df["date_opened"] <= end_date)
    & (df["region"].isin(selected_regions))
    & (df["category"].isin(selected_categories))
    & (df["priority"].isin(selected_priorities))
    & (df["channel"].isin(selected_channels))
    & (df["source_system"].isin(selected_systems))
].copy()


# ============================================================
# HEADER
# ============================================================

st.title("📊 Northwind Complaints Dashboard")

st.markdown(
    """
    **Complaint performance and root-cause analysis**

    Use this dashboard to understand complaint volume, resolution
    performance, SLA breaches, system transfers, and potential
    operational drivers.
    """
)

st.divider()


# ============================================================
# EXECUTIVE KPI SECTION
# ============================================================

st.subheader("Executive overview")


total_complaints = len(filtered_df)

closed_complaints = filtered_df["is_closed"].sum()

open_complaints = total_complaints - closed_complaints

avg_resolution = filtered_df["days_to_close"].mean()

sla_breach_rate = filtered_df["sla_breach"].mean()

reopen_rate = filtered_df["reopened"].mean()

transfer_rate = (
    filtered_df["transferred_between_systems"] > 0
).mean()

total_bill_corrections = (
    filtered_df["bill_correction_value"].sum()
)


# ------------------------------------------------------------
# KPI cards
# ------------------------------------------------------------

col1, col2, col3, col4 = st.columns(4)

with col1:

    st.metric(
        "Complaints",
        f"{total_complaints:,}"
    )

with col2:

    st.metric(
        "Open complaints",
        f"{open_complaints:,}"
    )

with col3:

    st.metric(
        "Avg. resolution",
        f"{avg_resolution:.1f} days"
        if not pd.isna(avg_resolution)
        else "N/A"
    )

with col4:

    st.metric(
        "SLA breach rate",
        percentage(sla_breach_rate)
    )


col5, col6, col7, col8 = st.columns(4)

with col5:

    st.metric(
        "Closed complaints",
        f"{closed_complaints:,}"
    )

with col6:

    st.metric(
        "Reopen rate",
        percentage(reopen_rate)
    )

with col7:

    st.metric(
        "Transfer rate",
        percentage(transfer_rate)
    )

with col8:

    st.metric(
        "Bill corrections",
        format_currency(total_bill_corrections)
    )


st.divider()


# ============================================================
# MONTHLY PERFORMANCE
# ============================================================

st.subheader("Complaint performance over time")


monthly = (
    filtered_df
    .groupby("month_date")
    .agg(
        complaints=("complaint_id", "count"),
        avg_resolution=("days_to_close", "mean"),
        sla_breach_rate=("sla_breach", "mean")
    )
    .reset_index()
)


col1, col2 = st.columns(2)


# ------------------------------------------------------------
# Complaint volume
# ------------------------------------------------------------

with col1:

    fig_volume = px.line(
        monthly,
        x="month_date",
        y="complaints",
        markers=True,
        title="Monthly complaint volume"
    )

    fig_volume.update_layout(
        xaxis_title="Month",
        yaxis_title="Complaints",
        hovermode="x unified"
    )

    st.plotly_chart(
        fig_volume,
        use_container_width=True
    )


# ------------------------------------------------------------
# Resolution time
# ------------------------------------------------------------

with col2:

    fig_resolution = px.line(
        monthly,
        x="month_date",
        y="avg_resolution",
        markers=True,
        title="Average resolution time"
    )

    fig_resolution.update_layout(
        xaxis_title="Month",
        yaxis_title="Days",
        hovermode="x unified"
    )

    st.plotly_chart(
        fig_resolution,
        use_container_width=True
    )


# ------------------------------------------------------------
# SLA breach
# ------------------------------------------------------------

fig_sla = px.line(
    monthly,
    x="month_date",
    y="sla_breach_rate",
    markers=True,
    title="SLA breach rate over time"
)

fig_sla.update_yaxes(
    tickformat=".0%"
)

fig_sla.update_layout(
    xaxis_title="Month",
    yaxis_title="SLA breach rate",
    hovermode="x unified"
)

st.plotly_chart(
    fig_sla,
    use_container_width=True
)


st.divider()


# ============================================================
# ROOT CAUSE ANALYSIS
# ============================================================

st.header("🔎 Root-cause analysis")

st.markdown(
    """
    The purpose of this section is to identify where complaint
    volume and resolution problems are concentrated.
    """
)


# ============================================================
# CATEGORY ANALYSIS
# ============================================================

st.subheader("Complaint categories")


category_summary = (
    filtered_df
    .groupby("category")
    .agg(
        complaints=("complaint_id", "count"),
        avg_resolution_days=("days_to_close", "mean"),
        sla_breach_rate=("sla_breach", "mean"),
        reopen_rate=("reopened", "mean"),
        transfer_rate=("transferred_between_systems", "mean"),
        bill_correction_value=("bill_correction_value", "sum")
    )
    .reset_index()
)


category_summary["share_of_complaints"] = (
    category_summary["complaints"]
    / category_summary["complaints"].sum()
)


# ------------------------------------------------------------
# Category volume
# ------------------------------------------------------------

col1, col2 = st.columns(2)

with col1:

    category_volume = category_summary.sort_values(
        "complaints",
        ascending=True
    )

    fig = px.bar(
        category_volume,
        x="complaints",
        y="category",
        orientation="h",
        title="Complaint volume by category",
        text="complaints"
    )

    fig.update_layout(
        xaxis_title="Complaints",
        yaxis_title=""
    )

    st.plotly_chart(
        fig,
        use_container_width=True
    )


# ------------------------------------------------------------
# Resolution time
# ------------------------------------------------------------

with col2:

    category_resolution = category_summary.sort_values(
        "avg_resolution_days",
        ascending=True
    )

    fig = px.bar(
        category_resolution,
        x="avg_resolution_days",
        y="category",
        orientation="h",
        title="Average resolution time by category"
    )

    fig.update_layout(
        xaxis_title="Average days",
        yaxis_title=""
    )

    st.plotly_chart(
        fig,
        use_container_width=True
    )


# ============================================================
# HIGH-IMPACT CATEGORIES
# ============================================================

st.subheader("Volume vs. resolution time")


fig = px.scatter(
    category_summary,
    x="complaints",
    y="avg_resolution_days",
    size="bill_correction_value",
    color="sla_breach_rate",
    hover_name="category",
    hover_data={
        "complaints": True,
        "avg_resolution_days": ":.1f",
        "sla_breach_rate": ":.1%",
        "reopen_rate": ":.1%",
        "transfer_rate": ":.1%",
        "bill_correction_value": ":,.0f"
    },
    title="Complaint volume vs. average resolution time",
    labels={
        "complaints": "Number of complaints",
        "avg_resolution_days": "Average resolution time (days)",
        "sla_breach_rate": "SLA breach rate"
    }
)

st.plotly_chart(
    fig,
    use_container_width=True
)

st.caption(
    "Large bubbles indicate greater bill-correction value. "
    "Color indicates SLA breach rate."
)


st.divider()


# ============================================================
# SYSTEM ANALYSIS
# ============================================================

st.header("🖥️ System and transfer analysis")


system_summary = (
    filtered_df
    .groupby("source_system")
    .agg(
        complaints=("complaint_id", "count"),
        avg_resolution_days=("days_to_close", "mean"),
        sla_breach_rate=("sla_breach", "mean"),
        transfer_rate=("transferred_between_systems", "mean"),
        reopen_rate=("reopened", "mean")
    )
    .reset_index()
)


col1, col2 = st.columns(2)


# ------------------------------------------------------------
# Complaints by system
# ------------------------------------------------------------

with col1:

    system_volume = system_summary.sort_values(
        "complaints",
        ascending=True
    )

    fig = px.bar(
        system_volume,
        x="complaints",
        y="source_system",
        orientation="h",
        title="Complaints by source system"
    )

    fig.update_layout(
        xaxis_title="Complaints",
        yaxis_title="Source system"
    )

    st.plotly_chart(
        fig,
        use_container_width=True
    )


# ------------------------------------------------------------
# Resolution time by system
# ------------------------------------------------------------

with col2:

    system_resolution = system_summary.sort_values(
        "avg_resolution_days",
        ascending=True
    )

    fig = px.bar(
        system_resolution,
        x="avg_resolution_days",
        y="source_system",
        orientation="h",
        title="Average resolution time by source system"
    )

    fig.update_layout(
        xaxis_title="Average days",
        yaxis_title="Source system"
    )

    st.plotly_chart(
        fig,
        use_container_width=True
    )


# ============================================================
# TRANSFER ANALYSIS
# ============================================================

st.subheader("Impact of system transfers")


transfer_summary = (
    filtered_df
    .groupby("transfer_status")
    .agg(
        complaints=("complaint_id", "count"),
        avg_resolution_days=("days_to_close", "mean"),
        sla_breach_rate=("sla_breach", "mean"),
        reopen_rate=("reopened", "mean")
    )
    .reset_index()
)


st.dataframe(
    transfer_summary.style.format({
        "avg_resolution_days": "{:.1f}",
        "sla_breach_rate": "{:.1%}",
        "reopen_rate": "{:.1%}"
    }),
    use_container_width=True,
    hide_index=True
)


fig = px.bar(
    transfer_summary,
    x="transfer_status",
    y="avg_resolution_days",
    color="transfer_status",
    title="Average resolution time: transferred vs. non-transferred"
)

fig.update_layout(
    xaxis_title="",
    yaxis_title="Average resolution time (days)",
    showlegend=False
)

st.plotly_chart(
    fig,
    use_container_width=True
)


# ============================================================
# TRANSFER × CATEGORY
# ============================================================

st.subheader("Transfers by complaint category")


transfer_category = (
    filtered_df
    .groupby(["category", "transfer_status"])
    .size()
    .reset_index(name="complaints")
)


fig = px.bar(
    transfer_category,
    x="category",
    y="complaints",
    color="transfer_status",
    barmode="group",
    title="System transfers by complaint category"
)

fig.update_layout(
    xaxis_title="Complaint category",
    yaxis_title="Complaints",
    xaxis_tickangle=-45
)

st.plotly_chart(
    fig,
    use_container_width=True
)


st.divider()


# ============================================================
# PRIORITY ANALYSIS
# ============================================================

st.header("⚠️ Priority analysis")


priority_summary = (
    filtered_df
    .groupby("priority")
    .agg(
        complaints=("complaint_id", "count"),
        avg_resolution_days=("days_to_close", "mean"),
        sla_breach_rate=("sla_breach", "mean"),
        reopen_rate=("reopened", "mean")
    )
    .reset_index()
)


priority_summary["share"] = (
    priority_summary["complaints"]
    / priority_summary["complaints"].sum()
)


col1, col2 = st.columns(2)


with col1:

    fig = px.bar(
        priority_summary,
        x="priority",
        y="complaints",
        title="Complaints by priority",
        text="complaints"
    )

    st.plotly_chart(
        fig,
        use_container_width=True
    )


with col2:

    fig = px.bar(
        priority_summary,
        x="priority",
        y="sla_breach_rate",
        title="SLA breach rate by priority"
    )

    fig.update_yaxes(
        tickformat=".0%"
    )

    st.plotly_chart(
        fig,
        use_container_width=True
    )


st.divider()


# ============================================================
# RESOLUTION ANALYSIS
# ============================================================

st.header("✅ Resolution analysis")


resolution_summary = (
    filtered_df
    .groupby("resolution_action")
    .agg(
        complaints=("complaint_id", "count"),
        avg_resolution_days=("days_to_close", "mean"),
        sla_breach_rate=("sla_breach", "mean"),
        reopen_rate=("reopened", "mean"),
        bill_correction_value=("bill_correction_value", "sum")
    )
    .reset_index()
    .sort_values(
        "complaints",
        ascending=False
    )
)


fig = px.bar(
    resolution_summary,
    x="complaints",
    y="resolution_action",
    orientation="h",
    title="Complaints by resolution action"
)

fig.update_layout(
    xaxis_title="Complaints",
    yaxis_title=""
)

st.plotly_chart(
    fig,
    use_container_width=True
)


st.dataframe(
    resolution_summary.style.format({
        "avg_resolution_days": "{:.1f}",
        "sla_breach_rate": "{:.1%}",
        "reopen_rate": "{:.1%}",
        "bill_correction_value": "${:,.2f}"
    }),
    use_container_width=True,
    hide_index=True
)


st.divider()


# ============================================================
# REOPENED COMPLAINTS
# ============================================================

st.header("🔄 Reopened complaints")


reopen_summary = (
    filtered_df
    .groupby("reopened_status")
    .agg(
        complaints=("complaint_id", "count"),
        avg_resolution_days=("days_to_close", "mean"),
        sla_breach_rate=("sla_breach", "mean")
    )
    .reset_index()
)


col1, col2 = st.columns(2)

with col1:

    fig = px.bar(
        reopen_summary,
        x="reopened_status",
        y="complaints",
        title="Reopened vs. non-reopened complaints"
    )

    st.plotly_chart(
        fig,
        use_container_width=True
    )


with col2:

    fig = px.bar(
        reopen_summary,
        x="reopened_status",
        y="avg_resolution_days",
        title="Resolution time by reopening status"
    )

    st.plotly_chart(
        fig,
        use_container_width=True
    )


st.divider()


# ============================================================
# BILL CORRECTION ANALYSIS
# ============================================================

st.header("💰 Bill correction analysis")


billing_df = filtered_df[
    filtered_df["bill_correction_value"].fillna(0) > 0
].copy()


if len(billing_df) > 0:

    billing_summary = (
        billing_df
        .groupby("category")
        .agg(
            complaints=("complaint_id", "count"),
            total_correction=("bill_correction_value", "sum"),
            average_correction=("bill_correction_value", "mean")
        )
        .reset_index()
        .sort_values(
            "total_correction",
            ascending=False
        )
    )

    col1, col2 = st.columns(2)

    with col1:

        fig = px.bar(
            billing_summary,
            x="total_correction",
            y="category",
            orientation="h",
            title="Total bill correction value"
        )

        fig.update_layout(
            xaxis_title="Correction value",
            yaxis_title=""
        )

        st.plotly_chart(
            fig,
            use_container_width=True
        )

    with col2:

        fig = px.bar(
            billing_summary,
            x="average_correction",
            y="category",
            orientation="h",
            title="Average correction per complaint"
        )

        fig.update_layout(
            xaxis_title="Average correction",
            yaxis_title=""
        )

        st.plotly_chart(
            fig,
            use_container_width=True
        )

else:

    st.info(
        "No complaints with bill-correction value were found "
        "under the current filters."
    )


st.divider()


# ============================================================
# COMPLAINT EXPLORER
# ============================================================

st.header("📋 Complaint explorer")


st.markdown(
    "Use this table to inspect the underlying complaint records."
)


# Columns to display
display_columns = [
    "complaint_id",
    "date_opened",
    "date_closed",
    "status",
    "channel",
    "category",
    "priority",
    "region",
    "source_system",
    "transferred_between_systems",
    "sla_days",
    "days_to_close",
    "sla_breach",
    "reopened",
    "resolution_action",
    "bill_correction_value"
]

display_columns = [
    col for col in display_columns
    if col in filtered_df.columns
]


st.dataframe(
    filtered_df[
        display_columns
    ].sort_values(
        "date_opened",
        ascending=False
    ),
    use_container_width=True,
    height=500,
    hide_index=True
)


# ============================================================
# DATA QUALITY / TECHNICAL INFORMATION
# ============================================================

with st.expander("Dataset information"):

    col1, col2, col3 = st.columns(3)

    with col1:

        st.metric(
            "Rows",
            f"{len(filtered_df):,}"
        )

    with col2:

        st.metric(
            "Columns",
            f"{len(filtered_df.columns):,}"
        )

    with col3:

        missing_values = filtered_df.isna().sum().sum()

        st.metric(
            "Missing values",
            f"{missing_values:,}"
        )

    st.write("Data types")

    st.dataframe(
        pd.DataFrame({
            "Column": filtered_df.columns,
            "Type": [
                str(filtered_df[col].dtype)
                for col in filtered_df.columns
            ],
            "Missing": [
                filtered_df[col].isna().sum()
                for col in filtered_df.columns
            ]
        }),
        use_container_width=True,
        hide_index=True
    )


# ============================================================
# FOOTER
# ============================================================

st.divider()

st.caption(
    "Northwind Utilities — Synthetic challenge data. "
    "Analysis for CGI consulting challenge."
)