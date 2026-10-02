import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../services/adminApi';
import type { TrafficEntry, TrafficStats } from '@/types/admin';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Activity, RefreshCw, ArrowUpRight, Clock, AlertTriangle,
  CheckCircle2, Globe, Filter, BarChart3, TrendingUp,
} from 'lucide-react';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

// ── Demo fallback data ──
function generateDemoTraffic(): TrafficEntry[] {
  const methods: ('GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH')[] = ['GET', 'GET', 'GET', 'POST', 'PATCH', 'DELETE'];
  const endpoints = [
    '/api/services/self-service', '/api/admin/audit-logs', '/api/health',
    '/api/admin/traffic', '/api/admin/dashboard-stats', '/api/admin/service-activity',
    '/api/services/assisted', '/api/admin/services/self-service',
  ];
  const now = Date.now();
  return Array.from({ length: 50 }, (_, i) => {
    const method = methods[Math.floor(Math.random() * methods.length)];
    const statusCode = Math.random() > 0.1 ? 200 : Math.random() > 0.5 ? 400 : 500;
    return {
      id: i + 1,
      timestamp: new Date(now - i * 90_000 - Math.random() * 60_000).toISOString(),
      method,
      endpoint: endpoints[Math.floor(Math.random() * endpoints.length)],
      statusCode,
      responseTime: Math.round(50 + Math.random() * 500),
      ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      requestSize: Math.round(100 + Math.random() * 2000),
      responseSize: Math.round(500 + Math.random() * 10000),
    };
  });
}

function generateDemoTrafficStats(): TrafficStats {
  const now = Date.now();
  return {
    totalRequests: 1823,
    averageResponseTime: 187,
    errorRate: 3,
    requestsPerMinute: 1,
    topEndpoints: [
      { endpoint: '/api/services/self-service', count: 423 },
      { endpoint: '/api/admin/audit-logs', count: 312 },
      { endpoint: '/api/health', count: 289 },
      { endpoint: '/api/admin/traffic', count: 198 },
      { endpoint: '/api/admin/dashboard-stats', count: 156 },
    ],
    statusCodeDistribution: [
      { code: 200, count: 1620 },
      { code: 304, count: 98 },
      { code: 400, count: 42 },
      { code: 500, count: 15 },
    ],
    hourly: Array.from({ length: 24 }, (_, i) => ({
      hour: new Date(now - (23 - i) * 3600_000).toISOString(),
      count: Math.round(10 + Math.random() * 50),
      avgTime: Math.round(100 + Math.random() * 300),
    })),
    methodDistribution: [
      { method: 'GET', count: 1580 },
      { method: 'POST', count: 142 },
      { method: 'PATCH', count: 67 },
      { method: 'DELETE', count: 34 },
    ],
    timeRange: { start: new Date(now - 86400_000).toISOString(), end: new Date(now).toISOString() },
  };
}

