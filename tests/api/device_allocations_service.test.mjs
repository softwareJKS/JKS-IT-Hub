import test from "node:test";
import assert from "node:assert/strict";

import { createDeviceAllocationService } from "../../apps/api/src/features/device-allocations/service.js";

const makeMockRepo = () => {
  const policies = new Map();
  const tiers = new Map();
  const departmentQuotas = new Map();
  const slots = new Map();
  const assets = new Map();
  const users = new Map();
  const notifications = [];

  return {
    policies,
    tiers,
    departmentQuotas,
    slots,
    assets,
    users,
    notifications,

    getActivePolicy: async () => {
      const active = [...policies.values()].find((p) => p.isActive);
      if (!active) return null;
      const policyQuotas = [...departmentQuotas.values()]
        .filter((q) => q.policyId === active.id)
        .map((q) => ({
          ...q,
          primaryTier: tiers.get(q.primaryTierId) || null
        }));
      const policySlots = [...slots.values()].filter((s) => s.policyId === active.id);
      return {
        ...active,
        departmentQuotas: policyQuotas,
        slots: policySlots
      };
    },
    getPolicyById: async (id) => {
      const policy = policies.get(id);
      if (!policy) return null;
      const policyQuotas = [...departmentQuotas.values()]
        .filter((q) => q.policyId === id)
        .map((q) => ({
          ...q,
          primaryTier: tiers.get(q.primaryTierId) || null
        }));
      const policySlots = [...slots.values()].filter((s) => s.policyId === id);
      return {
        ...policy,
        departmentQuotas: policyQuotas,
        slots: policySlots
      };
    },
    getNextSlotNumber: async (policyId, departmentName, sectionName) => {
      const matching = [...slots.values()].filter(
        (s) =>
          s.policyId === policyId &&
          s.departmentName === departmentName &&
          (s.sectionName || null) === (sectionName || null)
      );
      return matching.length + 1;
    },
    findAssetByTag: async (tag) => {
      return [...assets.values()].find((a) => a.assetTag === tag) || null;
    },
    findAssetById: async (id) => {
      return assets.get(id) || null;
    },
    findAssetByUsername: async (username) => {
      return [...assets.values()].find((a) => a.snipeAssignedUsername === username) || null;
    },
    findUserByUsername: async (username) => {
      return [...users.values()].find((u) => u.username === username) || null;
    },
    getItStaffUserIds: async () => ["admin-1"],
    createInAppNotifications: async (items) => {
      notifications.push(...items);
    },
    createSlot: async (data) => {
      const slot = { id: `slot-${slots.size + 1}`, ...data };
      slots.set(slot.id, slot);
      return slot;
    },
    updateSlot: async (id, data) => {
      const existing = slots.get(id);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      slots.set(id, updated);
      return updated;
    },
    deleteSlot: async (id) => {
      slots.delete(id);
      return { success: true };
    },
    getSlotById: async (id) => {
      return slots.get(id) || null;
    },
    listSlots: async () => ({
      data: [...slots.values()],
      meta: { total: slots.size, page: 1, perPage: 100 }
    })
  };
};

test("DeviceAllocationService: getSummary calculates budget variance accurately", async () => {
  const mockRepo = makeMockRepo();
  const service = createDeviceAllocationService({ deviceRepo: mockRepo });

  // 1. Setup policy
  const policyId = "pol-2026";
  mockRepo.policies.set(policyId, {
    id: policyId,
    name: "2026 Active Policy",
    fiscalYear: 2026,
    isActive: true
  });

  // 2. Setup tier (Standard Staff: RM 4500)
  const tierStandardId = "tier-std";
  mockRepo.tiers.set(tierStandardId, {
    id: tierStandardId,
    name: "Tier 5: Standard",
    tierCode: "TIER_5",
    totalBudget: 4500
  });

  // 3. Setup Department Quota: Production baseline quota = 12
  mockRepo.departmentQuotas.set("dq-prod", {
    id: "dq-prod",
    policyId,
    departmentName: "Manufacturing",
    sectionName: "Production",
    baselineQuota: 12,
    primaryTierId: tierStandardId
  });

  // 4. Setup 15 active slots in Production (12 owned, 3 leased => 3 exceed)
  for (let i = 1; i <= 15; i++) {
    mockRepo.slots.set(`slot-prod-${i}`, {
      id: `slot-prod-${i}`,
      policyId,
      departmentName: "Manufacturing",
      sectionName: "Production",
      slotNumber: i,
      slotType: "EMPLOYEE",
      classification: i > 12 ? "GROWTH_EXCEED" : "BASELINE",
      tierId: tierStandardId,
      ownershipStatus: i > 12 ? "LEASED" : "OWNED",
      discrepancyStatus: "MATCHED"
    });
  }

  const summary = await service.getSummary();
  assert.equal(summary.hasActivePolicy, true);
  assert.equal(summary.kpis.totalBaselineQuota, 12);
  assert.equal(summary.kpis.totalActiveHeadcount, 15);
  assert.equal(summary.kpis.totalOwnedUnits, 12);
  assert.equal(summary.kpis.totalLeasedUnits, 3);
  assert.equal(summary.kpis.grossExceedUnits, 3); // 15 - 12
  assert.equal(summary.kpis.totalBaselineBudget, 12 * 4500); // RM 54,000
  assert.equal(summary.kpis.totalActiveBudget, 15 * 4500); // RM 67,500
  assert.equal(summary.kpis.totalAdditionalBudgetReq, 3 * 4500); // RM 13,500
});

