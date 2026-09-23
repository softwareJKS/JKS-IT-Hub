import { z } from "zod";

const idSchema = z.string().trim().min(1, "ID is required");

export const createPolicySchema = z.object({
  name: z.string().trim().min(1, "Policy name is required").max(191),
  fiscalYear: z.coerce.number().int().min(2000).max(2100),
  isActive: z.boolean().default(false),
  description: z.string().trim().max(5000).optional().nullable()
});

export const updatePolicySchema = createPolicySchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field must be provided");

export const createTierSchema = z.object({
  tierCode: z
    .string()
    .trim()
    .min(1, "Tier code is required")
    .max(50)
    .transform((val) => val.toUpperCase().replace(/\s+/g, "_")),
  name: z.string().trim().min(1, "Tier name is required").max(191),
  pcBudget: z.coerce.number().min(0, "PC budget must be non-negative"),
  otherBudget: z.coerce.number().min(0, "Peripherals budget must be non-negative").default(0),
  includedItems: z.array(z.string().trim()).optional().default([]),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().default(0)
});

export const updateTierSchema = createTierSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field must be provided");

export const upsertDepartmentQuotaSchema = z.object({
  policyId: idSchema,
  departmentName: z.string().trim().min(1, "Department name is required").max(191),
  sectionName: z
    .string()
    .trim()
    .max(191)
    .optional()
    .nullable()
    .transform((val) => (val && val !== "-" && val !== "All" ? val : null)),
  baselineQuota: z.coerce.number().int().min(0, "Baseline quota must be 0 or greater"),
  primaryTierId: idSchema,
  notes: z.string().trim().max(5000).optional().nullable()
});

export const createSlotSchema = z
  .object({
    policyId: idSchema,
    departmentName: z.string().trim().min(1, "Department name is required").max(191),
    sectionName: z
      .string()
      .trim()
      .max(191)
      .optional()
      .nullable()
      .transform((val) => (val && val !== "-" && val !== "All" ? val : null)),
    slotNumber: z.coerce.number().int().min(1).optional(),
    slotType: z.enum(["EMPLOYEE", "STATION", "VACANT"]).default("EMPLOYEE"),
    classification: z.enum(["BASELINE", "GROWTH_EXCEED"]).default("BASELINE"),
    tierId: idSchema,
    assignedUserId: z.string().trim().nullable().optional(),
    assignedUserName: z.string().trim().max(191).nullable().optional(),
    staffId: z.string().trim().max(50).nullable().optional(),
    username: z.string().trim().max(191).nullable().optional(),
    stationName: z.string().trim().max(191).nullable().optional(),
    assetId: z.string().trim().nullable().optional(),
    assetTag: z.string().trim().max(191).nullable().optional(),
    deviceModel: z.string().trim().max(191).nullable().optional(),
    deviceBrand: z.string().trim().max(100).nullable().optional(),
    ownershipStatus: z.enum(["OWNED", "LEASED"]).default("OWNED"),
    verifiedJoinDate: z.string().trim().max(50).nullable().optional(),
    exceedJustification: z.string().trim().max(5000).nullable().optional(),
    remarks: z.string().trim().max(5000).nullable().optional()
  })
  .refine(
    (data) => {
      if (data.classification === "GROWTH_EXCEED") {
        return Boolean(data.exceedJustification && data.exceedJustification.trim().length > 0);
      }
      return true;
    },
    {
      message: "Exceed justification is mandatory when slot is classified as GROWTH_EXCEED",
      path: ["exceedJustification"]
    }
  );

export const updateSlotSchema = z
  .object({
    departmentName: z.string().trim().min(1).max(191).optional(),
    sectionName: z
      .string()
      .trim()
      .max(191)
      .optional()
      .nullable()
      .transform((val) => (val && val !== "-" && val !== "All" ? val : null)),
    slotNumber: z.coerce.number().int().min(1).optional(),
    slotType: z.enum(["EMPLOYEE", "STATION", "VACANT"]).optional(),
    classification: z.enum(["BASELINE", "GROWTH_EXCEED"]).optional(),
    tierId: idSchema.optional(),
    assignedUserId: z.string().trim().nullable().optional(),
    assignedUserName: z.string().trim().max(191).nullable().optional(),
    staffId: z.string().trim().max(50).nullable().optional(),
    username: z.string().trim().max(191).nullable().optional(),
    stationName: z.string().trim().max(191).nullable().optional(),
    assetId: z.string().trim().nullable().optional(),
    assetTag: z.string().trim().max(191).nullable().optional(),
    deviceModel: z.string().trim().max(191).nullable().optional(),
    deviceBrand: z.string().trim().max(100).nullable().optional(),
    ownershipStatus: z.enum(["OWNED", "LEASED"]).optional(),
    verifiedJoinDate: z.string().trim().max(50).nullable().optional(),
    exceedJustification: z.string().trim().max(5000).nullable().optional(),
    remarks: z.string().trim().max(5000).nullable().optional(),
    discrepancyStatus: z.enum(["MATCHED", "MISMATCHED", "UNLINKED"]).optional(),
    discrepancyNote: z.string().trim().max(5000).nullable().optional()
  })
  .refine(
    (data) => {
      if (data.classification === "GROWTH_EXCEED" && data.exceedJustification !== undefined) {
        return Boolean(data.exceedJustification && data.exceedJustification.trim().length > 0);
      }
      return true;
    },
    {
      message: "Exceed justification is mandatory when slot is classified as GROWTH_EXCEED",
      path: ["exceedJustification"]
    }
  );

export const listSlotsQuerySchema = z.object({
  policyId: z.string().trim().optional(),
  departmentName: z.string().trim().optional(),
  sectionName: z.string().trim().optional(),
  slotType: z.enum(["EMPLOYEE", "STATION", "VACANT"]).optional(),
  classification: z.enum(["BASELINE", "GROWTH_EXCEED"]).optional(),
  ownershipStatus: z.enum(["OWNED", "LEASED"]).optional(),
  discrepancyStatus: z.enum(["MATCHED", "MISMATCHED", "UNLINKED"]).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(500).default(100)
});
