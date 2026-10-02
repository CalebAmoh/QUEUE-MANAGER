import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Shield,
  Clock,
  Fingerprint,
  FileText,
  Gauge,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Bell,
  Database,
  Wrench,
  Loader2,
} from 'lucide-react';
import { adminApi } from '@/services/adminApi';

interface SettingsState {
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
}

const DEFAULT_SETTINGS: SettingsState = {
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
};

export function AdminSettings() {
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    adminApi.getSystemSettings()
      .then((data) => {
        const s = data as SettingsState;
        setSettings(s);
        setOriginalSettings(s);
      })
      .catch(() => setError('Failed to load settings. Showing defaults.'))
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await adminApi.updateSystemSettings(settings);
      const s = updated as SettingsState;
      setSettings(s);
      setOriginalSettings(s);
      setSaved(true);
      setHasChanges(false);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(originalSettings);
    setHasChanges(false);
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading settings…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-600" />
            System Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Configure system-wide behaviour and limits</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" size="sm" onClick={handleReset} disabled={saving} className="gap-2">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving} className="gap-2">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {saved && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-400">Settings saved successfully.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700 dark:text-red-400">{error}</AlertDescription>
        </Alert>
      )}

      {/* Maintenance Mode — prominent warning card */}
      <Card className={settings.maintenanceMode ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wrench className="h-4 w-4 text-amber-600" />
            Maintenance Mode
            {settings.maintenanceMode && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-300 ml-2">ACTIVE</Badge>
            )}
          </CardTitle>
          <CardDescription className="text-xs">
            When enabled, the customer kiosk will display a maintenance message and block all transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Enable Maintenance Mode</Label>
              <p className="text-xs text-muted-foreground">Kiosk will be inaccessible to customers</p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(v) => update('maintenanceMode', v)}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
          {settings.maintenanceMode && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Customers will see a maintenance screen until this is turned off.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Timeouts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600" />
            Session Timeouts
          </CardTitle>
          <CardDescription className="text-xs">Configure idle and screen timeouts across the customer kiosk and admin dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sessionTimeout" className="text-sm flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Kiosk Session Timeout (seconds)
              </Label>
              <Input
                id="sessionTimeout"
                type="number"
                min={0}
                value={settings.sessionTimeout}
                onChange={(e) => update('sessionTimeout', parseInt(e.target.value) || 0)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">Idle time before an in-progress customer session resets to home ({Math.floor(settings.sessionTimeout / 60)}m {settings.sessionTimeout % 60}s)</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="serviceSelectionTimeout" className="text-sm flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Service Selection Timeout (seconds)
              </Label>
              <Input
                id="serviceSelectionTimeout"
                type="number"
                min={0}
                value={settings.serviceSelectionTimeout}
                onChange={(e) => update('serviceSelectionTimeout', parseInt(e.target.value) || 0)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">Countdown on the "Select a Service" screen</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="transactionCompleteTimeout" className="text-sm flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Transaction Complete Screen (seconds)
              </Label>
              <Input
                id="transactionCompleteTimeout"
                type="number"
                min={0}
                value={settings.transactionCompleteTimeout}
                onChange={(e) => update('transactionCompleteTimeout', parseInt(e.target.value) || 0)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">Auto-return to home after a transaction completes</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adminSessionTimeout" className="text-sm flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Admin Session Timeout (minutes)
              </Label>
              <Input
                id="adminSessionTimeout"
                type="number"
                min={0}
                value={settings.adminSessionTimeout}
                onChange={(e) => update('adminSessionTimeout', parseInt(e.target.value) || 0)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">Idle time before the admin dashboard logs out</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session & Security */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-blue-600" />
            Session & Security
          </CardTitle>
          <CardDescription className="text-xs">Control biometric caching and rate limiting.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Fingerprint className="h-3.5 w-3.5 text-muted-foreground" />
                Biometric Cache
              </Label>
              <p className="text-xs text-muted-foreground">Cache fingerprint templates locally to speed up verification</p>
            </div>
            <Switch checked={settings.enableBiometricCache} onCheckedChange={(v) => update('enableBiometricCache', v)} />
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                  Rate Limiting
                </Label>
                <p className="text-xs text-muted-foreground">Protect the API from excessive requests</p>
              </div>
              <Switch checked={settings.enableRateLimiting} onCheckedChange={(v) => update('enableRateLimiting', v)} />
            </div>
            {settings.enableRateLimiting && (
              <div className="ml-5 space-y-1.5">
                <Label htmlFor="rateLimit" className="text-xs text-muted-foreground">Requests per minute</Label>
                <Input
                  id="rateLimit"
                  type="number"
                  value={settings.rateLimitRequestsPerMinute}
                  onChange={(e) => update('rateLimitRequestsPerMinute', parseInt(e.target.value) || 0)}
                  className="h-8 max-w-[140px] text-sm"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logging & Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-600" />
            Logging & Notifications
          </CardTitle>
          <CardDescription className="text-xs">Control what gets logged and when notifications are sent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Database className="h-3.5 w-3.5 text-muted-foreground" />
                Detailed Audit Logging
              </Label>
              <p className="text-xs text-muted-foreground">Log full request details, user agents, and metadata</p>
            </div>
            <Switch checked={settings.enableDetailedLogging} onCheckedChange={(v) => update('enableDetailedLogging', v)} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                Audit Logging
              </Label>
              <p className="text-xs text-muted-foreground">Record all admin and security events to the audit log</p>
            </div>
            <Switch checked={settings.enableAuditLogging} onCheckedChange={(v) => update('enableAuditLogging', v)} />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                Transaction Notifications
              </Label>
              <p className="text-xs text-muted-foreground">Send alerts for large or suspicious transactions</p>
            </div>
            <Switch checked={settings.enableTransactionNotifications} onCheckedChange={(v) => update('enableTransactionNotifications', v)} />
          </div>
        </CardContent>
      </Card>

      {/* Save footer */}
      {hasChanges && (
        <div className="flex items-center justify-end gap-3 py-2">
          <p className="text-xs text-muted-foreground">You have unsaved changes</p>
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
          <Button size="sm" onClick={handleSave} className="gap-2">
            <Save className="h-3.5 w-3.5" />
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
