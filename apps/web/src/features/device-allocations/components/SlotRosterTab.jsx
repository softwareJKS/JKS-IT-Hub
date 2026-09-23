import React, { useState } from "react";
import { Link } from "react-router-dom";
import { PlusIcon, AlertTriangleIcon, CheckIcon, LinkIcon } from "./AllocationIcons.jsx";

export function SlotRosterTab({
  slots = [],
  meta = {},
  isLoading,
  filters = {},
  onFilterChange,
  departments = [],
  onOpenAddSlot,
  onOpenEditSlot,
  onDeleteSlot,
  onAutoMatchSlot
}) {
  const [matchingSlotId, setMatchingSlotId] = useState(null);

  const handleAutoMatch = async (slotId) => {
    try {
      setMatchingSlotId(slotId);
      await onAutoMatchSlot(slotId);
    } finally {
      setMatchingSlotId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Toolbar / Filters */}
      <div className="allocations-toolbar">
        <div className="allocations-filters">
          {/* Search */}
          <input
            type="text"
            className="form-input"
            placeholder="Search employee, asset tag, model, staff ID..."
            style={{ minWidth: "260px" }}
            value={filters.search || ""}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value, page: 1 })}
          />

          {/* Department Filter */}
          <select
            className="form-select"
            value={filters.departmentName || ""}
            onChange={(e) => onFilterChange({ ...filters, departmentName: e.target.value, page: 1 })}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id || d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Slot Type */}
          <select
            className="form-select"
            value={filters.slotType || ""}
            onChange={(e) => onFilterChange({ ...filters, slotType: e.target.value, page: 1 })}
          >
            <option value="">All Slot Types</option>
            <option value="EMPLOYEE">Employee</option>
            <option value="STATION">Station / Shopfloor</option>
            <option value="VACANT">Vacant Headroom</option>
          </select>

          {/* Classification */}
          <select
            className="form-select"
            value={filters.classification || ""}
            onChange={(e) => onFilterChange({ ...filters, classification: e.target.value, page: 1 })}
          >
            <option value="">All Classifications</option>
            <option value="BASELINE">Baseline Quota</option>
            <option value="GROWTH_EXCEED">Growth Exceed (+)</option>
          </select>

          {/* Ownership */}
          <select
            className="form-select"
            value={filters.ownershipStatus || ""}
            onChange={(e) => onFilterChange({ ...filters, ownershipStatus: e.target.value, page: 1 })}
          >
            <option value="">All Ownership</option>
            <option value="OWNED">Owned (Company)</option>
            <option value="LEASED">Leased (Rental)</option>
          </select>

          {/* Discrepancy */}
          <select
            className="form-select"
            value={filters.discrepancyStatus || ""}
            onChange={(e) => onFilterChange({ ...filters, discrepancyStatus: e.target.value, page: 1 })}
          >
            <option value="">All Sync States</option>
            <option value="MATCHED">Matched</option>
            <option value="MISMATCHED">Mismatched</option>
            <option value="UNLINKED">Unlinked</option>
          </select>
        </div>

        <div className="allocations-actions">
          <button
            type="button"
            className="allocations-btn-primary"
            onClick={onOpenAddSlot}
          >
            <PlusIcon style={{ width: 14, height: 14 }} /> Add Allocation Slot
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="allocations-table-container">
        <table className="allocations-table">
          <thead>
            <tr>
              <th style={{ width: "45px" }}>Slot #</th>
              <th>Department / Section</th>
              <th>Type</th>
              <th>Employee / Station Name</th>
              <th>Staff ID</th>
              <th>Username</th>
              <th>Tier</th>
              <th>Device Model</th>
              <th>Asset Tag</th>
              <th>Brand</th>
              <th>Ownership</th>
              <th>Status</th>
              <th>Snipe-IT Sync</th>
              <th>Remarks / Exceed Justification</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={15} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>
                  Loading device slots...
                </td>
              </tr>
            ) : slots.length === 0 ? (
              <tr>
                <td colSpan={15} style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>
                  No allocation slots found matching your criteria.
                </td>
              </tr>
            ) : (
              slots.map((slot) => {
                const isVacant = slot.slotType === "VACANT";
                const isStation = slot.slotType === "STATION";
                const isExceed = slot.classification === "GROWTH_EXCEED";
                const isMismatched = slot.discrepancyStatus === "MISMATCHED";

                return (
                  <tr key={slot.id} className={isExceed ? "exceed-row" : ""}>
                    <td style={{ color: "var(--alloc-hint-text, var(--ui-text-muted))", fontWeight: 600 }}>#{slot.slotNumber}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--alloc-kpi-val, var(--ui-text-primary))" }}>{slot.departmentName}</div>
                      {slot.sectionName && (
                        <div style={{ fontSize: "0.75rem", color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>{slot.sectionName}</div>
                      )}
                    </td>
                    <td>
                      {isVacant ? (
                        <span style={{ color: "var(--alloc-hint-text, var(--ui-text-muted))", fontStyle: "italic", fontSize: "0.75rem" }}>Vacant</span>
                      ) : isStation ? (
                        <span style={{ color: "var(--alloc-kpi-purple, #9333ea)", fontSize: "0.75rem", fontWeight: 600 }}>Station</span>
                      ) : (
                        <span style={{ color: "var(--ui-feedback-info, #0284c7)", fontSize: "0.75rem", fontWeight: 600 }}>Employee</span>
                      )}
                    </td>
                    <td>
                      {isVacant ? (
                        <span style={{ color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>— Unassigned —</span>
                      ) : isStation ? (
                        <strong style={{ color: "var(--alloc-kpi-val, var(--ui-text-primary))" }}>{slot.stationName || "Shopfloor Station"}</strong>
                      ) : (
                        <div>
                          <strong style={{ color: "var(--alloc-kpi-val, var(--ui-text-primary))" }}>{slot.assignedUserName || "Unnamed"}</strong>
                          {slot.verifiedJoinDate && (
                            <div style={{ fontSize: "0.72rem", color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>
                              Joined: {slot.verifiedJoinDate}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--alloc-table-td-text, var(--ui-text-primary))" }}>
                      {slot.staffId || "—"}
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--ui-feedback-info, #0284c7)" }}>
                      {slot.username || "—"}
                    </td>
                    <td>
                      <span style={{ fontSize: "0.78rem", color: "var(--alloc-table-td-text, var(--ui-text-primary))" }}>
                        {slot.tier?.name || "—"}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--alloc-table-td-text, var(--ui-text-primary))" }}>
                      {slot.deviceModel || "—"}
                    </td>
                    <td>
                      {slot.assetTag ? (
                        slot.assetId ? (
                          <Link to={`/assets/${slot.assetId}`} className="mono-tag" title="View asset details">
                            {slot.assetTag}
                          </Link>
                        ) : (
                          <span className="mono-tag">{slot.assetTag}</span>
                        )
                      ) : (
                        <span style={{ color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>
                      {slot.deviceBrand || "—"}
                    </td>
                    <td>
                      {slot.ownershipStatus === "LEASED" ? (
                        <span className="badge-ownership-leased">Leased</span>
                      ) : (
                        <span className="badge-ownership-owned">Owned</span>
                      )}
                    </td>
                    <td>
                      {isExceed ? (
                        <span className="badge-slot-exceed" title={slot.exceedJustification || "Exceeds baseline quota"}>
                          Exceed (+)
                        </span>
                      ) : (
                        <span className="badge-slot-baseline">Baseline</span>
                      )}
                    </td>
                    <td>
                      {isMismatched ? (
                        <span
                          className="badge-discrepancy-mismatch"
                          title={slot.discrepancyNote || "Asset assignment differs from Snipe-IT checkout"}
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          <AlertTriangleIcon style={{ width: 13, height: 13 }} /> Mismatch
                        </span>
                      ) : slot.discrepancyStatus === "UNLINKED" ? (
                        <span className="badge-discrepancy-unlinked">Unlinked</span>
                      ) : (
                        <span
                          className="badge-discrepancy-matched"
                          style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
                        >
                          <CheckIcon style={{ width: 13, height: 13 }} /> Matched
                        </span>
                      )}
                    </td>
                    <td style={{ maxWidth: "200px", fontSize: "0.78rem" }}>
                      {isExceed && slot.exceedJustification && (
                        <div style={{ color: "var(--ui-feedback-error, #dc2626)", marginBottom: "0.2rem" }}>
                          <strong>Justification:</strong> {slot.exceedJustification}
                        </div>
                      )}
                      {slot.remarks && <div style={{ color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>{slot.remarks}</div>}
                      {!slot.remarks && !slot.exceedJustification && <span style={{ color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>—</span>}
                    </td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {(!slot.assetId || isMismatched) && !isVacant && (
                        <button
                          type="button"
                          className="alloc-btn-action-success"
                          disabled={matchingSlotId === slot.id}
                          style={{ marginRight: "0.3rem" }}
                          onClick={() => handleAutoMatch(slot.id)}
                          title="Auto-match with live Snipe-IT inventory by username or asset tag"
                        >
                          <LinkIcon style={{ width: 12, height: 12 }} /> {matchingSlotId === slot.id ? "Matching..." : "Auto-Link"}
                        </button>
                      )}
                      <button
                        type="button"
                        className="alloc-btn-action-edit"
                        style={{ marginRight: "0.3rem" }}
                        onClick={() => onOpenEditSlot(slot)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="alloc-btn-action-delete"
                        onClick={() => onDeleteSlot(slot.id)}
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

      {/* Pagination Footer */}
      {meta.total > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", color: "var(--alloc-hint-text, var(--ui-text-muted))" }}>
          <div>
            Showing <strong>{slots.length}</strong> of <strong>{meta.total}</strong> allocation slots
          </div>
          {meta.totalPages > 1 && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                disabled={meta.page <= 1}
                className="btn btn-secondary"
                style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                onClick={() => onFilterChange({ ...filters, page: meta.page - 1 })}
              >
                Previous
              </button>
              <span style={{ padding: "0.3rem 0.5rem" }}>
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                type="button"
                disabled={meta.page >= meta.totalPages}
                className="btn btn-secondary"
                style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                onClick={() => onFilterChange({ ...filters, page: meta.page + 1 })}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
