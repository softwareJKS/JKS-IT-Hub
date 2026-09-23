import React, { useState, useEffect } from "react";

export function DepartmentQuotaModal({
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
    baselineQuota: 0,
    primaryTierId: "",
    notes: ""
  });
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [isCustomSection, setIsCustomSection] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        policyId: activePolicyId || initialData.policyId || "",
        departmentName: initialData.departmentName || "",
        sectionName: initialData.sectionName || "",
        baselineQuota: initialData.baselineQuota ?? 0,
        primaryTierId: initialData.primaryTier?.id || initialData.primaryTierId || tiers[0]?.id || "",
        notes: initialData.notes || ""
      });
    } else {
      setFormData({
        policyId: activePolicyId || "",
        departmentName: departmentsList[0]?.name || "",
        sectionName: "",
        baselineQuota: 0,
        primaryTierId: tiers[0]?.id || "",
        notes: ""
      });
    }
    setError(null);
  }, [initialData, activePolicyId, tiers, departmentsList, isOpen]);

  if (!isOpen) return null;

  // Filter sections matching current department
  const filteredSections = sectionsList.filter((s) => {
    const matchedDept = departmentsList.find((d) => d.name === formData.departmentName);
    return matchedDept && s.departmentId === matchedDept.id;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.departmentName.trim()) {
      setError("Department name is required");
      return;
    }
    if (!formData.primaryTierId) {
      setError("Please select a primary package tier");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        ...formData,
        sectionName: formData.sectionName?.trim() || null,
        baselineQuota: Number(formData.baselineQuota || 0)
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save department quota");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="allocations-modal-backdrop" onClick={onClose}>
      <div className="allocations-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="allocations-modal-header">
          <div className="allocations-modal-title">
            {initialData ? "Edit Department Baseline Quota" : "Set Department Baseline Quota"}
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

            {/* Department */}
            <div className="form-group">
              <label className="form-label">
                Department <span className="required">*</span>
              </label>
              {!isCustomDept ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <select
                    className="form-select"
                    style={{ flex: 1 }}
                    value={formData.departmentName}
                    onChange={(e) => setFormData({ ...formData, departmentName: e.target.value, sectionName: "" })}
                  >
                    <option value="">Select Department</option>
                    {departmentsList.map((d) => (
                      <option key={d.id || d.name} value={d.name}>
                        {d.name} {d.code ? `(${d.code})` : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="allocations-toggle-btn"
                    onClick={() => setIsCustomDept(true)}
                  >
                    Custom +
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter custom department name"
                    style={{ flex: 1 }}
                    value={formData.departmentName}
                    onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                  />
                  <button
                    type="button"
                    className="allocations-toggle-btn"
                    onClick={() => setIsCustomDept(false)}
                  >
                    Select List
                  </button>
                </div>
              )}
            </div>

            {/* Section */}
            <div className="form-group">
              <label className="form-label">Section (Optional)</label>
              {!isCustomSection && filteredSections.length > 0 ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <select
                    className="form-select"
                    style={{ flex: 1 }}
                    value={formData.sectionName}
                    onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
                  >
                    <option value="">None / General (—)</option>
                    {filteredSections.map((s) => (
                      <option key={s.id || s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="allocations-toggle-btn"
                    onClick={() => setIsCustomSection(true)}
                  >
                    Custom +
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter section name (e.g. Automation, RND, Costing)"
                    style={{ flex: 1 }}
                    value={formData.sectionName}
                    onChange={(e) => setFormData({ ...formData, sectionName: e.target.value })}
                  />
                  {filteredSections.length > 0 && (
                    <button
                      type="button"
                      className="allocations-toggle-btn"
                      onClick={() => setIsCustomSection(false)}
                    >
                      Select List
                    </button>
                  )}
                </div>
              )}
              <span className="form-hint">Leave blank if the department has no separate sub-sections.</span>
            </div>

            <div className="form-row">
              {/* Baseline Quota */}
              <div className="form-group">
                <label className="form-label">
                  Approved Baseline Quota <span className="required">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.baselineQuota}
                  onChange={(e) => setFormData({ ...formData, baselineQuota: e.target.value })}
                />
                <span className="form-hint">Budgeted headcount seats (e.g. 9 for Automation, 12 for Production).</span>
              </div>

              {/* Primary Package Tier */}
              <div className="form-group">
                <label className="form-label">
                  Primary Package Tier <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={formData.primaryTierId}
                  onChange={(e) => setFormData({ ...formData, primaryTierId: e.target.value })}
                >
                  <option value="">Select Tier</option>
                  {tiers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (RM {Number(t.totalBudget).toLocaleString()})
                    </option>
                  ))}
                </select>
                <span className="form-hint">Default equipment package rate for this unit.</span>
              </div>
            </div>

            {/* Notes / Justification */}
            <div className="form-group">
              <label className="form-label">Headcount & Asset Justification / Notes</label>
              <textarea
                className="form-textarea"
                placeholder="e.g. Combined Software (6) & Electrical Design (3) Quota. Historical team slots transferred."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
              {isSubmitting ? "Saving..." : "Save Baseline Quota"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
