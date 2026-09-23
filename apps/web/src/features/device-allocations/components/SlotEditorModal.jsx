import React, { useState, useEffect } from "react";
import { AlertTriangleIcon } from "./AllocationIcons.jsx";

export function SlotEditorModal({
  isOpen,
  onClose,
  initialData,
  activePolicyId,
  departmentsList = [],
  sectionsList = [],
  tiers = [],
  onSave
}) {
  const [formData, setFormData] = useState({
    policyId: activePolicyId || "",
    departmentName: "",
    sectionName: "",
    slotNumber: "",
    slotType: "EMPLOYEE",
    classification: "BASELINE",
    tierId: "",
    assignedUserName: "",
    staffId: "",
    username: "",
    stationName: "",
    assetTag: "",
    deviceModel: "",
    deviceBrand: "",
    ownershipStatus: "OWNED",
    verifiedJoinDate: "",
    exceedJustification: "",
    remarks: ""
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        policyId: activePolicyId || initialData.policyId || "",
        departmentName: initialData.departmentName || "",
        sectionName: initialData.sectionName || "",
        slotNumber: initialData.slotNumber ?? "",
        slotType: initialData.slotType || "EMPLOYEE",
        classification: initialData.classification || "BASELINE",
        tierId: initialData.tier?.id || initialData.tierId || tiers[0]?.id || "",
        assignedUserName: initialData.assignedUserName || "",
        staffId: initialData.staffId || "",
        username: initialData.username || "",
        stationName: initialData.stationName || "",
        assetTag: initialData.assetTag || "",
        deviceModel: initialData.deviceModel || "",
        deviceBrand: initialData.deviceBrand || "",
        ownershipStatus: initialData.ownershipStatus || "OWNED",
        verifiedJoinDate: initialData.verifiedJoinDate || "",
        exceedJustification: initialData.exceedJustification || "",
        remarks: initialData.remarks || ""
      });
    } else {
      setFormData({
        policyId: activePolicyId || "",
        departmentName: departmentsList[0]?.name || "",
        sectionName: "",
        slotNumber: "",
        slotType: "EMPLOYEE",
        classification: "BASELINE",
        tierId: tiers[0]?.id || "",
        assignedUserName: "",
        staffId: "",
        username: "",
        stationName: "",
        assetTag: "",
        deviceModel: "",
        deviceBrand: "",
        ownershipStatus: "OWNED",
        verifiedJoinDate: "",
        exceedJustification: "",
        remarks: ""
      });
    }
    setError(null);
  }, [initialData, activePolicyId, tiers, departmentsList, isOpen]);

  if (!isOpen) return null;

  const isExceed = formData.classification === "GROWTH_EXCEED";
  const isEmployee = formData.slotType === "EMPLOYEE";
  const isStation = formData.slotType === "STATION";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.departmentName.trim()) {
      setError("Department name is required");
      return;
    }
    if (!formData.tierId) {
      setError("Please select a package tier");
      return;
    }
    if (isExceed && !formData.exceedJustification?.trim()) {
      setError("Exceed justification is mandatory when slot is marked as GROWTH_EXCEED");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        ...formData,
        slotNumber: formData.slotNumber ? Number(formData.slotNumber) : undefined,
        sectionName: formData.sectionName?.trim() || null,
        exceedJustification: isExceed ? formData.exceedJustification.trim() : null
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save slot allocation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="allocations-modal-backdrop" onClick={onClose}>
      <div className="allocations-modal-card" style={{ maxWidth: "720px" }} onClick={(e) => e.stopPropagation()}>
        <div className="allocations-modal-header">
          <div className="allocations-modal-title">
            {initialData ? `Edit Allocation Slot #${initialData.slotNumber}` : "Add New Allocation Slot"}
          </div>
          <button
            type="button"
            className="allocations-modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="allocations-modal-body">
            {error && (
              <div style={{ background: "var(--ui-feedback-error-muted, rgba(244, 63, 94, 0.15))", border: "1px solid var(--ui-feedback-error, rgba(244, 63, 94, 0.3))", color: "var(--ui-feedback-error, #fb7185)", padding: "0.75rem", borderRadius: "0.45rem", fontSize: "0.85rem" }}>
                {error}
              </div>
            )}

            {/* Department & Section */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Department <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={formData.departmentName}
                  onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                >
                  <option value="">Select Department</option>
                  {departmentsList.map((d) => (
                    <option key={d.id || d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Section (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Automation, RND, Mechanical Design"
                  value={formData.sectionName}
                  onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
                />
              </div>
            </div>

            {/* Slot Type & Classification */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Slot Allocation Type <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={formData.slotType}
                  onChange={(e) => setFormData({ ...formData, slotType: e.target.value })}
                >
                  <option value="EMPLOYEE">Employee Personal Assignment</option>
                  <option value="STATION">Shopfloor / Shared Station</option>
                  <option value="VACANT">Vacant Headroom Seat</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Quota Classification <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={formData.classification}
                  onChange={(e) => setFormData({ ...formData, classification: e.target.value })}
                >
                  <option value="BASELINE">Baseline Quota (Covered by approved quota)</option>
                  <option value="GROWTH_EXCEED">Growth Exceed (+) (Unbudgeted / expanded seat)</option>
                </select>
              </div>
            </div>

            {/* Exceedance Justification Banner */}
            {isExceed && (
              <div className="alert-justification-box">
                <div className="alert-justification-title" style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <AlertTriangleIcon style={{ width: 16, height: 16, flexShrink: 0 }} /> Mandatory Exceedance Justification Required
                </div>
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--ui-feedback-error, #dc2626)" }}>
                  This slot increases the active fleet beyond the department's baseline quota. Record management justification for financial and audit reconciliation.
                </p>
                <textarea
                  className="form-textarea"
                  style={{ background: "var(--alloc-input-bg)", borderColor: "var(--ui-feedback-error, rgba(244, 63, 94, 0.4))", color: "var(--alloc-input-text)" }}
                  placeholder="e.g. Expanded from 8 to 12 for regional customer support expansion. Approved by Management."
                  value={formData.exceedJustification}
                  onChange={(e) => setFormData({ ...formData, exceedJustification: e.target.value })}
                  required
                />
              </div>
            )}

            {/* Employee Details (if EMPLOYEE) */}
            {isEmployee && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Employee Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Azly Jaludian"
                    value={formData.assignedUserName}
                    onChange={(e) => setFormData({ ...formData, assignedUserName: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Staff ID</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. JKS0283"
                    value={formData.staffId}
                    onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. azly.jaludian"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Station Details (if STATION) */}
            {isStation && (
              <div className="form-group">
                <label className="form-label">Station / Equipment Function Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Assembly Laptop (DESKTOP-6PF3T7Q) or Waterjet PC"
                  value={formData.stationName}
                  onChange={(e) => setFormData({ ...formData, stationName: e.target.value })}
                />
              </div>
            )}

            {/* Tier & Ownership */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Package Budget Tier <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={formData.tierId}
                  onChange={(e) => setFormData({ ...formData, tierId: e.target.value })}
                >
                  <option value="">Select Tier</option>
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (RM {Number(t.totalBudget).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Fleet Ownership Status</label>
                <select
                  className="form-select"
                  value={formData.ownershipStatus}
                  onChange={(e) => setFormData({ ...formData, ownershipStatus: e.target.value })}
                >
                  <option value="OWNED">Company-Owned Asset</option>
                  <option value="LEASED">Leased / Rental Asset</option>
                </select>
              </div>
            </div>

            {/* Hardware Asset Tag & Model */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Snipe-IT Asset Tag</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. JKS-IT-2512-323 or DESKTOP-B0429"
                  value={formData.assetTag}
                  onChange={(e) => setFormData({ ...formData, assetTag: e.target.value })}
                />
                <span className="form-hint">Matches against live inventory for automatic verification.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Device Model</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Latitude 5520, ThinkPad P14s, MacBook Air M4"
                  value={formData.deviceModel}
                  onChange={(e) => setFormData({ ...formData, deviceModel: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Brand</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dell, Lenovo, Apple, HP"
                  value={formData.deviceBrand}
                  onChange={(e) => setFormData({ ...formData, deviceBrand: e.target.value })}
                />
              </div>
            </div>

            {/* Additional Remarks */}
            <div className="form-group">
              <label className="form-label">Remarks / Operational Notes</label>
              <textarea
                className="form-textarea"
                placeholder="Optional notes regarding hardware deployment, multi-machine setup, or lease duration"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              />
            </div>
          </div>

          <div className="allocations-modal-footer">
            <button
              type="button"
              className="allocations-btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="allocations-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save Slot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
