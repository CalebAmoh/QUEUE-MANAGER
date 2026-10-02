import axios from 'axios';
import { SELF_SERVICE_API_URL, SDK_BASE_URL, BACKEND_URL, FRAUD_API_URL, STATEMENT_FORWARDED_FOR, FRAUD_DEVICE_IP, FRAUD_API_KEY } from '@/config';

const API_BASE_URL = SELF_SERVICE_API_URL;

// Backend server for activity logging (proxied via Vite in dev)
const LOG_API_BASE = BACKEND_URL;

/**
 * Log a service activity event to the admin backend.
 * Fire-and-forget — failures are swallowed so they never block the customer flow.
 */
export async function logServiceActivity(entry: {
  serviceId: string;
  serviceName?: string;
  action: string;
  status: 'success' | 'failure' | 'pending';
  duration?: number;
  errorMessage?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    // Try Vite proxy first, then direct
    await fetch('/api/service-activity/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).then(async (res) => {
      if (!res.ok) throw new Error('proxy failed');
      return res;
    });
  } catch {
    // Fallback to direct URL
    try {
      await fetch(`${LOG_API_BASE}/api/service-activity/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch {
      // Swallow — logging should never block the customer UX
      console.warn('Could not log service activity:', entry.action);
    }
  }
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

const localClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  }
});

// Balance Enquiry API — proxied through backend to avoid CORS
export const getAccountBalance = async (accountId: string) => {
  try {
    // Try relative URL (Vite proxy)
    const response = await localClient.get(`/api/proxy/balance/${accountId}`);
    return response.data;
  } catch (err) {
    // Fallback to direct port 9002 URL
    const directUrl = `${BACKEND_URL}/api/proxy/balance/${accountId}`;
    const response = await localClient.get(directUrl);
    return response.data;
  }
};

export interface StatementRequestPayload {
  accountId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  statementType?: string;
  userId?: string;
}

export const requestStatement = async (payload: StatementRequestPayload) => {
  const headers = {
    'x-api-key': import.meta.env.STATEMENT_API_KEY || 'self',
    'x-api-secret': import.meta.env.STATEMENT_API_SECRET || 'self',
    'x-forwarded-for': STATEMENT_FORWARDED_FOR,
  };


  try {
    const response = await localClient.post('/api/proxy/statement', payload, { headers });
    return response.data;
  } catch (err) {
    const directUrl = `${BACKEND_URL}/api/proxy/statement`;
    const response = await localClient.post(directUrl, payload, { headers });
    return response.data;
  }
};

export const getTransactionsWithBalanceDetails = async (accountId: string) => {
  const toDate = new Date().toISOString().split('T')[0];
  const limit = 5;
  const response = await apiClient.get(`/transactions/${accountId}/${toDate}/${limit}`);
  return response.data;
};

export const getMonthlyTransactions = async (accountId: string) => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const fromDate = firstDayOfMonth.toISOString().split('T')[0];
  const toDate = lastDayOfMonth.toISOString().split('T')[0];
  const limit = 100;
  const response = await apiClient.get(`/transactions/${accountId}/${fromDate}/${toDate}/${limit}`);
  return response.data;
};

export interface QueueTicketPayload {
  serviceId: string;
  customerName: string;
  accountNumber: string;
  amount?: number;
  queueNumber?: string;
  transactionId: string;
}

export const pushTicketToQueue = async (payload: QueueTicketPayload) => {
  try {
    // Call the local consolidated backend instead of the remote IP
    const response = await fetch('/api/self-service/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        branch_id: 'MAIN' // Default to MAIN as requested
      }),
    });

    if (!response.ok) throw new Error(`Queueing failed: ${response.status}`);

    const data = await response.json();
    console.log('Ticket pushed to local queue:', data);
    return data;
  } catch (error) {
    console.error('Failed to push ticket to local queue:', error);
    return null;
  }
};

export const depositAmount = async (accountId: string, amount: number) => {
  const response = await apiClient.put(
    `/account/${accountId}/deposit`,
    { amount },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
  return response.data;
};

// --- Fraud Reporting API ---

const fraudApiClient = axios.create({
  baseURL: FRAUD_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': FRAUD_API_KEY,
  },
});

export interface FraudReportPayload {
  accountNumber: string;
  description: string;
  other: string;
  pinCode: string;
  serviceCode: string;
  // Additional required fields
  blockCard?: boolean;
}

export interface FraudReportResponse {
  responseCode: string;
  message?: string;
  data?: unknown;
  errors?: string[];
}

export const submitFraudReport = async (payload: FraudReportPayload): Promise<FraudReportResponse> => {
  try {
    const requestBody = {
      accountNumber: payload.accountNumber,
      authToken: 'KIOSK_SESSION',
      description: payload.description,
      other: payload.other,
      pinCode: payload.pinCode,
      serviceCode: payload.serviceCode,
      // Required device/session fields
      username: payload.accountNumber,
      entrySource: 'SELF_SERVICE_KIOSK',
      channel: 'KIOSK',
      country: 'GH',
      deviceId: 'KIOSK-001',
      deviceName: 'SecureBank Self-Service Kiosk',
      deviceIp: FRAUD_DEVICE_IP,
      brand: 'SecureBank',
      manufacturer: 'SecureBank Systems',
    };

    const response = await fraudApiClient.post('/customerEnquiry', requestBody);
    console.log('Fraud report submitted:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to submit fraud report:', error);
    const err = error as Record<string, unknown>;
    const errData = (err?.response as Record<string, unknown>)?.data as Record<string, unknown>;
    // Surface specific validation errors if available
    const errors = errData?.errors as string[] | undefined;
    if (errors?.length) {
      throw new Error(errors.join(', '));
    }
    throw new Error((errData?.message as string) || (err.message as string) || 'Failed to submit fraud report');
  }
};