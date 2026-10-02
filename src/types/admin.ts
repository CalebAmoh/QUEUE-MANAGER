export type LogLevel = 'info' | 'warning' | 'error' | 'critical';
export type LogCategory = 'auth' | 'transaction' | 'system' | 'security' | 'api' | 'user';

export interface AuditLog {
  id: number;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  userId?: string;
  userName?: string;
  action: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  status: 'success' | 'failure';
  metadata?: Record<string, unknown>;
}

export interface TrafficEntry {
  id: number;
  timestamp: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  statusCode: number;
  responseTime: number;
  ipAddress: string;
  userAgent?: string;
  userId?: string;
  requestSize?: number;
  responseSize?: number;
  errorMessage?: string;
}

export type ServiceStatus = 'operational' | 'degraded' | 'down' | 'maintenance';
export type ServiceName = 'fingerprint_auth' | 'balance_inquiry' | 'account_updates' | 'statement_generation' | 'fund_transfers' | 'bill_payments' | 'cash_withdrawal' | 'cash_deposit' | 'check_deposits' | 'pin_reset' | 'fraud_reporting' | 'mfa_setup' | 'assistance' | 'receipt';

export interface Service {
  id: ServiceName;
  name: string;
  description: string;
  enabled: boolean;
  status: ServiceStatus;
  lastChecked: string;
  uptime: number;
  totalRequests: number;
  successRate: number;
  averageResponseTime: number;
}

export interface ServiceActivity {
  id: number;
  serviceId: ServiceName;
  serviceName: string;
  timestamp: string;
  action: string;
  status: 'success' | 'failure' | 'pending';
  duration: number;
  errorMessage?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export interface SystemSettings {
  maintenanceMode: boolean;
  sessionTimeout: number;
  serviceSelectionTimeout: number;
  transactionCompleteTimeout: number;
  adminSessionTimeout: number;
  enableBiometricCache: boolean;
  enableDetailedLogging: boolean;
  enableRateLimiting: boolean;
  rateLimitRequestsPerMinute: number;
  enableAuditLogging: boolean;
  enableTransactionNotifications: boolean;
  adsEnabled: boolean;
  landscapeAdsEnabled: boolean;
  portraitAdsEnabled: boolean;
}

export interface TrafficStats {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  requestsPerMinute: number;
  topEndpoints: { endpoint: string; count: number }[];
  statusCodeDistribution: { code: number; count: number }[];
  hourly: { hour: string; count: number; avgTime: number }[];
  methodDistribution: { method: string; count: number }[];
  timeRange: { start: string; end: string };
}

export interface AuditLogStats {
  total: number;
  last24h: number;
  byLevel: { level: string; count: number }[];
  byCategory: { category: string; count: number }[];
  byStatus: { status: string; count: number }[];
  hourly: { hour: string; count: number }[];
  daily: { day: string; count: number }[];
}

export interface ServiceActivityStats {
  total: number;
  avgDuration: number;
  successCount: number;
  failureCount: number;
  pendingCount: number;
  byService: { serviceId: string; serviceName: string; count: number; avgDuration: number }[];
  hourly: { hour: string; count: number; success: number; failure: number }[];
}

export interface DashboardStats {
  totalAuditLogs: number;
  totalTrafficEntries: number;
  activeServices: number;
  totalServices: number;
  recentErrors: number;
  averageSystemHealth: number;
  trafficLast24h: number;
  auditLast24h: number;
}

// Database-driven service model (from Prisma)
export interface DbService {
  id: number;
  serviceId: string;
  title: string;
  description: string;
  tag: string;
  enabled: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

// Self-service transaction row (from tb_self_serv_txn)
export interface SelfServTransaction {
  ticket_id: string | null;
  cr_account: string | null;
  dr_account: string | null;
  trans_type: string;
  amount: number;
  currency: string | null;
  doc_ref: string | null;
  is_served: string | null;
  served_by: string | null;
  created_at: string;
  posting_date: string | null;
  served_at: string | null;
  param1: string | null;
  param2: string | null;
  param3: string | null;
  param4: string | null;
  param5: string | null;
}

// Detailed health check response from /api/health/detailed
export type ComponentStatus = 'online' | 'degraded' | 'offline' | 'unknown';

export interface HealthComponent {
  status: ComponentStatus;
  latency?: number;
  message?: string;
}

export interface DetailedHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  responseTime: number;
  components: {
    database: HealthComponent;
    databaseTables: HealthComponent;
    apiServer: HealthComponent;
    biometricEngine: HealthComponent;
    authService: HealthComponent;
    services: HealthComponent;
  };
  services: { active: number; total: number };
}
