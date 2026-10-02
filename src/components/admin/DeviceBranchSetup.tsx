import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Server,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Building2,
  HelpCircle
} from 'lucide-react';
import { adminApi } from '@/services/adminApi';
import { api } from '@/services/bankassistApi';

interface DeviceBranchMapping {
  id: number;
  ipAddress: string;
  branchId: string;
  branchName: string;
  createdAt: string;
}

interface BranchLOV {
  actualCode: string;
  subCode: string | null;
  description: string;
}

export function DeviceBranchSetup() {
  const [mappings, setMappings] = useState<DeviceBranchMapping[]>([]);
  const [branches, setBranches] = useState<BranchLOV[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [ipAddress, setIpAddress] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  
  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch data
  const fetchData = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [mappingRes, branchRes] = await Promise.allSettled([
        adminApi.getDeviceBranches(),
        api.getBranches(),
      ]);

      if (branchRes.status === 'fulfilled') {
        setBranches(branchRes.value || []);
      } else {
        console.error('Failed to load branches:', branchRes.reason);
      }

      if (mappingRes.status === 'fulfilled') {
        setMappings(mappingRes.value || []);
      } else {
        console.error('Failed to load device mappings:', mappingRes.reason);
        const errMsg = mappingRes.reason?.message || '';
        if (errMsg.includes('401') || errMsg.toLowerCase().includes('unauthorized') || errMsg.toLowerCase().includes('token')) {
          setError('Admin session has expired. Please log out and log back in from the top right menu.');
        } else {
          setError('Failed to fetch device mappings from server.');
        }
      }
    } catch (err: any) {
      console.error('Failed to load Device Registry data:', err);
      setError('Failed to fetch data from server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // IP Regex Validation
  const validateIp = (ip: string) => {
    const regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return regex.test(ip.trim());
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedIp = ipAddress.trim();

    if (!trimmedIp) {
      setError('IP Address is required.');
      return;
    }

    if (!validateIp(trimmedIp)) {
      setError('Invalid IPv4 address format (e.g., 10.203.14.169).');
      return;
    }

    if (!selectedBranchId) {
      setError('Please select a branch to map this IP to.');
      return;
    }

    const branch = branches.find((b) => b.actualCode === selectedBranchId);
    if (!branch) {
      setError('Selected branch is invalid.');
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.createDeviceBranch({
        ipAddress: trimmedIp,
        branchId: branch.actualCode,
        branchName: branch.description,
      });

      setSuccess(`Device ${trimmedIp} successfully registered to ${branch.description} (${branch.actualCode}).`);
      setIpAddress('');
      setSelectedBranchId('');
      
      // Log event
      adminApi.writeAuditLog({
        level: 'info',
        category: 'system',
        action: 'Register Kiosk Device IP',
        details: `Kiosk IP ${trimmedIp} mapped to Branch ${branch.description} (${branch.actualCode})`,
        status: 'success'
      });

      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to register device IP mapping.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number, ip: string, branchName: string) => {
    if (!confirm(`Are you sure you want to remove the IP registry mapping for ${ip}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await adminApi.deleteDeviceBranch(id);
      setSuccess(`Successfully deleted mapping for Kiosk IP ${ip}.`);
      
      // Log event
      adminApi.writeAuditLog({
        level: 'warning',
        category: 'system',
        action: 'Remove Kiosk Device IP',
        details: `Deleted Kiosk mapping for IP ${ip} (was in branch ${branchName})`,
        status: 'success'
      });

      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to remove device mapping.');
    }
  };

  const filteredMappings = mappings.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      m.ipAddress.toLowerCase().includes(term) ||
      m.branchId.toLowerCase().includes(term) ||
      m.branchName.toLowerCase().includes(term)
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Loading branch & device registry...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Server className="h-6 w-6 text-primary" />
            Device Branch Registry
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Map self-service kiosk IP addresses to specific bank branches for teller queue routing.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchData}
          disabled={refreshing}
          className="w-fit"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Alert Banners */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="border-emerald-500 bg-emerald-50/50 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Register New IP Card */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Register Kiosk Device
            </CardTitle>
            <CardDescription>
              Assign a static IP to a branch queue.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ipAddress">Kiosk IP Address</Label>
                <Input
                  id="ipAddress"
                  type="text"
                  placeholder="e.g., 10.203.14.169"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  className="font-mono text-sm"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Assigned Branch</Label>
                <div className="relative">
                  <select
                    id="branch"
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none pr-8"
                    disabled={submitting || branches.length === 0}
                  >
                    <option value="">-- Select Branch --</option>
                    {branches.map((b) => (
                      <option key={b.actualCode} value={b.actualCode}>
                        {b.description} ({b.actualCode})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                  </div>
                </div>
                {branches.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Core Bank branches LOV is empty. Check API endpoint.
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Registry Mapping
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right Side: List Registry Mappings */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold">Registered Devices</CardTitle>
                <CardDescription>
                  List of kiosks currently mapped to active branch queues.
                </CardDescription>
              </div>
              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search IP, branch..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredMappings.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[250px] text-muted-foreground border border-dashed rounded-lg p-6">
                <HelpCircle className="h-8 w-8 opacity-25 mb-2" />
                <p className="text-sm font-medium">No registered devices found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Add your first IP address mapping on the left.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Kiosk Device IP</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Branch Code</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Branch Description</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMappings.map((m) => (
                      <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20 transition-all font-medium">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">
                          {m.ipAddress}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="font-semibold">{m.branchId}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {m.branchName}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(m.id, m.ipAddress, m.branchName)}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
