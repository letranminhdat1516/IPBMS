import { toast } from 'sonner';

import api from '@/lib/api';
import { normalizePhoneTo84 } from '@/lib/utils';

import type { User } from '@/types/user';

import { getUserById } from '@/services/users';

/* ================= Types (tối thiểu) ================= */
type DashboardApiResponse = {
  totalUsers: number;
  totalCameras: number;
  totalEvents: number;
  totalSnapshots: number;
  cameraStats: { online: number; offline: number; maintenance: number };
  assignmentStats: { total_assignments: number; active_assignments: number };
  recentEvents: unknown[];
  dailySummaryStats: { todays_summaries: number; this_week_summaries: number };
  alertStats: { total_alerts: number; unread_alerts: number };
  quotaUsage: { total_used: number; total_limit: number; percentage_used: number };
};

export type DashboardOverview = {
  totalCustomers: number;
  newUsersInRange: number;
  newRegistrations: number;
  monitoredPatients: number;
  recentCustomers: {
    user_id: string | number;
    full_name: string;
    email?: string;
    phone_number?: string;
    created_at: string;
  }[];
  totalUsers?: number;
  totalCameras?: number;
  totalEvents?: number;
  totalSnapshots?: number;
  cameraStats?: DashboardApiResponse['cameraStats'];
  assignmentStats?: DashboardApiResponse['assignmentStats'];
  recentEvents?: DashboardApiResponse['recentEvents'];
  dailySummaryStats?: DashboardApiResponse['dailySummaryStats'];
  alertStats?: DashboardApiResponse['alertStats'];
  quotaUsage?: DashboardApiResponse['quotaUsage'];
};

export type ListResponse<T> = {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages?: number };
};

export type TimePoint = { date: string; value: number };
export type NewCustomerItem = {
  id: string | number;
  name?: string;
  phone?: string;
  created_at?: string;
  title?: string;
  date?: string;
};

export type RecentItem = {
  id?: string;
  title: string;
  amount?: number;
  date?: string;
  user_name?: string;
  user?: { full_name?: string };
  user_id?: string;
  plan?: unknown;
};

export // API response item type for payments
type PaymentApiItem = {
  payment_id?: string;
  user_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  payment_method?: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
  invoice_id?: string;
  subscription_id?: string;
};

/* ================= Dashboard Overview ================= */
async function getDashboardRaw(params: { from: string; to: string }) {
  return api.get<DashboardApiResponse>('/dashboard/overview', params);
}

export async function getDashboardOverview(params: { from: string; to: string }) {
  try {
    const r = await getDashboardRaw(params);
    return {
      totalCustomers: r.totalUsers,
      newUsersInRange: 0,
      newRegistrations: 0,
      monitoredPatients: 0,
      recentCustomers: [],
      totalUsers: r.totalUsers,
      totalCameras: r.totalCameras,
      totalEvents: r.totalEvents,
      totalSnapshots: r.totalSnapshots,
      cameraStats: r.cameraStats,
      assignmentStats: r.assignmentStats,
      recentEvents: r.recentEvents,
      dailySummaryStats: r.dailySummaryStats,
      alertStats: r.alertStats,
      quotaUsage: r.quotaUsage,
    } as DashboardOverview;
  } catch {
    // Fallback dev gọn
    const from = new Date(params.from);
    const to = new Date(params.to);
    const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
    const baseTotal = 1250;
    const newUsers = Math.min(Math.floor(45 / 7) * days, 100);
    const newRegs = Math.min(Math.floor(23 / 30) * days, 50);

    return {
      totalCustomers: baseTotal,
      newUsersInRange: newUsers,
      newRegistrations: newRegs,
      monitoredPatients: Math.floor(baseTotal * 0.07),
      recentCustomers: [
        {
          user_id: 'mock-1',
          full_name: 'Nguyễn Văn A',
          email: 'a@example.com',
          phone_number: '+84901234567',
          created_at: new Date().toISOString(),
        },
        {
          user_id: 'mock-2',
          full_name: 'Trần Thị B',
          email: 'b@example.com',
          phone_number: '+84909876543',
          created_at: new Date(Date.now() - 86_400_000).toISOString(),
        },
        {
          user_id: 'mock-3',
          full_name: 'Lê Văn C',
          email: 'c@example.com',
          phone_number: '+84905678901',
          created_at: new Date(Date.now() - 172_800_000).toISOString(),
        },
      ],
    };
  }
}

