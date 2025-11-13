import React from 'react';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';

import { getUserById } from '@/services/users';

export type CaregiverInvitation = {
  assignment_id: string;
  caregiver_id: string;
  patient_id?: string; // Optional for backward compatibility
  customer_id?: string; // New field used by backend
  is_active: boolean;
  assigned_at: string;
  unassigned_at?: string | null;
  assignment_notes?: string | null;
  caregiver_name?: string;
  patient_name?: string;
  caregiver_phone?: string;
  patient_phone?: string;
};

export type CaregiverInvitationStats = {
  total_caregiver_invitations: number;
  pending_caregiver_invitations: number;
  accepted_caregiver_invitations: number;
  rejected_caregiver_invitations: number;
  active_caregiver_invitations: number;
};

export type CreateCaregiverInvitationRequest = {
  caregiver_id: string;
  patient_id: string;
  assignment_notes?: string;
};

export type UpdateCaregiverInvitationRequest = {
  assignment_notes?: string;
  is_active?: boolean;
};

export function createCaregiverInvitation(body: CreateCaregiverInvitationRequest) {
  return api.post<CaregiverInvitation>('/caregiver-invitations', body);
}

// Cache for user data to avoid duplicate fetches
const userDataCache = new Map<
  string | number,
  { full_name?: string; username: string; phone_number?: string }
>();

// Helper function to fetch user data with caching
async function getCachedUserData(userId: string | number) {
  if (userDataCache.has(userId)) {
    return userDataCache.get(userId)!;
  }

  try {
    const userData = await getUserById(userId);
    const cachedData = {
      full_name: userData.full_name || undefined,
      username: userData.username,
      phone_number: userData.phone_number || undefined,
    };
    userDataCache.set(userId, cachedData);
    return cachedData;
  } catch (_error) {
    // Return minimal data if fetch fails
    return { username: `User ${userId}`, full_name: undefined, phone_number: undefined };
  }
}

// Optimized enrichment function using batch fetching
async function enrichCaregiverInvitationsOptimized(
  invitations: CaregiverInvitation[]
): Promise<CaregiverInvitation[]> {
  if (invitations.length === 0) return invitations;

  // Collect all unique user IDs to fetch
  const userIds = new Set<string | number>();
  invitations.forEach((invitation) => {
    if (invitation.caregiver_id) userIds.add(invitation.caregiver_id);
    const patientId = invitation.patient_id || invitation.customer_id;
    if (patientId) userIds.add(patientId);
  });

  // Fetch all user data in parallel
  const userDataPromises = Array.from(userIds).map((id) => getCachedUserData(id));
  const userDataResults = await Promise.all(userDataPromises);

  // Create a map for quick lookup
  const userDataMap = new Map<
    string | number,
    { full_name?: string; username: string; phone_number?: string }
  >();
  Array.from(userIds).forEach((id, index) => {
    userDataMap.set(id, userDataResults[index]);
  });

  // Enrich invitations with user data
  return invitations.map((invitation) => {
    const caregiverData = userDataMap.get(invitation.caregiver_id);
    const patientId = invitation.patient_id || invitation.customer_id;
    const patientData = patientId ? userDataMap.get(patientId) : undefined;

    return {
      ...invitation,
      caregiver_name: caregiverData?.full_name || caregiverData?.username,
      caregiver_phone: caregiverData?.phone_number || undefined,
      patient_name: patientData?.full_name || patientData?.username || undefined,
      patient_phone: patientData?.phone_number || undefined,
    };
  });
}

// Helper function to enrich multiple invitations (legacy - kept for compatibility)
async function enrichCaregiverInvitationsWithUserData(
  invitations: CaregiverInvitation[]
): Promise<CaregiverInvitation[]> {
  return enrichCaregiverInvitationsOptimized(invitations);
}

export function listCaregiverInvitations(params?: {
  caregiver_id?: string;
  patient_id?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}) {
  return api.get<CaregiverInvitation[]>('/caregiver-invitations', params);
}

