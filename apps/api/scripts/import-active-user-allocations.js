import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../src/shared/db/prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXCEL_PATH = path.resolve(__dirname, "../../../active-user.xlsx");

async function main() {
  console.log("==================================================");
  console.log("JKS IT Hub — Device Allocation Excel Data Importer");
  console.log("Target Excel:", EXCEL_PATH);
  console.log("==================================================");

  // 1. Extract data using Python openpyxl
  const pythonScript = `
import openpyxl, json, sys

try:
    wb = openpyxl.load_workbook("${EXCEL_PATH}", data_only=True)
except Exception as e:
    sys.stderr.write(f"Failed to open workbook: {e}\\n")
    sys.exit(1)

sheet = wb["User by Dept (2026 vs 2019)"]

# Table 1: Quotas
t1 = []
for r in range(6, 23):
    no = sheet.cell(r, 1).value
    dept = sheet.cell(r, 2).value
    sec = sheet.cell(r, 3).value
    quota = sheet.cell(r, 4).value
    tier_str = sheet.cell(r, 7).value
    sec_clean = None if sec in ["-", "", None] else str(sec).strip()
    if dept and str(dept).strip():
        t1.append({
            "no": no,
            "departmentName": str(dept).strip(),
            "sectionName": sec_clean,
            "baselineQuota": int(quota or 0),
            "tierStr": str(tier_str or "").strip()
        })

# Table 2: Slots
t2 = []
for r in range(28, sheet.max_row + 1):
    no = sheet.cell(r, 1).value
    if no is not None and str(no).strip() and not str(no).startswith("■") and not str(no) == "TOTAL":
        dept = sheet.cell(r, 2).value
        sec = sheet.cell(r, 3).value
        sec_clean = None if sec in ["-", "", None] else str(sec).strip()
        t2.append({
            "no": no,
            "departmentName": str(dept).strip(),
            "sectionName": sec_clean,
            "name": str(sheet.cell(r, 4).value or "").strip(),
            "staffId": str(sheet.cell(r, 5).value or "").strip(),
            "username": str(sheet.cell(r, 6).value or "").strip(),
            "tierStr": str(sheet.cell(r, 7).value or "").strip(),
            "model": str(sheet.cell(r, 8).value or "").strip(),
            "assetTag": str(sheet.cell(r, 9).value or "").strip(),
            "brand": str(sheet.cell(r, 10).value or "").strip(),
            "own": str(sheet.cell(r, 11).value or "").strip(),
            "joinDate": str(sheet.cell(r, 12).value or "").strip() if sheet.cell(r, 12).value else None,
            "bStatus": str(sheet.cell(r, 13).value or "").strip(),
            "bTag": str(sheet.cell(r, 14).value or "").strip() if sheet.cell(r, 14).value else None,
            "notes": str(sheet.cell(r, 15).value or "").strip() if sheet.cell(r, 15).value else None
        })

print(json.dumps({"t1": t1, "t2": t2}))
`;

  console.log("Reading Excel sheets...");
  const rawOutput = execSync(`python3 -c '${pythonScript.replace(/'/g, "'\\''")}'`, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024
  });
  const { t1, t2 } = JSON.parse(rawOutput);
  console.log(`Parsed ${t1.length} Department Quotas (Table 1) and ${t2.length} Allocation Slots (Table 2).`);

  // 2. Load Tiers, Users, and Assets from DB
  const tiers = await prisma.devicePackageTier.findMany();
  const tierByCode = new Map(tiers.map((t) => [t.tierCode, t.id]));

  function resolveTierId(tierStr) {
    if (!tierStr) return tierByCode.get("T5");
    const s = tierStr.toUpperCase();
    if (s.includes("TIER 1") || s.includes("HOD") || s.includes("DIRECTOR")) return tierByCode.get("T1");
    if (s.includes("TIER 2") || s.includes("DESIGNER") || s.includes("R&D")) return tierByCode.get("T3");
    if (s.includes("TIER 3") || s.includes("AUTOMATION") || s.includes("SOFTWARE") || s.includes("IT")) return tierByCode.get("T4");
    if (s.includes("TIER 4") || s.includes("MANAGERIAL") || s.includes("COSTING") || s.includes("BD") || s.includes("TC")) return tierByCode.get("T2");
    if (s.includes("TIER 5") || s.includes("STANDARD")) return tierByCode.get("T5");
    return tierByCode.get("T5");
  }

  const users = await prisma.user.findMany({ select: { id: true, username: true } });
  const userMap = new Map(users.map((u) => [u.username.toLowerCase(), u.id]));

  const assets = await prisma.asset.findMany({
    select: { id: true, assetTag: true, modelName: true, snipeAssignedUsername: true, statusLabel: true }
  });
  const assetMap = new Map(assets.map((a) => [a.assetTag.toLowerCase(), a]));

  // 3. Create or Update Active Policy
  console.log("Setting up active quota policy...");
  let policy = await prisma.deviceQuotaPolicy.findFirst({
    where: { isActive: true }
  });

  if (!policy) {
    policy = await prisma.deviceQuotaPolicy.create({
      data: {
        name: "2026 Fleet Status & Baseline Policy",
        fiscalYear: 2026,
        isActive: true,
        description: "2019/2022 Approved departmental baseline quotas and 2026 active fleet allocation roster from active-user.xlsx"
      }
    });
    console.log(`Created new active policy: ${policy.name} (${policy.id})`);
  } else {
    policy = await prisma.deviceQuotaPolicy.update({
      where: { id: policy.id },
      data: {
        name: "2026 Fleet Status & Baseline Policy",
        fiscalYear: 2026,
        description: "2019/2022 Approved departmental baseline quotas and 2026 active fleet allocation roster from active-user.xlsx"
      }
    });
    console.log(`Using existing active policy: ${policy.name} (${policy.id})`);
  }

  // Clear existing quotas and slots for clean import
  console.log("Cleaning up previous slots and quotas for this policy...");
  await prisma.deviceAllocationSlot.deleteMany({ where: { policyId: policy.id } });
  await prisma.departmentQuota.deleteMany({ where: { policyId: policy.id } });

  // 4. Insert Department Quotas
  console.log(`Inserting ${t1.length} Department Quotas...`);
  const quotaMap = new Map();

  for (const q of t1) {
    const tierId = resolveTierId(q.tierStr);
    const key = `${q.departmentName}:::${q.sectionName || ""}`;
    quotaMap.set(key, q.baselineQuota);

    await prisma.departmentQuota.create({
      data: {
        policyId: policy.id,
        departmentName: q.departmentName,
        sectionName: q.sectionName,
        baselineQuota: q.baselineQuota,
        primaryTierId: tierId,
        notes: `Approved baseline: ${q.baselineQuota} units (${q.tierStr || "Standard"})`
      }
    });
  }
  console.log("Department Quotas created successfully.");

  // 5. Insert Allocation Slots
  console.log(`Inserting ${t2.length} Device Allocation Slots...`);
  const groupCounters = new Map();
  let baselineSlotsCount = 0;
  let exceedSlotsCount = 0;
  let linkedAssetsCount = 0;
  let linkedUsersCount = 0;

  for (const item of t2) {
    const groupKey = `${item.departmentName}:::${item.sectionName || ""}`;
    const slotNumber = (groupCounters.get(groupKey) || 0) + 1;
    groupCounters.set(groupKey, slotNumber);

    const baselineQuota = quotaMap.get(groupKey) ?? 0;
    const isExceed = slotNumber > baselineQuota;
    const classification = isExceed ? "GROWTH_EXCEED" : "BASELINE";

    if (isExceed) {
      exceedSlotsCount++;
    } else {
      baselineSlotsCount++;
    }

    const tierId = resolveTierId(item.tierStr);

    // Slot type detection
    const isStation =
      item.staffId.toUpperCase() === "STATION" ||
      item.name.toLowerCase() === "assembly" ||
      item.name.toLowerCase() === "waterjet";
    const slotType = isStation ? "STATION" : "EMPLOYEE";
    const stationName = isStation ? item.name : null;
    const assignedUserName = isStation ? null : item.name;

    // Asset matching
    const assetTagClean = item.assetTag?.trim();
    const asset = assetTagClean ? assetMap.get(assetTagClean.toLowerCase()) : null;
    const assetId = asset ? asset.id : null;
    if (assetId) linkedAssetsCount++;

    // User matching
    const usernameClean = item.username?.replace(/^-$/, "").trim();
    const assignedUserId = usernameClean ? userMap.get(usernameClean.toLowerCase()) || null : null;
    if (assignedUserId) linkedUsersCount++;

    // Ownership status
    const isLeased = item.own.toLowerCase().includes("lease");
    const ownershipStatus = isLeased ? "LEASED" : "OWNED";

    // Model and brand
    const deviceModel = asset?.modelName || item.model || "Standard Device";
    const deviceBrand = item.brand || deviceModel.split(" ")[0] || "Standard";

    // Discrepancy calculation
    let discrepancyStatus = "MATCHED";
    let discrepancyNote = null;

    if (assetTagClean && !asset) {
      discrepancyStatus = "UNLINKED";
      discrepancyNote = `Asset tag ${assetTagClean} not found in inventory`;
    } else if (asset && slotType === "EMPLOYEE") {
      const slotUser = usernameClean.toLowerCase();
      const assetUser = String(asset.snipeAssignedUsername || "").toLowerCase();
      if (slotUser && assetUser && slotUser !== assetUser) {
        discrepancyStatus = "MISMATCHED";
        discrepancyNote = `Slot user (${slotUser}) differs from Snipe-IT checkout user (${assetUser})`;
      }
    }

    const remarks = [
      item.bStatus ? `Baseline: ${item.bStatus}` : null,
      item.notes ? `Note: ${item.notes}` : null
    ]
      .filter(Boolean)
      .join(" | ") || null;

    const exceedJustification = isExceed
      ? item.bStatus || "Departmental growth beyond 2019/2022 approved baseline"
      : null;

    await prisma.deviceAllocationSlot.create({
      data: {
        policyId: policy.id,
        departmentName: item.departmentName,
        sectionName: item.sectionName,
        slotNumber,
        slotType,
        classification,
        tierId,
        assignedUserId,
        assignedUserName,
        staffId: item.staffId && item.staffId !== "-" ? item.staffId : null,
        username: usernameClean || null,
        stationName,
        assetId,
        assetTag: assetTagClean || null,
        deviceModel,
        deviceBrand,
        ownershipStatus,
        verifiedJoinDate: item.joinDate || null,
        exceedJustification,
        remarks,
        discrepancyStatus,
        discrepancyNote
      }
    });
  }

  console.log("==================================================");
  console.log("IMPORT COMPLETED SUCCESSFULLY!");
  console.log(`- Policy: ${policy.name} (Fiscal ${policy.fiscalYear})`);
  console.log(`- Department Quotas Created: ${t1.length}`);
  console.log(`- Allocation Slots Created: ${t2.length}`);
  console.log(`  * Baseline Slots: ${baselineSlotsCount}`);
  console.log(`  * Growth Exceed Slots: ${exceedSlotsCount}`);
  console.log(`  * Assets Linked: ${linkedAssetsCount} / ${t2.length}`);
  console.log(`  * Users Linked: ${linkedUsersCount} / ${t2.length}`);
  console.log("==================================================");
}

main()
  .catch((err) => {
    console.error("Import failed with error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
