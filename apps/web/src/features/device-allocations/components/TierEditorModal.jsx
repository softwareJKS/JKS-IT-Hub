import React, { useState, useEffect } from "react";

export function TierEditorModal({
  isOpen,
  onClose,
  initialData,
  onSave
}) {
  const [formData, setFormData] = useState({
    tierCode: "",
    name: "",
    pcBudget: 0,
    otherBudget: 0,
    includedItemsText: "",
    isActive: true,
    sortOrder: 0
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      const items = Array.isArray(initialData.includedItems) ? initialData.includedItems.join("\n") : "";
      setFormData({
        tierCode: initialData.tierCode || "",
        name: initialData.name || "",
        pcBudget: initialData.pcBudget ?? 0,
        otherBudget: initialData.otherBudget ?? 0,
        includedItemsText: items,
        isActive: initialData.isActive ?? true,
        sortOrder: initialData.sortOrder ?? 0
      });
    } else {
      setFormData({
        tierCode: "",
        name: "",
        pcBudget: 0,
        otherBudget: 1500,
        includedItemsText: "1. Laptop / Desktop\n2. Monitor\n3. Keyboard / Mouse\n4. Antivirus\n5. Microsoft Office License",
        isActive: true,
        sortOrder: 0
      });
    }
    setError(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const totalCalculated = Number(formData.pcBudget || 0) + Number(formData.otherBudget || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.tierCode.trim()) {
      setError("Tier code is required");
      return;
    }
    if (!formData.name.trim()) {
      setError("Tier name is required");
      return;
    }

    const items = formData.includedItemsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        tierCode: formData.tierCode.trim().toUpperCase(),
        name: formData.name.trim(),
        pcBudget: Number(formData.pcBudget || 0),
        otherBudget: Number(formData.otherBudget || 0),
        includedItems: items,
        isActive: formData.isActive,
        sortOrder: Number(formData.sortOrder || 0)
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save tier");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="allocations-modal-backdrop" onClick={onClose}>
      <div className="allocations-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="allocations-modal-header">
          <div className="allocations-modal-title">
            {initialData ? `Edit Package Tier: ${initialData.name}` : "Create New Package Budget Tier"}
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

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Tier Code <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. TIER_1 or HOD"
                  value={formData.tierCode}
                  onChange={(e) => setFormData({ ...formData, tierCode: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Tier Name / Label <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Tier 1: HOD / Director"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">PC Hardware Budget (RM)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.pcBudget}
                  onChange={(e) => setFormData({ ...formData, pcBudget: e.target.value })}
                />
                <span className="form-hint">e.g. 6500 for HOD, 6000 for Designer, 3000 for Standard.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Peripherals / Licenses Budget (RM)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.otherBudget}
                  onChange={(e) => setFormData({ ...formData, otherBudget: e.target.value })}
                />
                <span className="form-hint">Standard RM 1,500 (Monitor, Antivirus, MS Office).</span>
              </div>
            </div>

            {/* Total Display */}
            <div style={{ background: "var(--ui-feedback-info-muted, rgba(56, 189, 248, 0.08))", border: "1px solid var(--ui-feedback-info, rgba(56, 189, 248, 0.25))", padding: "0.85rem 1rem", borderRadius: "0.45rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--alloc-label-text, var(--ui-text-secondary))", fontSize: "0.85rem", fontWeight: 600 }}>Total Package Rate per Seat:</span>
              <strong style={{ color: "var(--ui-feedback-success, #16a34a)", fontSize: "1.25rem", fontFamily: "monospace" }}>
                RM {totalCalculated.toLocaleString()}
              </strong>
            </div>

            {/* Included items */}
            <div className="form-group">
              <label className="form-label">Included Package Items (One per line)</label>
              <textarea
                className="form-textarea"
                rows={5}
                placeholder="1. Laptop / Desktop&#10;2. Monitor&#10;3. Keyboard / Mouse&#10;4. Antivirus&#10;5. Microsoft Office License"
                value={formData.includedItemsText}
                onChange={(e) => setFormData({ ...formData, includedItemsText: e.target.value })}
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
              {isSubmitting ? "Saving..." : "Save Tier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
