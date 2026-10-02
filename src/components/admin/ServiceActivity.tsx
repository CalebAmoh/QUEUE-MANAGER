import { useEffect, useState } from 'react';
import { adminApi } from '@/services/adminApi';
import { TransactionLogs } from './TransactionLogs';
import type { ServiceActivity, ServiceName, ServiceActivityStats } from '@/types/admin';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  History, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle,
  Filter, BarChart3, TrendingUp, Activity, Users, Receipt, Headset,
} from 'lucide-react';

const serviceColors: Record<ServiceName, string> = {
  fingerprint_auth: 'bg-purple-100 text-purple-800',
  balance_inquiry: 'bg-blue-100 text-blue-800',
  account_updates: 'bg-orange-100 text-orange-800',
  statement_generation: 'bg-indigo-100 text-indigo-800',
  fund_transfers: 'bg-green-100 text-green-800',
  bill_payments: 'bg-cyan-100 text-cyan-800',
  cash_withdrawal: 'bg-emerald-100 text-emerald-800',
  cash_deposit: 'bg-teal-100 text-teal-800',
  check_deposits: 'bg-yellow-100 text-yellow-800',
  pin_reset: 'bg-pink-100 text-pink-800',
  fraud_reporting: 'bg-red-100 text-red-800',
  mfa_setup: 'bg-violet-100 text-violet-800',
  assistance: 'bg-rose-100 text-rose-800',
  receipt: 'bg-gray-100 text-gray-800',
};

const serviceLabels: Record<ServiceName, string> = {
  fingerprint_auth: 'Fingerprint Auth',
  balance_inquiry: 'Balance Inquiry',
  account_updates: 'Account Updates',
  statement_generation: 'Statement Generation',
  fund_transfers: 'Fund Transfers',
  bill_payments: 'Bill Payments',
  cash_withdrawal: 'Cash Withdrawal',
  cash_deposit: 'Cash Deposit',
  check_deposits: 'Check Deposits',
  pin_reset: 'PIN Reset',
  fraud_reporting: 'Fraud Reporting',
  mfa_setup: 'MFA Setup',
  assistance: 'CRO Assistance',
  receipt: 'Receipt',
};

// ── Demo data generators ──────────────────────────────────────────────────────

function generateDemoActivities(): ServiceActivity[] {
  const services: { id: ServiceName; name: string }[] = [
    { id: 'fingerprint_auth', name: 'Fingerprint Auth' },
    { id: 'balance_inquiry', name: 'Balance Inquiry' },
    { id: 'cash_withdrawal', name: 'Cash Withdrawal' },
    { id: 'fund_transfers', name: 'Fund Transfers' },
    { id: 'bill_payments', name: 'Bill Payments' },
    { id: 'account_updates', name: 'Account Updates' },
    { id: 'statement_generation', name: 'Statement Generation' },
    { id: 'cash_deposit', name: 'Cash Deposit' },
    { id: 'pin_reset', name: 'PIN Reset' },
    { id: 'fraud_reporting', name: 'Fraud Reporting' },
    { id: 'mfa_setup', name: 'MFA Setup' },
    { id: 'check_deposits', name: 'Check Deposits' },
  ];
  const statuses: ('success' | 'failure' | 'pending')[] = ['success','success','success','success','failure','pending'];
  const actions = ['User authentication','Balance check','Withdrawal processed','Transfer initiated','Bill payment','Account info updated','Statement generated','Deposit received','PIN change','Fraud alert filed','MFA enrolled','Check deposited'];
  const users = ['USR-1042','USR-2381','USR-0917','USR-5540','USR-3312',undefined,'USR-7821','USR-6104'];
  const now = Date.now();
  return Array.from({ length: 50 }, (_, i) => {
    const svc = services[i % services.length];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    return {
      id: i + 1,
      serviceId: svc.id,
      serviceName: svc.name,
      timestamp: new Date(now - i * 120_000 - Math.random() * 60_000).toISOString(),
      action: actions[i % actions.length],
      status,
      duration: Math.round(80 + Math.random() * 1400),
      errorMessage: status === 'failure' ? 'Connection timeout or service unavailable' : undefined,
      userId: users[Math.floor(Math.random() * users.length)] as string | undefined,
    };
  });
}

