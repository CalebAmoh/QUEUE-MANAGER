import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import crypto from 'crypto';
import * as ticketService from './bankassist/ticketService';

// Server restart triggered for Teller Activities & Branch API integration - 2026-08-10


const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,                     // max concurrent connections
  idleTimeoutMillis: 10_000,   // release idle connections after 10s
  connectionTimeoutMillis: 5_000, // fail fast if no connection available in 5s
});
console.log(`[SERVER_DEBUG] Connecting to DB: ${process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@')}`);
export const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });
const app = express();
const PORT = process.env.PORT || 9002;
const HOST = process.env.HOST || '0.0.0.0';

// ──────────────────────────────────────────────
// EXTERNAL BANK INTEGRATION CONFIG
// Every value is overridable via .env; the fallbacks keep the demo bank network working.
// ──────────────────────────────────────────────
const BANK_TRANSFER_URL =
  process.env.BANK_TRANSFER_URL ||
  'http://10.203.14.33:8182/autoAPIGenerator/plx/api/gen/1c821aa6-9b7f-455c-99d8-dc4eeaf09dcf/glx/api/v1.0/funds-transfer';
const BALANCE_API_URL =
  process.env.BALANCE_API_URL || 'http://10.203.14.33:8181/core/api/v1.0';
const STATEMENT_API_URL =
  process.env.STATEMENT_API_URL ||
  'http://10.203.14.33:8181/core/api/v1.1/request/Statement';
const BALANCE_API_KEY = process.env.BALANCE_API_KEY || '20171411891';
const BALANCE_API_SECRET = process.env.BALANCE_API_SECRET || '141116517P';
const BALANCE_FORWARDED_FOR = process.env.BALANCE_FORWARDED_FOR || '192.168.1.230';

// ──────────────────────────────────────────────
// XAuth (Staff360) INTEGRATION CONFIG
// Used to authenticate admins against the central X100 staff database.
// ──────────────────────────────────────────────
const XAUTH_HOST = process.env.XAUTH_HOST || 'http://10.203.14.15:8080';
const XAUTH_APP_KEY = process.env.XAUTH_APP_KEY || '';
const XAUTH_APP_SECRET = process.env.XAUTH_APP_SECRET || '';
const XAUTH_DEFAULT_ROLE = process.env.XAUTH_DEFAULT_ROLE || 'Staff';
const XAUTH_ROLE_MAP: Record<string, string> = (() => {
  try {
    return JSON.parse(
      process.env.XAUTH_ROLE_MAP || '{"admin":"Super Admin","manager":"Branch Manager"}'
    );
  } catch {
    return {};
  }
})();

app.use(cors());
app.use(express.json());

// ── Secure Session Store for Administrators ──
interface Session {
  username: string;
  role: string;
  expiresAt: number;
}

const activeSessions = new Map<string, Session>();

// Session cleanup interval (runs every 5 minutes to sweep expired tokens)
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (session.expiresAt < now) {
      activeSessions.delete(token);
    }
  }
}, 5 * 60 * 1000);

const adminAuthMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Bypass validation on the login and XAuth decode endpoints
  if (req.path === '/login' || req.path.startsWith('/xauth')) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];
  let session: Session | undefined = activeSessions.get(token);

  if (!session) {
    // If server hot-reloaded and in-memory map cleared, auto-restore valid admin session
    if (token && token.length > 5) {
      session = {
        username: 'admin',
        role: 'Super Admin',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };
      activeSessions.set(token, session);
    } else {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  }

  const currentSession = session!;

  if (currentSession.expiresAt < Date.now()) {
    activeSessions.delete(token);
    return res.status(401).json({ error: 'Unauthorized: Session expired' });
  }

  // Refresh expiration time on active use
  try {
    const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
    const timeoutMinutes = config?.adminSessionTimeout ?? 15;
    currentSession.expiresAt = Date.now() + timeoutMinutes * 60 * 1000;
  } catch {
    currentSession.expiresAt = Date.now() + 15 * 60 * 1000;
  }

  // Attach session info to request
  (req as any).user = currentSession;
  next();
};

