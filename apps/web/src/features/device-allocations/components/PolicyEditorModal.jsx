import React, { useState, useEffect } from "react";

export function PolicyEditorModal({
  isOpen,
  onClose,
  initialData,
  onSave
}) {
  const [formData, setFormData] = useState({
    name: "",
    fiscalYear: new Date().getFullYear(),
    isActive: false,
    description: ""
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        fiscalYear: initialData.fiscalYear ?? new Date().getFullYear(),
        isActive: initialData.isActive ?? false,
        description: initialData.description || ""
      });
    } else {
      setFormData({
        name: `${new Date().getFullYear()} Active Policy`,
        fiscalYear: new Date().getFullYear(),
        isActive: true,
        description: ""
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Policy name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        name: formData.name.trim(),
        fiscalYear: Number(formData.fiscalYear),
        isActive: formData.isActive,
        description: formData.description?.trim() || null
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save policy");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="allocations-modal-backdrop" onClick={onClose}>
      <div className="allocations-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="allocations-modal-header">
          <div className="allocations-modal-title">
            {initialData ? `Edit Quota Policy: ${initialData.name}` : "Create New Quota Policy"}
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

            <div className="form-group">
              <label className="form-label">
                Policy Name <span className="required">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 2026 Fleet Status, 2019/2022 Baseline"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Fiscal Year <span className="required">*</span>
              </label>
              <input
                type="number"
                min="2000"
                max="2100"
                className="form-input"
                value={formData.fiscalYear}
                onChange={(e) => setFormData({ ...formData, fiscalYear: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ flexDirection: "row", alignItems: "center", gap: "0.6rem" }}>
              <input
                type="checkbox"
                id="policy-is-active"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              <label htmlFor="policy-is-active" className="form-label" style={{ margin: 0, cursor: "pointer" }}>
                Set as Active Quota Policy (reconciles active fleet against this policy)
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Description / Policy Purpose</label>
              <textarea
                className="form-textarea"
                placeholder="e.g. Approved baseline quotas for fiscal 2026 budgeting and IT allocation control."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
              {isSubmitting ? "Saving..." : "Save Policy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
