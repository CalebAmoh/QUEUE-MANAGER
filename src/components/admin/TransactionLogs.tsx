import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Download, Search, Filter,
  ArrowUpCircle, ArrowDownCircle, ChevronLeft, ChevronRight, Headphones,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { BACKEND_URL } from '@/config';
import type { SelfServTransaction } from '@/types/admin';

const API_BASE = BACKEND_URL;
const PAGE_SIZE = 20;

interface TransactionLogsProps {
  mode?: 'transactions' | 'assisted';
}

export function TransactionLogs({ mode = 'transactions' }: TransactionLogsProps) {
  const isAssisted = mode === 'assisted';
  const [rows, setRows] = useState<SelfServTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'WITHDRAWAL' | 'DEPOSIT'>('ALL');
  const [filterServed, setFilterServed] = useState<'ALL' | 'Y' | 'N'>('ALL');

  const fetchTxns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: PAGE_SIZE.toString(),
        offset: (page * PAGE_SIZE).toString(),
      });
      if (isAssisted) {
        params.set('transType', 'ASSISTANCE');
      } else if (filterType === 'ALL') {
        params.set('transTypes', 'WITHDRAWAL,DEPOSIT');
      } else {
        params.set('transType', filterType);
      }
      if (filterServed !== 'ALL') params.set('isServed', filterServed);

      const res = await fetch(`${API_BASE}/api/admin/transactions?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRows(data.transactions ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterServed, isAssisted]);

  useEffect(() => { fetchTxns(); }, [fetchTxns]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filtered = search.trim()
    ? rows.filter(r =>
        [r.ticket_id, r.cr_account, r.dr_account, r.doc_ref, r.param1]
          .some(v => v?.toLowerCase().includes(search.toLowerCase()))
      )
    : rows;

  const formatAmount = (amount: number, currency = 'GHS') =>
    new Intl.NumberFormat('en-GH', { style: 'currency', currency: currency ?? 'GHS' }).format(amount);

  const formatDate = (dt: string | null) =>
    dt ? new Date(dt).toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  const exportCSV = () => {
    const header = ['Ticket ID', 'Type', 'DR Account', 'CR Account', 'Amount', 'Currency', 'Doc Ref', 'Status', 'Customer', 'Service', 'Created At'];
    const csvRows = filtered.map(r => [
      r.ticket_id ?? '',
      r.trans_type,
      r.dr_account ?? '',
      r.cr_account ?? '',
      r.trans_type === 'ASSISTANCE' ? '' : r.amount,
      r.currency ?? 'GHS',
      r.doc_ref ?? '',
      r.is_served === 'Y' ? 'Served' : 'Pending',
      r.param1 ?? '',
      r.param2 ?? '',
      r.created_at,
    ]);
    const csv = [header, ...csvRows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${isAssisted ? 'assisted-requests' : 'transactions'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">{isAssisted ? 'Assisted Requests' : 'Transaction Logs'}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAssisted
              ? 'Assisted requests logged by the self-service kiosk'
              : 'Self-service kiosk transactions — cash withdrawals &amp; deposits'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTxns} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-1.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-3 px-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search ticket, account, customer…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-8 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              {!isAssisted && (
                <Select value={filterType} onValueChange={v => { setFilterType(v as 'ALL' | 'WITHDRAWAL' | 'DEPOSIT'); setPage(0); }}>
                  <SelectTrigger className="h-8 w-[140px] text-sm">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                    <SelectItem value="DEPOSIT">Deposit</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <Select value={filterServed} onValueChange={v => { setFilterServed(v as 'ALL' | 'Y' | 'N'); setPage(0); }}>
                <SelectTrigger className="h-8 w-[130px] text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="N">Pending</SelectItem>
                  <SelectItem value="Y">Served</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground ml-auto whitespace-nowrap">
              {total.toLocaleString()} record{total !== 1 ? 's' : ''}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {isAssisted ? 'Assisted Requests' : 'Transactions'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Type</th>
                  <th className="px-4 py-2.5 text-left font-medium">Ticket</th>
                  <th className="px-4 py-2.5 text-left font-medium">Customer</th>
                  <th className="px-4 py-2.5 text-left font-medium">Account</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-4 py-2.5 text-left font-medium">Doc Ref</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
                      <RefreshCw className="w-5 h-5 animate-spin inline mr-2" />
                      Loading transactions…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, i) => {
                    const isWithdrawal = row.trans_type === 'WITHDRAWAL';
                    const isDeposit    = row.trans_type === 'DEPOSIT';
                    const isAssistance = row.trans_type === 'ASSISTANCE';
                    const account = isWithdrawal
                      ? row.dr_account
                      : isDeposit
                      ? row.cr_account
                      : null;

                    const typeColor = isWithdrawal
                      ? 'text-red-600 dark:text-red-400'
                      : isDeposit
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-blue-600 dark:text-blue-400';

                    const TypeIcon = isWithdrawal
                      ? ArrowUpCircle
                      : isDeposit
                      ? ArrowDownCircle
                      : Headphones;

                    const iconColor = isWithdrawal
                      ? 'text-red-500'
                      : isDeposit
                      ? 'text-green-500'
                      : 'text-blue-500';

                    return (
                      <Dialog key={`${row.ticket_id}-${i}`}>
                        <DialogTrigger asChild>
                          <tr className="border-b last:border-0 hover:bg-muted/20 cursor-pointer transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <TypeIcon className={`w-4 h-4 shrink-0 ${iconColor}`} />
                                <span className={`font-medium text-xs ${typeColor}`}>
                                  {isAssisted ? 'Assisted' : row.trans_type}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                              {row.ticket_id ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium">{row.param1 ?? '—'}</span>
                              {isAssistance && row.param2 && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">{row.param2}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">
                              {isAssistance ? (
                                <span className="text-muted-foreground italic text-xs">Teller desk</span>
                              ) : (
                                account ?? '—'
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold tabular-nums">
                              {isAssistance ? (
                                <span className="text-muted-foreground text-xs">—</span>
                              ) : (
                                formatAmount(row.amount, row.currency ?? 'GHS')
                              )}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                              {row.doc_ref ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={row.is_served === 'Y' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {row.is_served === 'Y' ? 'Served' : 'Pending'}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(row.created_at)}
                            </td>
                          </tr>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{isAssisted ? 'Assisted Request Details' : 'Transaction Details'}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Ticket ID</label>
                                <p className="text-sm font-mono">{row.ticket_id ?? '—'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Type</label>
                                <span className={`font-medium text-sm ${typeColor}`}>
                                  {isAssisted ? 'Assisted' : row.trans_type}
                                </span>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Customer</label>
                                <p className="text-sm">{row.param1 ?? '—'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Account</label>
                                <p className="text-sm font-mono">
                                  {isAssistance ? <span className="italic text-muted-foreground">Teller desk</span> : (account ?? '—')}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">DR Account</label>
                                <p className="text-sm font-mono">{row.dr_account ?? '—'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">CR Account</label>
                                <p className="text-sm font-mono">{row.cr_account ?? '—'}</p>
                              </div>
                              {!isAssistance && (
                                <>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Amount</label>
                                    <p className="text-sm font-semibold">{formatAmount(row.amount, row.currency ?? 'GHS')}</p>
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Currency</label>
                                    <p className="text-sm">{row.currency ?? 'GHS'}</p>
                                  </div>
                                </>
                              )}
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Doc Ref</label>
                                <p className="text-sm font-mono">{row.doc_ref ?? '—'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Service</label>
                                <p className="text-sm font-mono">{row.param3 ?? '—'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Status</label>
                                <Badge variant={row.is_served === 'Y' ? 'default' : 'secondary'} className="text-xs">
                                  {row.is_served === 'Y' ? 'Served' : 'Pending'}
                                </Badge>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Served By</label>
                                <p className="text-sm">{row.served_by ?? '—'}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Created At</label>
                                <p className="text-sm">{formatDate(row.created_at)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Posting Date</label>
                                <p className="text-sm">{formatDate(row.posting_date)}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Served At</label>
                                <p className="text-sm">{formatDate(row.served_at)}</p>
                              </div>
                            </div>
                            {row.param2 && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Description / Notes</label>
                                <p className="text-sm mt-1 bg-muted p-3 rounded-md">{row.param2}</p>
                              </div>
                            )}
                            {row.param4 && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Reference 4</label>
                                <p className="text-sm font-mono mt-1">{row.param4}</p>
                              </div>
                            )}
                            {row.param5 && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">Reference 5</label>
                                <p className="text-sm font-mono mt-1">{row.param5}</p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {page + 1} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
