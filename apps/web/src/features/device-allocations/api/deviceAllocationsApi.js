import { apiFetch } from "../../../shared/utils/api-client.js";

const parseResponse = async (response) => {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.detail || payload?.message || "Request failed");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
};

export const fetchAllocationsSummary = async (policyId) => {
  const query = policyId ? `?policyId=${encodeURIComponent(policyId)}` : "";
  const response = await apiFetch(`/api/v1/device-allocations/summary${query}`);
  const payload = await parseResponse(response);
  return payload.data;
};

export const fetchDepartmentReconciliation = async (policyId) => {
  const query = policyId ? `?policyId=${encodeURIComponent(policyId)}` : "";
  const response = await apiFetch(`/api/v1/device-allocations/reconciliation${query}`);
  const payload = await parseResponse(response);
  return payload.data;
};

export const fetchSlots = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") {
      params.set(key, String(val));
    }
  });
  const query = params.toString() ? `?${params.toString()}` : "";
  const response = await apiFetch(`/api/v1/device-allocations/slots${query}`);
  return parseResponse(response);
};

export const createSlot = async (slotData) => {
  const response = await apiFetch("/api/v1/device-allocations/slots", {
    method: "POST",
    body: JSON.stringify(slotData)
  });
  const payload = await parseResponse(response);
  return payload.data;
};

export const updateSlot = async (id, slotData) => {
  const response = await apiFetch(`/api/v1/device-allocations/slots/${id}`, {
    method: "PUT",
    body: JSON.stringify(slotData)
  });
  const payload = await parseResponse(response);
  return payload.data;
};

export const deleteSlot = async (id) => {
  const response = await apiFetch(`/api/v1/device-allocations/slots/${id}`, {
    method: "DELETE"
  });
  return parseResponse(response);
};

export const autoMatchSlot = async (id) => {
  const response = await apiFetch(`/api/v1/device-allocations/slots/${id}/auto-match`, {
    method: "POST"
  });
  const payload = await parseResponse(response);
  return payload.data;
};

export const fetchPackageTiers = async () => {
  const response = await apiFetch("/api/v1/device-allocations/tiers");
  const payload = await parseResponse(response);
  return payload.data;
};

export const createPackageTier = async (tierData) => {
  const response = await apiFetch("/api/v1/device-allocations/tiers", {
    method: "POST",
    body: JSON.stringify(tierData)
  });
  const payload = await parseResponse(response);
  return payload.data;
};

export const updatePackageTier = async (id, tierData) => {
  const response = await apiFetch(`/api/v1/device-allocations/tiers/${id}`, {
    method: "PUT",
    body: JSON.stringify(tierData)
  });
  const payload = await parseResponse(response);
  return payload.data;
};

export const deletePackageTier = async (id) => {
  const response = await apiFetch(`/api/v1/device-allocations/tiers/${id}`, {
    method: "DELETE"
  });
  return parseResponse(response);
};

export const fetchQuotaPolicies = async () => {
  const response = await apiFetch("/api/v1/device-allocations/policies");
  const payload = await parseResponse(response);
  return payload.data;
};

export const createQuotaPolicy = async (policyData) => {
  const response = await apiFetch("/api/v1/device-allocations/policies", {
    method: "POST",
    body: JSON.stringify(policyData)
  });
  const payload = await parseResponse(response);
  return payload.data;
};

export const updateQuotaPolicy = async (id, policyData) => {
  const response = await apiFetch(`/api/v1/device-allocations/policies/${id}`, {
    method: "PUT",
    body: JSON.stringify(policyData)
  });
  const payload = await parseResponse(response);
  return payload.data;
};

export const deleteQuotaPolicy = async (id) => {
  const response = await apiFetch(`/api/v1/device-allocations/policies/${id}`, {
    method: "DELETE"
  });
  return parseResponse(response);
};

export const fetchDepartments = async () => {
  const response = await apiFetch("/api/v1/device-allocations/departments");
  const payload = await parseResponse(response);
  return payload.data;
};

export const upsertDepartmentQuota = async (quotaData) => {
  const response = await apiFetch("/api/v1/device-allocations/department-quotas", {
    method: "POST",
    body: JSON.stringify(quotaData)
  });
  const payload = await parseResponse(response);
  return payload.data;
};

export const deleteDepartmentQuota = async (id) => {
  const response = await apiFetch(`/api/v1/device-allocations/department-quotas/${id}`, {
    method: "DELETE"
  });
  return parseResponse(response);
};
