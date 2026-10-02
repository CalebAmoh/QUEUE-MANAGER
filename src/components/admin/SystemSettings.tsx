import { useEffect, useState } from 'react';
import type { DbService } from '@/types/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Settings,
  RefreshCw,
  Power,
  Zap,
  Monitor,
  Headphones,
  AlertTriangle,
  WifiOff,
} from 'lucide-react';
import { BACKEND_URL } from '@/config';

type ServiceType = 'self-service' | 'assisted';

// Backend API base URL — always use the same host as the browser, port 9002
const API_BASE = BACKEND_URL;

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }
  return res;
}

export function SystemSettings() {
  const [selfServices, setSelfServices] = useState<DbService[]>([]);
  const [assistedServices, setAssistedServices] = useState<DbService[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<ServiceType>('self-service');

  const fetchServices = async () => {
    setLoading(true);
    setError(null);
    try {
      const [selfRes, assistedRes] = await Promise.all([
        apiFetch('/api/admin/services/self-service'),
        apiFetch('/api/admin/services/assisted'),
      ]);
      const selfData: DbService[] = await selfRes.json();
      const assistedData: DbService[] = await assistedRes.json();
      setSelfServices(selfData);
      setAssistedServices(assistedData);
    } catch (err) {
      console.error('Failed to fetch services:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to connect to the server. Make sure the backend is running on port 3001.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const toggleService = async (type: ServiceType, service: DbService) => {
    const key = `${type}-${service.id}`;
    setUpdating((prev) => new Set(prev).add(key));
    try {
      const res = await apiFetch(`/api/admin/services/${type}/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !service.enabled }),
      });
      const updated: DbService = await res.json();
      const updater = (prev: DbService[]) =>
        prev.map((s) => (s.id === updated.id ? updated : s));

      if (type === 'self-service') {
        setSelfServices(updater);
      } else {
        setAssistedServices(updater);
      }
    } catch (err) {
      console.error('Failed to update service:', err);
      setError(`Failed to toggle service "${service.title}". ${err instanceof Error ? err.message : ''}`);
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const batchToggle = async (type: ServiceType, enabled: boolean) => {
    const batchKey = `batch-${type}`;
    setUpdating((prev) => new Set(prev).add(batchKey));
    try {
      const res = await apiFetch(`/api/admin/services/${type}/batch`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const updatedList: DbService[] = await res.json();
      if (type === 'self-service') {
        setSelfServices(updatedList);
      } else {
        setAssistedServices(updatedList);
      }
    } catch (err) {
      console.error('Failed to batch toggle services:', err);
      setError(`Failed to ${enabled ? 'enable' : 'disable'} all ${type} services. ${err instanceof Error ? err.message : ''}`);
    } finally {
      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(batchKey);
        return next;
      });
    }
  };

  const allServices = [...selfServices, ...assistedServices];
  const totalEnabled = allServices.filter((s) => s.enabled).length;

  const renderLoadingSkeleton = () => (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="rounded-2xl border-l-4 border-l-muted">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full max-w-md" />
                <Skeleton className="h-3 w-48" />
              </div>
              <div className="ml-6 flex flex-col items-center gap-2">
                <Skeleton className="h-6 w-10 rounded-full" />
                <Skeleton className="h-3 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderServiceList = (services: DbService[], type: ServiceType) => (
    <ScrollArea className="h-[500px]">
      {loading ? (
        renderLoadingSkeleton()
      ) : (
        <div className="space-y-4">
          {services.map((service) => {
            const key = `${type}-${service.id}`;
            return (
              <Card
                key={service.id}
                className="rounded-2xl border-l-4"
                style={{ borderLeftColor: service.enabled ? '#22c55e' : '#ef4444' }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{service.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {service.tag}
                        </Badge>
                        <Badge
                          variant={service.enabled ? 'default' : 'secondary'}
                          className={
                            service.enabled
                              ? 'bg-green-100 text-green-800 border-green-200'
                              : 'bg-red-100 text-red-800 border-red-200'
                          }
                        >
                          {service.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {service.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Service ID: <code className="bg-muted px-1 rounded">{service.serviceId}</code>
                        {' · '}
                        Display Order: {service.displayOrder}
                      </p>
                    </div>

                    <div className="ml-6 flex flex-col items-center gap-2">
                      <Switch
                        checked={service.enabled}
                        onCheckedChange={() => toggleService(type, service)}
                        disabled={updating.has(key)}
                      />
                      <span
                        className={`text-xs font-medium ${service.enabled ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {updating.has(key) ? '...' : service.enabled ? 'ON' : 'OFF'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {services.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No services found.
            </div>
          )}
        </div>
      )}
    </ScrollArea>
  );

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <Alert variant="destructive" className="rounded-2xl">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={fetchServices} className="ml-4 shrink-0">
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Services</p>
                <p className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-8 w-12 inline-block" /> : allServices.length}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Settings className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Enabled</p>
                <p className="text-2xl font-bold">
                  {loading ? <Skeleton className="h-8 w-12 inline-block" /> : totalEnabled}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Power className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Self-Service</p>
                <p className="text-2xl font-bold">
                  {loading ? (
                    <Skeleton className="h-8 w-16 inline-block" />
                  ) : (
                    `${selfServices.filter((s) => s.enabled).length}/${selfServices.length}`
                  )}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Monitor className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Assisted</p>
                <p className="text-2xl font-bold">
                  {loading ? (
                    <Skeleton className="h-8 w-16 inline-block" />
                  ) : (
                    `${assistedServices.filter((s) => s.enabled).length}/${assistedServices.length}`
                  )}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Headphones className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Service Configuration */}
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Service Configuration</CardTitle>
                <CardDescription>
                  Enable or disable services for customer kiosk. Changes reflect immediately.
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchServices} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ServiceType)}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="self-service" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Self-Service ({loading ? '...' : selfServices.length})
              </TabsTrigger>
              <TabsTrigger value="assisted" className="flex items-center gap-2">
                <Headphones className="h-4 w-4" />
                Assisted Services ({loading ? '...' : assistedServices.length})
              </TabsTrigger>
            </TabsList>

            {/* Batch toggle buttons */}
            {!loading && (
              <div className="flex items-center justify-end gap-2 mb-4">
                <span className="text-xs text-muted-foreground mr-1">Quick actions:</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-700 border-green-200 hover:bg-green-50"
                  disabled={updating.has(`batch-${activeTab}`)}
                  onClick={() => batchToggle(activeTab, true)}
                >
                  <Power className="h-3 w-3 mr-1" />
                  {updating.has(`batch-${activeTab}`) ? 'Updating...' : 'Enable All'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-700 border-red-200 hover:bg-red-50"
                  disabled={updating.has(`batch-${activeTab}`)}
                  onClick={() => batchToggle(activeTab, false)}
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {updating.has(`batch-${activeTab}`) ? 'Updating...' : 'Disable All'}
                </Button>
              </div>
            )}

            <TabsContent value="self-service">
              {renderServiceList(selfServices, 'self-service')}
            </TabsContent>

            <TabsContent value="assisted">
              {renderServiceList(assistedServices, 'assisted')}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
