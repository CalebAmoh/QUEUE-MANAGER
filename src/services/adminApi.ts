import type {
  AuditLog,
  TrafficEntry,
  ServiceActivity,
  SystemSettings,
  TrafficStats,
  DashboardStats,
  DbService,
  SelfServTransaction,
  LogLevel,
  LogCategory,
  AuditLogStats,
  ServiceActivityStats,
  DetailedHealth,
} from '@/types/admin';
import { BACKEND_URL } from '@/config';

// Backend API base URL — try Vite proxy first, fall back to direct
const API_BASE = BACKEND_URL;

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const finalOptions = { ...options };
  
  const authDataStr = sessionStorage.getItem('adminAuth');
  if (authDataStr) {
    try {
      const parsed = JSON.parse(authDataStr);
      if (parsed.token) {
        finalOptions.headers = {
          ...options?.headers,
          'Authorization': `Bearer ${parsed.token}`
        };
      }
    } catch {
      // ignore
    }
  }

  try {
    const proxyRes = await fetch(path, finalOptions);
    const ct = proxyRes.headers.get('content-type') || '';
    if (proxyRes.ok && ct.includes('application/json')) {
      return proxyRes;
    }
  } catch {
    // proxy not available
  }
  const directRes = await fetch(`${API_BASE}${path}`, finalOptions);
  if (!directRes.ok) {
    throw new Error(`API error ${directRes.status}: ${directRes.statusText}`);
  }
  return directRes;
}

export const adminApi = {
  // ── Audit Logs (real API) ──
  getAuditLogs: async (filters?: {
    level?: LogLevel;
    category?: LogCategory;
    status?: 'success' | 'failure';
    limit?: number;
    offset?: number;
  }): Promise<{ logs: AuditLog[]; total: number }> => {
    const params = new URLSearchParams();
    if (filters?.level) params.set('level', filters.level);
    if (filters?.category) params.set('category', filters.category);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const res = await apiFetch(`/api/admin/audit-logs?${params}`);
    return res.json();
  },

  getAuditLogStats: async (): Promise<AuditLogStats> => {
    const res = await apiFetch('/api/admin/audit-logs/stats');
    return res.json();
  },

  // ── Traffic (real API) ──
  getTraffic: async (filters?: {
    method?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ entries: TrafficEntry[]; total: number }> => {
    const params = new URLSearchParams();
    if (filters?.method) params.set('method', filters.method);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const res = await apiFetch(`/api/admin/traffic?${params}`);
    return res.json();
  },

  getTrafficStats: async (): Promise<TrafficStats> => {
    const res = await apiFetch('/api/admin/traffic/stats');
    return res.json();
  },

  // ── Service Activity (real API) ──
  getServiceActivity: async (filters?: {
    serviceId?: string;
    status?: 'success' | 'failure' | 'pending';
    limit?: number;
    offset?: number;
  }): Promise<{ activities: ServiceActivity[]; total: number }> => {
    const params = new URLSearchParams();
    if (filters?.serviceId) params.set('serviceId', filters.serviceId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const res = await apiFetch(`/api/admin/service-activity?${params}`);
    return res.json();
  },

  getServiceActivityStats: async (): Promise<ServiceActivityStats> => {
    const res = await apiFetch('/api/admin/service-activity/stats');
    return res.json();
  },

  // ── Transactions / Ticket log ──
  getTransactions: async (filters?: {
    serviceId?: string;
    status?: string;
    isAssisted?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: SelfServTransaction[]; total: number }> => {
    const params = new URLSearchParams();
    if (filters?.serviceId) params.set('serviceId', filters.serviceId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.isAssisted !== undefined) params.set('isAssisted', String(filters.isAssisted));
    if (filters?.limit) params.set('limit', String(filters.limit));
    if (filters?.offset) params.set('offset', String(filters.offset));
    const res = await apiFetch(`/api/admin/transactions?${params}`);
    return res.json();
  },

  // ── Dashboard Stats (real API) ──
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await apiFetch('/api/admin/dashboard-stats');
    return res.json();
  },

  // ── Database-driven service APIs ──
  getSelfServices: async (): Promise<DbService[]> => {
    const res = await apiFetch('/api/admin/services/self-service');
    return res.json();
  },

  getAssistedServices: async (): Promise<DbService[]> => {
    const res = await apiFetch('/api/admin/services/assisted');
    return res.json();
  },

  toggleServiceEnabled: async (
    type: 'self-service' | 'assisted',
    id: number,
    enabled: boolean
  ): Promise<DbService> => {
    const res = await apiFetch(`/api/admin/services/${type}/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    return res.json();
  },

  // ── Settings (real API) ──
  getSystemSettings: async (): Promise<SystemSettings> => {
    const res = await apiFetch('/api/admin/settings');
    return res.json();
  },

  updateSystemSettings: async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    const res = await apiFetch('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  // ── Kiosk Live Status ──
  getKioskStatus: async (): Promise<{
    maintenanceMode: boolean;
    sessionTimeout: number;
    todayTransactions: number;
    activeServices: number;
    totalServices: number;
  }> => {
    const res = await apiFetch('/api/admin/kiosk-status');
    return res.json();
  },

  // ── Detailed Health Check ──
  getDetailedHealth: async (): Promise<DetailedHealth> => {
    const res = await apiFetch('/api/health/detailed');
    return res.json();
  },

  // ── Write an audit log entry (fire-and-forget safe) ──
  writeAuditLog: async (entry: {
    level?: 'info' | 'warning' | 'error' | 'critical';
    category?: 'auth' | 'transaction' | 'system' | 'security' | 'api' | 'user';
    action: string;
    details?: string;
    status?: 'success' | 'failure';
    userId?: string;
    userName?: string;
  }): Promise<void> => {
    try {
      await apiFetch('/api/admin/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch {
      // non-critical — never throw
    }
  },

  // ── Device-Branch mapping CRUD ──
  getDeviceBranches: async (): Promise<{ id: number; ipAddress: string; branchId: string; branchName: string; createdAt: string }[]> => {
    const res = await apiFetch('/api/admin/device-branch');
    const data = await res.json();
    if (!res.ok || (data && data.error)) {
      throw new Error(data?.error || `Error ${res.status}: Failed to fetch device branches`);
    }
    return Array.isArray(data) ? data : [];
  },

  createDeviceBranch: async (data: { ipAddress: string; branchId: string; branchName: string }): Promise<{ id: number; ipAddress: string; branchId: string; branchName: string; createdAt: string }> => {
    const res = await apiFetch('/api/admin/device-branch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok || (result && result.error)) {
      throw new Error(result?.error || `Error ${res.status}: Failed to register device branch`);
    }
    return result;
  },

  deleteDeviceBranch: async (id: number): Promise<{ success: boolean }> => {
    const res = await apiFetch(`/api/admin/device-branch/${id}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (!res.ok || (result && result.error)) {
      throw new Error(result?.error || `Error ${res.status}: Failed to delete device branch`);
    }
    return result;
  },

  // ── Authentication ──
  login: async (username: string, password: string): Promise<{ success: boolean; token: string; user: { username: string; role: string } }> => {
    const res = await apiFetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return res.json();
  },

  // ── XAuth (Staff360) — exchange opaque token for an admin session ──
  xauthLogin: async (token: string): Promise<{
    success: boolean;
    token: string;
    user: { username: string; role: string; staffId?: string; fullName?: string; email?: string };
  }> => {
    const res = await apiFetch('/api/admin/xauth/decode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return res.json();
  },
};