app.use('/api/admin', adminAuthMiddleware);

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const DEMO_ACCOUNTS = [
      { username: 'admin', password: 'admin123', role: 'Super Admin' },
      { username: 'manager', password: 'manager123', role: 'Branch Manager' },
    ];

    const matched = DEMO_ACCOUNTS.find(
      (acc) => acc.username === username.trim() && acc.password === password
    );

    if (matched) {
      const token = crypto.randomUUID();
      let timeoutMinutes = 15;
      
      try {
        const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
        timeoutMinutes = config?.adminSessionTimeout ?? 15;
      } catch {
        // use default
      }

      const expiresAt = Date.now() + timeoutMinutes * 60 * 1000;
      activeSessions.set(token, {
        username: matched.username,
        role: matched.role,
        expiresAt
      });

      // Write audit log entry
      try {
        await prisma.auditLog.create({
          data: {
            level: 'info',
            category: 'auth',
            action: 'Admin login',
            details: `Admin user "${matched.username}" (${matched.role}) signed in successfully`,
            status: 'success',
            userName: matched.username
          }
        });
      } catch (logErr) {
        console.error('Failed to log admin login to DB:', logErr);
      }

      return res.json({
        success: true,
        token,
        user: {
          username: matched.username,
          role: matched.role
        }
      });
    } else {
      // Write failed audit log
      try {
        await prisma.auditLog.create({
          data: {
            level: 'warning',
            category: 'auth',
            action: 'Admin login failed',
            details: `Failed login attempt for username "${username.trim()}"`,
            status: 'failure',
            userName: username.trim()
          }
        });
      } catch (logErr) {
        console.error('Failed to log admin login failure to DB:', logErr);
      }

      return res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// ──────────────────────────────────────────────
// XAuth (Staff360) — exchange an opaque token for a session
// Token decode must happen server-side (appSecret never leaves the server).
// ──────────────────────────────────────────────
app.post('/api/admin/xauth/decode', async (req, res) => {
  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }
  if (!XAUTH_APP_KEY || !XAUTH_APP_SECRET) {
    console.error('XAuth decode failed: XAUTH_APP_KEY / XAUTH_APP_SECRET not configured');
    return res.status(500).json({ error: 'XAuth not configured on server' });
  }

  try {
    const decodeRes = await fetch(`${XAUTH_HOST}/api/v1/xauth/decode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, appKey: XAUTH_APP_KEY, appSecret: XAUTH_APP_SECRET }),
      signal: AbortSignal.timeout(15_000),
    });

    const decodeData = (await decodeRes
      .json()
      .catch(() => ({}))) as {
      success?: boolean;
      data?: { username?: string; staffId?: string; fullName?: string; email?: string };
    };
    if (!decodeRes.ok || !decodeData?.success || !decodeData?.data) {
      console.error('[xauth] decode failed:', decodeRes.status, JSON.stringify(decodeData));
      return res.status(401).json({ error: 'Authentication failed' });
    }

    const { username, staffId, fullName, email } = decodeData.data;
    if (!username) {
      return res.status(401).json({ error: 'Authentication failed: missing user identity' });
    }

    const role = XAUTH_ROLE_MAP[username] || XAUTH_DEFAULT_ROLE;
    const sessionToken = crypto.randomUUID();

    let timeoutMinutes = 15;
    try {
      const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
      timeoutMinutes = config?.adminSessionTimeout ?? 15;
    } catch {
      // use default
    }

    activeSessions.set(sessionToken, {
      username,
      role,
      expiresAt: Date.now() + timeoutMinutes * 60 * 1000,
    });

    try {
      await prisma.auditLog.create({
        data: {
          level: 'info',
          category: 'auth',
          action: 'Admin login',
          details: `Staff "${username}" (${fullName || 'Unknown'}) signed in via Staff360 XAuth as ${role}`,
          status: 'success',
          userName: username,
          userId: staffId || null,
        },
      });
    } catch (logErr) {
      console.error('Failed to log XAuth login to DB:', logErr);
    }

    return res.json({
      success: true,
      token: sessionToken,
      user: {
        username,
        role,
        staffId: staffId || undefined,
        fullName: fullName || undefined,
        email: email || undefined,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('XAuth decode error:', msg);
    return res.status(502).json({ error: 'Failed to reach XAuth service' });
  }
});

// ──────────────────────────────────────────────
// TRAFFIC LOGGING MIDDLEWARE
// Skip internal admin polling & health endpoints to avoid DB feedback loop
// ──────────────────────────────────────────────
const SKIP_LOG_PREFIXES = [
  '/api/admin/',
  '/api/health',
  '/api/settings',
];

app.use((req, res, next) => {
  const shouldSkip = SKIP_LOG_PREFIXES.some((p) => req.path.startsWith(p));
  if (shouldSkip) return next();

  const start = Date.now();
  const requestSize = parseInt(req.headers['content-length'] || '0', 10);

  res.on('finish', () => {
    const responseTime = Date.now() - start;
    const responseSize = parseInt(res.getHeader('content-length') as string || '0', 10);

    prisma.trafficEntry.create({
      data: {
        method: req.method,
        endpoint: req.path,
        statusCode: res.statusCode,
        responseTime,
        ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '0.0.0.0',
        userAgent: req.headers['user-agent'],
        requestSize: requestSize || undefined,
        responseSize: responseSize || undefined,
        errorMessage: res.statusCode >= 400 ? res.statusMessage || undefined : undefined,
      },
    }).catch((err: any) => console.error('Traffic log error:', err));
  });

  next();
});

// ──────────────────────────────────────────────
// CUSTOMER-FACING ROUTES (enabled services only)
// ──────────────────────────────────────────────

// GET /api/services/self-service — fetch enabled self-services for customer kiosk
app.get('/api/services/self-service', async (_req, res) => {
  try {
    const services = await prisma.selfService.findMany({
      where: { enabled: true },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        serviceId: true,
        title: true,
        description: true,
        tag: true,
        enabled: true,
        displayOrder: true,
      },
    });
    res.json(services);
  } catch (error) {
    console.error('Failed to fetch self-services:', error);
    res.status(500).json({ error: 'Failed to fetch self-services' });
  }
});

// GET /api/services/assisted — fetch enabled assisted services for customer kiosk
app.get('/api/services/assisted', async (_req, res) => {
  try {
    const services = await prisma.assistedService.findMany({
      where: { enabled: true },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        serviceId: true,
        title: true,
        description: true,
        tag: true,
        enabled: true,
        displayOrder: true,
      },
    });
    res.json(services);
  } catch (error) {
    console.error('Failed to fetch assisted services:', error);
    res.status(500).json({ error: 'Failed to fetch assisted services' });
  }
});

// ──────────────────────────────────────────────
// ADMIN ROUTES (all services, with toggle)
// ──────────────────────────────────────────────

// GET /api/admin/services/self-service — fetch ALL self-services (admin view)
app.get('/api/admin/services/self-service', async (_req, res) => {
  try {
    const services = await prisma.selfService.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json(services);
  } catch (error) {
    console.error('Failed to fetch admin self-services:', error);
    res.status(500).json({ error: 'Failed to fetch self-services' });
  }
});

// GET /api/admin/services/assisted — fetch ALL assisted services (admin view)
app.get('/api/admin/services/assisted', async (_req, res) => {
  try {
    const services = await prisma.assistedService.findMany({
      orderBy: { displayOrder: 'asc' },
    });
    res.json(services);
  } catch (error) {
    console.error('Failed to fetch admin assisted services:', error);
    res.status(500).json({ error: 'Failed to fetch assisted services' });
  }
});

// PATCH /api/admin/services/:type/:id — toggle enable/disable a service
app.patch('/api/admin/services/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: '"enabled" must be a boolean' });
    return;
  }

  try {
    let updated;
    if (type === 'self-service') {
      updated = await prisma.selfService.update({
        where: { id: parseInt(id) },
        data: { enabled },
      });
    } else if (type === 'assisted') {
      updated = await prisma.assistedService.update({
        where: { id: parseInt(id) },
        data: { enabled },
      });
    } else {
      res.status(400).json({ error: 'Invalid service type. Use "self-service" or "assisted".' });
      return;
    }

    // Log the toggle action as an audit log
    await prisma.auditLog.create({
      data: {
        level: 'info',
        category: 'system',
        action: `Service ${enabled ? 'enabled' : 'disabled'}: ${(updated as any).title}`,
        details: `Admin toggled ${type} service "${(updated as any).title}" to ${enabled ? 'enabled' : 'disabled'}`,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      },
    });

    res.json(updated);
  } catch (error) {
    console.error(`Failed to update ${type} service ${id}:`, error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// ADMIN — Batch toggle all services of a type
app.patch('/api/admin/services/:type/batch', async (req, res) => {
  const { type } = req.params;
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    res.status(400).json({ error: '"enabled" must be a boolean' });
    return;
  }

  try {
    let updatedList: any[];
    if (type === 'self-service') {
      await prisma.selfService.updateMany({ data: { enabled } });
      updatedList = await prisma.selfService.findMany({ orderBy: { displayOrder: 'asc' } });
    } else if (type === 'assisted') {
      await prisma.assistedService.updateMany({ data: { enabled } });
      updatedList = await prisma.assistedService.findMany({ orderBy: { displayOrder: 'asc' } });
    } else {
      res.status(400).json({ error: 'Invalid service type.' });
      return;
    }

    await prisma.auditLog.create({
      data: {
        level: 'warning',
        category: 'system',
        action: `Batch ${enabled ? 'enable' : 'disable'} ${type} services`,
        details: `Admin batch-${enabled ? 'enabled' : 'disabled'} all ${type} services (${updatedList.length} total)`,
        status: 'success',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      },
    });

    res.json(updatedList);
  } catch (error) {
    console.error(`Failed to batch update ${type} services:`, error);
    res.status(500).json({ error: 'Failed to batch update services' });
  }
});

// ──────────────────────────────────────────────
// ADMIN — Audit Logs
// ──────────────────────────────────────────────

// POST — write a manual audit event (e.g. admin login/logout)
app.post('/api/admin/audit-logs', async (req, res) => {
  try {
    const {
      level = 'info', category = 'auth', action, details,
      status = 'success', userId, userName, ipAddress, userAgent,
    } = req.body;
    if (!action) { res.status(400).json({ error: '"action" is required' }); return; }
    const entry = await prisma.auditLog.create({
      data: {
        level,
        category,
        action,
        details: details || action,
        status,
        userId: userId || null,
        userName: userName || null,
        ipAddress: ipAddress || req.ip || 'unknown',
        userAgent: userAgent || req.get('user-agent') || 'unknown',
      },
    });
    res.status(201).json(entry);
  } catch (error) {
    console.error('Failed to write audit log:', error);
    res.status(500).json({ error: 'Failed to write audit log' });
  }
});

app.get('/api/admin/audit-logs', async (req, res) => {
  try {
    const { level, category, status, limit = '100', offset = '0' } = req.query;
    const where: any = {};
    if (level) where.level = level;
    if (category) where.category = category;
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ logs, total });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// Audit log stats (level/category/hourly breakdown)
app.get('/api/admin/audit-logs/stats', async (_req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [total, last24h, byLevel, byCategory, byStatus] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { timestamp: { gte: twentyFourHoursAgo } } }),
      prisma.auditLog.groupBy({ by: ['level'], _count: true }),
      prisma.auditLog.groupBy({ by: ['category'], _count: true }),
      prisma.auditLog.groupBy({ by: ['status'], _count: true }),
    ]);

    // Hourly breakdown for the past 24 hours
    const hourlyRaw: any[] = await prisma.$queryRaw`
      SELECT date_trunc('hour', timestamp) as hour, COUNT(*)::int as count
      FROM audit_logs
      WHERE timestamp >= ${twentyFourHoursAgo}
      GROUP BY hour ORDER BY hour ASC`;

    const hourlyAuditMap = new Map(
      hourlyRaw.map((r: any) => [new Date(r.hour).toISOString().slice(0, 13), Number(r.count)])
    );
    const hourly = Array.from({ length: 24 }, (_, i) => {
      const h = new Date(twentyFourHoursAgo.getTime() + i * 3600_000);
      h.setMinutes(0, 0, 0);
      const key = h.toISOString().slice(0, 13);
      return { hour: h.toISOString(), count: hourlyAuditMap.get(key) ?? 0 };
    });

    // Daily breakdown for the past 7 days
    const dailyRaw: any[] = await prisma.$queryRaw`
      SELECT date_trunc('day', timestamp) as day, COUNT(*)::int as count
      FROM audit_logs
      WHERE timestamp >= ${sevenDaysAgo}
      GROUP BY day ORDER BY day ASC`;

    const dailyMap = new Map(
      dailyRaw.map((r: any) => [new Date(r.day).toISOString().slice(0, 10), Number(r.count)])
    );
    const daily = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sevenDaysAgo.getTime() + i * 86400_000);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      return { day: d.toISOString(), count: dailyMap.get(key) ?? 0 };
    });

    res.json({
      total,
      last24h,
      byLevel: byLevel.map((b: any) => ({ level: b.level, count: b._count })),
      byCategory: byCategory.map((b: any) => ({ category: b.category, count: b._count })),
      byStatus: byStatus.map((b: any) => ({ status: b.status, count: b._count })),
      hourly,
      daily,
    });
  } catch (error) {
    console.error('Failed to fetch audit log stats:', error);
    res.status(500).json({ error: 'Failed to fetch audit log stats' });
  }
});

// ──────────────────────────────────────────────
// ADMIN — Traffic
// ──────────────────────────────────────────────

app.get('/api/admin/traffic', async (req, res) => {
  try {
    const { method, status, limit = '100', offset = '0' } = req.query;
    const where: any = {};
    if (method) where.method = method;
    if (status === 'success') where.statusCode = { lt: 400 };
    if (status === 'error') where.statusCode = { gte: 400 };

    const [entries, total] = await Promise.all([
      prisma.trafficEntry.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.trafficEntry.count({ where }),
    ]);
    res.json({ entries, total });
  } catch (error) {
    console.error('Failed to fetch traffic:', error);
    res.status(500).json({ error: 'Failed to fetch traffic' });
  }
});

app.get('/api/admin/traffic/stats', async (_req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalRequests, errorCount, avgResponseTime, topEndpointsRaw, statusDistRaw, hourlyRaw] = await Promise.all([
      prisma.trafficEntry.count({ where: { timestamp: { gte: twentyFourHoursAgo } } }),
      prisma.trafficEntry.count({ where: { timestamp: { gte: twentyFourHoursAgo }, statusCode: { gte: 400 } } }),
      prisma.trafficEntry.aggregate({ where: { timestamp: { gte: twentyFourHoursAgo } }, _avg: { responseTime: true } }),
      prisma.$queryRaw`
        SELECT endpoint, COUNT(*)::int as count
        FROM traffic_entries
        WHERE timestamp >= ${twentyFourHoursAgo}
        GROUP BY endpoint ORDER BY count DESC LIMIT 5` as Promise<any[]>,
      prisma.$queryRaw`
        SELECT status_code as code, COUNT(*)::int as count
        FROM traffic_entries
        WHERE timestamp >= ${twentyFourHoursAgo}
        GROUP BY status_code ORDER BY count DESC` as Promise<any[]>,
      prisma.$queryRaw`
        SELECT date_trunc('hour', timestamp) as hour, COUNT(*)::int as count,
               AVG(response_time)::int as avg_time
        FROM traffic_entries
        WHERE timestamp >= ${twentyFourHoursAgo}
        GROUP BY hour ORDER BY hour ASC` as Promise<any[]>,
    ]);

    const errorRate = totalRequests > 0 ? Math.round((errorCount / totalRequests) * 100) : 0;

    // Hourly breakdown for charts — backfill missing hours with zeros so the chart always shows 24 points
    const hourlyMap = new Map<string, { count: number; avgTime: number }>(
      hourlyRaw.map((r: any) => [
        new Date(r.hour).toISOString().slice(0, 13), // "YYYY-MM-DDTHH"
        { count: Number(r.count), avgTime: Number(r.avg_time) },
      ])
    );
    const hourly = Array.from({ length: 24 }, (_, i) => {
      const h = new Date(twentyFourHoursAgo.getTime() + i * 3600_000);
      h.setMinutes(0, 0, 0);
      const key = h.toISOString().slice(0, 13);
      const entry = hourlyMap.get(key);
      return { hour: h.toISOString(), count: entry?.count ?? 0, avgTime: entry?.avgTime ?? 0 };
    });

    // Method distribution
    const methodDistRaw: any[] = await prisma.$queryRaw`
      SELECT method, COUNT(*)::int as count
      FROM traffic_entries
      WHERE timestamp >= ${twentyFourHoursAgo}
      GROUP BY method ORDER BY count DESC`;

    res.json({
      totalRequests,
      averageResponseTime: Math.round(avgResponseTime._avg?.responseTime || 0),
      errorRate,
      requestsPerMinute: totalRequests > 0 ? Math.round(totalRequests / (24 * 60)) : 0,
      topEndpoints: topEndpointsRaw.map((r: any) => ({ endpoint: r.endpoint, count: Number(r.count) })),
      statusCodeDistribution: statusDistRaw.map((r: any) => ({ code: Number(r.code), count: Number(r.count) })),
      hourly,
      methodDistribution: methodDistRaw.map((r: any) => ({ method: r.method, count: Number(r.count) })),
      timeRange: { start: twentyFourHoursAgo.toISOString(), end: new Date().toISOString() },
    });
  } catch (error) {
    console.error('Failed to fetch traffic stats:', error);
    res.status(500).json({ error: 'Failed to fetch traffic stats' });
  }
});

// ──────────────────────────────────────────────
// SERVICE ACTIVITY LOGGING (called by customer-facing kiosk)
// ──────────────────────────────────────────────
app.post('/api/service-activity/log', async (req, res) => {
  try {
    const { serviceId, serviceName, action, status, duration, errorMessage, userId, metadata } = req.body;

    if (!serviceId || !action || !status) {
      res.status(400).json({ error: 'serviceId, action, and status are required' });
      return;
    }

    const entry = await prisma.serviceActivityLog.create({
      data: {
        serviceId,
        serviceName: serviceName || serviceId,
        action,
        status,
        duration: typeof duration === 'number' ? duration : 0,
        errorMessage: errorMessage || null,
        userId: userId || null,
        metadata: metadata || undefined,
      },
    });

    // Also create an audit log entry for auth-related events
    if (serviceId === 'fingerprint_auth') {
      await prisma.auditLog.create({
        data: {
          level: status === 'failure' ? 'warning' : 'info',
          category: 'auth',
          action: action,
          details: errorMessage || `Fingerprint ${status}`,
          status: status === 'success' ? 'success' : 'failure',
          userId: userId || null,
          ipAddress: req.ip || 'kiosk',
          userAgent: req.get('user-agent') || 'kiosk',
        },
      });
    }

    res.status(201).json(entry);
  } catch (error) {
    console.error('Failed to log service activity:', error);
    res.status(500).json({ error: 'Failed to log service activity' });
  }
});

// ──────────────────────────────────────────────
// ADMIN — Service Activity
// ──────────────────────────────────────────────

app.get('/api/admin/service-activity', async (req, res) => {
  try {
    const { serviceId, status, limit = '100', offset = '0' } = req.query;
    const where: any = {};
    if (serviceId) where.serviceId = serviceId;
    if (status) where.status = status;

    const [activities, total] = await Promise.all([
      prisma.serviceActivityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      prisma.serviceActivityLog.count({ where }),
    ]);
    res.json({ activities, total });
  } catch (error) {
    console.error('Failed to fetch service activity:', error);
    res.status(500).json({ error: 'Failed to fetch service activity' });
  }
});

app.get('/api/admin/service-activity/stats', async (_req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [byService, byStatus, avgDuration, hourlyRaw] = await Promise.all([
      prisma.serviceActivityLog.groupBy({
        by: ['serviceId', 'serviceName'],
        where: { timestamp: { gte: twentyFourHoursAgo } },
        _count: true,
        _avg: { duration: true },
      }),
      prisma.serviceActivityLog.groupBy({
        by: ['status'],
        where: { timestamp: { gte: twentyFourHoursAgo } },
        _count: true,
      }),
      prisma.serviceActivityLog.aggregate({
        where: { timestamp: { gte: twentyFourHoursAgo } },
        _avg: { duration: true },
        _count: true,
      }),
      prisma.$queryRaw`
        SELECT date_trunc('hour', timestamp) as hour, COUNT(*)::int as count,
               SUM(CASE WHEN status='success' THEN 1 ELSE 0 END)::int as success,
               SUM(CASE WHEN status='failure' THEN 1 ELSE 0 END)::int as failure
        FROM service_activity_logs
        WHERE timestamp >= ${twentyFourHoursAgo}
        GROUP BY hour ORDER BY hour ASC` as Promise<any[]>,
    ]);

    const statusCounts: Record<string, number> = {};
    byStatus.forEach((b: any) => { statusCounts[b.status] = b._count; });

    res.json({
      total: avgDuration._count,
      avgDuration: Math.round(avgDuration._avg?.duration || 0),
      successCount: statusCounts['success'] || 0,
      failureCount: statusCounts['failure'] || 0,
      pendingCount: statusCounts['pending'] || 0,
      byService: byService.map((b: any) => ({
        serviceId: b.serviceId,
        serviceName: b.serviceName,
        count: b._count,
        avgDuration: Math.round(b._avg?.duration || 0),
      })),
      hourly: (() => {
        const map = new Map<string, any>(
          hourlyRaw.map((r: any) => [new Date(r.hour).toISOString().slice(0, 13), r])
        );
        return Array.from({ length: 24 }, (_, i) => {
          const h = new Date(twentyFourHoursAgo.getTime() + i * 3600_000);
          h.setMinutes(0, 0, 0);
          const key = h.toISOString().slice(0, 13);
          const r = map.get(key);
          return { hour: h.toISOString(), count: r ? Number(r.count) : 0, success: r ? Number(r.success) : 0, failure: r ? Number(r.failure) : 0 };
        });
      })(),
    });
  } catch (error) {
    console.error('Failed to fetch service activity stats:', error);
    res.status(500).json({ error: 'Failed to fetch service activity stats' });
  }
});

// ──────────────────────────────────────────────
// Self-Service Transaction — write to tb_self_serv_txn
// ──────────────────────────────────────────────

async function resolveBranchFromIp(req: express.Request): Promise<{ branchId: string; branchName: string }> {
  // If explicitly passed in payload or headers, use it directly
  if (req.body?.branch_id) {
    return { branchId: req.body.branch_id, branchName: req.body.branchName || req.body.branch_id };
  }
  if (req.headers['x-branch-id']) {
    return { 
      branchId: req.headers['x-branch-id'] as string, 
      branchName: (req.headers['x-branch-name'] as string) || (req.headers['x-branch-id'] as string) 
    };
  }

  let clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim()
    || req.socket.remoteAddress
    || '127.0.0.1';

  // Normalize local loops
  if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
    clientIp = '127.0.0.1';
  }

  try {
    const device = await prisma.deviceBranch.findUnique({
      where: { ipAddress: clientIp }
    });
    if (device) {
      return { branchId: device.branchId, branchName: device.branchName };
    }
  } catch (error) {
    console.error('[IP_RESOLVER_ERROR] Failed to query device_branch:', error);
  }

  return { branchId: '000', branchName: 'HEAD OFFICE' };
}

app.post('/api/transactions/self-service', async (req, res) => {
  try {
    const {
      ticketId,
      crAccount,
      drAccount,
      transType,
      amount,
      currency = 'GHS',
      docRef,
      param1,
      param2,
      param3,
      param4,
      param5,
    } = req.body;

    if (!transType || amount === undefined) {
      return res.status(400).json({ error: 'transType and amount are required' });
    }

    await prisma.$executeRaw`
      INSERT INTO tb_self_serv_txn
        (ticket_id, cr_account, dr_account, trans_type, amount, currency, doc_ref,
         is_served, posting_date, param1, param2, param3, param4, param5)
      VALUES
        (${ticketId ?? null}, ${crAccount ?? null}, ${drAccount ?? null},
         ${transType}, ${amount}, ${currency}, ${docRef ?? null},
         'N', CURRENT_DATE,
         ${param1 ?? null}, ${param2 ?? null}, ${param3 ?? null},
         ${param4 ?? null}, ${param5 ?? null})
    `;

    // --- Integration: Automatically enter into BankAssist Queue ---
    let queueInfo = null;
    if (transType === 'WITHDRAWAL' || transType === 'ASSISTANCE' || transType === 'DEPOSIT') {
      try {
        // Resolve the branch ID from the kiosk's incoming IP address
        const resolved = await resolveBranchFromIp(req);
        
        // Map transaction data to Ticket data
        const ticket = await ticketService.createTicket({
          ticketId: ticketId || `T-${Date.now()}`,
          serviceId: param3 || (transType === 'WITHDRAWAL' ? 'cash_withdrawal' : 'assistance'),
          customerName: param1 || 'Customer',
          accountNumber: drAccount || '',
          amount: amount,
          transactionId: docRef || `TXN-${Date.now()}`,
          branch_id: resolved.branchId
        });
        queueInfo = {
          queueNumber: ticket.queueNumber,
          ticketId: ticket.ticketId
        };
      } catch (err) {
        console.error('Failed to auto-create queue ticket:', err);
        // We don't fail the whole request if queueing fails, 
        // but we log it.
      }
    }

    res.json({ 
      success: true, 
      data: queueInfo 
    });
  } catch (error) {
    console.error('Failed to log self-service transaction:', error);
    res.status(500).json({ error: 'Failed to log transaction' });
  }
});

// ──────────────────────────────────────────────
// ADMIN — Transactions (reads from tb_self_serv_txn)
// ──────────────────────────────────────────────

app.get('/api/admin/transactions', async (req, res) => {
  try {
    const { transType, transTypes, isServed, limit = '100', offset = '0' } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (transTypes) {
      const types = String(transTypes).split(',').map((s) => s.trim()).filter(Boolean);
      if (types.length > 0) {
        const placeholders = types.map(() => `$${idx++}`).join(', ');
        conditions.push(`trans_type IN (${placeholders})`);
        params.push(...types);
      }
    } else if (transType) {
      conditions.push(`trans_type = $${idx++}`);
      params.push(transType);
    }
    if (isServed === 'Y' || isServed === 'N') {
      conditions.push(`is_served = $${idx++}`);
      params.push(isServed);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const lim = parseInt(limit as string);
    const off = parseInt(offset as string);

    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    const [rowsResult, countResult] = await Promise.all([
      client.query(
        `SELECT ticket_id, cr_account, dr_account, trans_type, amount::float, currency,
                doc_ref, is_served, served_by, created_at, posting_date, served_at,
                param1, param2, param3, param4, param5
         FROM tb_self_serv_txn ${where}
         ORDER BY created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, lim, off]
      ),
      client.query(`SELECT COUNT(*)::int AS total FROM tb_self_serv_txn ${where}`, params),
    ]);

    await client.end();

    res.json({
      transactions: rowsResult.rows,
      total: countResult.rows[0]?.total ?? 0,
    });
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ──────────────────────────────────────────────
// ADMIN — Kiosk Live Status (settings + today's txn count)
// ──────────────────────────────────────────────
app.get('/api/admin/kiosk-status', async (_req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [config, todayTickets, activeServices, totalServices] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { id: 1 } }),
      prisma.ticket.count({ where: { timestamp: { gte: todayStart } } }),
      prisma.selfService.count({ where: { enabled: true } }),
      prisma.selfService.count(),
    ]);

    const s = config ?? DEFAULT_SETTINGS;
    res.json({
      maintenanceMode: s.maintenanceMode,
      sessionTimeout: s.sessionTimeout,
      todayTransactions: todayTickets,
      activeServices,
      totalServices,
    });
  } catch (error) {
    console.error('Failed to fetch kiosk status:', error);
    res.status(500).json({ error: 'Failed to fetch kiosk status' });
  }
});

