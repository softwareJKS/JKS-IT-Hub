import React from "react";
import { ClockIcon, PlusIcon } from "./AllocationIcons.jsx";

const formatRM = (val) => {
  const num = Number(val ?? 0);
  return `RM ${num.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export function DepartmentReconciliationTab({
  data = {},
  isLoading,
  onOpenAddQuota,
  onOpenEditQuota,
  onViewDepartmentSlots
}) {
  const departments = data.departments || [];
  const totals = data.totals || {};

  if (isLoading) {
    return (
      <div className="empty-tab-state">
        <div className="empty-tab-icon">
          <ClockIcon />
        </div>
        <p>Loading department reconciliation...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="allocations-toolbar">
        <div>
          <h3 style={{ margin: "0 0 0.25rem 0", color: "var(--alloc-kpi-val, var(--ui-text-primary))", fontSize: "1.1rem" }}>
            Departmental Headcount Allocation & Budget Reconciliation
          </h3>
          <p style={{ margin: 0, color: "var(--alloc-hint-text, var(--ui-text-muted))", fontSize: "0.82rem" }}>
            Reconciliation of approved baseline quotas versus active deployed fleet (Owned & Leased) with real-time budget variance.
          </p>
        </div>
        <div className="allocations-actions">
          <button
            type="button"
            className="allocations-btn-primary"
            onClick={onOpenAddQuota}
          >
            <PlusIcon style={{ width: 14, height: 14 }} /> Set Department Quota
          </button>
        </div>
      </div>

      <div className="allocations-table-container">
        <table className="allocations-table">
          <thead>
            <tr>
              <th style={{ width: "40px" }}>No.</th>
              <th>Department</th>
              <th>Section</th>
              <th style={{ textAlign: "center" }}>Baseline Quota</th>
              <th style={{ textAlign: "center" }}>Active HC</th>
              <th style={{ textAlign: "center" }}>Net Growth</th>
              <th>Primary Tier</th>
              <th style={{ textAlign: "right" }}>Unit Rate</th>
              <th style={{ textAlign: "right" }}>Baseline Budget</th>
              <th style={{ textAlign: "right" }}>Total Active Budget</th>
              <th style={{ textAlign: "right" }}>Additional Budget</th>
              <th>Fleet Composition</th>
              <th>Justification / Notes</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 ? (
              <tr>
                <td colSpan={14} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>
                  No department quotas configured yet. Click <strong>Set Department Quota</strong> to add your first department baseline.
                </td>
              </tr>
            ) : (
              departments.map((row) => {
                const hasExceed = row.netGrowth > 0;
                return (
                  <tr key={row.id} className={hasExceed ? "exceed-row" : ""}>
                    <td style={{ color: "var(--alloc-hint-text, var(--ui-text-muted))", fontWeight: 500 }}>{row.number}</td>
                    <td style={{ fontWeight: 600, color: "var(--alloc-kpi-val, var(--ui-text-primary))" }}>{row.departmentName}</td>
                    <td style={{ color: row.sectionName ? "var(--alloc-table-td-text, var(--ui-text-primary))" : "var(--alloc-hint-text, var(--ui-text-muted))" }}>
                      {row.sectionName || "—"}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 600 }}>{row.baselineQuota}</td>
                    <td style={{ textAlign: "center", fontWeight: 600, color: "var(--ui-feedback-info, #0284c7)" }}>
                      {row.activeHeadcount}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      {hasExceed ? (
                        <span className="growth-positive">+{row.netGrowth}</span>
                      ) : (
                        <span className="growth-neutral">0</span>
                      )}
                    </td>
                    <td>
                      <span style={{ fontSize: "0.8rem", color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>
                        {row.primaryTier?.name || "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                      {formatRM(row.unitRate)}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--alloc-kpi-purple, #9333ea)" }}>
                      {formatRM(row.baselineBudget)}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--ui-feedback-info, #0284c7)" }}>
                      {formatRM(row.activeBudget)}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "monospace" }}>
                      {row.additionalBudgetReq > 0 ? (
                        <span style={{ color: "var(--ui-feedback-error, #dc2626)", fontWeight: 700 }}>
                          {formatRM(row.additionalBudgetReq)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>RM 0</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.35rem", alignItems: "center" }}>
                        <span className="badge-ownership-owned">{row.ownedUnits} Own</span>
                        <span className="badge-ownership-leased">{row.leasedUnits} Lease</span>
                      </div>
                    </td>
                    <td style={{ maxWidth: "240px", fontSize: "0.8rem", color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>
                      {row.notes ? (
                        <span title={row.notes} style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {row.notes}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className="alloc-btn-action-edit"
                        style={{ marginRight: "0.35rem" }}
                        onClick={() => onOpenEditQuota(row)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="alloc-btn-action-info"
                        onClick={() => onViewDepartmentSlots(row.departmentName, row.sectionName)}
                      >
                        Slots ({row.slotsCount})
                      </button>
                    </td>
                  </tr>
                );
              })
            )}

            {/* Totals Summary Row */}
            {departments.length > 0 && (
              <tr className="total-row">
                <td colSpan={3} style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  TOTAL (All {departments.length} Departments / Sections)
                </td>
                <td style={{ textAlign: "center" }}>{totals.baselineQuota ?? 0}</td>
                <td style={{ textAlign: "center", color: "var(--ui-feedback-info, #0284c7)" }}>{totals.activeHeadcount ?? 0}</td>
                <td style={{ textAlign: "center", color: (totals.netGrowth ?? 0) > 0 ? "var(--ui-feedback-error, #dc2626)" : "var(--ui-feedback-success, #16a34a)" }}>
                  {(totals.netGrowth ?? 0) > 0 ? `+${totals.netGrowth}` : "0"}
                </td>
                <td colSpan={2} style={{ textAlign: "center", color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>Overall Summary</td>
                <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--alloc-kpi-purple, #9333ea)" }}>
                  {formatRM(totals.baselineBudget)}
                </td>
                <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--ui-feedback-info, #0284c7)" }}>
                  {formatRM(totals.activeBudget)}
                </td>
                <td style={{ textAlign: "right", fontFamily: "monospace", color: (totals.additionalBudgetReq ?? 0) > 0 ? "var(--ui-feedback-error, #dc2626)" : "var(--ui-feedback-success, #16a34a)" }}>
                  {formatRM(totals.additionalBudgetReq)}
                </td>
                <td>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                    {totals.ownedUnits ?? 0} Own / {totals.leasedUnits ?? 0} Lease
                  </span>
                </td>
                <td colSpan={2} style={{ fontSize: "0.8rem", color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>
                  Net Headcount Variance: {(totals.netGrowth ?? 0) > 0 ? `+${totals.netGrowth} exceed seats` : "Within baseline"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