function generateDemoStats(): ServiceActivityStats {
  const now = Date.now();
  return {
    total: 1247, avgDuration: 342, successCount: 1089, failureCount: 103, pendingCount: 55,
    byService: [
      { serviceId: 'fingerprint_auth', serviceName: 'Fingerprint Auth', count: 312, avgDuration: 210 },
      { serviceId: 'cash_withdrawal', serviceName: 'Cash Withdrawal', count: 245, avgDuration: 480 },
      { serviceId: 'balance_inquiry', serviceName: 'Balance Inquiry', count: 198, avgDuration: 120 },
      { serviceId: 'fund_transfers', serviceName: 'Fund Transfers', count: 156, avgDuration: 560 },
      { serviceId: 'bill_payments', serviceName: 'Bill Payments', count: 112, avgDuration: 390 },
      { serviceId: 'account_updates', serviceName: 'Account Updates', count: 87, avgDuration: 270 },
      { serviceId: 'statement_generation', serviceName: 'Statement Generation', count: 62, avgDuration: 820 },
      { serviceId: 'cash_deposit', serviceName: 'Cash Deposit', count: 75, avgDuration: 410 },
    ],
    hourly: Array.from({ length: 24 }, (_, i) => {
      const h = new Date(now - (23 - i) * 3600_000);
      const count = Math.round(20 + Math.random() * 60);
      const success = Math.round(count * (0.8 + Math.random() * 0.15));
      return { hour: h.toISOString(), count, success, failure: count - success };
    }),
  };
}

// ── Shared stat cards ─────────────────────────────────────────────────────────

