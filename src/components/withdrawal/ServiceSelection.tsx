import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Banknote, PiggyBank, FileCheck, Send, Receipt, Wallet, FileText, UserCog, KeyRound, AlertOctagon, Shield, Clock, AlertTriangle, X } from 'lucide-react';
import { BankingButton } from '@/components/ui/banking-button';
import type { Service } from './types';

interface ServiceSelectionProps {
  services: Service[];
  selectedServiceId: string | null;
  onServiceSelect: (serviceId: string) => void;
  onConfirm: () => void;
  onBack?: () => void;
  showBackButton?: boolean;
  singleAccount?: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  timeoutSeconds?: number; // seconds — from admin settings (service selection timeout)
}

const IDLE_TIMEOUT_SECONDS = 300; // fallback default (overridden by prop)

// Map service IDs to icons
const serviceIcons: Record<string, React.ElementType> = {
  cash_withdrawal: Banknote,
  cash_deposit: PiggyBank,
  check_deposits: FileCheck,
  fund_transfers: Send,
  bill_payments: Receipt,
  balance: Wallet,
  statement_generation: FileText,
  account_updates: UserCog,
  pin_reset: KeyRound,
  fraud_reporting: AlertOctagon,
  mfa_setup: Shield,
};

// Map tags to colors with shadow colors
const tagColors: Record<string, { badge: string; shadow: string; glow: string; iconBg: string; iconText: string; badgeBg: string; badgeGlow: string }> = {
  Cash: {
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    shadow: 'shadow-emerald-200/50 dark:shadow-emerald-900/30',
    glow: 'hover:shadow-emerald-300/60 dark:hover:shadow-emerald-500/20',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-500 group-hover:bg-emerald-600',
    badgeGlow: 'bg-emerald-400/30',
  },
  Deposits: {
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    shadow: 'shadow-blue-200/50 dark:shadow-blue-900/30',
    glow: 'hover:shadow-blue-300/60 dark:hover:shadow-blue-500/20',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconText: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-500 group-hover:bg-blue-600',
    badgeGlow: 'bg-blue-400/30',
  },
  Transfers: {
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    shadow: 'shadow-purple-200/50 dark:shadow-purple-900/30',
    glow: 'hover:shadow-purple-300/60 dark:hover:shadow-purple-500/20',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconText: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-500 group-hover:bg-purple-600',
    badgeGlow: 'bg-purple-400/30',
  },
  Payments: {
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    shadow: 'shadow-orange-200/50 dark:shadow-orange-900/30',
    glow: 'hover:shadow-orange-300/60 dark:hover:shadow-orange-500/20',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconText: 'text-orange-600 dark:text-orange-400',
    badgeBg: 'bg-orange-500 group-hover:bg-orange-600',
    badgeGlow: 'bg-orange-400/30',
  },
  Insights: {
    badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    shadow: 'shadow-cyan-200/50 dark:shadow-cyan-900/30',
    glow: 'hover:shadow-cyan-300/60 dark:hover:shadow-cyan-500/20',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    iconText: 'text-cyan-600 dark:text-cyan-400',
    badgeBg: 'bg-cyan-500 group-hover:bg-cyan-600',
    badgeGlow: 'bg-cyan-400/30',
  },
  Documentation: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    shadow: 'shadow-slate-200/50 dark:shadow-slate-800/30',
    glow: 'hover:shadow-slate-300/60 dark:hover:shadow-slate-600/20',
    iconBg: 'bg-slate-100 dark:bg-slate-800/30',
    iconText: 'text-slate-600 dark:text-slate-400',
    badgeBg: 'bg-slate-500 group-hover:bg-slate-600',
    badgeGlow: 'bg-slate-400/30',
  },
  Maintenance: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    shadow: 'shadow-amber-200/50 dark:shadow-amber-900/30',
    glow: 'hover:shadow-amber-300/60 dark:hover:shadow-amber-500/20',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconText: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-500 group-hover:bg-amber-600',
    badgeGlow: 'bg-amber-400/30',
  },
  Security: {
    badge: 'bg-red-100 text-red-700 border-red-200',
    shadow: 'shadow-red-200/50 dark:shadow-red-900/30',
    glow: 'hover:shadow-red-300/60 dark:hover:shadow-red-500/20',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconText: 'text-red-600 dark:text-red-400',
    badgeBg: 'bg-red-500 group-hover:bg-red-600',
    badgeGlow: 'bg-red-400/30',
  },
};

