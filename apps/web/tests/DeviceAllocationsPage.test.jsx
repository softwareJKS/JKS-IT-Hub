import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/features/device-allocations/api/deviceAllocationsApi.js", () => ({
  fetchAllocationsSummary: vi.fn(),
  fetchDepartmentReconciliation: vi.fn(),
  fetchSlots: vi.fn(),
  fetchPackageTiers: vi.fn(),
  fetchQuotaPolicies: vi.fn(),
  fetchDepartments: vi.fn(),
  createSlot: vi.fn(),
  updateSlot: vi.fn(),
  deleteSlot: vi.fn(),
  autoMatchSlot: vi.fn(),
  createPackageTier: vi.fn(),
  updatePackageTier: vi.fn(),
  deletePackageTier: vi.fn(),
  createQuotaPolicy: vi.fn(),
  updateQuotaPolicy: vi.fn(),
  deleteQuotaPolicy: vi.fn(),
  upsertDepartmentQuota: vi.fn(),
  deleteDepartmentQuota: vi.fn()
}));

import DeviceAllocationsPage from "../src/features/device-allocations/pages/DeviceAllocationsPage.jsx";
import {
  fetchAllocationsSummary,
  fetchDepartmentReconciliation,
  fetchSlots,
  fetchPackageTiers,
  fetchQuotaPolicies,
  fetchDepartments
} from "../src/features/device-allocations/api/deviceAllocationsApi.js";

const mockPolicy = {
  id: "pol-2026",
  name: "2026 Active Policy",
  fiscalYear: 2026,
  isActive: true,
  description: "Test policy"
};

const mockSummary = {
  hasActivePolicy: true,
  policy: mockPolicy,
  kpis: {
    totalBaselineQuota: 84,
    totalActiveHeadcount: 86,
    totalOwnedUnits: 70,
    totalLeasedUnits: 16,
    grossExceedUnits: 11,
    totalVacancies: 9,
    totalBaselineBudget: 453000,
    totalActiveBudget: 485000,
    totalAdditionalBudgetReq: 56000,
    discrepancyCount: 0
  }
};

const mockReconciliation = {
  hasActivePolicy: true,
  policyId: "pol-2026",
  policyName: "2026 Active Policy",
  departments: [
    {
      id: "dept-1",
      number: 1,
      departmentName: "Account & Finance",
      sectionName: null,
      baselineQuota: 4,
      activeHeadcount: 4,
      netGrowth: 0,
      primaryTier: { id: "tier-std", name: "Tier 5: Standard", totalBudget: 4500 },
      unitRate: 4500,
      baselineBudget: 18000,
      activeBudget: 18000,
      additionalBudgetReq: 0,
      ownedUnits: 4,
      leasedUnits: 0,
      fleetComposition: "4 Own / 0 Lease",
      notes: "Stable headcount",
      slotsCount: 4
    }
  ],
  totals: {
    baselineQuota: 84,
    activeHeadcount: 86,
    netGrowth: 11,
    baselineBudget: 453000,
    activeBudget: 485000,
    additionalBudgetReq: 56000,
    ownedUnits: 70,
    leasedUnits: 16
  }
};

const mockSlots = {
  data: [
    {
      id: "slot-1",
      slotNumber: 1,
      departmentName: "Account & Finance",
      sectionName: null,
      slotType: "EMPLOYEE",
      classification: "BASELINE",
      assignedUserName: "Azly Jaludian",
      staffId: "JKS0283",
      username: "azly.jaludian",
      assetTag: "JKS-IT-2512-323",
      deviceModel: "Latitude 5520",
      deviceBrand: "Dell",
      ownershipStatus: "OWNED",
      discrepancyStatus: "MATCHED",
      tier: { id: "tier-std", name: "Tier 5: Standard" }
    }
  ],
  meta: {
    total: 1,
    page: 1,
    perPage: 50,
    totalPages: 1
  }
};

const mockTiers = [
  {
    id: "tier-std",
    tierCode: "TIER_5",
    name: "Tier 5: Standard",
    pcBudget: 3000,
    otherBudget: 1500,
    totalBudget: 4500,
    includedItems: ["Laptop", "Monitor"],
    isActive: true,
    _count: { slots: 1 }
  }
];

const mockDepartments = {
  departments: [{ id: "dept-1", name: "Account & Finance" }],
  sections: []
};

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <DeviceAllocationsPage />
      }
    ],
    { initialEntries: ["/"] }
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
};

describe("DeviceAllocationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchQuotaPolicies.mockResolvedValue([mockPolicy]);
    fetchAllocationsSummary.mockResolvedValue(mockSummary);
    fetchDepartmentReconciliation.mockResolvedValue(mockReconciliation);
    fetchSlots.mockResolvedValue(mockSlots);
    fetchPackageTiers.mockResolvedValue(mockTiers);
    fetchDepartments.mockResolvedValue(mockDepartments);
  });

  it("renders top KPI banner with baseline quota and budget metrics", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("RM 453,000").length).toBeGreaterThanOrEqual(1);
    });

    expect(screen.getByText("Approved Baseline Quota")).toBeInTheDocument();
    expect(screen.getByText("Active Fleet Headcount")).toBeInTheDocument();
    expect(screen.getAllByText(/84/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/86/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders Table 1 Reconciliation by default and switches to Slot Roster tab", async () => {
    renderPage();

    await waitFor(
      () => {
        expect(screen.getByText("Account & Finance")).toBeInTheDocument();
        expect(screen.getByText("4 Own")).toBeInTheDocument();
        expect(screen.getByText("0 Lease")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Switch to Slot Roster tab
    const rosterTabBtn = screen.getByRole("button", { name: /Itemized Slot Roster/i });
    fireEvent.click(rosterTabBtn);

    await waitFor(
      () => {
        expect(screen.getByText("Azly Jaludian")).toBeInTheDocument();
        expect(screen.getByText("JKS-IT-2512-323")).toBeInTheDocument();
        expect(screen.getByText("Latitude 5520")).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it("opens Department Quota modal on button click", async () => {
    renderPage();

    await waitFor(
      () => {
        expect(screen.queryByText(/Loading department reconciliation/i)).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Set Department Quota/i })).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    fireEvent.click(screen.getByRole("button", { name: /Set Department Quota/i }));

    expect(screen.getByText("Set Department Baseline Quota")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save Baseline Quota/i })).toBeInTheDocument();
  });
});