function StatsBar({ stats, activities }: { stats: ServiceActivityStats | null; activities: ServiceActivity[] }) {
  const successCount = stats?.successCount ?? activities.filter(a => a.status === 'success').length;
  const failureCount = stats?.failureCount ?? activities.filter(a => a.status === 'failure').length;
  const pendingCount = stats?.pendingCount ?? activities.filter(a => a.status === 'pending').length;
  const avgDuration = stats?.avgDuration ?? (activities.length > 0 ? Math.round(activities.reduce((s,a) => s + a.duration, 0) / activities.length) : 0);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { label: 'Successful',   value: successCount.toLocaleString(), color: 'text-green-600',  bg: 'bg-green-100',  Icon: CheckCircle2 },
        { label: 'Failed',       value: failureCount.toLocaleString(), color: 'text-red-600',    bg: 'bg-red-100',    Icon: XCircle },
        { label: 'Pending',      value: pendingCount.toLocaleString(), color: 'text-yellow-600', bg: 'bg-yellow-100', Icon: Clock },
        { label: 'Avg Duration', value: `${avgDuration}ms`,            color: 'text-blue-600',   bg: 'bg-blue-100',   Icon: BarChart3 },
      ].map(({ label, value, color, bg, Icon }) => (
        <Card key={label} className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
              <div className={`p-3 ${bg} rounded-full`}><Icon className={`h-5 w-5 ${color}`} /></div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Tab 1: App Activity ───────────────────────────────────────────────────────

function AppActivityTab() {
  const [activities, setActivities] = useState<ServiceActivity[]>([]);
  const [totalActivities, setTotalActivities] = useState(0);
  const [stats, setStats] = useState<ServiceActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [filterService, setFilterService] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [activityData, statsData] = await Promise.all([
        adminApi.getServiceActivity({
          serviceId: filterService !== 'all' ? filterService : undefined,
          status: filterStatus !== 'all' ? (filterStatus as 'success'|'failure'|'pending') : undefined,
        }),
        adminApi.getServiceActivityStats(),
      ]);
      setActivities(activityData.activities);
      setTotalActivities(activityData.total);
      setStats(statsData);
      setUsingDemo(false);
    } catch {
      const demo = generateDemoActivities();
      let filtered = demo;
      if (filterService !== 'all') filtered = filtered.filter(a => a.serviceId === filterService);
      if (filterStatus !== 'all') filtered = filtered.filter(a => a.status === filterStatus);
      setActivities(filtered);
      setTotalActivities(filtered.length);
      setStats(generateDemoStats());
      setUsingDemo(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filterService, filterStatus]);

  return (
    <div className="space-y-6">
      {usingDemo && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Showing demo data</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Could not reach the server. Data below is simulated.</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Retry</Button>
        </div>
      )}

      <StatsBar stats={stats} activities={activities} />

      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />Hourly Activity (Last 24h)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={stats.hourly}>
                  <defs>
                    <linearGradient id="saSuccessFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="saFailureFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <RechartsTooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Legend />
                  <Area type="monotone" dataKey="success" name="Success" stroke="#22c55e" fill="url(#saSuccessFill)" strokeWidth={2} stackId="1" />
                  <Area type="monotone" dataKey="failure" name="Failure" stroke="#ef4444" fill="url(#saFailureFill)" strokeWidth={2} stackId="1" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />Activity by Service
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={stats.byService.slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="serviceName" type="category" tick={{ fontSize: 10 }} width={110} />
                  <RechartsTooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="count" name="Count" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <History className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Kiosk App Activity Log</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <Select value={filterService} onValueChange={setFilterService}>
              <SelectTrigger className="w-[190px]"><SelectValue placeholder="Service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {(Object.keys(serviceLabels) as ServiceName[]).map(k => (
                  <SelectItem key={k} value={k}>{serviceLabels[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => { setFilterService('all'); setFilterStatus('all'); }}>
              <Filter className="h-4 w-4 mr-2" />Clear
            </Button>
          </div>
          <ScrollArea className="h-[420px]">
            {loading ? (
              <div className="flex items-center justify-center h-[360px]">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[360px] text-muted-foreground">
                <History className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg font-medium">No activities found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.map(a => {
                    const StatusIcon = a.status === 'success' ? CheckCircle2 : a.status === 'failure' ? XCircle : Clock;
                    return (
                      <Dialog key={a.id}>
                        <DialogTrigger asChild>
                          <TableRow className="cursor-pointer hover:bg-muted/50">
                            <TableCell className="whitespace-nowrap text-xs">{format(new Date(a.timestamp), 'dd MMM HH:mm:ss')}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={serviceColors[a.serviceId as ServiceName] ?? 'bg-gray-100 text-gray-800'}>
                                {serviceLabels[a.serviceId as ServiceName] ?? a.serviceId}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[140px] truncate text-sm">{a.action}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={a.status === 'success' ? 'bg-green-100 text-green-800 border-green-200' : a.status === 'failure' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}>
                                <StatusIcon className="h-3 w-3 mr-1" />{a.status}
                              </Badge>
                            </TableCell>
                            <TableCell className={a.duration < 500 ? 'text-green-600' : a.duration < 1500 ? 'text-yellow-600' : 'text-red-600'}>
                              {a.duration}ms
                            </TableCell>
                            <TableCell className="font-mono text-xs">{a.userId || 'System'}</TableCell>
                            <TableCell>
                              {a.errorMessage ? (
                                <div className="flex items-center gap-1 text-red-600">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  <span className="text-xs truncate max-w-[130px]">{a.errorMessage}</span>
                                </div>
                              ) : <span className="text-muted-foreground text-xs">-</span>}
                            </TableCell>
                          </TableRow>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Activity Details</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">ID</label>
                                <p className="text-sm font-mono">{a.id}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Timestamp</label>
                                <p className="text-sm">{format(new Date(a.timestamp), 'PPpp')}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Service</label>
                                <Badge variant="outline" className={serviceColors[a.serviceId as ServiceName] ?? 'bg-gray-100 text-gray-800'}>
                                  {serviceLabels[a.serviceId as ServiceName] ?? a.serviceId}
                                </Badge>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Service ID</label>
                                <p className="text-sm font-mono">{a.serviceId}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Status</label>
                                <Badge variant="outline" className={a.status === 'success' ? 'bg-green-100 text-green-800 border-green-200' : a.status === 'failure' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-yellow-100 text-yellow-800 border-yellow-200'}>
                                  <StatusIcon className="h-3 w-3 mr-1" />{a.status}
                                </Badge>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Duration</label>
                                <p className={`text-sm font-medium ${a.duration < 500 ? 'text-green-600' : a.duration < 1500 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {a.duration}ms
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Customer / User</label>
                                <p className="text-sm font-mono">{a.userId || 'System'}</p>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Action</label>
                              <p className="text-sm mt-1">{a.action}</p>
                            </div>
                            {a.errorMessage && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Error Message</label>
                                <p className="text-sm mt-1 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 p-3 rounded-md">{a.errorMessage}</p>
                              </div>
                            )}
                            {a.metadata && Object.keys(a.metadata).length > 0 && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Metadata</label>
                                <pre className="text-xs bg-muted p-3 rounded-md mt-1 overflow-auto">
                                  {JSON.stringify(a.metadata, null, 2)}
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
          <p className="mt-3 text-xs text-muted-foreground">Showing {activities.length} of {totalActivities.toLocaleString()} entries</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function ServiceActivityMonitor() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Customer Activity</h2>
          <p className="text-sm text-muted-foreground">All customer interactions, transactions, and assisted requests</p>
        </div>
      </div>

      <Tabs defaultValue="activity" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />App Activity
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />Transaction Logs
          </TabsTrigger>
          <TabsTrigger value="assisted" className="flex items-center gap-2">
            <Headset className="h-4 w-4" />Assisted Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity">
          <AppActivityTab />
        </TabsContent>
        <TabsContent value="transactions">
          <TransactionLogs />
        </TabsContent>
        <TabsContent value="assisted">
          <TransactionLogs mode="assisted" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
