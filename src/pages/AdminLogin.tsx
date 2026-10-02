import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BankingButton } from '@/components/ui/banking-button';
import {
  Shield,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  User,
  AlertCircle,
  ArrowLeft,
  Fingerprint,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminApi } from '@/services/adminApi';
import { XAUTH_HOST, XAUTH_APP_KEY } from '@/config';

// Demo credentials
const DEMO_ACCOUNTS = [
  { username: 'admin', password: 'admin123', role: 'Super Admin' },
  { username: 'manager', password: 'manager123', role: 'Branch Manager' },
];

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  // If already authenticated, redirect to admin dashboard
  useEffect(() => {
    const authData = sessionStorage.getItem('adminAuth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed.username && parsed.role) {
          navigate('/admin', { replace: true });
        }
      } catch {
        sessionStorage.removeItem('adminAuth');
      }
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await adminApi.login(username.trim(), password);

      if (response.success && response.token) {
        sessionStorage.setItem(
          'adminAuth',
          JSON.stringify({
            username: response.user.username,
            role: response.user.role,
            token: response.token,
            loginTime: new Date().toISOString(),
          })
        );
        navigate('/admin');
      } else {
        setError('Invalid username or password.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Invalid username or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (account: (typeof DEMO_ACCOUNTS)[0]) => {
    setUsername(account.username);
    setPassword(account.password);
    setError('');
  };

  const startXAuthLogin = () => {
    setError('');
    if (!XAUTH_APP_KEY) {
      setError('Staff360 sign-in is not configured on this server yet.');
      return;
    }
    // Redirect to Staff360's hosted login page; the callback route (/xauth/callback)
    // receives the opaque token and exchanges it server-side for a session.
    window.location.href = `${XAUTH_HOST}/api/v1/xauth/signin/initiate?app_key=${encodeURIComponent(XAUTH_APP_KEY)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/15 via-background to-primary/20 relative overflow-hidden p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back to Home */}
        <div className="mb-6">
          <Link to="/">
            <BankingButton variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Portal
            </BankingButton>
          </Link>
        </div>

        <Card className="border-2 border-amber-200/50 shadow-2xl shadow-amber-500/10 bg-card/80 backdrop-blur-md">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/10 rounded-2xl mb-4 border border-amber-200/50">
                <Shield className="h-8 w-8 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Sign in to access the administration dashboard
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter username"
                    className="pl-10 h-11"
                    autoComplete="username"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="Enter password"
                    className="pl-10 pr-10 h-11"
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}

              <BankingButton
                type="submit"
                variant="default"
                size="lg"
                className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-5 w-5" />
                    Sign In
                  </>
                )}
              </BankingButton>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            {/* XAuth (Staff360) sign-in */}
            <BankingButton
              type="button"
              variant="outline"
              size="lg"
              className="w-full h-12"
              onClick={startXAuthLogin}
            >
              <Fingerprint className="mr-2 h-5 w-5" />
              Sign in with Staff360
            </BankingButton>

            {/* Demo Credentials Toggle */}
            <div className="mt-6 pt-5 border-t border-border/50">
              <button
                type="button"
                onClick={() => setShowDemo(!showDemo)}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {showDemo ? 'Hide' : 'Show'} demo credentials
              </button>

              {showDemo && (
                <div className="mt-3 space-y-2">
                  {DEMO_ACCOUNTS.map((account) => (
                    <button
                      key={account.username}
                      type="button"
                      onClick={() => fillDemoCredentials(account)}
                      className="w-full flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors text-left"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {account.username}{' '}
                          <span className="text-muted-foreground font-normal">/ {account.password}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{account.role}</p>
                      </div>
                      <span className="text-xs text-primary font-medium">Use →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          SecureBank Administration • Authorized Personnel Only
        </p>
      </div>
    </div>
  );
}
