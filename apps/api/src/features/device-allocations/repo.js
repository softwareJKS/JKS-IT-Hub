import { prisma } from "../../shared/db/prisma.js";

// ==================== POLICIES ====================

export const listPolicies = async () => {
  return prisma.deviceQuotaPolicy.findMany({
    orderBy: [{ fiscalYear: "desc" }, { createdAt: "desc" }],
    include: {
      _count: {
        select: {
          departmentQuotas: true,
          slots: true
        }
      }
    }
  });
};

export const getPolicyById = async (id) => {
  return prisma.deviceQuotaPolicy.findUnique({
    where: { id },
    include: {
      departmentQuotas: {
        include: { primaryTier: true },
        orderBy: [{ departmentName: "asc" }, { sectionName: "asc" }]
      },
      slots: {
        include: { tier: true, asset: true, assignedToUser: true },
        orderBy: [{ departmentName: "asc" }, { sectionName: "asc" }, { slotNumber: "asc" }]
      }
    }
  });
};

export const getActivePolicy = async () => {
  return prisma.deviceQuotaPolicy.findFirst({
    where: { isActive: true },
    include: {
      departmentQuotas: {
        include: { primaryTier: true },
        orderBy: [{ departmentName: "asc" }, { sectionName: "asc" }]
      },
      slots: {
        include: { tier: true, asset: true, assignedToUser: true },
        orderBy: [{ departmentName: "asc" }, { sectionName: "asc" }, { slotNumber: "asc" }]
      }
    }
  });
};

export const createPolicy = async (data) => {
  if (data.isActive) {
    return prisma.$transaction(async (tx) => {
      await tx.deviceQuotaPolicy.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
      return tx.deviceQuotaPolicy.create({ data });
    });
  }
  return prisma.deviceQuotaPolicy.create({ data });
};

export const updatePolicy = async (id, data) => {
  if (data.isActive) {
    return prisma.$transaction(async (tx) => {
      await tx.deviceQuotaPolicy.updateMany({
        where: { id: { not: id }, isActive: true },
        data: { isActive: false }
      });
      return tx.deviceQuotaPolicy.update({
        where: { id },
        data
      });
    });
  }
  return prisma.deviceQuotaPolicy.update({
    where: { id },
    data
  });
};

export const deletePolicy = async (id) => {
  return prisma.deviceQuotaPolicy.delete({
    where: { id }
  });
};

// ==================== TIERS ====================

export const listTiers = async () => {
  return prisma.devicePackageTier.findMany({
    orderBy: [{ sortOrder: "asc" }, { totalBudget: "desc" }],
    include: {
      _count: {
        select: {
          departmentQuotas: true,
          slots: true
        }
      }
    }
  });
};

export const getTierById = async (id) => {
  return prisma.devicePackageTier.findUnique({
    where: { id }
  });
};

export const createTier = async (data) => {
  const pc = Number(data.pcBudget ?? 0);
  const other = Number(data.otherBudget ?? 0);
  const total = pc + other;
  return prisma.devicePackageTier.create({
    data: {
      ...data,
      totalBudget: total
    }
  });
};

export const updateTier = async (id, data) => {
  const existing = await prisma.devicePackageTier.findUnique({ where: { id } });
  if (!existing) return null;

  const pc = data.pcBudget !== undefined ? Number(data.pcBudget) : Number(existing.pcBudget);
  const other = data.otherBudget !== undefined ? Number(data.otherBudget) : Number(existing.otherBudget);
  const total = pc + other;

  return prisma.devicePackageTier.update({
    where: { id },
    data: {
      ...data,
      totalBudget: total
    }
  });
};

export const deleteTier = async (id) => {
  return prisma.devicePackageTier.delete({
    where: { id }
  });
};

// ==================== DEPARTMENT QUOTAS ====================

export const listDepartmentQuotas = async (policyId) => {
  return prisma.departmentQuota.findMany({
    where: { policyId },
    include: { primaryTier: true },
    orderBy: [{ departmentName: "asc" }, { sectionName: "asc" }]
  });
};

export const upsertDepartmentQuota = async ({ policyId, departmentName, sectionName = null, baselineQuota, primaryTierId, notes }) => {
  return prisma.departmentQuota.upsert({
    where: {
      policyId_departmentName_sectionName: {
        policyId,
        departmentName,
        sectionName: sectionName ?? ""
      }
    },
    update: {
      baselineQuota,
      primaryTierId,
      notes
    },
    create: {
      policyId,
      departmentName,
      sectionName: sectionName ?? null,
      baselineQuota,
      primaryTierId,
      notes
    },
    include: {
      primaryTier: true
    }
  });
};

