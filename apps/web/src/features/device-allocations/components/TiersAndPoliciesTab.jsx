import React from "react";
import { ClockIcon, PlusIcon, CheckIcon } from "./AllocationIcons.jsx";

const formatRM = (val) => {
  const num = Number(val ?? 0);
  return `RM ${num.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export function TiersAndPoliciesTab({
  tiers = [],
  policies = [],
  activePolicyId,
  isLoading,
  onOpenAddTier,
  onOpenEditTier,
  onDeleteTier,
  onOpenAddPolicy,
  onOpenEditPolicy,
  onActivatePolicy,
  onDeletePolicy
}) {
  if (isLoading) {
    return (
      <div className="empty-tab-state">
        <div className="empty-tab-icon">
          <ClockIcon />
        </div>
        <p>Loading package tiers & policies...</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* 1. Package Tiers Section */}
      <div>
        <div className="allocations-toolbar">
          <div>
            <h3 style={{ margin: "0 0 0.25rem 0", color: "var(--alloc-kpi-val, var(--ui-text-primary))", fontSize: "1.1rem" }}>
              Device Specification & Package Budget Tiers
            </h3>
            <p style={{ margin: 0, color: "var(--alloc-hint-text, var(--ui-text-muted))", fontSize: "0.82rem" }}>
              Standard equipment bundles and budget estimations (Laptop/Desktop + Peripherals/Licenses) applied to headcount slots.
            </p>
          </div>
          <div className="allocations-actions">
            <button
              type="button"
              className="allocations-btn-primary"
              onClick={onOpenAddTier}
            >
              <PlusIcon style={{ width: 14, height: 14 }} /> Add Package Tier
            </button>
          </div>
        </div>

        <div className="tier-cards-grid">
          {tiers.length === 0 ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "2rem", color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>
              No package tiers defined yet. Click <strong>Add Package Tier</strong> to establish hardware budgets.
            </div>
          ) : (
            tiers.map((tier) => {
              const items = Array.isArray(tier.includedItems) ? tier.includedItems : [];
              return (
                <div key={tier.id} className="tier-card">
                  <div>
                    <div className="tier-card-header">
                      <span className="tier-code-badge">{tier.tierCode}</span>
                      <span style={{ fontSize: "0.75rem", color: tier.isActive ? "var(--ui-feedback-success, #16a34a)" : "var(--alloc-hint-text, var(--ui-text-muted))" }}>
                        {tier.isActive ? "● Active" : "○ Inactive"}
                      </span>
                    </div>

                    <div className="tier-card-title">{tier.name}</div>

                    <div className="tier-pricing-strip">
                      <span className="tier-total-price">{formatRM(tier.totalBudget)}</span>
                      <span className="tier-price-breakdown">
                        ({formatRM(tier.pcBudget)} PC + {formatRM(tier.otherBudget)} Others)
                      </span>
                    </div>

                    {items.length > 0 && (
                      <ul className="tier-items-list">
                        {items.map((item, idx) => (
                          <li key={idx} className="tier-item">
                            <CheckIcon className="tier-item-check-svg" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="tier-card-footer">
                    <span style={{ fontSize: "0.75rem", color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>
                      {tier._count?.slots ?? 0} active slots assigned
                    </span>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        type="button"
                        className="alloc-btn-action-edit"
                        onClick={() => onOpenEditTier(tier)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="alloc-btn-action-delete"
                        onClick={() => onDeleteTier(tier.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Quota Policies Versioning Section */}
      <div>
        <div className="allocations-toolbar">
          <div>
            <h3 style={{ margin: "0 0 0.25rem 0", color: "var(--alloc-kpi-val, var(--ui-text-primary))", fontSize: "1.1rem" }}>
              Fiscal Quota Policies & Baseline Versions
            </h3>
            <p style={{ margin: 0, color: "var(--alloc-hint-text, var(--ui-text-muted))", fontSize: "0.82rem" }}>
              Manage active and historical departmental quota baselines for auditability and year-over-year reconciliation.
            </p>
          </div>
          <div className="allocations-actions">
            <button
              type="button"
              className="allocations-btn-cancel"
              onClick={onOpenAddPolicy}
            >
              <PlusIcon style={{ width: 14, height: 14 }} /> New Quota Policy
            </button>
          </div>
        </div>

        <div className="allocations-table-container">
          <table className="allocations-table">
            <thead>
              <tr>
                <th>Policy Name</th>
                <th>Fiscal Year</th>
                <th>Status</th>
                <th>Description</th>
                <th style={{ textAlign: "center" }}>Department Baselines</th>
                <th style={{ textAlign: "center" }}>Allocation Slots</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "2rem 1rem", color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>
                    No quota policies registered yet.
                  </td>
                </tr>
              ) : (
                policies.map((pol) => {
                  const isActive = pol.isActive;
                  return (
                    <tr key={pol.id} style={{ background: isActive ? "var(--ui-feedback-info-muted, rgba(56, 189, 248, 0.05))" : "transparent" }}>
                      <td>
                        <strong style={{ color: isActive ? "var(--ui-feedback-info, #0284c7)" : "var(--alloc-kpi-val, var(--ui-text-primary))" }}>{pol.name}</strong>
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.88rem" }}>{pol.fiscalYear}</td>
                      <td>
                        {isActive ? (
                          <span className="policy-badge">
                            <CheckIcon style={{ width: 13, height: 13 }} /> Active Policy
                          </span>
                        ) : (
                          <span className="policy-badge inactive">Archived</span>
                        )}
                      </td>
                      <td style={{ color: "var(--alloc-hint-text, var(--ui-text-muted))", fontSize: "0.82rem", maxWidth: "260px" }}>
                        {pol.description || "—"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontWeight: 600 }}>{pol._count?.departmentQuotas ?? 0}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontWeight: 600 }}>{pol._count?.slots ?? 0}</span>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {!isActive && (
                          <button
                            type="button"
                            className="alloc-btn-action-info"
                            style={{ marginRight: "0.3rem" }}
                            onClick={() => onActivatePolicy(pol.id)}
                          >
                            Set Active
                          </button>
                        )}
                        <button
                          type="button"
                          className="alloc-btn-action-edit"
                          style={{ marginRight: "0.3rem" }}
                          onClick={() => onOpenEditPolicy(pol)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="alloc-btn-action-delete"
                          onClick={() => onDeletePolicy(pol.id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