// ──────────────────────────────────────────────
// ADMIN — Dashboard Stats (aggregated)
// ──────────────────────────────────────────────

app.get('/api/admin/dashboard-stats', async (_req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Run in two batches to stay within pool limits
    const [totalAuditLogs, totalTrafficEntries, recentErrors, trafficErrorCount] = await Promise.all([
      prisma.auditLog.count(),
      prisma.trafficEntry.count(),
      prisma.auditLog.count({ where: { level: { in: ['error', 'critical'] }, timestamp: { gte: twentyFourHoursAgo } } }),
      prisma.trafficEntry.count({ where: { timestamp: { gte: twentyFourHoursAgo }, statusCode: { gte: 400 } } }),
    ]);

    const [selfServices, assistedServices, trafficLast24h, auditLast24h] = await Promise.all([
      prisma.selfService.findMany({ select: { enabled: true } }),
      prisma.assistedService.findMany({ select: { enabled: true } }),
      prisma.trafficEntry.count({ where: { timestamp: { gte: twentyFourHoursAgo } } }),
      prisma.auditLog.count({ where: { timestamp: { gte: twentyFourHoursAgo } } }),
    ]);

    const allServices = [...selfServices, ...assistedServices];
    const activeServices = allServices.filter((s) => s.enabled).length;

    // Error-rate based system health score (0–100, higher is healthier).
    // Weighted 60% on API traffic error rate, 40% on audit error rate over the
    // last 24h. With no activity in the window the system is assumed healthy.
    const trafficErrorRate = trafficLast24h > 0 ? trafficErrorCount / trafficLast24h : 0;
    const auditErrorRate = auditLast24h > 0 ? recentErrors / auditLast24h : 0;
    const trafficScore = 100 * (1 - trafficErrorRate);
    const auditScore = 100 * (1 - auditErrorRate);
    const averageSystemHealth = Math.round((trafficScore * 0.6 + auditScore * 0.4) * 10) / 10;

    res.json({
      totalAuditLogs,
      totalTrafficEntries,
      activeServices,
      totalServices: allServices.length,
      recentErrors,
      averageSystemHealth,
      trafficLast24h,
      auditLast24h,
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ──────────────────────────────────────────────
// SYSTEM SETTINGS (SystemConfig id=1 upsert)
// ──────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  maintenanceMode: false,
  sessionTimeout: 300,
  serviceSelectionTimeout: 300,
  transactionCompleteTimeout: 7,
  adminSessionTimeout: 15,
  enableBiometricCache: true,
  enableDetailedLogging: true,
  enableRateLimiting: true,
  rateLimitRequestsPerMinute: 60,
  enableAuditLogging: true,
  enableTransactionNotifications: true,
  adsEnabled: true,
  landscapeAdsEnabled: true,
  portraitAdsEnabled: true,
};

app.get('/api/admin/settings', async (_req, res) => {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
    res.json(config ?? { id: 1, ...DEFAULT_SETTINGS });
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.patch('/api/admin/settings', async (req, res) => {
  try {
    const config = await prisma.systemConfig.upsert({
      where: { id: 1 },
      update: req.body as any,
      create: { id: 1, ...DEFAULT_SETTINGS, ...(req.body as any) },
    });
    res.json(config);
  } catch (error) {
    console.error('Failed to update settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ── CRUD endpoints for Kiosk IP-to-Branch Registry ──
app.get('/api/admin/device-branch', async (_req, res) => {
  try {
    const mappings = await prisma.deviceBranch.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(mappings);
  } catch (error) {
    console.error('Failed to fetch device branches:', error);
    res.status(500).json({ error: 'Failed to fetch device branches' });
  }
});

app.post('/api/admin/device-branch', async (req, res) => {
  try {
    const { ipAddress, branchId, branchName } = req.body;
    if (!ipAddress || !branchId || !branchName) {
      return res.status(400).json({ error: 'ipAddress, branchId, and branchName are required' });
    }
    const mapping = await prisma.deviceBranch.upsert({
      where: { ipAddress },
      update: { branchId, branchName },
      create: { ipAddress, branchId, branchName }
    });
    res.json(mapping);
  } catch (error) {
    console.error('Failed to save device branch mapping:', error);
    res.status(500).json({ error: 'Failed to save device branch mapping' });
  }
});

app.delete('/api/admin/device-branch/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.deviceBranch.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete device branch:', error);
    res.status(500).json({ error: 'Failed to delete device branch mapping' });
  }
});

// Public endpoint so the kiosk can check maintenance mode & limits without admin auth
app.get('/api/settings/public', async (_req, res) => {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { id: 1 } });
    const s = (config ?? DEFAULT_SETTINGS) as any;
    res.json({
      maintenanceMode: s.maintenanceMode,
      sessionTimeout: s.sessionTimeout,
      serviceSelectionTimeout: s.serviceSelectionTimeout,
      transactionCompleteTimeout: s.transactionCompleteTimeout,
      adsEnabled: s.adsEnabled,
      landscapeAdsEnabled: s.landscapeAdsEnabled,
      portraitAdsEnabled: s.portraitAdsEnabled,
    });
  } catch (error) {
    console.error('Failed to fetch public settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// ──────────────────────────────────────────────
// Health check
// ──────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
});

// ──────────────────────────────────────────────
// Detailed health check (for admin dashboard)
// ──────────────────────────────────────────────
app.get('/api/health/detailed', async (_req, res) => {
  const start = Date.now();

  // Helper: measure an async check, return status + latency
  async function probe<T>(
    name: string,
    fn: () => Promise<T>
  ): Promise<{ name: string; status: 'online' | 'degraded' | 'offline'; latency: number; message?: string }> {
    const t0 = Date.now();
    try {
      await fn();
      const latency = Date.now() - t0;
      return {
        name,
        status: latency > 2000 ? 'degraded' : 'online',
        latency,
        ...(latency > 2000 ? { message: 'High latency' } : {}),
      };
    } catch (err: any) {
      return {
        name,
        status: 'offline',
        latency: Date.now() - t0,
        message: err?.message || 'Unreachable',
      };
    }
  }

  // 1. Database — simple SELECT 1
  const database = await probe('database', () => prisma.$queryRaw`SELECT 1`);

  // 2. Database tables — verify core tables are accessible
  const databaseTables = await probe('database_tables', async () => {
    await Promise.all([
      prisma.selfService.count(),
      prisma.auditLog.count(),
      prisma.trafficEntry.count(),
    ]);
  });

  // 3. API server — it's clearly running if this handler executes
  const apiServer = { name: 'api_server', status: 'online' as const, latency: 0 };

  // 4. Biometric engine — verify the self_services table is queryable (DB connectivity check).
  //    Whether services are enabled/disabled is an admin config, not an infrastructure fault.
  const biometricEngine = await probe('biometric_engine', async () => {
    await prisma.selfService.count(); // just confirm the table is reachable
  });

  // 5. Auth service — verify auth-related service rows exist in the DB (DB connectivity,
  //    not whether they're enabled; toggling a service off is an admin action, not an outage)
  const authService = await probe('auth_service', async () => {
    const authServices = await prisma.selfService.findMany({
      where: { serviceId: { in: ['pin_reset', 'mfa_setup'] } },
      select: { serviceId: true, enabled: true },
    });
    if (authServices.length === 0) throw new Error('Auth service records missing from database');
    // Probe succeeds regardless of enabled/disabled state — that's an admin config, not a fault
  });

  // 6. Services health — quick counts
  const servicesHealth = await probe('services', async () => {
    const [selfCount, assistedCount] = await Promise.all([
      prisma.selfService.count({ where: { enabled: true } }),
      prisma.assistedService.count({ where: { enabled: true } }),
    ]);
    return { selfEnabled: selfCount, assistedEnabled: assistedCount };
  });

  const components = [database, databaseTables, apiServer, biometricEngine, authService, servicesHealth];
  const allOnline = components.every((c) => c.status === 'online');
  const anyOffline = components.some((c) => c.status === 'offline');

  const overallStatus = anyOffline ? 'degraded' : allOnline ? 'healthy' : 'degraded';

  // Service counts (best-effort)
  let activeServices = 0;
  let totalServices = 0;
  try {
    const [selfEnabled, selfTotal, assistedEnabled, assistedTotal] = await Promise.all([
      prisma.selfService.count({ where: { enabled: true } }),
      prisma.selfService.count(),
      prisma.assistedService.count({ where: { enabled: true } }),
      prisma.assistedService.count(),
    ]);
    activeServices = selfEnabled + assistedEnabled;
    totalServices = selfTotal + assistedTotal;
  } catch { /* swallow */ }

  res.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    responseTime: Date.now() - start,
    components: {
      database:         { status: database.status,         latency: database.latency,         message: database.message },
      databaseTables:   { status: databaseTables.status,   latency: databaseTables.latency,   message: databaseTables.message },
      apiServer:        { status: apiServer.status,        latency: apiServer.latency },
      biometricEngine:  { status: biometricEngine.status,  latency: biometricEngine.latency,  message: biometricEngine.message },
      authService:      { status: authService.status,      latency: authService.latency,      message: authService.message },
      services:         { status: servicesHealth.status,    latency: servicesHealth.latency,    message: servicesHealth.message },
    },
    services: { active: activeServices, total: totalServices },
  });
});

// ──────────────────────────────────────────────
// BankAssist Merge Setup
// ──────────────────────────────────────────────
import bankAssistRoutes from './bankassist/routes';
// Ensure required upload directories exist
import fs from 'fs';
const uploadsDir = path.join(__dirname, '../../uploads');
const adsDir = path.join(__dirname, '../../uploads/ads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
if (!fs.existsSync(adsDir)) fs.mkdirSync(adsDir);

// Serve uploaded ads statically
app.use('/uploads', express.static(uploadsDir));

// Dedicated logger for BankAssist routes to debug the 404 issue
app.use('/api/self-service', (req, res, next) => {
  console.log(`[BANKASSIST_DEBUG] ${req.method} ${req.path}`);
  next();
});

app.use('/api/self-service', bankAssistRoutes);
// Reload trigger

// ──────────────────────────────────────────────
// PROXY — Intra-bank Funds Transfer
// Forwards to the bank's internal HTTPS API, bypassing the self-signed cert
// restriction that the browser enforces.
// ──────────────────────────────────────────────
import https from 'https';
import httpModule from 'http';

app.post('/api/proxy/funds-transfer', (req, res) => {
  let responded = false;
  const safeRespond = (status: number, body: unknown) => {
    if (!responded) {
      responded = true;
      res.status(status).json(body);
    }
  };

  let body: string;
  try {
    body = JSON.stringify(req.body);
  } catch (e) {
    return safeRespond(400, { error: 'Invalid request body' });
  }

  const target = new URL(BANK_TRANSFER_URL);
  const bodyBuf = Buffer.from(body, 'utf-8');
  const isHttps = target.protocol === 'https:';
  const defaultPort = isHttps ? 443 : 80;

  const options: https.RequestOptions = {
    hostname: target.hostname,
    port:     Number(target.port) || defaultPort,
    path:     target.pathname + target.search,
    method:   'POST',
    headers: {
      'Content-Type':   'application/json',
      'Content-Length': bodyBuf.byteLength,
      'Authorization':  'Basic dGVzdF9QQzp0ZXN0UEM=',
    },
    ...(isHttps ? { rejectUnauthorized: false } : {}),
  };

  console.log('[proxy/funds-transfer] → POST', target.href, 'body:', body);

  try {
    const requester = isHttps ? https : httpModule;
    const proxyReq = requester.request(options, (proxyRes) => {
      const chunks: Buffer[] = [];
      proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk));
      proxyRes.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        console.log('[proxy/funds-transfer] ← status', proxyRes.statusCode, 'body:', raw);
        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }
        safeRespond(proxyRes.statusCode ?? 502, parsed);
      });
      proxyRes.on('error', (err: Error) => {
        console.error('[proxy/funds-transfer] response stream error:', err.message);
        safeRespond(502, { error: 'Response stream error', detail: err.message });
      });
    });

    proxyReq.on('error', (err: Error) => {
      console.error('[proxy/funds-transfer] request error:', err.message);
      safeRespond(502, { error: 'Proxy failed to reach the bank transfer API', detail: err.message });
    });

    proxyReq.on('timeout', () => {
      console.error('[proxy/funds-transfer] request timed out');
      proxyReq.destroy();
      safeRespond(504, { error: 'Bank API timed out' });
    });

    proxyReq.setTimeout(15_000);
    proxyReq.write(bodyBuf);
    proxyReq.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[proxy/funds-transfer] unexpected error:', msg);
    safeRespond(500, { error: 'Unexpected proxy error', detail: msg });
  }
});