/* ================= Recent Sales (cần pagination) ================= */
export async function getRecentSales(params: {
  from: string;
  to: string;
  page?: number;
  limit?: number;
}): Promise<ListResponse<PaymentApiItem & { user?: User }>> {
  try {
    const full = await api.get<PaymentApiItem[]>(
      '/dashboard/recent-sales',
      {
        from: params.from,
        to: params.to,
        page: params.page ?? 1,
        limit: params.limit ?? 10,
      },
      { unwrapResponse: false }
    );

    let data: PaymentApiItem[] = [];
    let pagination = { total: 0, page: params.page ?? 1, limit: params.limit ?? 10 };

    if (Array.isArray(full)) {
      data = full as PaymentApiItem[];
      pagination = { total: data.length, page: params.page ?? 1, limit: params.limit ?? 10 };
    } else if (full && typeof full === 'object') {
      const wrapper = full as Record<string, unknown>;
      if (Array.isArray(wrapper.data)) data = wrapper.data as PaymentApiItem[];
      if (wrapper.pagination && typeof wrapper.pagination === 'object') {
        const p = wrapper.pagination as Record<string, unknown>;
        pagination = {
          total: Number(p.total ?? data.length ?? 0),
          page: Number(p.page ?? params.page ?? 1),
          limit: Number(p.limit ?? params.limit ?? 10),
        };
      } else {
        pagination = { total: data.length, page: params.page ?? 1, limit: params.limit ?? 10 };
      }
    }

    const items: (PaymentApiItem & { user?: User })[] = await Promise.all(
      data.map(async (d: PaymentApiItem) => {
        let userData;
        if (d.user_id) {
          try {
            userData = await getUserById(d.user_id);
          } catch {
            // Silently ignore user fetch errors
          }
        }

        return {
          ...d,
          user: userData,
        };
      })
    );

    return { items, pagination };
  } catch {
    toast.error('Không thể tải dữ liệu giao dịch gần đây.');
    // Return empty data on error
    return {
      items: [],
      pagination: { page: 1, limit: params.limit ?? 10, total: 0 },
    };
  }
}

/* ================= Report Requests ================= */
export async function getReportRequests(params: {
  from: string;
  to: string;
  page?: number;
  limit?: number;
}) {
  try {
    return await api.get<ListResponse<RecentItem>>('/dashboard/report-requests', params);
  } catch {
    toast.error('Không thể tải dữ liệu báo cáo & yêu cầu khách hàng.');
    return {
      items: [],
      pagination: { page: params.page ?? 1, limit: params.limit ?? 10, total: 0 },
    };
  }
}

/* ================= Report/Support Summary ================= */
type ReportRequestSummaryApi = {
  reports: { total: number; by_status: Record<string, number>; accepted_rate: number };
  supports: { total: number; by_status: Record<string, number>; processing_rate: number };
};
export type ReportRequestSummary = {
  reports: { total: number; byStatus: Record<string, number>; acceptedRate: number };
  supports: { total: number; byStatus: Record<string, number>; processingRate: number };
};

export async function getReportRequestsSummary(params: { from: string; to: string }) {
  try {
    const raw = await api.get<ReportRequestSummaryApi>(
      '/dashboard/report-requests/summary',
      params
    );
    return {
      reports: {
        total: raw?.reports?.total ?? 0,
        byStatus: raw?.reports?.by_status ?? {},
        acceptedRate: raw?.reports?.accepted_rate ?? 0,
      },
      supports: {
        total: raw?.supports?.total ?? 0,
        byStatus: raw?.supports?.by_status ?? {},
        processingRate: raw?.supports?.processing_rate ?? 0,
      },
    } satisfies ReportRequestSummary;
  } catch {
    return {
      reports: { total: 12, byStatus: { pending: 5, accepted: 4, rejected: 3 }, acceptedRate: 75 },
      supports: {
        total: 8,
        byStatus: { pending: 3, processing: 3, completed: 2 },
        processingRate: 62,
      },
    };
  }
}

/* ================= Patients Time-series ================= */
export async function getPatientsTimeSeries(params: {
  from: string;
  to: string;
  groupBy?: 'day' | 'week' | 'month';
}): Promise<TimePoint[]> {
  try {
    return await api.get<TimePoint[]>(
      '/dashboard/patients/time-series',
      params as unknown as Record<string, string>
    );
  } catch {
    return [
      { date: '2025-09-01', value: 12 },
      { date: '2025-09-02', value: 15 },
      { date: '2025-09-03', value: 18 },
      { date: '2025-09-04', value: 22 },
      { date: '2025-09-05', value: 25 },
      { date: '2025-09-06', value: 28 },
      { date: '2025-09-07', value: 32 },
    ];
  }
}

/* ================= New Customers (client paging) ================= */
export async function getNewCustomers(params: {
  from: string;
  to: string;
  page?: number;
  limit?: number;
}) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;

  const data = await getDashboardOverview({ from: params.from, to: params.to });
  const raw = data.recentCustomers ?? [];
  const sorted = [...raw].sort((a, b) => {
    const da = a?.created_at ? Date.parse(a.created_at) : 0;
    const db = b?.created_at ? Date.parse(b.created_at) : 0;
    return db - da;
  });

  const items: NewCustomerItem[] = sorted
    .slice((page - 1) * limit, (page - 1) * limit + limit)
    .map((c) => ({
      id: c.user_id,
      name: c.full_name,
      phone: normalizePhoneTo84(String(c.phone_number ?? '')),
      created_at: c.created_at,
      title: c.full_name,
      date: c.created_at,
    }));

  return {
    items,
    pagination: { page, limit, total: sorted.length },
  } as ListResponse<NewCustomerItem>;
}
