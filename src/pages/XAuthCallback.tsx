import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BankingButton } from '@/components/ui/banking-button';
import { Loader2, Shield, AlertCircle, ArrowLeft } from 'lucide-react';
import { adminApi } from '@/services/adminApi';

export default function XAuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('No token received from Staff360. Please try signing in again.');
      setProcessing(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const response = await adminApi.xauthLogin(token);
        if (!cancelled) {
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
            navigate('/admin', { replace: true });
          } else {
            setError('Authentication failed. Please try again.');
            setProcessing(false);
          }
        }
      } catch (err) {
        console.error('XAuth callback error:', err);
        if (!cancelled) {
          setError('Could not verify your Staff360 identity. Please try again.');
          setProcessing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/15 via-background to-primary/20 relative overflow-hidden p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="border-2 border-amber-200/50 shadow-2xl shadow-amber-500/10 bg-card/80 backdrop-blur-md">
          <CardContent className="p-8">
            {processing ? (
              <div className="text-center">
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-amber-600" />
                <h1 className="text-xl font-bold text-foreground mt-6">Verifying Staff360 identity</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Please wait while we complete your sign-in…
                </p>
              </div>
            ) : error ? (
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-2xl mb-4 border border-red-200/50">
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <h1 className="text-xl font-bold text-foreground">Sign-in Failed</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    We could not authenticate you via Staff360
                  </p>
                </div>

                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>

                <Link to="/admin/login" className="block mt-6">
                  <BankingButton variant="default" size="lg" className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white">
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    Back to Admin Login
                  </BankingButton>
                </Link>
              </div>
            ) : (
              <div className="text-center">
                <Shield className="mx-auto h-10 w-10 text-amber-600" />
                <p className="text-sm text-muted-foreground mt-4">Redirecting…</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
