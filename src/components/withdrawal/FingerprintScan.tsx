import React, { useState, useEffect, useCallback } from 'react';
import { Fingerprint, AlertCircle, CheckCircle, Loader2, RefreshCw, Scan, ShieldCheck, Info } from 'lucide-react';
import { BankingButton } from '../ui/banking-button';
import { Card, CardContent } from '../ui/card';
import axios from 'axios';

interface User {
  name: string;
  account: string;
  balance: number;
}

interface FingerprintScanProps {
  onSuccess: (fingerprintData: string) => void;
  isAssisted?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

type ScanStatus = 'idle' | 'initializing' | 'ready' | 'scanning' | 'processing' | 'success' | 'error';

const FingerprintScan: React.FC<FingerprintScanProps> = ({ onSuccess, isAssisted = false, isLoading = false, error: externalError = null }) => {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [scanProgress, setScanProgress] = useState(0);
  

  // Initialize scanner on mount
  useEffect(() => {
    initializeScanner();
  }, []);

  // Simulate scan progress
  useEffect(() => {
    if (status === 'scanning') {
      setScanProgress(0);
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [status]);

  const initializeScanner = async () => {
    setStatus('initializing');
    setErrorMessage('');
    
    try {
      const response = await axios.get('/init');
      if (response.data) {
        setStatus('ready');
      } else {
        throw new Error('Scanner initialization failed');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Failed to initialize fingerprint scanner. Please ensure the device is connected.');
    }
  };

  const handleScan = useCallback(async () => {
    setStatus('scanning');
    setErrorMessage('');

    try {
      // Simulate fingerprint scanning time
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      setStatus('processing');
      
      // Instead of doing verification here, we pass a placeholder to trigger parent's verification
      // The parent (WithdrawalApp) will handle the actual /verify API call
      setStatus('success');
      setTimeout(() => {
        onSuccess('fingerprint-captured');
      }, 1200);
    } catch {
      setStatus('error');
      setErrorMessage('Fingerprint not recognized. Please try again or contact support.');
    }
  }, [onSuccess]);

  const getStatusConfig = () => {
    switch (status) {
      case 'idle':
      case 'initializing':
        return {
          icon: <Loader2 className="w-8 h-8 text-primary animate-spin" />,
          title: 'Initializing Scanner',
          subtitle: 'Please wait while we prepare the device...',
          color: 'primary',
          pulseColor: 'bg-primary/20',
        };
      case 'ready':
        return {
          icon: <Fingerprint className="w-10 h-10 text-primary" />,
          title: 'Scanner Ready',
          subtitle: 'Place your finger on the scanner to begin',
          color: 'primary',
          pulseColor: 'bg-primary/20',
        };
      case 'scanning':
        return {
          icon: <Scan className="w-10 h-10 text-blue-500 animate-pulse" />,
          title: 'Scanning...',
          subtitle: 'Keep your finger steady on the scanner',
          color: 'blue',
          pulseColor: 'bg-blue-400/30',
        };
      case 'processing':
        return {
          icon: <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />,
          title: 'Processing',
          subtitle: 'Verifying your identity...',
          color: 'amber',
          pulseColor: 'bg-amber-400/30',
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-10 h-10 text-emerald-500" />,
          title: 'Verified Successfully',
          subtitle: 'Identity confirmed. Redirecting...',
          color: 'emerald',
          pulseColor: 'bg-emerald-400/30',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-10 h-10 text-red-500" />,
          title: 'Verification Failed',
          subtitle: errorMessage,
          color: 'red',
          pulseColor: 'bg-red-400/30',
        };
      default:
        return {
          icon: <Fingerprint className="w-10 h-10 text-primary" />,
          title: 'Scanner Ready',
          subtitle: 'Place your finger on the scanner',
          color: 'primary',
          pulseColor: 'bg-primary/20',
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Determine effective status considering parent's loading/error states
  // const getEffectiveStatusConfig = () => {
  //   if (isLoading) {
  //     return {
  //       icon: <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />,
  //       title: 'Verifying Identity',
  //       subtitle: 'Please wait while we verify your fingerprint...',
  //       color: 'amber',
  //       pulseColor: 'bg-amber-400/30',
  //     };
  //   }
  //   if (externalError) {
  //     return {
  //       icon: <AlertCircle className="w-10 h-10 text-red-500" />,
  //       title: 'Verification Failed',
  //       subtitle: externalError,
  //       color: 'red',
  //       pulseColor: 'bg-red-400/30',
  //     };
  //   }
  //   return statusConfig;
  // };
  // const getEffectiveStatusConfig = () => {
  //   // Only override when verification is happening AFTER scan
  //   if (isLoading && (status === 'processing' || status === 'success')) {
  //     return {
  //       icon: <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />,
  //       title: 'Verifying Identity',
  //       subtitle: 'Please wait while we verify your fingerprint...',
  //       color: 'amber',
  //       pulseColor: 'bg-amber-400/30',
  //     };
  //   }

  //   if (externalError) {
  //     return {
  //       icon: <AlertCircle className="w-10 h-10 text-red-500" />,
  //       title: 'Verification Failed',
  //       subtitle: externalError,
  //       color: 'red',
  //       pulseColor: 'bg-red-400/30',
  //     };
  //   }

  //   return statusConfig;
  // };
  const getEffectiveStatusConfig = () => {
    // Only override when verification is happening AFTER scan
    // Don't override during initialization
    if (isLoading && (status === 'processing' || status === 'success')) {
      return {
        icon: <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />,
        title: 'Verifying Identity',
        subtitle: 'Please wait while we verify your fingerprint...',
        color: 'amber',
        pulseColor: 'bg-amber-400/30',
      };
    }

    // Show external error only if not in initial states
    if (externalError && status !== 'initializing' && status !== 'idle') {
      return {
        icon: <AlertCircle className="w-10 h-10 text-red-500" />,
        title: 'Verification Failed',
        subtitle: externalError,
        color: 'red',
        pulseColor: 'bg-red-400/30',
      };
    }

    return statusConfig;
  };


  const effectiveConfig = getEffectiveStatusConfig();
  const showExternalError = !!externalError && !isLoading;

  return (
    <div className="w-full max-w-5xl mx-auto px-2">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 items-center">
        
        {/* Left Column - Scanner Visualization */}
        <div className="flex flex-col items-center justify-center order-2 lg:order-1">
          <Card className="w-full max-w-sm bg-gradient-to-br from-card/80 via-card to-card/90 backdrop-blur-sm border border-border/50 shadow-xl shadow-primary/5 rounded-3xl">
            <CardContent className="p-5 lg:p-6">
              {/* Scanner Visual */}
              <div className="relative flex items-center justify-center mb-4">
                {/* Outer glow rings */}
                <div className={`absolute w-32 h-32 lg:w-40 lg:h-40 rounded-full ${effectiveConfig.pulseColor} animate-ping opacity-20`} />
                <div className={`absolute w-28 h-28 lg:w-36 lg:h-36 rounded-full ${effectiveConfig.pulseColor} animate-pulse opacity-40`} />
                
                {/* Scanner circle */}
                <div className={`relative w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-4 border-slate-200 dark:border-slate-700 shadow-inner flex items-center justify-center transition-all duration-500`}>
                  {/* Progress ring for scanning */}
                  {status === 'scanning' && (
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90">
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-blue-500/30"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className="text-blue-500"
                        strokeDasharray={`${scanProgress * 2.83} 283`}
                        style={{ transition: 'stroke-dasharray 0.1s ease' }}
                      />
                    </svg>
                  )}
                  
                  {/* Fingerprint icon/animation */}
                  <div className="relative z-10">
                    {effectiveConfig.icon}
                  </div>
                </div>
              </div>

              {/* Status Text */}
              <div className="text-center space-y-2 mb-6">
                <h3 className="text-xl lg:text-2xl font-semibold text-foreground">
                  {effectiveConfig.title}
                </h3>
                <p className="text-sm lg:text-base text-muted-foreground max-w-xs mx-auto">
                  {effectiveConfig.subtitle}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {status === 'ready' && !isLoading && !showExternalError && (
                  <BankingButton
                    onClick={handleScan}
                    className="w-full h-12 text-sm font-medium bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 rounded-xl"
                    size="default"
                  >
                    <Fingerprint className="mr-2 h-4 w-4" />
                    Start Fingerprint Scan
                  </BankingButton>
                )}

                {(status === 'error' || showExternalError) && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <BankingButton
                      onClick={handleScan}
                      className="flex-1 h-11 rounded-xl text-sm"
                      variant="default"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Try Again
                    </BankingButton>
                    {/* <BankingButton
                      onClick={initializeScanner}
                      className="flex-1 h-11 rounded-xl text-sm"
                      variant="outline"
                    >
                      Reinitialize
                    </BankingButton> */}
                  </div>
                )}

                {(status === 'scanning' ||
                  status === 'processing' ||
                  (isLoading && status === 'success')) &&
                  !showExternalError && (
                    <div className="flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {status === 'scanning'
                          ? `Scanning... ${scanProgress}%`
                          : status === 'processing'
                          ? 'Processing fingerprint...'
                          : 'Verifying identity...'}
                      </span>
                    </div>
                )}


              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Instructions & Info */}
        <div className="flex flex-col space-y-4 order-1 lg:order-2">
          {/* Header */}
          <div className="text-center lg:text-left space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Secure Biometric Authentication</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Verify Your Identity
            </h1>
            <p className="text-base text-muted-foreground max-w-md mx-auto lg:mx-0">
              Use your registered fingerprint to securely access your banking services
            </p>
          </div>

          {/* Instructions Card */}
          <Card className="bg-gradient-to-br from-slate-50/80 to-slate-100/50 dark:from-slate-800/50 dark:to-slate-900/30 border-slate-200/50 dark:border-slate-700/50 rounded-2xl">
            <CardContent className="p-4">
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" />
                How to Scan
              </h4>
              <ul className="space-y-2">
                {[
                  'Place your registered finger flat on the scanner',
                  'Click on the "Start Fingerprint Scan" button',
                  'Hold steady until the scan completes',
                  'Remove your finger when prompted',
                ].map((instruction, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-sm text-muted-foreground pt-0.5">{instruction}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Assisted Mode Notice */}
          {isAssisted && (
            <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800/50 rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h4 className="font-medium text-amber-800 dark:text-amber-300 text-sm">
                      CRO Assisted Mode
                    </h4>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">
                      A Customer Relations Officer will assist you with this transaction after verification.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Note */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              Your biometric data is encrypted and never stored. Each scan is processed securely.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FingerprintScan;