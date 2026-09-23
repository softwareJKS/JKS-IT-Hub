import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { WorkspacePageHeader } from "../../../shared/workspace/WorkspacePageHeader.jsx";
import { WorkspacePanel } from "../../../shared/workspace/WorkspacePanel.jsx";
import {
  fetchAllocationsSummary,
  fetchDepartmentReconciliation,
  fetchSlots,
  createSlot,
  updateSlot,
  deleteSlot,
  autoMatchSlot,
  fetchPackageTiers,
  createPackageTier,
  updatePackageTier,
  deletePackageTier,
  fetchQuotaPolicies,
  createQuotaPolicy,
  updateQuotaPolicy,
  deleteQuotaPolicy,
  fetchDepartments,
  upsertDepartmentQuota,
  deleteDepartmentQuota
} from "../api/deviceAllocationsApi.js";
import { AllocationsSummaryBanner } from "../components/AllocationsSummaryBanner.jsx";
import { DepartmentReconciliationTab } from "../components/DepartmentReconciliationTab.jsx";
import { SlotRosterTab } from "../components/SlotRosterTab.jsx";
import { TiersAndPoliciesTab } from "../components/TiersAndPoliciesTab.jsx";
import { DepartmentQuotaModal } from "../components/DepartmentQuotaModal.jsx";
import { SlotEditorModal } from "../components/SlotEditorModal.jsx";
import { TierEditorModal } from "../components/TierEditorModal.jsx";
import { PolicyEditorModal } from "../components/PolicyEditorModal.jsx";
import {
  BarChartIcon,
  LaptopDevicesIcon,
  SlidersIcon,
  CheckIcon
} from "../components/AllocationIcons.jsx";
import "../device-allocations.css";

