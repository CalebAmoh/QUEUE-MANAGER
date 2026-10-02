import { useEffect, useState } from 'react';
import { adminApi } from '@/services/adminApi';
import type { AuditLog, AuditLogStats, LogLevel, LogCategory } from '@/types/admin';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import {
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  FileText, Filter, RefreshCw, AlertCircle, CheckCircle2,
  Info, AlertTriangle, XCircle, Search, TrendingUp,
} from 'lucide-react';

const levelIcons: Record<LogLevel, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  error: XCircle,
  critical: AlertCircle,
};

const levelColors: Record<LogLevel, string> = {
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  critical: 'bg-purple-100 text-purple-800 border-purple-200',
};

const categoryLabels: Record<LogCategory, string> = {
  auth: 'Authentication',
  transaction: 'Transaction',
  system: 'System',
  security: 'Security',
  api: 'API',
  user: 'User',
};

// ── Demo fallback data ──
function generateDemoLogs(): AuditLog[] {
  const levels: LogLevel[] = ['info', 'info', 'info', 'warning', 'error', 'critical'];
  const categories: LogCategory[] = ['auth', 'transaction', 'system', 'security', 'api', 'user'];
  const actions = [
    'User login attempt', 'Fingerprint scan completed', 'Cash withdrawal processed',
    'Balance inquiry', 'PIN reset requested', 'MFA token verified',
    'Service toggled', 'Session expired', 'Rate limit triggered',
    'Database backup completed', 'API key rotated', 'Fraud alert triggered',
  ];
  const now = Date.now();
  return Array.from({ length: 40 }, (_, i) => {
    const level = levels[Math.floor(Math.random() * levels.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const status: 'success' | 'failure' = Math.random() > 0.15 ? 'success' : 'failure';
    return {
      id: i + 1,
      timestamp: new Date(now - i * 180_000 - Math.random() * 60_000).toISOString(),
      level,
      category,
      userId: `USR-${1000 + Math.floor(Math.random() * 9000)}`,
      userName: ['admin', 'John Doe', 'Jane Smith', 'System'][Math.floor(Math.random() * 4)],
      action: actions[i % actions.length],
      details: `${actions[i % actions.length]} - operation completed ${status === 'success' ? 'successfully' : 'with errors'}`,
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      status,
    };
  });
}

function generateDemoAuditStats(): AuditLogStats {
  const now = Date.now();
  return {
    total: 2341,
    last24h: 456,
    byLevel: [
      { level: 'info', count: 1820 },
      { level: 'warning', count: 312 },
      { level: 'error', count: 182 },
      { level: 'critical', count: 27 },
    ],
    byCategory: [
      { category: 'auth', count: 890 },
      { category: 'transaction', count: 654 },
      { category: 'system', count: 412 },
      { category: 'security', count: 210 },
      { category: 'api', count: 120 },
      { category: 'user', count: 55 },
    ],
    byStatus: [
      { status: 'success', count: 2050 },
      { status: 'failure', count: 291 },
    ],
    hourly: Array.from({ length: 24 }, (_, i) => ({
      hour: new Date(now - (23 - i) * 3600_000).toISOString(),
      count: Math.round(5 + Math.random() * 30),
    })),
    daily: Array.from({ length: 7 }, (_, i) => ({
      day: new Date(now - (6 - i) * 86400_000).toISOString(),
      count: Math.round(200 + Math.random() * 300),
    })),
  };
}

export function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [stats, setStats] = useState<AuditLogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filters, setFilters] = useState({
    level: 'all' as string,
    category: 'all' as string,
    status: 'all' as string,
    search: '',
  });

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        adminApi.getAuditLogs({
          level: filters.level !== 'all' ? (filters.level as LogLevel) : undefined,
          category: filters.category !== 'all' ? (filters.category as LogCategory) : undefined,
          status: filters.status !== 'all' ? (filters.status as 'success' | 'failure') : undefined,
        }),
        adminApi.getAuditLogStats(),
      ]);
      setLogs(logsData.logs);
      setTotalLogs(logsData.total);
      setStats(statsData);
      setUsingDemo(false);
    } catch (error) {
      console.error('Failed to fetch audit logs, using demo data:', error);
      const demoLogs = generateDemoLogs();
      let filtered = demoLogs;
      if (filters.level !== 'all') filtered = filtered.filter((l) => l.level === filters.level);
      if (filters.category !== 'all') filtered = filtered.filter((l) => l.category === filters.category);
      if (filters.status !== 'all') filtered = filtered.filter((l) => l.status === filters.status);
      setLogs(filtered);
      setTotalLogs(filtered.length);
      setStats(generateDemoAuditStats());
      setUsingDemo(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        log.action.toLowerCase().includes(searchLower) ||
        log.details.toLowerCase().includes(searchLower) ||
        log.userName?.toLowerCase().includes(searchLower) ||
        log.userId?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const clearFilters = () => {
    setFilters({ level: 'all', category: 'all', status: 'all', search: '' });
  };

  const LEVEL_COLORS: Record<string, string> = { info: '#3b82f6', warning: '#f59e0b', error: '#ef4444', critical: '#8b5cf6' };
  const formatHour = (h: string) => { try { return format(new Date(h), 'HH:mm'); } catch { return h; } };

  return (
    <div className="space-y-6">
      {/* Demo data banner */}
      {usingDemo && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Showing demo data</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Could not reach the server API. The data below is simulated for preview purposes.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} className="shrink-0">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      )}

      {/* Charts Row */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Total Logs</p>
              <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{stats.last24h} in 24h</p>
            </CardContent>
          </Card>
          {stats.byStatus.map((s) => (
            <Card key={s.status}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium capitalize">{s.status}</p>
                <p className="text-2xl font-bold">{s.count.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {stats.hourly.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" /> Hourly Events (24h)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.hourly}>
                      <defs>
                        <linearGradient id="colorAudit" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="hour" tickFormatter={formatHour} tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartsTooltip labelFormatter={formatHour} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#colorAudit)" name="Events" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {stats.byLevel.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" /> By Level
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.byLevel} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={3} dataKey="count" nameKey="level">
                        {stats.byLevel.map((entry, index) => (
                          <Cell key={index} fill={LEVEL_COLORS[entry.level] || '#94a3b8'} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <CardTitle>Audit Logs</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filters.level}
              onValueChange={(value) => setFilters({ ...filters, level: value as LogLevel })}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.category}
              onValueChange={(value) => setFilters({ ...filters, category: value as LogCategory })}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="auth">Authentication</SelectItem>
                <SelectItem value="transaction">Transaction</SelectItem>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value as 'success' | 'failure' })}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>

          <ScrollArea className="h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center h-[400px]">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No audit logs found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => {
                  const LevelIcon = levelIcons[log.level];
                  return (
                    <Dialog key={log.id}>
                      <DialogTrigger asChild>
                        <TableRow className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(log.timestamp), 'MMM d, HH:mm:ss')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={levelColors[log.level]}>
                              <LevelIcon className="h-3 w-3 mr-1" />
                              {log.level}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{categoryLabels[log.category]}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{log.action}</TableCell>
                          <TableCell>{log.userName || log.userId || 'System'}</TableCell>
                          <TableCell>
                            {log.status === 'success' ? (
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Success
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800 border-red-200">
                                <XCircle className="h-3 w-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{log.ipAddress}</TableCell>
                        </TableRow>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Log Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">ID</label>
                              <p className="text-sm font-mono">{log.id}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                              <p className="text-sm">{format(new Date(log.timestamp), 'PPpp')}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Level</label>
                              <Badge variant="outline" className={levelColors[log.level]}>
                                {log.level}
                              </Badge>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Category</label>
                              <Badge variant="secondary">{categoryLabels[log.category]}</Badge>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">User</label>
                              <p className="text-sm">{log.userName || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">User ID</label>
                              <p className="text-sm font-mono">{log.userId || 'N/A'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                              <p className="text-sm font-mono">{log.ipAddress}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Status</label>
                              <Badge
                                className={
                                  log.status === 'success'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }
                              >
                                {log.status}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Action</label>
                            <p className="text-sm mt-1">{log.action}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Details</label>
                            <p className="text-sm mt-1 bg-muted p-3 rounded-md">{log.details}</p>
                          </div>
                          {log.userAgent && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">User Agent</label>
                              <p className="text-sm font-mono mt-1">{log.userAgent}</p>
                            </div>
                          )}
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Metadata</label>
                              <pre className="text-xs bg-muted p-3 rounded-md mt-1 overflow-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  );
                })}
              </TableBody>
            </Table>
            )}
          </ScrollArea>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Showing {filteredLogs.length} of {totalLogs} logs
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