test("DeviceAllocationService: getDepartmentReconciliation matches Table 1 structure", async () => {
  const mockRepo = makeMockRepo();
  const service = createDeviceAllocationService({ deviceRepo: mockRepo });

  const policyId = "pol-1";
  mockRepo.policies.set(policyId, {
    id: policyId,
    name: "2026 Fleet",
    fiscalYear: 2026,
    isActive: true
  });

  const tierId = "tier-bd";
  mockRepo.tiers.set(tierId, {
    id: tierId,
    name: "Tier 4: Manager/BD",
    tierCode: "TIER_4",
    totalBudget: 6000
  });

  // After Sales: Baseline 8, Active 12
  mockRepo.departmentQuotas.set("dq-as", {
    id: "dq-as",
    policyId,
    departmentName: "After Sales",
    sectionName: null,
    baselineQuota: 8,
    primaryTierId: tierId,
    notes: "Expanded for customer support"
  });

  for (let i = 1; i <= 12; i++) {
    mockRepo.slots.set(`slot-as-${i}`, {
      id: `slot-as-${i}`,
      policyId,
      departmentName: "After Sales",
      sectionName: null,
      slotNumber: i,
      slotType: "EMPLOYEE",
      classification: i > 8 ? "GROWTH_EXCEED" : "BASELINE",
      ownershipStatus: "OWNED",
      discrepancyStatus: "MATCHED"
    });
  }

  const recon = await service.getDepartmentReconciliation();
  assert.equal(recon.hasActivePolicy, true);
  assert.equal(recon.departments.length, 1);

  const asDept = recon.departments[0];
  assert.equal(asDept.departmentName, "After Sales");
  assert.equal(asDept.baselineQuota, 8);
  assert.equal(asDept.activeHeadcount, 12);
  assert.equal(asDept.netGrowth, 4);
  assert.equal(asDept.unitRate, 6000);
  assert.equal(asDept.baselineBudget, 48000);
  assert.equal(asDept.activeBudget, 72000);
  assert.equal(asDept.additionalBudgetReq, 24000);
  assert.equal(asDept.fleetComposition, "12 Own / 0 Lease");
});

test("DeviceAllocationService: autoMatchSlot binds Snipe-IT asset to slot", async () => {
  const mockRepo = makeMockRepo();
  const service = createDeviceAllocationService({ deviceRepo: mockRepo });

  const policyId = "pol-1";
  mockRepo.policies.set(policyId, { id: policyId, name: "Policy", isActive: true });

  mockRepo.slots.set("slot-1", {
    id: "slot-1",
    policyId,
    departmentName: "IT",
    username: "haziq.it",
    slotType: "EMPLOYEE",
    discrepancyStatus: "UNLINKED"
  });

  mockRepo.assets.set("asset-1", {
    id: "asset-1",
    assetTag: "JKS-IT-2026-001",
    modelName: "ThinkPad T14",
    snipeAssignedUsername: "haziq.it",
    statusLabel: "Ready to Deploy (deployed)"
  });

  const res = await service.autoMatchSlot("slot-1");
  assert.equal(res.matched, true);
  assert.equal(res.slot.assetTag, "JKS-IT-2026-001");
  assert.equal(res.slot.ownershipStatus, "OWNED");
  assert.equal(res.slot.discrepancyStatus, "MATCHED");
});
