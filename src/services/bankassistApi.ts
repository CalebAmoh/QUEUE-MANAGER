import { Ticket, Office, Ad } from '@/types/queue';
import { BACKEND_URL } from '@/config';

// Use environment variable for backend URL, fallback to current host if not set

// API base URL for standard requests
export const getApiBaseUrl = () => {
  if (import.meta.env.DEV) {
    // In development, use relative URL so Vite proxy handles it
    return '/api/self-service';
  }
  // In production, use the configured backend URL
  return `${BACKEND_URL}/api/self-service`;
};

// Base URL for media files and uploads
export const getMediaBaseUrl = () => {
  if (import.meta.env.DEV) {
    // In development, use relative URL so Vite proxy handles it
    return '';
  }
  // In production, use the configured backend URL
  return BACKEND_URL;
};

// when running locally we use Vite proxy so frontend can call relative URLs
const BASE_URL = getApiBaseUrl();

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (!(options?.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      ...headers,
      ...(options?.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    let errorMsg = `API error: ${res.status}`;
    try {
      const errorJson = await res.json();
      if (errorJson.error) errorMsg = errorJson.error;
      else if (errorJson.message) errorMsg = errorJson.message;
    } catch(e) {
      // Intentionally ignore JSON parsing errors for text responses
    }
    throw new Error(errorMsg);
  }

  const json = await res.json();
  return json.data;
}

export const api = {
  getTickets: (branch_id?: string) => request<Ticket[]>(branch_id ? `/tickets?branch_id=${encodeURIComponent(branch_id)}` : '/tickets'),
  getWaitingTickets: (branch_id?: string) => request<Ticket[]>(branch_id ? `/queue/waiting?branch_id=${encodeURIComponent(branch_id)}` : '/queue/waiting'),
  getSkippedTickets: (branch_id?: string) => request<Ticket[]>(branch_id ? `/queue/skipped?branch_id=${encodeURIComponent(branch_id)}` : '/queue/skipped'),
  getOffices: (branch_id?: string) => request<Office[]>(branch_id ? `/offices?branch_id=${encodeURIComponent(branch_id)}` : '/offices'),
  createOffice: (data: Partial<Office>) =>
    request<Office>('/offices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  callTicket: (id: number, officeId: number, servedBy: string) =>
    request<Ticket>(`/tickets/${id}/call`, {
      method: 'PATCH',
      body: JSON.stringify({ officeId, servedBy }),
    }),
  startService: (id: number) =>
    request<Ticket>(`/tickets/${id}/start`, { method: 'PATCH', body: '{}' }),
  completeService: (id: number, servedBy: string) =>
    request<Ticket>(`/tickets/${id}/complete`, { method: 'PATCH', body: JSON.stringify({ servedBy }) }),
  skipTicket: (id: number) =>
    request<Ticket>(`/tickets/${id}/skip`, { method: 'PATCH', body: '{}' }),
  recallTicket: (id: number) =>
    request<Ticket>(`/tickets/${id}/recall`, { method: 'PATCH', body: '{}' }),
  cancelTicket: (id: number, servedBy: string) =>
    request<Ticket>(`/tickets/${id}/cancel`, { method: 'PATCH', body: JSON.stringify({ servedBy }) }),

  updateOfficeStatus: (id: number, status: Office['status'], occupiedBy?: string | null) =>
    request<Office>(`/offices/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, occupiedBy }),
    }),

  getTellerActivities: (username: string) =>
    request<string[]>(`/teller-activities/${encodeURIComponent(username)}`),

  getBranches: () => request<{ actualCode: string; subCode: string | null; description: string }[]>('/branches'),
  getBranchInfo: (code: string) => request<{ code: string; description: string }>(`/branches/${encodeURIComponent(code)}`),

  updateOfficeServices: (id: number, services: string[]) =>
    request<Office>(`/offices/${id}/services`, {
      method: 'PATCH',
      body: JSON.stringify({ services }),
    }),

  updateOffice: (id: number, data: { name: string; deskNumber: string }) =>
    request<Office>(`/offices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getAds: () => request<Ad[]>('/ads'),
  uploadAd: (formData: FormData) =>
    request<Ad>('/ads', {
      method: 'POST',
      body: formData,
      // Fetch handles FormData without setting Content-Type header manually if we don't spread headers
    }),
  updateAd: (id: number, data: { display_type?: 'landscape' | 'portrait'; active?: boolean; title?: string } | 'landscape' | 'portrait') =>
    request<Ad>(`/ads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(typeof data === 'string' ? { display_type: data } : data),
    }),
  toggleAdActive: (id: number, active: boolean) =>
    request<Ad>(`/ads/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ active }),
    }),
  deleteAd: (id: number) =>
    request<void>(`/ads/${id}`, { method: 'DELETE' }),
  deleteOffice: (id: number) =>
    request<void>(`/offices/${id}`, { method: 'DELETE' }),
};
