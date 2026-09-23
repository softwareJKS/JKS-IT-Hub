import * as repo from "./repo.js";

const toNum = (val) => Number(val ?? 0);

const detectOwnership = (statusLabel) => {
  const norm = String(statusLabel ?? "").toLowerCase();
  if (norm.includes("leas") || norm.includes("rental")) {
    return "LEASED";
  }
  return "OWNED";
};

export const createDeviceAllocationService = ({
  deviceRepo = repo,
  assetRepo,
  userRepo,
  pulseOrgClient,
  logger = console
}) => {
  const getActivePolicyOrThrow = async (policyId) => {
    if (policyId) {
      const policy = await deviceRepo.getPolicyById(policyId);
      if (!policy) {
        const err = new Error("Requested quota policy not found");
        err.statusCode = 404;
        throw err;
      }
      return policy;
    }
    const active = await deviceRepo.getActivePolicy();
    return active;
  };

  const getSummary = async (policyId) => {
    const policy = await getActivePolicyOrThrow(policyId);
    if (!policy) {
      return {
        hasActivePolicy: false,
        policy: null,
        kpis: {
          totalBaselineQuota: 0,
          totalActiveHeadcount: 0,
          totalOwnedUnits: 0,
          totalLeasedUnits: 0,
          grossExceedUnits: 0,
          totalVacancies: 0,
          totalBaselineBudget: 0,
          totalActiveBudget: 0,
          totalAdditionalBudgetReq: 0,
          discrepancyCount: 0
        }
      };
    }

    const quotas = policy.departmentQuotas || [];
    const slots = policy.slots || [];

    // Group active slots by dept/section
    const activeSlotsByGroup = new Map();
    let ownedCount = 0;
    let leasedCount = 0;
    let vacantCount = 0;
    let discrepancyCount = 0;

    for (const slot of slots) {
      const key = `${slot.departmentName}:::${slot.sectionName || ""}`;
      if (slot.slotType === "VACANT") {
        vacantCount += 1;
      } else {
        activeSlotsByGroup.set(key, (activeSlotsByGroup.get(key) || 0) + 1);
        if (slot.ownershipStatus === "LEASED") {
          leasedCount += 1;
        } else {
          ownedCount += 1;
        }
      }
      if (slot.discrepancyStatus === "MISMATCHED") {
        discrepancyCount += 1;
      }
    }

    let totalBaselineQuota = 0;
    let totalBaselineBudget = 0;
    let totalActiveBudget = 0;
    let totalAdditionalBudgetReq = 0;
    let grossExceedUnits = 0;

    for (const q of quotas) {
      const key = `${q.departmentName}:::${q.sectionName || ""}`;
      const activeCount = activeSlotsByGroup.get(key) || 0;
      const baseline = q.baselineQuota;
      const unitRate = toNum(q.primaryTier?.totalBudget);

      totalBaselineQuota += baseline;
      totalBaselineBudget += baseline * unitRate;
      totalActiveBudget += activeCount * unitRate;

      const exceed = Math.max(0, activeCount - baseline);
      grossExceedUnits += exceed;
      totalAdditionalBudgetReq += exceed * unitRate;
    }

    return {
      hasActivePolicy: true,
      policy: {
        id: policy.id,
        name: policy.name,
        fiscalYear: policy.fiscalYear,
        isActive: policy.isActive,
        description: policy.description
      },
      kpis: {
        totalBaselineQuota,
        totalActiveHeadcount: ownedCount + leasedCount,
        totalOwnedUnits: ownedCount,
        totalLeasedUnits: leasedCount,
        grossExceedUnits,
        totalVacancies: vacantCount,
        totalBaselineBudget,
        totalActiveBudget,
        totalAdditionalBudgetReq,
        discrepancyCount
      }
    };
  };

  const getDepartmentReconciliation = async (policyId) => {
    const policy = await getActivePolicyOrThrow(policyId);
    if (!policy) {
      return {
        hasActivePolicy: false,
        departments: [],
        totals: {
          baselineQuota: 0,
          activeHeadcount: 0,
          netGrowth: 0,
          baselineBudget: 0,
          activeBudget: 0,
          additionalBudgetReq: 0,
          ownedUnits: 0,
          leasedUnits: 0
        }
      };
    }

    const quotas = policy.departmentQuotas || [];
    const allSlots = policy.slots || [];

    // Group slots by dept + section
    const slotsMap = new Map();
    for (const slot of allSlots) {
      const key = `${slot.departmentName}:::${slot.sectionName || ""}`;
      if (!slotsMap.has(key)) slotsMap.set(key, []);
      slotsMap.get(key).push(slot);
    }

    const departments = [];
    const totals = {
      baselineQuota: 0,
      activeHeadcount: 0,
      netGrowth: 0,
      baselineBudget: 0,
      activeBudget: 0,
      additionalBudgetReq: 0,
      ownedUnits: 0,
      leasedUnits: 0
    };

    quotas.forEach((q, idx) => {
      const key = `${q.departmentName}:::${q.sectionName || ""}`;
      const groupSlots = slotsMap.get(key) || [];
      const activeSlots = groupSlots.filter((s) => s.slotType !== "VACANT");
      const activeHeadcount = activeSlots.length;

      let ownedUnits = 0;
      let leasedUnits = 0;
      for (const s of activeSlots) {
        if (s.ownershipStatus === "LEASED") leasedUnits += 1;
        else ownedUnits += 1;
      }

      const baselineQuota = q.baselineQuota;
      const netGrowth = Math.max(0, activeHeadcount - baselineQuota);
      const unitRate = toNum(q.primaryTier?.totalBudget);
      const baselineBudget = baselineQuota * unitRate;
      const activeBudget = activeHeadcount * unitRate;
      const additionalBudgetReq = netGrowth * unitRate;

      totals.baselineQuota += baselineQuota;
      totals.activeHeadcount += activeHeadcount;
      totals.netGrowth += netGrowth;
      totals.baselineBudget += baselineBudget;
      totals.activeBudget += activeBudget;
      totals.additionalBudgetReq += additionalBudgetReq;
      totals.ownedUnits += ownedUnits;
      totals.leasedUnits += leasedUnits;

      departments.push({
        id: q.id,
        number: idx + 1,
        departmentName: q.departmentName,
        sectionName: q.sectionName,
        baselineQuota,
        activeHeadcount,
        netGrowth,
        primaryTier: q.primaryTier
          ? {
              id: q.primaryTier.id,
              name: q.primaryTier.name,
              tierCode: q.primaryTier.tierCode,
              totalBudget: toNum(q.primaryTier.totalBudget)
            }
          : null,
        unitRate,
        baselineBudget,
        activeBudget,
        additionalBudgetReq,
        ownedUnits,
        leasedUnits,
        fleetComposition: `${ownedUnits} Own / ${leasedUnits} Lease`,
        notes: q.notes,
        slotsCount: groupSlots.length
      });
    });

    return {
      hasActivePolicy: true,
      policyId: policy.id,
      policyName: policy.name,
      fiscalYear: policy.fiscalYear,
      departments,
      totals
    };
  };

  const listSlots = async (filters, pagination) => {
    return deviceRepo.listSlots(filters, pagination);
  };

  const checkSlotDiscrepancy = async (slotData) => {
    // If slot has assetTag or assetId, verify against Snipe-IT Asset in database
    let asset = null;
    if (slotData.assetId) {
      asset = await deviceRepo.findAssetById(slotData.assetId);
    } else if (slotData.assetTag) {
      asset = await deviceRepo.findAssetByTag(slotData.assetTag);
    }

    if (!asset) {
      if (slotData.assetTag) {
        return {
          discrepancyStatus: "UNLINKED",
          discrepancyNote: `Asset tag ${slotData.assetTag} not found in inventory`
        };
      }
      return {
        discrepancyStatus: "MATCHED",
        discrepancyNote: null
      };
    }

    // Asset exists. Check assigned user.
    const slotUser = String(slotData.username ?? "").trim().toLowerCase();
    const assetUser = String(
      asset.snipeAssignedUsername ?? asset.assignedToUser?.username ?? ""
    ).trim().toLowerCase();

    if (slotData.slotType === "VACANT") {
      return {
        discrepancyStatus: "MISMATCHED",
        discrepancyNote: `Slot marked Vacant but asset ${asset.assetTag} is linked`
      };
    }

    if (slotData.slotType === "STATION") {
      return {
        discrepancyStatus: "MATCHED",
        discrepancyNote: null
      };
    }

    if (slotUser && assetUser && slotUser !== assetUser) {
      return {
        discrepancyStatus: "MISMATCHED",
        discrepancyNote: `Slot user (${slotUser}) differs from Snipe-IT checkout user (${assetUser})`
      };
    }

    return {
      discrepancyStatus: "MATCHED",
      discrepancyNote: null
    };
  };

  const createSlot = async (data, actor) => {
    const policy = await getActivePolicyOrThrow(data.policyId);
    if (!policy) {
      const err = new Error("Active quota policy not found");
      err.statusCode = 404;
      throw err;
    }

    const slotNumber =
      data.slotNumber ?? (await deviceRepo.getNextSlotNumber(data.policyId, data.departmentName, data.sectionName));

    // Resolve asset details if assetTag is given
    let assetId = data.assetId || null;
    let deviceModel = data.deviceModel || null;
    let deviceBrand = data.deviceBrand || null;
    let ownershipStatus = data.ownershipStatus || "OWNED";

    if (data.assetTag) {
      const foundAsset = await deviceRepo.findAssetByTag(data.assetTag);
      if (foundAsset) {
        assetId = foundAsset.id;
        deviceModel = foundAsset.modelName || deviceModel;
        deviceBrand = foundAsset.modelName?.split(" ")?.[0] || deviceBrand;
        if (foundAsset.statusLabel) {
          ownershipStatus = detectOwnership(foundAsset.statusLabel);
        }
      }
    }

    // Resolve user details if username given
    let assignedUserId = data.assignedUserId || null;
    if (data.username && !assignedUserId) {
      const foundUser = await deviceRepo.findUserByUsername(data.username);
      if (foundUser) {
        assignedUserId = foundUser.id;
      }
    }

    const discrepancy = await checkSlotDiscrepancy({
      ...data,
      assetId,
      assignedUserId
    });

    const slot = await deviceRepo.createSlot({
      ...data,
      slotNumber,
      assetId,
      assignedUserId,
      deviceModel,
      deviceBrand,
      ownershipStatus,
      discrepancyStatus: discrepancy.discrepancyStatus,
      discrepancyNote: discrepancy.discrepancyNote
    });

    // Notify IT admins if GROWTH_EXCEED or MISMATCHED
    if (slot.classification === "GROWTH_EXCEED" || slot.discrepancyStatus === "MISMATCHED") {
      try {
        const staffIds = await deviceRepo.getItStaffUserIds();
        const title =
          slot.classification === "GROWTH_EXCEED"
            ? `New Exceedance Slot: ${slot.departmentName}`
            : `Device Allocation Discrepancy: ${slot.departmentName}`;
        const message =
          slot.classification === "GROWTH_EXCEED"
            ? `Slot #${slot.slotNumber} added as GROWTH_EXCEED (${slot.assignedUserName || slot.stationName || "Slot"}). Justification: ${slot.exceedJustification || "None provided"}`
            : `Slot #${slot.slotNumber} flagged with discrepancy: ${slot.discrepancyNote}`;

        const notifications = staffIds.map((uid) => ({
          userId: uid,
          title,
          message,
          type: "device_quota_alert",
          referenceType: "device_slot",
          referenceId: slot.id
        }));
        await deviceRepo.createInAppNotifications(notifications);
      } catch (err) {
        logger.warn?.({ err }, "Failed to dispatch in-app notification for device slot");
      }
    }

    return slot;
  };

  const updateSlot = async (id, data, actor) => {
    const existing = await deviceRepo.getSlotById(id);
    if (!existing) {
      const err = new Error("Device allocation slot not found");
      err.statusCode = 404;
      throw err;
    }

    const merged = { ...existing, ...data };
    let assetId = merged.assetId || null;
    let deviceModel = merged.deviceModel;
    let deviceBrand = merged.deviceBrand;
    let ownershipStatus = merged.ownershipStatus;

    if (data.assetTag && data.assetTag !== existing.assetTag) {
      const foundAsset = await deviceRepo.findAssetByTag(data.assetTag);
      if (foundAsset) {
        assetId = foundAsset.id;
        deviceModel = foundAsset.modelName || deviceModel;
        if (foundAsset.statusLabel) {
          ownershipStatus = detectOwnership(foundAsset.statusLabel);
        }
      }
    }

    let assignedUserId = merged.assignedUserId;
    if (data.username && data.username !== existing.username) {
      const foundUser = await deviceRepo.findUserByUsername(data.username);
      if (foundUser) {
        assignedUserId = foundUser.id;
      }
    }

    const discrepancy = await checkSlotDiscrepancy({
      ...merged,
      assetId,
      assignedUserId
    });

    const updated = await deviceRepo.updateSlot(id, {
      ...data,
      assetId,
      assignedUserId,
      deviceModel,
      deviceBrand,
      ownershipStatus,
      discrepancyStatus: discrepancy.discrepancyStatus,
      discrepancyNote: discrepancy.discrepancyNote
    });

    return updated;
  };

  const deleteSlot = async (id) => {
    return deviceRepo.deleteSlot(id);
  };

  const autoMatchSlot = async (slotId) => {
    const slot = await deviceRepo.getSlotById(slotId);
    if (!slot) {
      const err = new Error("Slot not found");
      err.statusCode = 404;
      throw err;
    }

    let matchedAsset = null;
    if (slot.username) {
      // Find asset in database where snipeAssignedUsername matches slot.username
      matchedAsset = await deviceRepo.findAssetByUsername(slot.username);
    }
    if (!matchedAsset && slot.assetTag) {
      matchedAsset = await deviceRepo.findAssetByTag(slot.assetTag);
    }

    if (!matchedAsset) {
      return {
        matched: false,
        message: "No matching asset found in Snipe-IT inventory for this user or tag"
      };
    }

    const updated = await deviceRepo.updateSlot(slot.id, {
      assetId: matchedAsset.id,
      assetTag: matchedAsset.assetTag,
      deviceModel: matchedAsset.modelName || slot.deviceModel,
      deviceBrand: matchedAsset.modelName?.split(" ")?.[0] || slot.deviceBrand,
      ownershipStatus: detectOwnership(matchedAsset.statusLabel),
      discrepancyStatus: "MATCHED",
      discrepancyNote: null
    });

    return {
      matched: true,
      slot: updated
    };
  };

  const listDepartments = async () => {
    const result = {
      departments: [],
      sections: []
    };

    // 1. Fetch from JKSPulse Mongo client if available
    try {
      if (pulseOrgClient?.listOrgHierarchy) {
        const pulseHierarchy = await pulseOrgClient.listOrgHierarchy();
        if (pulseHierarchy?.departments?.length) {
          result.departments = pulseHierarchy.departments.map((d) => ({
            id: d.id,
            name: d.name,
            code: d.code
          }));
        }
        if (pulseHierarchy?.sections?.length) {
          result.sections = pulseHierarchy.sections.map((s) => ({
            id: s.id,
            departmentId: s.departmentId,
            name: s.name
          }));
        }
      }
    } catch (err) {
      logger.warn?.({ err }, "listDepartments: pulseOrgClient lookup failed, continuing with local");
    }

    // 2. Fetch existing departments & sections already configured in department quotas
    const activePolicy = await deviceRepo.getActivePolicy();
    if (activePolicy?.departmentQuotas) {
      const knownDepts = new Set(result.departments.map((d) => d.name.toLowerCase()));
      for (const q of activePolicy.departmentQuotas) {
        if (!knownDepts.has(q.departmentName.toLowerCase())) {
          result.departments.push({
            id: `custom-${q.departmentName}`,
            name: q.departmentName
          });
          knownDepts.add(q.departmentName.toLowerCase());
        }
        if (q.sectionName) {
          result.sections.push({
            id: `custom-sec-${q.departmentName}-${q.sectionName}`,
            departmentName: q.departmentName,
            name: q.sectionName
          });
        }
      }
    }

    // Sort alphabetically
    result.departments.sort((a, b) => a.name.localeCompare(b.name));
    result.sections.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  };

  return {
    getSummary,
    getDepartmentReconciliation,
    listSlots,
    createSlot,
    updateSlot,
    deleteSlot,
    autoMatchSlot,
    listDepartments,
    listTiers: deviceRepo.listTiers,
    getTierById: deviceRepo.getTierById,
    createTier: deviceRepo.createTier,
    updateTier: deviceRepo.updateTier,
    deleteTier: deviceRepo.deleteTier,
    listPolicies: deviceRepo.listPolicies,
    getPolicyById: deviceRepo.getPolicyById,
    createPolicy: deviceRepo.createPolicy,
    updatePolicy: deviceRepo.updatePolicy,
    deletePolicy: deviceRepo.deletePolicy,
    listDepartmentQuotas: deviceRepo.listDepartmentQuotas,
    upsertDepartmentQuota: deviceRepo.upsertDepartmentQuota,
    deleteDepartmentQuota: deviceRepo.deleteDepartmentQuota
  };
};
