import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import api from '@/lib/api';

import type { Patient } from '@/types/patient';
import type { PatientBehaviorBaseline } from '@/types/patient-behavior-baseline';
import type { PatientMedicalRecord } from '@/types/patient-medical-record';
import type { Report } from '@/types/report';

export type HealthReportSummary = {
  totalReports: number;
  pendingReports: number;
  completedReports: number;
  totalPatients: number;
  activePatients: number;
  criticalAlerts: number;
};

export type HealthReportItem = {
  report_id: number;
  report_type: string;
  patient_id?: number;
  patient_name?: string;
  report_time: string;
  status: string;
  content: string;
  severity?: string;
  diagnosis?: string;
  medications?: string;
};

export type HealthReportsResponse = {
  items: HealthReportItem[];
  pagination: { page: number; limit: number; total: number };
  summary?: HealthReportSummary;
};

// Reports API
export function getReports(params?: {
  page?: number;
  limit?: number;
  status?: string[];
  type?: string[];
  from?: string;
  to?: string;
}) {
  const query = params
    ? {
        page: params.page,
        limit: params.limit,
        status: params.status?.join(','),
        type: params.type?.join(','),
        from: params.from,
        to: params.to,
      }
    : undefined;
  return api.get<HealthReportsResponse>('/reports', query);
}

export function useReports(params?: {
  page?: number;
  limit?: number;
  status?: string[];
  type?: string[];
  from?: string;
  to?: string;
}) {
  return useQuery({
    queryKey: ['health-reports', params],
    queryFn: () => getReports(params),
  });
}

export function getReportById(reportId: number) {
  return api.get<Report>(`/reports/${reportId}`);
}

export function useReportById(reportId: number, enabled = true) {
  return useQuery({
    queryKey: ['health-report', reportId],
    queryFn: () => getReportById(reportId),
    enabled: Boolean(reportId) && enabled,
  });
}

// Patient Health Records
export function getPatientMedicalRecords(patientId?: number) {
  const url = patientId ? `/patients/${patientId}/medical-records` : '/patients/medical-records';
  return api.get<PatientMedicalRecord[]>(url);
}

export function usePatientMedicalRecords(patientId?: number) {
  return useQuery({
    queryKey: ['patient-medical-records', patientId],
    queryFn: () => getPatientMedicalRecords(patientId),
    enabled: !!patientId,
  });
}

export function getPatientBehaviorBaselines(patientId?: number) {
  const url = patientId
    ? `/patients/${patientId}/behavior-baselines`
    : '/patients/behavior-baselines';
  return api.get<PatientBehaviorBaseline[]>(url);
}

export function usePatientBehaviorBaselines(patientId?: number) {
  return useQuery({
    queryKey: ['patient-behavior-baselines', patientId],
    queryFn: () => getPatientBehaviorBaselines(patientId),
    enabled: !!patientId,
  });
}

// Patients API
export function getPatients(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  return api.get<{ items: Patient[]; pagination: { page: number; limit: number; total: number } }>(
    '/patients',
    params
  );
}

export function usePatients(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: () => getPatients(params),
  });
}

export function getPatientById(patientId: number) {
  return api.get<Patient>(`/patients/${patientId}`);
}

export function usePatientById(patientId: number, enabled = true) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => getPatientById(patientId),
    enabled: Boolean(patientId) && enabled,
  });
}

// Health Summary/Dashboard
export function getHealthSummary(params?: { from?: string; to?: string }) {
  return api.get<HealthReportSummary>('/health/reports/overview', params);
}

export function useHealthSummary(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['health-summary', params],
    queryFn: () => getHealthSummary(params),
  });
}

// Report Status Updates
export function updateReportStatus(reportId: number, status: string) {
  return api.patch<{ updated: boolean }>(`/reports/${reportId}/status`, { status });
}

export function useUpdateReportStatus(reportId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: string) => updateReportStatus(reportId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health-reports'] });
      qc.invalidateQueries({ queryKey: ['health-report', reportId] });
    },
  });
}