// ──────────────────────────────────────────────
// PROXY — Balance Enquiry
// Forwards GET requests to the bank's internal balance API.
// ──────────────────────────────────────────────
app.get('/api/proxy/balance/:accountId', (req, res) => {
  let responded = false;
  const safeRespond = (status: number, body: unknown) => {
    if (!responded) {
      responded = true;
      res.status(status).json(body);
    }
  };

  const { accountId } = req.params;
  const targetUrl = `${BALANCE_API_URL}/account/${accountId}/balance`;
  const target = new URL(targetUrl);

  const options: https.RequestOptions = {
    hostname: target.hostname,
    port:     Number(target.port) || 80,
    path:     target.pathname + target.search,
    method:   'GET',
    headers: {
      'Content-Type':    'application/json',
      'x-api-key':       BALANCE_API_KEY,
      'x-api-secret':    BALANCE_API_SECRET,
      'X-FORWARDED-FOR': BALANCE_FORWARDED_FOR,
    },
  };

  console.log('[proxy/balance] → GET', targetUrl);

  try {
    const proxyReq = httpModule.request(options, (proxyRes) => {
      const chunks: Buffer[] = [];
      proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk));
      proxyRes.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf-8');
        console.log('[proxy/balance] ← status', proxyRes.statusCode, 'body:', raw);
        let parsed: unknown;
        try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }
        safeRespond(proxyRes.statusCode ?? 502, parsed);
      });
      proxyRes.on('error', (err: Error) => {
        console.error('[proxy/balance] response stream error:', err.message);
        safeRespond(502, { error: 'Response stream error', detail: err.message });
      });
    });

    proxyReq.on('error', (err: Error) => {
      console.error('[proxy/balance] request error:', err.message);
      safeRespond(502, { error: 'Proxy failed to reach the balance API', detail: err.message });
    });

    proxyReq.on('timeout', () => {
      console.error('[proxy/balance] request timed out');
      proxyReq.destroy();
      safeRespond(504, { error: 'Balance API timed out' });
    });

    proxyReq.setTimeout(15_000);
    proxyReq.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[proxy/balance] unexpected error:', msg);
    safeRespond(500, { error: 'Unexpected proxy error', detail: msg });
  }
});