// Enriched version that fetches user data to populate names and phones
export async function listCaregiverInvitationsEnriched(params?: {
  caregiver_id?: string;
  patient_id?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<CaregiverInvitation[]> {
  const invitations = await api.get<CaregiverInvitation[]>('/caregiver-invitations', params);
  return enrichCaregiverInvitationsWithUserData(invitations);
}

export function getCaregiverInvitationById(assignment_id: string) {
  return api.get<CaregiverInvitation>(
    `/caregiver-invitations/${encodeURIComponent(assignment_id)}`
  );
}

// Enriched version that fetches user data to populate names and phones
export async function getCaregiverInvitationByIdEnriched(
  assignment_id: string
): Promise<CaregiverInvitation> {
  const invitation = await api.get<CaregiverInvitation>(
    `/caregiver-invitations/${encodeURIComponent(assignment_id)}`
  );
  const enriched = await enrichCaregiverInvitationsOptimized([invitation]);
  return enriched[0];
}

export function updateCaregiverInvitation(
  assignment_id: string,
  body: UpdateCaregiverInvitationRequest
) {
  return api.put<CaregiverInvitation>(
    `/caregiver-invitations/${encodeURIComponent(assignment_id)}`,
    body
  );
}

export function deleteCaregiverInvitationById(assignment_id: string) {
  return api.delete<CaregiverInvitation>(
    `/caregiver-invitations/${encodeURIComponent(assignment_id)}`
  );
}

export function deleteCaregiverInvitations(params: {
  caregiver_id?: string;
  customer_id?: string;
}) {
  // Using DELETE with query string; backend returns { success, assignment }
  const query = new URLSearchParams();
  if (params.caregiver_id) query.set('caregiver_id', params.caregiver_id);
  if (params.customer_id) query.set('customer_id', params.customer_id);
  return api.delete<{ success: boolean; assignment: CaregiverInvitation | null }>(
    `/caregiver-invitations?${query.toString()}`
  );
}

export function acceptCaregiverInvitation(assignment_id: string, body?: { notes?: string }) {
  return api.post<CaregiverInvitation>(
    `/caregiver-invitations/${encodeURIComponent(assignment_id)}/accept`,
    body
  );
}

export function rejectCaregiverInvitation(assignment_id: string, body?: { notes?: string }) {
  return api.post<CaregiverInvitation>(
    `/caregiver-invitations/${encodeURIComponent(assignment_id)}/reject`,
    body
  );
}

export function getCaregiverInvitationStats() {
  return api.get<CaregiverInvitationStats>('/caregiver-invitations/stats');
}

export function useCaregiverInvitations(params?: {
  caregiver_id?: string;
  patient_id?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: ['caregiver-invitations', params],
    queryFn: () => listCaregiverInvitations(params),
    staleTime: 30_000,
  });
}

export function useCaregiverInvitationStats() {
  return useQuery({
    queryKey: ['caregiver-invitation-stats'],
    queryFn: getCaregiverInvitationStats,
    staleTime: 60_000,
  });
}

export function useCaregiverInvitation(assignment_id: string) {
  return useQuery({
    queryKey: ['caregiver-invitations', assignment_id],
    queryFn: () => getCaregiverInvitationById(assignment_id),
    staleTime: 30_000,
  });
}

export function useCreateCaregiverInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCaregiverInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caregiver-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['caregiver-invitations-enriched'] });
      queryClient.invalidateQueries({ queryKey: ['caregiver-invitation-stats'] });
    },
  });
}

export function useUpdateCaregiverInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      assignment_id,
      data,
    }: {
      assignment_id: string;
      data: UpdateCaregiverInvitationRequest;
    }) => updateCaregiverInvitation(assignment_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caregiver-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['caregiver-invitations-enriched'] });
      queryClient.invalidateQueries({ queryKey: ['caregiver-invitation-stats'] });
    },
  });
}

export function useDeleteCaregiverInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCaregiverInvitationById,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caregiver-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['caregiver-invitations-enriched'] });
      queryClient.invalidateQueries({ queryKey: ['caregiver-invitation-stats'] });
    },
  });
}

export function useAcceptCaregiverInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignment_id, data }: { assignment_id: string; data?: { notes?: string } }) =>
      acceptCaregiverInvitation(assignment_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caregiver-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['caregiver-invitations-enriched'] });
      queryClient.invalidateQueries({ queryKey: ['caregiver-invitation-stats'] });
    },
  });
}

export function useRejectCaregiverInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignment_id, data }: { assignment_id: string; data?: { notes?: string } }) =>
      rejectCaregiverInvitation(assignment_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caregiver-invitations'] });
      queryClient.invalidateQueries({ queryKey: ['caregiver-invitations-enriched'] });
      queryClient.invalidateQueries({ queryKey: ['caregiver-invitation-stats'] });
    },
  });
}

// Custom hook for prefetching user data
export function usePrefetchUserData(userIds: (string | number)[]) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (userIds.length === 0) return;

    // Prefetch user data in background
    userIds.forEach((userId) => {
      queryClient.prefetchQuery({
        queryKey: ['users', userId],
        queryFn: () => getUserById(userId),
        staleTime: 5 * 60 * 1000, // 5 minutes
      });
    });
  }, [userIds, queryClient]);
}

// Optimized React Query approach with enriched queryFn
export function useCaregiverInvitationsEnriched(params?: {
  caregiver_id?: string;
  patient_id?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
  search?: string;
}) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['caregiver-invitations-enriched', params],
    queryFn: async () => {
      const invitations = await listCaregiverInvitations(params);
      if (!invitations || invitations.length === 0) return [];

      // Collect all unique user IDs for prefetching
      const userIds: (string | number)[] = [];
      invitations.forEach((invitation) => {
        if (invitation.caregiver_id) userIds.push(invitation.caregiver_id);
        const patientId = invitation.patient_id || invitation.customer_id;
        if (patientId) userIds.push(patientId);
      });

      // Prefetch user data in background for future requests
      userIds.forEach((userId) => {
        queryClient.prefetchQuery({
          queryKey: ['users', userId],
          queryFn: () => getUserById(userId),
          staleTime: 5 * 60 * 1000, // 5 minutes
        });
      });

      // Enrich data using optimized batch fetching
      return enrichCaregiverInvitationsOptimized(invitations);
    },
    staleTime: 30_000,
  });
}

export function useCaregiverInvitationEnriched(assignment_id: string) {
  return useQuery({
    queryKey: ['caregiver-invitations-enriched', assignment_id],
    queryFn: () => getCaregiverInvitationByIdEnriched(assignment_id),
    staleTime: 30_000,
  });
}

export function invalidateAssignments(
  qc: ReturnType<typeof useQueryClient>,
  params?: {
    caregiver_id?: string;
    patient_id?: string;
  }
) {
  qc.invalidateQueries({ queryKey: ['caregiver-invitations', params] });
  qc.invalidateQueries({ queryKey: ['caregiver-invitations-enriched', params] });
}
