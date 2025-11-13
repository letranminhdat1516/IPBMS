import api from '@/lib/api';

import { Plan, PlanVersion, PlanWithVersions } from '@/types/plan';

export function getUserPlan(userId: string) {
  return api.get<{ plan: string }>(`/admin/users/${userId}/plan`);
}

export function updateUserPlan(userId: string, plan: string) {
  return api.put<{ updated: boolean; plan: string }>(`/admin/users/${userId}/plan`, { plan });
}

export function getPlans(params?: {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}) {
  return api.get<Plan[]>(`/admin/plans`, {
    ...params,
    limit: params?.limit || 100, // Default to API max limit if not specified
  });
}

// Backward compatibility - return just the data array
export function getPlansList(params?: {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}) {
  return api.get<Plan[]>(`/admin/plans`, params);
}

export function getPlanDetail(planId: string) {
  return api.get<Plan>(`/admin/plans/${encodeURIComponent(planId)}`);
}

export function createPlan(data: Omit<Plan, 'created_at' | 'updated_at'>) {
  return api.post<Plan>(`/admin/plans`, data);
}

export function updatePlan(planId: string, data: Partial<Omit<Plan, 'created_at' | 'updated_at'>>) {
  return api.put<Plan>(`/admin/plans/${encodeURIComponent(planId)}`, data);
}

export function activatePlan(planId: string) {
  return api.put<Plan>(`/admin/plans/${encodeURIComponent(planId)}`, { is_current: true });
}

export function deactivatePlan(planId: string) {
  return api.put<Plan>(`/admin/plans/${encodeURIComponent(planId)}`, { is_current: false });
}

export function deletePlan(planId: string) {
  return api.delete<{ deleted: boolean; plan_code: string }>(
    `/admin/plans/${encodeURIComponent(planId)}`
  );
}

export function deprecatePlan(planId: string, successorPlanCode?: string) {
  return api.patch<Plan>(`/admin/plans/${encodeURIComponent(planId)}/deprecate`, {
    successor_plan_code: successorPlanCode,
  });
}

export function archivePlan(planId: string, successorPlanCode?: string) {
  return api.patch<Plan>(`/admin/plans/${encodeURIComponent(planId)}/archive`, {
    successor_plan_code: successorPlanCode,
  });
}

// Utility functions for easier usage
export async function getAllPlansFlat(): Promise<Plan[]> {
  try {
    const response = await getPlansList({ limit: 100 }); // Get all plans (API max limit)
    return response || [];
  } catch (_error) {
    // Return empty array on error
    return [];
  }
}

export async function getPlanByCode(code: string): Promise<Plan | null> {
  try {
    const plans = await getAllPlansFlat();
    return plans.find((plan) => plan.code === code) || null;
  } catch (_error) {
    // Return null on error
    return null;
  }
}

export async function validatePlanExists(planCode: string): Promise<boolean> {
  const plan = await getPlanByCode(planCode);
  return plan !== null;
}

// Plan Versioning APIs
export function getPlansWithVersions(params?: {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  withVersions?: 'all' | 'current';
}) {
  return api.get<PlanWithVersions[]>('/admin/plans', params);
}

// Get all plans with all versions (convenience function)
export function getAllPlansWithAllVersions(params?: {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}) {
  return api.get<PlanWithVersions[]>('/admin/plans', {
    ...params,
    withVersions: 'all',
    limit: 100, // API max limit
  });
}

// Get all plans with current versions only (convenience function)
export function getAllPlansWithCurrentVersions(params?: {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}) {
  return api.get<PlanWithVersions[]>('/admin/plans', {
    ...params,
    withVersions: 'current',
  });
}

export function getPlanVersions(
  planCode: string,
  params?: {
    page?: number;
    limit?: number;
  }
) {
  return api.get<PlanVersion[]>(`/admin/plans/${encodeURIComponent(planCode)}/versions`, params);
}

export function getCurrentPlanVersion(planCode: string) {
  return api.get<PlanVersion>(`/admin/plans/${encodeURIComponent(planCode)}/versions/current`);
}

export function createPlanVersion(
  planCode: string,
  data: Omit<PlanVersion, 'id' | 'plan_code' | 'created_at' | 'updated_at'>
) {
  return api.post<PlanVersion>(`/admin/plans/${encodeURIComponent(planCode)}/versions`, data);
}

export function updatePlanVersion(
  versionId: string,
  data: Partial<Omit<PlanVersion, 'id' | 'plan_code' | 'created_at' | 'updated_at'>>
) {
  return api.put<PlanVersion>(`/admin/plans/versions/${versionId}`, data);
}

export function activatePlanVersion(versionId: string) {
  return api.post<{ activated: boolean; version: PlanVersion }>(
    `/admin/plans/versions/${versionId}/activate`
  );
}

export function deactivatePlanVersion(versionId: string) {
  return api.post<{ deactivated: boolean; version: PlanVersion }>(
    `/admin/plans/versions/${versionId}/deactivate`
  );
}