export default function DeviceAllocationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("reconciliation"); // 'reconciliation' | 'roster' | 'tiers'
  const [selectedPolicyId, setSelectedPolicyId] = useState("");

  // Roster Filters
  const [slotFilters, setSlotFilters] = useState({
    search: "",
    departmentName: "",
    slotType: "",
    classification: "",
    ownershipStatus: "",
    discrepancyStatus: "",
    page: 1,
    perPage: 50
  });

  // Modals state
  const [isQuotaModalOpen, setIsQuotaModalOpen] = useState(false);
  const [editingQuota, setEditingQuota] = useState(null);

  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);

  const [isTierModalOpen, setIsTierModalOpen] = useState(false);
  const [editingTier, setEditingTier] = useState(null);

  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);

  // Queries
  const policiesQuery = useQuery({
    queryKey: ["device-allocations", "policies"],
    queryFn: fetchQuotaPolicies
  });

  const activePolicy = useMemo(() => {
    const list = policiesQuery.data || [];
    if (selectedPolicyId) return list.find((p) => p.id === selectedPolicyId);
    return list.find((p) => p.isActive) || list[0] || null;
  }, [policiesQuery.data, selectedPolicyId]);

  const effectivePolicyId = activePolicy?.id || "";

  const summaryQuery = useQuery({
    queryKey: ["device-allocations", "summary", effectivePolicyId],
    queryFn: () => fetchAllocationsSummary(effectivePolicyId),
    enabled: Boolean(effectivePolicyId)
  });

  const reconciliationQuery = useQuery({
    queryKey: ["device-allocations", "reconciliation", effectivePolicyId],
    queryFn: () => fetchDepartmentReconciliation(effectivePolicyId),
    enabled: Boolean(effectivePolicyId)
  });

  const slotsQuery = useQuery({
    queryKey: ["device-allocations", "slots", effectivePolicyId, slotFilters],
    queryFn: () => fetchSlots({ ...slotFilters, policyId: effectivePolicyId }),
    enabled: Boolean(effectivePolicyId)
  });

  const tiersQuery = useQuery({
    queryKey: ["device-allocations", "tiers"],
    queryFn: fetchPackageTiers
  });

  const departmentsQuery = useQuery({
    queryKey: ["device-allocations", "departments"],
    queryFn: fetchDepartments
  });

  // Mutations
  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["device-allocations"] });
  };

  const saveQuotaMutation = useMutation({
    mutationFn: upsertDepartmentQuota,
    onSuccess: invalidateAll
  });

  const saveSlotMutation = useMutation({
    mutationFn: (data) => {
      if (editingSlot?.id) return updateSlot(editingSlot.id, data);
      return createSlot(data);
    },
    onSuccess: invalidateAll
  });

  const deleteSlotMutation = useMutation({
    mutationFn: deleteSlot,
    onSuccess: invalidateAll
  });

  const autoMatchMutation = useMutation({
    mutationFn: autoMatchSlot,
    onSuccess: invalidateAll
  });

  const saveTierMutation = useMutation({
    mutationFn: (data) => {
      if (editingTier?.id) return updatePackageTier(editingTier.id, data);
      return createPackageTier(data);
    },
    onSuccess: invalidateAll
  });

  const deleteTierMutation = useMutation({
    mutationFn: deletePackageTier,
    onSuccess: invalidateAll
  });

  const savePolicyMutation = useMutation({
    mutationFn: (data) => {
      if (editingPolicy?.id) return updateQuotaPolicy(editingPolicy.id, data);
      return createQuotaPolicy(data);
    },
    onSuccess: invalidateAll
  });

  const activatePolicyMutation = useMutation({
    mutationFn: (id) => updateQuotaPolicy(id, { isActive: true }),
    onSuccess: (updated) => {
      setSelectedPolicyId(updated.id);
      invalidateAll();
    }
  });

  const deletePolicyMutation = useMutation({
    mutationFn: deleteQuotaPolicy,
    onSuccess: invalidateAll
  });

  // Handlers for cross-tab actions
  const handleViewDepartmentSlots = (deptName, secName) => {
    setSlotFilters({
      ...slotFilters,
      departmentName: deptName,
      sectionName: secName || "",
      page: 1
    });
    setActiveTab("roster");
  };

  const handleOpenAddQuota = () => {
    setEditingQuota(null);
    setIsQuotaModalOpen(true);
  };

  const handleOpenEditQuota = (row) => {
    setEditingQuota(row);
    setIsQuotaModalOpen(true);
  };

  const handleOpenAddSlot = () => {
    setEditingSlot(null);
    setIsSlotModalOpen(true);
  };

  const handleOpenEditSlot = (slot) => {
    setEditingSlot(slot);
    setIsSlotModalOpen(true);
  };

  const handleDeleteSlot = async (slotId) => {
    if (window.confirm("Are you sure you want to delete this allocation slot?")) {
      await deleteSlotMutation.mutateAsync(slotId);
    }
  };

  const handleOpenAddTier = () => {
    setEditingTier(null);
    setIsTierModalOpen(true);
  };

  const handleOpenEditTier = (tier) => {
    setEditingTier(tier);
    setIsTierModalOpen(true);
  };

  const handleDeleteTier = async (tierId) => {
    if (window.confirm("Are you sure you want to delete this package tier?")) {
      await deleteTierMutation.mutateAsync(tierId);
    }
  };

  const handleOpenAddPolicy = () => {
    setEditingPolicy(null);
    setIsPolicyModalOpen(true);
  };

  const handleOpenEditPolicy = (pol) => {
    setEditingPolicy(pol);
    setIsPolicyModalOpen(true);
  };

  const handleDeletePolicy = async (policyId) => {
    const targetPolicy = policiesList.find((p) => p.id === policyId);
    const isTargetActive = targetPolicy?.isActive;
    const confirmMsg = isTargetActive
      ? `"${targetPolicy?.name || "This policy"}" is currently the ACTIVE quota policy.\n\nDeleting it will remove all department baselines and device slots linked to it.\n\nAre you sure you want to proceed?`
      : "Are you sure you want to delete this quota policy? All associated department baselines and slots will be removed.";

    if (window.confirm(confirmMsg)) {
      await deletePolicyMutation.mutateAsync(policyId);
    }
  };

  const departmentsList = departmentsQuery.data?.departments || [];
  const sectionsList = departmentsQuery.data?.sections || [];
  const tiersList = tiersQuery.data || [];
  const policiesList = policiesQuery.data || [];

  return (
    <div className="allocations-workspace">
      {/* Header */}
      <WorkspacePageHeader
        title="Departmental Device Allocations & Quotas"
        description="Comprehensive headcount allocation roster, baseline quota reconciliation, package budget estimation, and live Snipe-IT inventory verification."
      >
        <div className="allocations-header-actions">
          {policiesList.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.82rem", color: "var(--alloc-hint-text, var(--ui-text-muted))", fontWeight: 600 }}>Policy Version:</span>
              <select
                className="form-select"
                style={{ padding: "0.4rem 0.75rem", fontSize: "0.85rem" }}
                value={effectivePolicyId}
                onChange={(e) => setSelectedPolicyId(e.target.value)}
              >
                {policiesList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.fiscalYear}) {p.isActive ? "(Active)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activePolicy && (
            <span className={`policy-badge ${activePolicy.isActive ? "" : "inactive"}`}>
              {activePolicy.isActive && <CheckIcon style={{ width: 13, height: 13 }} />}
              {activePolicy.isActive ? "Active Policy" : "Archived Policy"}
            </span>
          )}
        </div>
      </WorkspacePageHeader>

      {/* Sticky KPI Summary Banner */}
      <AllocationsSummaryBanner
        kpis={summaryQuery.data?.kpis || {}}
        activePolicy={activePolicy}
      />

      {/* Tabs Bar */}
      <WorkspacePanel style={{ padding: "0.75rem 1rem" }}>
        <div className="allocations-tabs">
          <button
            type="button"
            className={`allocations-tab-btn ${activeTab === "reconciliation" ? "active" : ""}`}
            onClick={() => setActiveTab("reconciliation")}
          >
            <BarChartIcon /> Department Reconciliation (Table 1)
            {reconciliationQuery.data?.departments?.length > 0 && (
              <span className="tab-badge">{reconciliationQuery.data.departments.length}</span>
            )}
          </button>

          <button
            type="button"
            className={`allocations-tab-btn ${activeTab === "roster" ? "active" : ""}`}
            onClick={() => setActiveTab("roster")}
          >
            <LaptopDevicesIcon /> Itemized Slot Roster (Table 2)
            {slotsQuery.data?.meta?.total > 0 && (
              <span className="tab-badge">{slotsQuery.data.meta.total}</span>
            )}
          </button>

          <button
            type="button"
            className={`allocations-tab-btn ${activeTab === "tiers" ? "active" : ""}`}
            onClick={() => setActiveTab("tiers")}
          >
            <SlidersIcon /> Tiers & Quota Policies
            {tiersList.length > 0 && (
              <span className="tab-badge">{tiersList.length}</span>
            )}
          </button>
        </div>
      </WorkspacePanel>

      {/* Active Tab View */}
      <WorkspacePanel>
        {activeTab === "reconciliation" && (
          <DepartmentReconciliationTab
            data={reconciliationQuery.data || {}}
            isLoading={reconciliationQuery.isLoading}
            onOpenAddQuota={handleOpenAddQuota}
            onOpenEditQuota={handleOpenEditQuota}
            onViewDepartmentSlots={handleViewDepartmentSlots}
          />
        )}

        {activeTab === "roster" && (
          <SlotRosterTab
            slots={slotsQuery.data?.data || []}
            meta={slotsQuery.data?.meta || {}}
            isLoading={slotsQuery.isLoading}
            filters={slotFilters}
            onFilterChange={setSlotFilters}
            departments={departmentsList}
            onOpenAddSlot={handleOpenAddSlot}
            onOpenEditSlot={handleOpenEditSlot}
            onDeleteSlot={handleDeleteSlot}
            onAutoMatchSlot={autoMatchMutation.mutateAsync}
          />
        )}

        {activeTab === "tiers" && (
          <TiersAndPoliciesTab
            tiers={tiersList}
            policies={policiesList}
            activePolicyId={effectivePolicyId}
            isLoading={tiersQuery.isLoading || policiesQuery.isLoading}
            onOpenAddTier={handleOpenAddTier}
            onOpenEditTier={handleOpenEditTier}
            onDeleteTier={handleDeleteTier}
            onOpenAddPolicy={handleOpenAddPolicy}
            onOpenEditPolicy={handleOpenEditPolicy}
            onActivatePolicy={(id) => activatePolicyMutation.mutateAsync(id)}
            onDeletePolicy={handleDeletePolicy}
          />
        )}
      </WorkspacePanel>

      {/* Modals */}
      <DepartmentQuotaModal
        isOpen={isQuotaModalOpen}
        onClose={() => setIsQuotaModalOpen(false)}
        initialData={editingQuota}
        activePolicyId={effectivePolicyId}
        departmentsList={departmentsList}
        sectionsList={sectionsList}
        tiers={tiersList}
        onSave={(data) => saveQuotaMutation.mutateAsync(data)}
      />

      <SlotEditorModal
        isOpen={isSlotModalOpen}
        onClose={() => setIsSlotModalOpen(false)}
        initialData={editingSlot}
        activePolicyId={effectivePolicyId}
        departmentsList={departmentsList}
        sectionsList={sectionsList}
        tiers={tiersList}
        onSave={(data) => saveSlotMutation.mutateAsync(data)}
      />

      <TierEditorModal
        isOpen={isTierModalOpen}
        onClose={() => setIsTierModalOpen(false)}
        initialData={editingTier}
        onSave={(data) => saveTierMutation.mutateAsync(data)}
      />

      <PolicyEditorModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
        initialData={editingPolicy}
        onSave={(data) => savePolicyMutation.mutateAsync(data)}
      />
    </div>
  );
}