export const deleteDepartmentQuota = async (id) => {
  return prisma.departmentQuota.delete({
    where: { id }
  });
};

// ==================== ALLOCATION SLOTS ====================

export const getNextSlotNumber = async (policyId, departmentName, sectionName = null) => {
  const aggregate = await prisma.deviceAllocationSlot.aggregate({
    where: {
      policyId,
      departmentName,
      sectionName: sectionName ?? null
    },
    _max: {
      slotNumber: true
    }
  });
  return (aggregate._max.slotNumber ?? 0) + 1;
};

export const listSlots = async (filters = {}, pagination = { page: 1, perPage: 100 }) => {
  const where = {};

  if (filters.policyId) {
    where.policyId = filters.policyId;
  }
  if (filters.departmentName) {
    where.departmentName = filters.departmentName;
  }
  if (filters.sectionName !== undefined) {
    where.sectionName = filters.sectionName || null;
  }
  if (filters.slotType) {
    where.slotType = filters.slotType;
  }
  if (filters.classification) {
    where.classification = filters.classification;
  }
  if (filters.ownershipStatus) {
    where.ownershipStatus = filters.ownershipStatus;
  }
  if (filters.discrepancyStatus) {
    where.discrepancyStatus = filters.discrepancyStatus;
  }
  if (filters.search) {
    const q = filters.search.trim();
    where.OR = [
      { assignedUserName: { contains: q } },
      { username: { contains: q } },
      { staffId: { contains: q } },
      { stationName: { contains: q } },
      { assetTag: { contains: q } },
      { deviceModel: { contains: q } },
      { departmentName: { contains: q } }
    ];
  }

  const [total, slots] = await Promise.all([
    prisma.deviceAllocationSlot.count({ where }),
    prisma.deviceAllocationSlot.findMany({
      where,
      include: {
        tier: true,
        asset: true,
        assignedToUser: {
          select: {
            id: true,
            username: true,
            status: true,
            role: true,
            orgSnapshot: true
          }
        }
      },
      orderBy: [
        { departmentName: "asc" },
        { sectionName: "asc" },
        { slotNumber: "asc" }
      ],
      skip: (pagination.page - 1) * pagination.perPage,
      take: pagination.perPage
    })
  ]);

  return {
    data: slots,
    meta: {
      total,
      page: pagination.page,
      perPage: pagination.perPage,
      totalPages: Math.ceil(total / pagination.perPage)
    }
  };
};

export const getSlotById = async (id) => {
  return prisma.deviceAllocationSlot.findUnique({
    where: { id },
    include: {
      tier: true,
      asset: true,
      assignedToUser: true,
      policy: true
    }
  });
};

export const createSlot = async (data) => {
  return prisma.deviceAllocationSlot.create({
    data,
    include: {
      tier: true,
      asset: true,
      assignedToUser: true
    }
  });
};

export const updateSlot = async (id, data) => {
  return prisma.deviceAllocationSlot.update({
    where: { id },
    data,
    include: {
      tier: true,
      asset: true,
      assignedToUser: true
    }
  });
};

export const deleteSlot = async (id) => {
  return prisma.deviceAllocationSlot.delete({
    where: { id }
  });
};

// ==================== ASSET / USER HELPERS ====================

export const findAssetByTag = async (assetTag) => {
  if (!assetTag) return null;
  return prisma.asset.findUnique({
    where: { assetTag }
  });
};

export const findAssetByUsername = async (username) => {
  if (!username) return null;
  return prisma.asset.findFirst({
    where: {
      OR: [
        { snipeAssignedUsername: { equals: username } },
        { assignedToUser: { username: { equals: username } } }
      ]
    }
  });
};

export const findAssetById = async (id) => {
  if (!id) return null;
  return prisma.asset.findUnique({
    where: { id }
  });
};

export const findUserByUsername = async (username) => {
  if (!username) return null;
  return prisma.user.findFirst({
    where: {
      username: {
        equals: username
      }
    }
  });
};

export const getItStaffUserIds = async () => {
  const staff = await prisma.user.findMany({
    where: {
      role: { in: ["dev", "it", "admin", "head_it"] },
      status: "active"
    },
    select: { id: true }
  });
  return staff.map((u) => u.id);
};

export const createInAppNotifications = async (notifications) => {
  if (!notifications || !notifications.length) return;
  return prisma.inAppNotification.createMany({
    data: notifications
  });
};