export function SystemTraffic() {
  const [traffic, setTraffic] = useState<TrafficEntry[]>([]);
  const [totalTraffic, setTotalTraffic] = useState(0);
  const [stats, setStats] = useState<TrafficStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [trafficData, statsData] = await Promise.all([
        adminApi.getTraffic({
          method: filterMethod !== 'all' ? filterMethod : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined,
        }),
        adminApi.getTrafficStats(),
      ]);
      setTraffic(trafficData.entries);
      setTotalTraffic(trafficData.total);
      setStats(statsData);
      setUsingDemo(false);
    } catch (error) {
      console.error('Failed to fetch traffic data, using demo data:', error);
      const demoTraffic = generateDemoTraffic();
      let filtered = demoTraffic;
      if (filterMethod !== 'all') filtered = filtered.filter((t) => t.method === filterMethod);
      if (filterStatus !== 'all') {
        if (filterStatus === 'success') filtered = filtered.filter((t) => t.statusCode < 400);
        if (filterStatus === 'error') filtered = filtered.filter((t) => t.statusCode >= 400);
      }
      setTraffic(filtered);
      setTotalTraffic(filtered.length);
      setStats(generateDemoTrafficStats());
      setUsingDemo(true);
    } finally {
      setLoading(false);
    }
  }, [filterMethod, filterStatus]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Server-side filtering is applied; use the fetched results directly
  const filteredTraffic = traffic;

  const getStatusColor = (statusCode: number) => {
    if (statusCode < 300) return 'bg-green-100 text-green-800 border-green-200';
    if (statusCode < 400) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (statusCode < 500) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  const getResponseTimeColor = (ms: number) => {
    if (ms < 200) return 'text-green-600';
    if (ms < 500) return 'text-yellow-600';
    return 'text-red-600';
  };

  const clearFilters = () => {
    setFilterMethod('all');
    setFilterStatus('all');
  };

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
          <Button variant="outline" size="sm" onClick={fetchData} className="shrink-0">
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">
                  {stats?.totalRequests.toLocaleString() || '-'}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Globe className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{stats?.averageResponseTime || '-'}ms</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold">{stats?.errorRate || '-'}%</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Req/Min</p>
                <p className="text-2xl font-bold">{stats?.requestsPerMinute || '-'}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats && (
        <>
          {/* ── Charts Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hourly Traffic Area Chart */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Hourly Traffic (Last 24h)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={stats.hourly}>
                    <defs>
                      <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                      formatter={(value: number, name: string) => [
                        name === 'count' ? `${value} requests` : `${value}ms`,
                        name === 'count' ? 'Requests' : 'Avg Response',
                      ]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="count"
                      name="Requests"
                      stroke="#3b82f6"
                      fill="url(#trafficFill)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="avgTime"
                      name="Avg Response (ms)"
                      stroke="#f59e0b"
                      fill="none"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Method Distribution Pie Chart */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Method Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={stats.methodDistribution}
                      dataKey="count"
                      nameKey="method"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      innerRadius={50}
                      paddingAngle={3}
                      label={({ method, percent }) =>
                        `${method} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {stats.methodDistribution.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                      formatter={(value: number) => [`${value} requests`, 'Count']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* ── Top Endpoints & Status Codes Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                  Top Endpoints
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topEndpoints.map((endpoint, i) => (
                    <div key={endpoint.endpoint} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                        <span className="text-sm font-mono truncate">{endpoint.endpoint}</span>
                      </div>
                      <Badge variant="secondary" className="ml-2 shrink-0">{endpoint.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Status Code Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.statusCodeDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="code" type="category" tick={{ fontSize: 11 }} width={50} />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                      formatter={(value: number) => [`${value} requests`, 'Count']}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {stats.statusCodeDistribution.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={
                            entry.code < 300 ? '#22c55e' :
                            entry.code < 400 ? '#3b82f6' :
                            entry.code < 500 ? '#f59e0b' : '#ef4444'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="h-6 w-6 text-primary" />
              <CardTitle>Traffic Monitor</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>

          <ScrollArea className="h-[400px]">
            {loading ? (
              <div className="flex items-center justify-center h-[350px]">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredTraffic.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
                <Globe className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No traffic entries found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTraffic.map((entry) => (
                  <Dialog key={entry.id}>
                    <DialogTrigger asChild>
                      <TableRow className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(entry.timestamp), 'HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              entry.method === 'GET'
                                ? 'bg-blue-50 text-blue-700'
                                : entry.method === 'POST'
                                ? 'bg-green-50 text-green-700'
                                : entry.method === 'DELETE'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-yellow-50 text-yellow-700'
                            }
                          >
                            {entry.method}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm max-w-[200px] truncate">
                          {entry.endpoint}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getStatusColor(entry.statusCode)}>
                            {entry.statusCode < 400 ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <AlertTriangle className="h-3 w-3 mr-1" />
                            )}
                            {entry.statusCode}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={getResponseTimeColor(entry.responseTime)}>
                            {entry.responseTime}ms
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{entry.ipAddress}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {((entry.responseSize || 0) / 1024).toFixed(1)}KB
                        </TableCell>
                      </TableRow>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Traffic Entry Details</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">ID</label>
                            <p className="text-sm font-mono">{entry.id}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                            <p className="text-sm">{format(new Date(entry.timestamp), 'PPpp')}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Method</label>
                            <Badge variant="outline">{entry.method}</Badge>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Status Code</label>
                            <Badge variant="outline" className={getStatusColor(entry.statusCode)}>
                              {entry.statusCode}
                            </Badge>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Response Time</label>
                            <p className={`text-sm font-medium ${getResponseTimeColor(entry.responseTime)}`}>
                              {entry.responseTime}ms
                            </p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">IP Address</label>
                            <p className="text-sm font-mono">{entry.ipAddress}</p>
                          </div>
                          {entry.userId && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">User ID</label>
                              <p className="text-sm font-mono">{entry.userId}</p>
                            </div>
                          )}
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Response Size</label>
                            <p className="text-sm">{((entry.responseSize || 0) / 1024).toFixed(1)} KB</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Request Size</label>
                            <p className="text-sm">{entry.requestSize ? `${(entry.requestSize / 1024).toFixed(1)} KB` : '—'}</p>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Endpoint</label>
                          <p className="text-sm font-mono mt-1 bg-muted p-3 rounded-md break-all">{entry.endpoint}</p>
                        </div>
                        {entry.errorMessage && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">Error Message</label>
                            <p className="text-sm mt-1 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 p-3 rounded-md">{entry.errorMessage}</p>
                          </div>
                        )}
                        {entry.userAgent && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">User Agent</label>
                            <p className="text-sm font-mono mt-1">{entry.userAgent}</p>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
              </TableBody>
            </Table>
            )}
          </ScrollArea>

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Showing {filteredTraffic.length} of {totalTraffic.toLocaleString()} entries
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