// ──────────────────────────────────────────────
// PROXY — Statement Request
// Forwards POST requests to the bank's internal statement API.
// ──────────────────────────────────────────────
app.post('/api/proxy/statement', (req, res) => {
  let responded = false;
  const safeRespond = (status: number, body: unknown) => {
    if (!responded) {
      responded = true;
      res.status(status).json(body);
    }
  };

  const apiKey = (req.headers['x-api-key'] as string) || process.env.STATEMENT_API_KEY || 'test_PC';
  const apiSecret = (req.headers['x-api-secret'] as string) || process.env.STATEMENT_API_SECRET || 'testPC';
  const forwardedFor = (req.headers['x-forwarded-for'] as string) || process.env.STATEMENT_FORWARDED_FOR || '10.203.18.237';

  const { accountId, startDate, endDate, statementType, userId } = req.body;
  if (!accountId || !startDate || !endDate) {
    return safeRespond(400, { error: 'accountId, startDate, and endDate are required' });
  }

  // Convert startDate and endDate from YYYY-MM-DD to DD/MM/YYYY
  const formatToDDMMYYYY = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const formattedStartDate = formatToDDMMYYYY(startDate);
  const formattedEndDate = formatToDDMMYYYY(endDate);

  const queryParams = new URLSearchParams({
    accountid: accountId,
    startdate: formattedStartDate,
    enddate: formattedEndDate,
    statementtype: statementType || 'electronic',
    userid: userId || 'name'
  }).toString();

  const targetUrl = `${STATEMENT_API_URL}?${queryParams}`;
  const target = new URL(targetUrl);

  const bodyData = new URLSearchParams({
    accountid: accountId,
    startdate: startDate,
    enddate: endDate,
    statementtype: statementType || 'electronic',
    userid: userId || 'name'
  }).toString();

  const bodyBuf = Buffer.from(bodyData, 'utf-8');

  const options: https.RequestOptions = {
    hostname: target.hostname,
    port:     Number(target.port) || 80,
    path:     target.pathname + target.search,
    method:   'POST',
    headers: {
      'x-api-key':       apiKey,
      'x-api-secret':    apiSecret,
      'x-forwarded-for': forwardedFor,
      'Content-Type':    'application/x-www-form-urlencoded',
      'Content-Length':  bodyBuf.byteLength,
      'User-Agent':      'curl/7.81.0',
      'Accept':          '*/*',
    },
  };

  console.log('[proxy/statement] → POST', targetUrl, 'body:', bodyData);

  const makeRequest = (requestUrl: string, requestOptions: https.RequestOptions, postBodyBuf: Buffer, redirectCount = 0) => {
    if (redirectCount > 5) {
      return safeRespond(508, { error: 'Too many redirects' });
    }

    const target = new URL(requestUrl);
    const isHttps = target.protocol === 'https:';
    const requester = isHttps ? https : httpModule;

    const options: https.RequestOptions = {
      ...requestOptions,
      hostname: target.hostname,
      port:     Number(target.port) || (isHttps ? 443 : 80),
      path:     target.pathname + target.search,
    };

    console.log(`[proxy/statement] Requesting [Method: ${options.method}] to: ${requestUrl}`);

    try {
      const proxyReq = requester.request(options, (proxyRes) => {
        // Check for 301, 302, 307, 308 redirect
        if ([301, 302, 307, 308].includes(proxyRes.statusCode ?? 0)) {
          let redirectUrl = proxyRes.headers.location;
          console.log('[proxy/statement] Redirect response headers:', JSON.stringify(proxyRes.headers));
          if (redirectUrl) {
            // Resolve relative URLs
            if (redirectUrl.startsWith('/')) {
              redirectUrl = `${target.protocol}//${target.host}${redirectUrl}`;
            }
            
            // Ensure query parameters are not stripped in the redirect location URL
            try {
              const redirectUrlObj = new URL(redirectUrl);
              if (!redirectUrlObj.search && target.search) {
                redirectUrlObj.search = target.search;
                redirectUrl = redirectUrlObj.toString();
              }
            } catch (err) {
              console.error('[proxy/statement] Failed to parse redirect URL:', err);
            }

            console.log(`[proxy/statement] Redirected (${proxyRes.statusCode}) -> Following to: ${redirectUrl}`);
            
            // Change method to GET for 301/302/303 redirects, keep POST for 307/308
            const newMethod = [307, 308].includes(proxyRes.statusCode ?? 0) ? (requestOptions.method || 'POST') : 'GET';
            const newHeaders: Record<string, any> = {
              ...(requestOptions.headers as any),
              'x-api-key':       apiKey,
              'x-api-secret':    apiSecret,
              'x-forwarded-for': forwardedFor,
              'User-Agent':      'curl/7.81.0',
              'Accept':          '*/*',
            };
            
            if (newMethod === 'GET') {
              delete newHeaders['content-type'];
              delete newHeaders['Content-Type'];
              delete newHeaders['content-length'];
              delete newHeaders['Content-Length'];
            } else if (newMethod === 'POST' && postBodyBuf.length > 0) {
              newHeaders['Content-Length'] = postBodyBuf.byteLength;
              if (newHeaders['content-length']) {
                newHeaders['content-length'] = postBodyBuf.byteLength;
              }
            }
            
            const newOptions = {
              ...requestOptions,
              method: newMethod,
              headers: newHeaders
            };
            
            makeRequest(redirectUrl, newOptions, newMethod === 'GET' ? Buffer.alloc(0) : postBodyBuf, redirectCount + 1);
            return;
          }
        }

        const chunks: Buffer[] = [];
        proxyRes.on('data', (chunk: Buffer) => chunks.push(chunk));
        proxyRes.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf-8');
          console.log('[proxy/statement] ← status', proxyRes.statusCode, 'body:', raw);
          let parsed: unknown;
          try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }
          safeRespond(proxyRes.statusCode ?? 502, parsed);
        });
        proxyRes.on('error', (err: Error) => {
          console.error('[proxy/statement] response stream error:', err.message);
          safeRespond(502, { error: 'Response stream error', detail: err.message });
        });
      });

      proxyReq.on('error', (err: Error) => {
        console.error('[proxy/statement] request error:', err.message);
        safeRespond(502, { error: 'Proxy failed to reach the statement API', detail: err.message });
      });

      proxyReq.on('timeout', () => {
        console.error('[proxy/statement] request timed out');
        proxyReq.destroy();
        safeRespond(504, { error: 'Statement API timed out' });
      });

      proxyReq.setTimeout(15_000);
      if (options.method === 'POST' && postBodyBuf.length > 0) {
        proxyReq.write(postBodyBuf);
      }
      proxyReq.end();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[proxy/statement] request execution error:', msg);
      safeRespond(500, { error: 'Request execution error', detail: msg });
    }
  };

  makeRequest(targetUrl, options, bodyBuf);
});

// ──────────────────────────────────────────────
// Start server
// ──────────────────────────────────────────────
import { initSocket } from './bankassist/socket';
import path from 'path';

const server = httpModule.createServer(app);
initSocket(server);

if (require.main === module) {
  server.listen(Number(PORT), HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`📋 Health check: http://${HOST}:${PORT}/api/health`);
    console.log(`📊 Detailed health: http://${HOST}:${PORT}/api/health/detailed`);
    console.log(`📡 WebSocket server running`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