const defaultTagColor = {
  badge: 'bg-gray-100 text-gray-700 border-gray-200',
  shadow: 'shadow-gray-200/50',
  glow: 'hover:shadow-gray-300/60',
  iconBg: 'bg-gray-100',
  iconText: 'text-gray-600',
  badgeBg: 'bg-gray-500 group-hover:bg-gray-600',
  badgeGlow: 'bg-gray-400/30',
};

const ServiceSelection: React.FC<ServiceSelectionProps> = ({
  services,
  onServiceSelect,
  onConfirm,
  onBack,
  showBackButton = true,
  singleAccount = false,
  isEnabled,
  timeoutSeconds,
}) => {
  const navigate = useNavigate();
  const timeout = timeoutSeconds ?? IDLE_TIMEOUT_SECONDS;
  const [idleSeconds, setIdleSeconds] = useState(timeout);

  // Idle timeout handler - reset timer on user activity
  const resetIdleTimer = useCallback(() => {
    setIdleSeconds(timeout);
  }, [timeout]);

  // Re-sync timer if the sessionTimeout prop changes (e.g. settings loaded async)
  useEffect(() => {
    setIdleSeconds(timeout);
  }, [timeout]);

  // Set up idle timeout and activity listeners
  useEffect(() => {
    // Events that reset the idle timer
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    
    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, resetIdleTimer);
    });

    // Countdown timer
    const intervalId = setInterval(() => {
      setIdleSeconds(prev => {
        if (prev <= 1) {
          // Time's up - navigate to index page
          navigate('/', { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 10000);

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, resetIdleTimer);
      });
      clearInterval(intervalId);
    };
  }, [navigate, resetIdleTimer]);

  // Direct click handler - select and immediately route to service
  const handleServiceClick = (serviceId: string) => {
    if (!isEnabled) return;
    onServiceSelect(serviceId);
    onConfirm(); // Immediately confirm and route
  };

  return (
    <div className="w-full h-full flex flex-col bg-transparent relative overflow-hidden">
      {/* Background decorative elements */}
      {/* <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/10 rounded-full blur-3xl" />
      </div> */}

      {/* Header */}
      <header className="bg-transparent text-primary-foreground p-6 flex-shrink-0 relative z-20">
        <div className="w-full mx-auto flex items-center justify-between gap-6">
          {/* Back/Cancel Button */}
          <div className="">
            {singleAccount ? (
              <BankingButton
                variant="default"
                size="sm"
                onClick={() => window.location.href = '/'}
                className="gap-1.5"
              >
                <X className="h-4 w-4 text-red-600" />
                Cancel
              </BankingButton>
            ) : showBackButton && onBack && (
              <BankingButton
                variant="default"
                size="sm"
                onClick={onBack}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4 text-blue-600" />
                Change Account
              </BankingButton>
            )}
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-2xl font-bold text-gray-600">Select a Service</h1>
            <p className="text-gray-600">
              Tap on a card below to continue with your transaction
            </p>
          </div>
          <div className="flex items-center gap-2 text-gray-600 flex-shrink-0">
            <Clock className="h-5 w-5" />
            <span className="text-sm hidden sm:inline">Session expires in {idleSeconds}s</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 relative z-10 overflow-y-auto scrollbar-hide">
        <div className="w-full max-w-7xl mx-auto">
          {/* Page Header with instruction */}
          {/* <div className="text-center mb-4">
            <p className="text-base text-muted-foreground">
              Tap on a card below to continue with your transaction
            </p>
          </div> */}

          {/* Idle Timeout Warning */}
          {/* <div className={`mb-3 flex items-center justify-center gap-2 text-sm ${idleSeconds <= 10 ? 'text-destructive animate-pulse' : 'text-muted-foreground'}`}>
            <Clock className="h-4 w-4" />
            <span>Session expires in {idleSeconds}s</span>
          </div> */}

          {/* Back Button - only show when user has multiple accounts */}
          {/* {showBackButton && onBack && (
            <div className="mb-3">
              <BankingButton
                variant="outline"
                size="sm"
                onClick={onBack}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                Change Account
              </BankingButton>
            </div>
          )}           */}
            {/* Services Grid - 4 cards per row, matching AssistanceTicket style */}
          {services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-6">
                <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-3">
                No Services Available
              </h2>
              <p className="text-base text-muted-foreground max-w-md mb-6">
                All services are currently disabled by the administrator. Please visit a teller for assistance or try again later.
              </p>
              {showBackButton && onBack && (
                <BankingButton
                  variant="default"
                  size="lg"
                  onClick={onBack}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go Back
                </BankingButton>
              )}
            </div>
          ) : (
          <div className="grid gap-4 sm:gap-5 md:gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {services.map((service, index) => {
              const Icon = serviceIcons[service.id] || Wallet;
              const colors = tagColors[service.tag] || defaultTagColor;
              return (                <button
                  key={service.id}
                  type="button"
                  className={[
                    'group relative flex flex-col items-center p-3 sm:p-4 rounded-xl border text-center transition-all duration-200',
                    isEnabled 
                      ? 'cursor-pointer bg-white/60 hover:bg-white/80 hover:shadow-lg hover:-translate-y-1 border-border/60 hover:border-primary/30 active:scale-[0.98]'
                      : 'opacity-50 cursor-not-allowed bg-muted border-border shadow-none'
                  ].join(' ')}
                  onClick={() => handleServiceClick(service.id)}
                  disabled={!isEnabled}
                >
                  {/* Pulsing icon badge — top right corner (tag-colored) */}
                  {isEnabled && (
                    <div className="absolute -top-2.5 -right-2.5 sm:-top-3 sm:-right-3">
                      {/* Outer pulsing glow ring */}
                      <span
                        className={`absolute inset-0 m-auto w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full ${colors.badgeGlow} animate-ping`}
                        style={{ animationDuration: `${2 + (index % 4) * 0.4}s` }}
                      />
                      {/* Inner pulsing glow */}
                      <span
                        className={`absolute inset-0 m-auto w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full ${colors.badgeGlow}`}
                        style={{ animation: `pulse ${2.2 + (index % 4) * 0.3}s ease-in-out infinite` }}
                      />
                      {/* Solid icon badge */}
                      <div className={`relative w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full ${colors.badgeBg} flex items-center justify-center shadow-md transition-colors duration-200 ring-2 ring-white`}>
                        <Icon className="w-4 h-4 sm:w-[18px] sm:h-[18px] md:w-5 md:h-5 text-white" />
                      </div>
                    </div>
                  )}                  {/* Tag — top left, static */}
                  <span className={`absolute -top-2 -left-1 sm:-top-2.5 sm:-left-1.5 text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded-full border shadow-sm ring-2 ring-white ${colors.badge}`}>
                    {service.tag}
                  </span>
                  {/* Title */}
                  <h3 className="font-semibold text-xs sm:text-base md:text-lg text-foreground mb-1 leading-tight mt-5 sm:mt-6 group-hover:text-primary transition-colors duration-300">
                    {service.title}
                  </h3>
                  {/* Description */}
                  <p className="text-[7px] sm:text-[9px] md:text-[11px] text-muted-foreground line-clamp-2 hidden sm:block">
                    {service.description}
                  </p>
                  {/* Arrow indicator on hover */}
                  {isEnabled && (
                    <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                      <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    </div>
                  )}
                </button>
              );            })}
          </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ServiceSelection;
