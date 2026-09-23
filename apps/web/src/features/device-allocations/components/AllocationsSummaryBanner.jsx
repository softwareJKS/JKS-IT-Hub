import React from "react";
import {
  BarChartIcon,
  LaptopDevicesIcon,
  TrendingUpIcon,
  CurrencyIcon,
  AlertTriangleIcon,
  CheckCircleIcon
} from "./AllocationIcons.jsx";

const formatRM = (val) => {
  const num = Number(val ?? 0);
  return `RM ${num.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export function AllocationsSummaryBanner({ kpis = {}, activePolicy }) {
  const {
    totalBaselineQuota = 0,
    totalActiveHeadcount = 0,
    totalOwnedUnits = 0,
    totalLeasedUnits = 0,
    grossExceedUnits = 0,
    totalVacancies = 0,
    totalBaselineBudget = 0,
    totalActiveBudget = 0,
    totalAdditionalBudgetReq = 0,
    discrepancyCount = 0
  } = kpis;

  return (
    <div className="allocations-kpi-grid">
      {/* 1. Baseline Quota */}
      <div className="kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-title">Approved Baseline Quota</span>
          <div className="kpi-icon-wrap kpi-icon-blue">
            <BarChartIcon />
          </div>
        </div>
        <div className="kpi-value">{totalBaselineQuota} <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--alloc-kpi-sub, var(--ui-text-muted))" }}>Units</span></div>
        <div className="kpi-subtext">
          <span>Policy: <strong className="kpi-tag-highlight">{activePolicy?.name || "Active"}</strong></span>
        </div>
      </div>

      {/* 2. Active Fleet Headcount */}
      <div className="kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-title">Active Fleet Headcount</span>
          <div className="kpi-icon-wrap kpi-icon-emerald">
            <LaptopDevicesIcon />
          </div>
        </div>
        <div className="kpi-value">{totalActiveHeadcount} <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--alloc-kpi-sub, var(--ui-text-muted))" }}>Deployed</span></div>
        <div className="kpi-subtext">
          <span>{totalOwnedUnits} Owned</span> • <span>{totalLeasedUnits} Leased</span>
        </div>
      </div>

      {/* 3. Growth Exceed & Vacancies */}
      <div className="kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-title">Gross Exceed Units</span>
          <div className="kpi-icon-wrap kpi-icon-rose">
            <TrendingUpIcon />
          </div>
        </div>
        <div className="kpi-value" style={{ color: grossExceedUnits > 0 ? "var(--ui-feedback-error, #dc2626)" : "var(--ui-feedback-success, #16a34a)" }}>
          {grossExceedUnits > 0 ? `+${grossExceedUnits}` : "0"} <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--alloc-kpi-sub, var(--ui-text-muted))" }}>Seats</span>
        </div>
        <div className="kpi-subtext">
          <span>{totalVacancies} Vacant Headroom</span>
        </div>
      </div>

      {/* 4. Baseline Budget */}
      <div className="kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-title">Baseline Budget</span>
          <div className="kpi-icon-wrap kpi-icon-purple">
            <CurrencyIcon />
          </div>
        </div>
        <div className="kpi-value">{formatRM(totalBaselineBudget)}</div>
        <div className="kpi-subtext">
          <span>Active Fleet: {formatRM(totalActiveBudget)}</span>
        </div>
      </div>

      {/* 5. Additional Budget Required */}
      <div className="kpi-card">
        <div className="kpi-card-header">
          <span className="kpi-title">Additional Budget Req.</span>
          <div className="kpi-icon-wrap kpi-icon-amber">
            <AlertTriangleIcon />
          </div>
        </div>
        <div className="kpi-value" style={{ color: totalAdditionalBudgetReq > 0 ? "var(--ui-feedback-warning, #d97706)" : "var(--ui-feedback-success, #16a34a)" }}>
          {formatRM(totalAdditionalBudgetReq)}
        </div>
        <div className="kpi-subtext">
          {discrepancyCount > 0 ? (
            <span style={{ color: "var(--ui-feedback-error, #dc2626)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              <AlertTriangleIcon style={{ width: 14, height: 14 }} /> {discrepancyCount} Snipe-IT Discrepanc{discrepancyCount === 1 ? "y" : "ies"}
            </span>
          ) : (
            <span style={{ color: "var(--ui-feedback-success, #16a34a)", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
              <CheckCircleIcon style={{ width: 14, height: 14 }} /> Snipe-IT in sync
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
