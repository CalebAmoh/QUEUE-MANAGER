import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BankingButton } from '@/components/ui/banking-button';
import { 
  Printer, UserCheck, Clock, Hash, ArrowLeft, Headphones,
  Banknote, PiggyBank, FileCheck, Send, Receipt, Wallet, 
  FileText, UserCog, KeyRound, AlertOctagon, Shield
} from 'lucide-react';
import { pushTicketToQueue } from '@/services/api';
import { BACKEND_URL } from '@/config';

const API_BASE = BACKEND_URL;

interface Service {
  id: string;
  title: string;
  description: string;
  tag: string;
}

// Fallback services in case API is unavailable
const fallbackServices: Service[] = [
  { id: 'cash_withdrawal', title: 'Cash Withdrawal', description: 'Assisted cash withdrawal from your account', tag: 'Cash' },
  { id: 'cash_deposit', title: 'Cash Deposit', description: 'Deposit cash into your account', tag: 'Cash' },
  { id: 'check_deposits', title: 'Cheque Deposits', description: 'Deposit cheques with Teller assistance', tag: 'Deposits' },
  { id: 'fund_transfers', title: 'Fund Transfers', description: 'Transfer funds with assistance', tag: 'Transfers' },
  { id: 'bill_payments', title: 'Bill Payments', description: 'Pay bills with Teller help', tag: 'Payments' },
  { id: 'balance', title: 'Balance Inquiry', description: 'Check your account balance', tag: 'Insights' },
  { id: 'statement_generation', title: 'Statement Generation', description: 'Get account statements', tag: 'Documentation' },
  { id: 'account_updates', title: 'Account Updates', description: 'Update your account details', tag: 'Maintenance' },
  { id: 'fraud_reporting', title: 'Fraud Reporting', description: 'Report suspicious activity', tag: 'Security' },
];

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

// Map tags to colors
const tagColors: Record<string, { tag: string; icon: string; border: string; iconBg: string; badgeBg: string; badgeGlow: string }> = {
  Cash: {
    tag: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: 'text-emerald-600',
    border: 'border-emerald-200 hover:border-emerald-400',
    iconBg: 'bg-emerald-100 group-hover:bg-emerald-200',
    badgeBg: 'bg-emerald-500 group-hover:bg-emerald-600',
    badgeGlow: 'bg-emerald-400/30',
  },
  Deposits: {
    tag: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: 'text-blue-600',
    border: 'border-blue-200 hover:border-blue-400',
    iconBg: 'bg-blue-100 group-hover:bg-blue-200',
    badgeBg: 'bg-blue-500 group-hover:bg-blue-600',
    badgeGlow: 'bg-blue-400/30',
  },
  Transfers: {
    tag: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: 'text-purple-600',
    border: 'border-purple-200 hover:border-purple-400',
    iconBg: 'bg-purple-100 group-hover:bg-purple-200',
    badgeBg: 'bg-purple-500 group-hover:bg-purple-600',
    badgeGlow: 'bg-purple-400/30',
  },
  Payments: {
    tag: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: 'text-orange-600',
    border: 'border-orange-200 hover:border-orange-400',
    iconBg: 'bg-orange-100 group-hover:bg-orange-200',
    badgeBg: 'bg-orange-500 group-hover:bg-orange-600',
    badgeGlow: 'bg-orange-400/30',
  },
  Insights: {
    tag: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    icon: 'text-cyan-600',
    border: 'border-cyan-200 hover:border-cyan-400',
    iconBg: 'bg-cyan-100 group-hover:bg-cyan-200',
    badgeBg: 'bg-cyan-500 group-hover:bg-cyan-600',
    badgeGlow: 'bg-cyan-400/30',
  },
  Documentation: {
    tag: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: 'text-slate-600',
    border: 'border-slate-200 hover:border-slate-400',
    iconBg: 'bg-slate-100 group-hover:bg-slate-200',
    badgeBg: 'bg-slate-500 group-hover:bg-slate-600',
    badgeGlow: 'bg-slate-400/30',
  },
  Maintenance: {
    tag: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: 'text-amber-600',
    border: 'border-amber-200 hover:border-amber-400',
    iconBg: 'bg-amber-100 group-hover:bg-amber-200',
    badgeBg: 'bg-amber-500 group-hover:bg-amber-600',
    badgeGlow: 'bg-amber-400/30',
  },
  Security: {
    tag: 'bg-red-100 text-red-700 border-red-200',
    icon: 'text-red-600',
    border: 'border-red-200 hover:border-red-400',
    iconBg: 'bg-red-100 group-hover:bg-red-200',
    badgeBg: 'bg-red-500 group-hover:bg-red-600',
    badgeGlow: 'bg-red-400/30',
  },
};

const defaultTagColors = {
  tag: 'bg-gray-100 text-gray-700 border-gray-200',
  icon: 'text-gray-600',
  border: 'border-gray-200 hover:border-gray-400',
  iconBg: 'bg-gray-100 group-hover:bg-gray-200',
  badgeBg: 'bg-gray-500 group-hover:bg-gray-600',
  badgeGlow: 'bg-gray-400/30',
};

interface AssistanceTicketProps {
  onBackToHome: () => void;
}

type AssistanceStep = 'select-service' | 'ticket-generated';

const AssistanceTicket: React.FC<AssistanceTicketProps> = ({ onBackToHome }) => {
  const [currentStep, setCurrentStep] = useState<AssistanceStep>('select-service');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [svgSlide, setSvgSlide] = useState(0);
  const [services, setServices] = useState<Service[]>(fallbackServices);
  const [isLoading, setIsLoading] = useState(false);
  const [assignedQueue, setAssignedQueue] = useState<number | null>(null);

  // Fetch enabled assisted services from database
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await fetch('/api/services/assisted');
        if (res.ok) {
          const data = await res.json();
          interface ServiceResponse {
            serviceId: string;
            title: string;
            description: string;
            tag: string;
          }
          const mapped: Service[] = data.map((s: ServiceResponse) => ({
            id: s.serviceId,
            title: s.title,
            description: s.description,
            tag: s.tag,
          }));
          if (mapped.length > 0) {
            setServices(mapped);
          }
        }
      } catch (err) {
        console.warn('Failed to fetch assisted services from API, using fallback:', err);
      }
    };
    fetchServices();
  }, []);

  // Auto-rotate SVG carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setSvgSlide(prev => (prev + 1) % 3);
    }, 7000);
    return () => clearInterval(interval);
  }, []);
  
  // Generate ticket details - memoized so they don't change on re-render
  const ticketId = useMemo(() => `CRO-${Date.now().toString().slice(-6)}`, []);

  const handleServiceSelect = async (service: Service) => {
    setSelectedService(service);
    setIsLoading(true);

    try {
      // Log to tb_self_serv_txn and trigger auto-queueing
      const response = await fetch(`${API_BASE}/api/transactions/self-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticketId.slice(0, 20),
          transType: 'ASSISTANCE',
          amount: 0,
          currency: 'GHS',
          docRef: `Q-AUTO`,
          param1: 'Walk-in Customer',
          param2: service.title,
          param3: service.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to log assistance request');

      const result = await response.json();
      
      // Update the memoized details with the official queue number
      if (result.data?.queueNumber) {
        setAssignedQueue(result.data.queueNumber);
      }

      setCurrentStep('ticket-generated');
    } catch (err) {
      console.error('Failed to generate assistance ticket:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToServices = () => {
    setCurrentStep('select-service');
    setSelectedService(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/15 via-background to-primary/20 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/10 rounded-full blur-3xl" />
      </div>      {/* Header */}      <header className="bg-gradient-primary text-primary-foreground px-3 py-3 sm:px-6 sm:py-4 shadow-banking flex-shrink-0 relative z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-4 md:gap-6">
          <button
            onClick={currentStep === 'ticket-generated' ? handleBackToServices : onBackToHome}
            className="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-xs sm:text-sm font-medium flex-shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">
              {currentStep === 'ticket-generated' ? 'Change Service' : 'Back to Home'}
            </span>
          </button>
          
          <div className="flex-1 text-center min-w-0">
            <h1 className="text-base sm:text-lg md:text-2xl font-bold truncate">TellerAssistance Request</h1>
            <p className="text-primary-foreground/80 text-xs sm:text-sm hidden sm:block">
              {currentStep === 'select-service' 
                ? 'Select the service you need help with'
                : 'Your assistance ticket is ready'}
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 sm:gap-2 text-primary-foreground/80 flex-shrink-0">
            <Headphones className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-xs sm:text-sm hidden md:inline">Support Available</span>
          </div>
        </div>
      </header>{/* Main Content */}      
      <main className="w-full flex-1 flex items-center justify-center px-3 py-4 sm:px-6 sm:py-6 relative z-10">
        {currentStep === 'select-service' ? (          
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4 sm:gap-6 lg:gap-20 items-center">
            {/* Left: Custom SVG & Instructions (hidden on small/medium screens) */}            {/* LEFT SVG SECTION — COMMENTED OUT */}            
            {svgSlide >= 0 && (
            <div className="hidden lg:flex flex-col items-center justify-center h-full px-2 xl:px-4 ml-[-50px]">              <div className="relative w-56 h-56 xl:w-64 xl:h-64 flex items-center justify-center overflow-hidden">
                {/* SVG Carousel */}
                <div
                  className="flex transition-transform duration-700 ease-in-out h-full"
                  style={{ width: '300%', transform: `translateX(-${svgSlide * (100)}%)` }}
                >
                  {/* Slide 1: Colorful 2×2 Card Grid */}
                  <div className="h-full flex-shrink-0 flex items-center justify-center" 
                  style={{ width: '100%' }}>
                    <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      {/* Background pulse */}
                      <circle cx="100" cy="100" r="95" fill="#10b981" opacity="0.04">
                        <animate attributeName="r" values="90;95;90" dur="3s" repeatCount="indefinite" />
                      </circle>

                      {/* Card 1 (top-left) - Emerald */}
                      <rect x="25" y="35" width="70" height="60" rx="10" fill="white" stroke="#10b981" strokeWidth="1.5" opacity="0.5" />
                      <rect x="33" y="50" width="46" height="4" rx="2" fill="#10b981" opacity="0.18" />
                      <rect x="33" y="58" width="54" height="4" rx="2" fill="#10b981" opacity="0.13" />
                      <rect x="33" y="66" width="40" height="4" rx="2" fill="#10b981" opacity="0.09" />
                      <rect x="33" y="74" width="34" height="3" rx="1.5" fill="#10b981" opacity="0.06" />
                      {/* Badge - Emerald */}
                      <circle cx="89" cy="41" r="11" fill="#10b981" opacity="0">
                        <animate attributeName="r" values="11;15;11" dur="2.4s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.05;0.2;0.05" dur="2.4s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="89" cy="41" r="8" fill="#10b981" opacity="0.75">
                        <animate attributeName="opacity" values="0.6;0.9;0.6" dur="2.4s" repeatCount="indefinite" />
                      </circle>
                      <rect x="84" y="36" width="10" height="10" rx="2" fill="none" stroke="white" strokeWidth="1.5" />
                      <line x1="84" y1="41" x2="94" y2="41" stroke="white" strokeWidth="1.2" />

                      {/* Card 2 (top-right) - Blue / Selected */}
                      <rect x="102" y="32" width="76" height="66" rx="12" fill="#3b82f6" opacity="0.08">
                        <animate attributeName="opacity" values="0.04;0.12;0.04" dur="2s" repeatCount="indefinite" />
                      </rect>
                      <rect x="105" y="35" width="70" height="60" rx="10" fill="white" stroke="#3b82f6" strokeWidth="2.5" opacity="0.95">
                        <animate attributeName="stroke-width" values="2.5;3.5;2.5" dur="2s" repeatCount="indefinite" />
                      </rect>
                      <rect x="113" y="50" width="46" height="4" rx="2" fill="#3b82f6" opacity="0.28" />
                      <rect x="113" y="58" width="54" height="4" rx="2" fill="#3b82f6" opacity="0.2" />
                      <rect x="113" y="66" width="40" height="4" rx="2" fill="#3b82f6" opacity="0.15" />
                      <rect x="113" y="74" width="34" height="3" rx="1.5" fill="#3b82f6" opacity="0.1" />
                      {/* Checkmark Badge - Blue */}
                      <circle cx="169" cy="41" r="9" fill="#3b82f6" opacity="0.85">
                        <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <path d="M165 41 L168 44 L174 37" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      {/* <circle cx="155" cy="41" r="" fill="#3b82f6" opacity="0">
                        <animate attributeName="r" values="11;15;11" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.06;0.25;0.06" dur="2s" repeatCount="indefinite" />
                      </circle> */}

                      {/* Card 3 (bottom-left) - Purple */}
                      <rect x="25" y="105" width="70" height="60" rx="10" fill="white" stroke="#a855f7" strokeWidth="1.5" opacity="0.5" />
                      <rect x="33" y="120" width="46" height="4" rx="2" fill="#a855f7" opacity="0.18" />
                      <rect x="33" y="128" width="54" height="4" rx="2" fill="#a855f7" opacity="0.13" />
                      <rect x="33" y="136" width="40" height="4" rx="2" fill="#a855f7" opacity="0.09" />
                      <rect x="33" y="144" width="34" height="3" rx="1.5" fill="#a855f7" opacity="0.06" />
                      {/* Badge - Purple (plus icon) */}
                      <circle cx="89" cy="111" r="11" fill="#a855f7" opacity="0">
                        <animate attributeName="r" values="11;15;11" dur="2.8s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.05;0.2;0.05" dur="2.8s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="89" cy="111" r="8" fill="#a855f7" opacity="0.75">
                        <animate attributeName="opacity" values="0.6;0.9;0.6" dur="2.8s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="89" cy="111" r="4.5" fill="none" stroke="white" strokeWidth="1.5" />
                      <line x1="89" y1="109" x2="89" y2="113" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
                      <line x1="87" y1="111" x2="91" y2="111" stroke="white" strokeWidth="1.3" strokeLinecap="round" />

                      {/* Card 4 (bottom-right) - Orange */}
                      <rect x="105" y="105" width="70" height="60" rx="10" fill="white" stroke="#f97316" strokeWidth="1.5" opacity="0.5" />
                      <rect x="113" y="120" width="46" height="4" rx="2" fill="#f97316" opacity="0.18" />
                      <rect x="113" y="128" width="54" height="4" rx="2" fill="#f97316" opacity="0.13" />
                      <rect x="113" y="136" width="40" height="4" rx="2" fill="#f97316" opacity="0.09" />
                      <rect x="113" y="144" width="34" height="3" rx="1.5" fill="#f97316" opacity="0.06" />
                      {/* Badge - Orange (X icon) */}
                      <circle cx="169" cy="111" r="11" fill="#f97316" opacity="0">
                        <animate attributeName="r" values="11;15;11" dur="3.2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.05;0.2;0.05" dur="3.2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="169" cy="111" r="8" fill="#f97316" opacity="0.75">
                        <animate attributeName="opacity" values="0.6;0.9;0.6" dur="3.2s" repeatCount="indefinite" />
                      </circle>
                      <path d="M166 108 L172 114 M172 108 L166 114" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />

                      {/* Floating decorative dots — colorful */}
                      <circle cx="12" cy="24" r="3" fill="#06b6d4" opacity="0.2">
                        <animate attributeName="cy" values="24;18;24" dur="2.5s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="188" cy="24" r="2.5" fill="#f59e0b" opacity="0.18">
                        <animate attributeName="cy" values="24;18;24" dur="3s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="12" cy="180" r="2" fill="#ef4444" opacity="0.15">
                        <animate attributeName="cy" values="180;175;180" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="188" cy="180" r="2.5" fill="#a855f7" opacity="0.12">
                        <animate attributeName="cy" values="180;174;180" dur="2.8s" repeatCount="indefinite" />
                      </circle>
                    </svg>
                  </div>                  
                  
                  {/* Slide 2: Colorful Printing Ticket SVG */}
                  <div className="h-full flex-shrink-0 flex items-center justify-center" 
                  style={{ width: '100%' }}>                    
                  <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      {/* Background pulse */}
                      <circle cx="100" cy="100" r="95" fill="#3b82f6" opacity="0.04">
                        <animate attributeName="r" values="90;95;90" dur="3.5s" repeatCount="indefinite" />
                      </circle>

                      {/* Clip so ticket emerges from printer slot */}
                      <defs>
                        <clipPath id="ticketClipTop">
                          <rect x="0" y="0" width="200" height="72" />
                        </clipPath>
                        <clipPath id="ticketClipBottom">
                          <rect x="0" y="123" width="200" height="80" />
                        </clipPath>
                      </defs>

                      {/* Ticket coming out top — clipped to emerge from printer slot */}
                      <g clipPath="url(#ticketClipTop)">
                        <g>
                          <animateTransform attributeName="transform" type="translate" values="0,8;0,0;0,8" dur="3s" repeatCount="indefinite" />
                          
                          {/* Ticket body */}
                          <rect x="58" y="8" width="84" height="66" rx="7" fill="white" stroke="#a855f7" strokeWidth="1.8" />
                          
                          {/* Ticket header bar */}
                          <rect x="58" y="8" width="84" height="14" rx="7" fill="#a855f7" opacity="0.15" />
                          <rect x="58" y="15" width="84" height="7" fill="#a855f7" opacity="0.15" />
                          
                          {/* Ticket title text */}
                          <rect x="72" y="12" width="56" height="4" rx="2" fill="#7c3aed" opacity="0.5" />
                          
                          {/* Perforated edge */}
                          <line x1="62" y1="26" x2="138" y2="26" stroke="#a855f7" strokeWidth="0.5" strokeDasharray="3,3" opacity="0.4" />
                          
                          {/* Content lines — multi-colored */}
                          <rect x="66" y="32" width="50" height="3.5" rx="1.5" fill="#10b981" opacity="0.3" />
                          <rect x="66" y="39" width="62" height="3.5" rx="1.5" fill="#3b82f6" opacity="0.25" />
                          <rect x="66" y="46" width="44" height="3.5" rx="1.5" fill="#f97316" opacity="0.25" />
                          
                          {/* Queue number box */}
                          <rect x="68" y="54" width="36" height="12" rx="4" fill="#10b981" opacity="0.12" stroke="#10b981" strokeWidth="0.8" />
                          <rect x="73" y="58" width="26" height="4" rx="2" fill="#10b981" opacity="0.4" />
                        </g>
                      </g>

                      {/* Printer body — rendered on top so ticket slides under */}
                      <rect x="35" y="72" width="130" height="52" rx="10" fill="white" stroke="#06b6d4" strokeWidth="2" />
                      <rect x="40" y="77" width="120" height="42" rx="7" fill="#ecfeff" stroke="#06b6d4" strokeWidth="0.8" opacity="0.6" />
                      
                      {/* Printer slot (top feed) */}
                      <rect x="50" y="70" width="100" height="6" rx="3" fill="#e0f2fe" stroke="#0891b2" strokeWidth="0.8" />
                      
                      {/* Printer indicator lights */}
                      <circle cx="55" cy="87" r="3.5" fill="#10b981" opacity="0.9">
                        <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="67" cy="87" r="3.5" fill="#f59e0b" opacity="0.7">
                        <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="79" cy="87" r="3.5" fill="#3b82f6" opacity="0.5" />
                      
                      {/* Printer detail lines */}
                      <rect x="90" y="84" width="55" height="3" rx="1.5" fill="#06b6d4" opacity="0.12" />
                      <rect x="90" y="91" width="45" height="3" rx="1.5" fill="#06b6d4" opacity="0.08" />
                      
                      {/* Paper output tray */}
                      <rect x="50" y="122" width="100" height="6" rx="3" fill="#e0f2fe" stroke="#0891b2" strokeWidth="0.8" />

                      {/* Receipt coming out bottom — clipped to emerge from output tray */}
                      <g clipPath="url(#ticketClipBottom)">
                        <g>
                          <animateTransform attributeName="transform" type="translate" values="0,-4;0,4;0,-4" dur="2.5s" repeatCount="indefinite" />
                          
                          {/* Receipt body */}
                          <rect x="62" y="126" width="76" height="52" rx="6" fill="white" stroke="#f97316" strokeWidth="1.5" />
                          
                          {/* Receipt content lines */}
                          <rect x="70" y="135" width="52" height="3" rx="1.5" fill="#f97316" opacity="0.25" />
                          <rect x="70" y="142" width="40" height="3" rx="1.5" fill="#f97316" opacity="0.18" />
                          <rect x="70" y="149" width="56" height="3" rx="1.5" fill="#f97316" opacity="0.13" />
                          <rect x="70" y="156" width="34" height="3" rx="1.5" fill="#f97316" opacity="0.09" />
                          
                          {/* Barcode lines */}
                          <rect x="72" y="164" width="2" height="6" rx="0.5" fill="#334155" opacity="0.3" />
                          <rect x="76" y="164" width="3" height="6" rx="0.5" fill="#334155" opacity="0.25" />
                          <rect x="81" y="164" width="1.5" height="6" rx="0.5" fill="#334155" opacity="0.3" />
                          <rect x="84" y="164" width="3" height="6" rx="0.5" fill="#334155" opacity="0.2" />
                          <rect x="89" y="164" width="2" height="6" rx="0.5" fill="#334155" opacity="0.3" />
                          <rect x="93" y="164" width="1.5" height="6" rx="0.5" fill="#334155" opacity="0.25" />
                          <rect x="96" y="164" width="3.5" height="6" rx="0.5" fill="#334155" opacity="0.2" />
                          <rect x="101" y="164" width="2" height="6" rx="0.5" fill="#334155" opacity="0.3" />
                          <rect x="105" y="164" width="1.5" height="6" rx="0.5" fill="#334155" opacity="0.25" />
                          <rect x="108" y="164" width="3" height="6" rx="0.5" fill="#334155" opacity="0.2" />
                          <rect x="113" y="164" width="2" height="6" rx="0.5" fill="#334155" opacity="0.3" />
                          <rect x="117" y="164" width="3" height="6" rx="0.5" fill="#334155" opacity="0.22" />
                        </g>
                      </g>

                      {/* Pulsing print badge — top-right */}
                      <circle cx="155" cy="55" r="14" fill="#3b82f6" opacity="0">
                        <animate attributeName="r" values="14;19;14" dur="2.2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.05;0.2;0.05" dur="2.2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="155" cy="55" r="10" fill="#3b82f6" opacity="0.8">
                        <animate attributeName="opacity" values="0.6;0.95;0.6" dur="2.2s" repeatCount="indefinite" />
                      </circle>
                      {/* Printer icon inside badge */}
                      <rect x="149" y="51" width="12" height="8" rx="2" fill="none" stroke="white" strokeWidth="1.3" />
                      <rect x="151" y="48" width="8" height="4" rx="1" fill="none" stroke="white" strokeWidth="1" />

                      {/* Decorative floating dots — colorful */}
                      <circle cx="18" cy="50" r="3" fill="#10b981" opacity="0.18">
                        <animate attributeName="cy" values="50;44;50" dur="2.5s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="182" cy="145" r="2.5" fill="#f59e0b" opacity="0.15">
                        <animate attributeName="cy" values="145;139;145" dur="3s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="25" cy="170" r="2" fill="#ef4444" opacity="0.12">
                        <animate attributeName="cy" values="170;165;170" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="175" cy="35" r="2.5" fill="#a855f7" opacity="0.14">
                        <animate attributeName="cy" values="35;29;35" dur="2.8s" repeatCount="indefinite" />
                      </circle>                    </svg>
                  </div>

                  {/* Slide 3: Get Help from Teller SVG */}
                  <div className="h-full flex-shrink-0 flex items-center justify-center" 
                  style={{ width: '100%' }}>
                    <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                      {/* Background pulse */}
                      <circle cx="100" cy="100" r="95" fill="#10b981" opacity="0.04">
                        <animate attributeName="r" values="90;95;90" dur="3s" repeatCount="indefinite" />
                      </circle>

                      {/* Desk / Counter */}
                      <rect x="20" y="120" width="160" height="14" rx="4" fill="#06b6d4" opacity="0.15" stroke="#0891b2" strokeWidth="1" />
                      <rect x="25" y="122" width="150" height="10" rx="3" fill="white" opacity="0.5" />
                      
                      {/* Desk front panel */}
                      <rect x="20" y="134" width="160" height="35" rx="5" fill="#ecfeff" stroke="#06b6d4" strokeWidth="1.2" />
                      <rect x="30" y="140" width="50" height="5" rx="2.5" fill="#06b6d4" opacity="0.12" />
                      <rect x="30" y="149" width="35" height="4" rx="2" fill="#06b6d4" opacity="0.08" />
                      
                      {/* Desk detail — nameplate */}
                      <rect x="105" y="138" width="60" height="14" rx="4" fill="#10b981" opacity="0.1" stroke="#10b981" strokeWidth="0.8" />
                      <rect x="112" y="143" width="46" height="4" rx="2" fill="#10b981" opacity="0.3" />

                      {/* Teller (right, behind desk) */}
                      {/* Head */}
                      <circle cx="135" cy="78" r="16" fill="white" stroke="#3b82f6" strokeWidth="2" />
                      {/* Hair */}
                      <path d="M119 74 Q119 60 135 58 Q151 60 151 74" fill="#3b82f6" opacity="0.2" />
                      {/* Eyes */}
                      <circle cx="129" cy="78" r="1.8" fill="#334155" opacity="0.7" />
                      <circle cx="141" cy="78" r="1.8" fill="#334155" opacity="0.7" />
                      {/* Smile */}
                      <path d="M129 85 Q135 90 141 85" fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" />
                      {/* Body / shoulders */}
                      <path d="M115 120 Q115 98 135 96 Q155 98 155 120" fill="white" stroke="#3b82f6" strokeWidth="1.8" />
                      {/* Shirt collar detail */}
                      <path d="M128 96 L135 104 L142 96" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.5" />
                      {/* ID badge on shirt */}
                      <rect x="140" y="104" width="10" height="12" rx="2" fill="#f59e0b" opacity="0.3" stroke="#f59e0b" strokeWidth="0.8">
                        <animate attributeName="opacity" values="0.2;0.45;0.2" dur="3s" repeatCount="indefinite" />
                      </rect>
                      <rect x="142" y="108" width="6" height="2" rx="1" fill="#f59e0b" opacity="0.5" />

                      {/* Teller arm reaching out (gesture of help) */}
                      <path d="M115 110 Q100 108 90 112" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" opacity="0.5">
                        <animate attributeName="d" values="M115 110 Q100 108 90 112;M115 110 Q100 106 88 110;M115 110 Q100 108 90 112" dur="3s" repeatCount="indefinite" />
                      </path>
                      {/* Hand */}
                      <circle cx="88" cy="112" r="4" fill="white" stroke="#3b82f6" strokeWidth="1.2" opacity="0.7">
                        <animate attributeName="cx" values="88;86;88" dur="3s" repeatCount="indefinite" />
                        <animate attributeName="cy" values="112;110;112" dur="3s" repeatCount="indefinite" />
                      </circle>

                      {/* Customer (left, in front of desk) */}
                      {/* Head */}
                      <circle cx="60" cy="85" r="14" fill="white" stroke="#a855f7" strokeWidth="1.8" />
                      {/* Hair */}
                      <path d="M46 81 Q46 68 60 66 Q74 68 74 81" fill="#a855f7" opacity="0.15" />
                      {/* Eyes */}
                      <circle cx="55" cy="85" r="1.5" fill="#334155" opacity="0.6" />
                      <circle cx="65" cy="85" r="1.5" fill="#334155" opacity="0.6" />
                      {/* Mouth */}
                      <line x1="56" y1="91" x2="64" y2="91" stroke="#334155" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
                      {/* Body */}
                      <path d="M42 134 Q42 104 60 102 Q78 104 78 134" fill="white" stroke="#a855f7" strokeWidth="1.5" />

                      {/* Document/paper the customer is holding */}
                      <rect x="68" y="110" width="16" height="20" rx="2" fill="white" stroke="#f97316" strokeWidth="1.2" opacity="0.8">
                        <animate attributeName="y" values="110;108;110" dur="2.5s" repeatCount="indefinite" />
                      </rect>
                      <rect x="71" y="114" width="10" height="2" rx="1" fill="#f97316" opacity="0.3" />
                      <rect x="71" y="118" width="8" height="2" rx="1" fill="#f97316" opacity="0.2" />
                      <rect x="71" y="122" width="10" height="2" rx="1" fill="#f97316" opacity="0.15" />

                      {/* Speech/help bubble from teller */}
                      <rect x="142" y="52" width="40" height="22" rx="8" fill="#10b981" opacity="0.12" stroke="#10b981" strokeWidth="0.8">
                        <animate attributeName="opacity" values="0.08;0.18;0.08" dur="2.5s" repeatCount="indefinite" />
                      </rect>
                      {/* Bubble tail */}
                      <path d="M148 74 L144 80 L152 74" fill="#10b981" opacity="0.12" />
                      {/* Text lines in bubble */}
                      <rect x="149" y="58" width="26" height="3" rx="1.5" fill="#10b981" opacity="0.3" />
                      <rect x="149" y="64" width="20" height="3" rx="1.5" fill="#10b981" opacity="0.2" />

                      {/* Question mark bubble from customer */}
                      <rect x="25" y="58" width="28" height="20" rx="7" fill="#a855f7" opacity="0.1" stroke="#a855f7" strokeWidth="0.7">
                        <animate attributeName="opacity" values="0.06;0.15;0.06" dur="2.8s" repeatCount="indefinite" />
                      </rect>
                      <path d="M47 78 L51 84 L43 78" fill="#a855f7" opacity="0.1" />
                      <text x="39" y="73" textAnchor="middle" fontSize="12" fill="#a855f7" opacity="0.45" fontWeight="bold">?</text>

                      {/* Pulsing help badge — top-right */}
                      <circle cx="175" cy="30" r="14" fill="#10b981" opacity="0">
                        <animate attributeName="r" values="14;19;14" dur="2.4s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.05;0.2;0.05" dur="2.4s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="175" cy="30" r="10" fill="#10b981" opacity="0.8">
                        <animate attributeName="opacity" values="0.6;0.95;0.6" dur="2.4s" repeatCount="indefinite" />
                      </circle>
                      {/* Headphones/help icon inside badge */}
                      <path d="M170 28 Q170 22 175 22 Q180 22 180 28" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      <rect x="169" y="28" width="4" height="5" rx="1.5" fill="white" opacity="0.9" />
                      <rect x="177" y="28" width="4" height="5" rx="1.5" fill="white" opacity="0.9" />
                      <line x1="173" y1="35" x2="177" y2="35" stroke="white" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />

                      {/* Decorative floating dots — colorful */}
                      <circle cx="14" cy="40" r="2.5" fill="#f59e0b" opacity="0.18">
                        <animate attributeName="cy" values="40;34;40" dur="2.5s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="186" cy="100" r="3" fill="#3b82f6" opacity="0.15">
                        <animate attributeName="cy" values="100;94;100" dur="3s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="10" cy="150" r="2" fill="#ef4444" opacity="0.12">
                        <animate attributeName="cy" values="150;145;150" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="190" cy="165" r="2.5" fill="#a855f7" opacity="0.14">
                        <animate attributeName="cy" values="165;159;165" dur="2.8s" repeatCount="indefinite" />
                      </circle>
                      <circle cx="100" cy="185" r="2" fill="#06b6d4" opacity="0.16">
                        <animate attributeName="cy" values="185;180;185" dur="3.2s" repeatCount="indefinite" />
                      </circle>
                    </svg>
                  </div>
                </div>

                {/* Carousel dots */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-2">
                  <button
                    onClick={() => setSvgSlide(0)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${svgSlide === 0 ? 'bg-primary w-5' : 'bg-primary/30 hover:bg-primary/50'}`}
                    aria-label="Show service cards"
                  />                  <button
                    onClick={() => setSvgSlide(1)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${svgSlide === 1 ? 'bg-primary w-5' : 'bg-primary/30 hover:bg-primary/50'}`}
                    aria-label="Show ticket printing"
                  />
                  <button
                    onClick={() => setSvgSlide(2)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${svgSlide === 2 ? 'bg-primary w-5' : 'bg-primary/30 hover:bg-primary/50'}`}
                    aria-label="Show teller help"
                  />
                </div>
              </div>              <div className="mt-4 text-center max-w-[300px] transition-opacity duration-500">                <h2 className="text-base xl:text-lg font-bold text-primary mb-1.5 leading-snug">
                  {svgSlide === 0 ? 'Tap on a Service' : svgSlide === 1 ? 'Print your ticket instantly' : 'Get Help from a Teller'}
                </h2>
                <p className="text-muted-foreground text-xs xl:text-sm leading-relaxed">
                  {svgSlide === 0
                    ? 'Select the banking service you need help with from the options.'
                    : svgSlide === 1
                    ? 'A printed ticket with your queue number will be issued for Tellerassistance.'
                    : 'A Customer Relations Officer will personally assist you at the desk.'}
                </p>
              </div>
            </div>
            )}
             {/* Right: Service Selection Grid */}
            <div className="w-[1000px]  max-w-full min-w-0">
              <Card className="shadow-banking bg-transparent backdrop-blur-md border border-border">
                <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
                  <CardTitle className="text-base sm:text-lg md:text-2xl text-center flex items-center justify-center gap-2 sm:gap-3 mb-8">
                    <div className="p-3 sm:p-2 rounded-xl bg-primary/10">
                      <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    What do you need help with?
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 pb-3 sm:px-4 sm:pb-4 md:px-6">                  
                  <div className="grid gap-2 lg:gap-8 sm:gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-3">
                    {services.map((service, index) => {
                      const Icon = serviceIcons[service.id] || Wallet;
                      const colors = tagColors[service.tag] || defaultTagColors;
                      return (
                        <button
                          key={service.id}
                          type="button"
                          disabled={isLoading}
                          onClick={() => handleServiceSelect(service)}
                          className={`group relative flex flex-col items-center p-2.5 sm:p-3 md:p-4 rounded-xl border bg-white/60 hover:bg-white/80 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-center border-border/60 hover:border-primary/30 lg:h-[100] lg:w-[300px] ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {/* Pulsing icon badge — top right corner (tag-colored) */}
                          <div className="absolute -top-2 -right-2 sm:-top-2.5 sm:-right-2.5">
                            {/* Outer pulsing glow ring */}
                            <span
                              className={`absolute inset-0 m-auto w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full ${colors.badgeGlow} animate-ping`}
                              style={{ animationDuration: `${2 + (index % 4) * 0.4}s` }}
                            />
                            {/* Inner pulsing glow */}
                            <span
                              className={`absolute inset-0 m-auto w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full ${colors.badgeGlow}`}
                              style={{ animation: `pulse ${2.2 + (index % 4) * 0.3}s ease-in-out infinite` }}
                            />
                            {/* Solid icon badge */}
                            <div className={`relative w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full ${colors.badgeBg} flex items-center justify-center shadow-md transition-colors duration-200 ring-2 ring-white`}>
                              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] text-white" />
                            </div>
                          </div>
                          <h3 className="font-semibold text-xs sm:text-sm md:text-base text-foreground mb-0.5 sm:mb-1 leading-tight mt-2 sm:mt-3">{service.title}</h3>
                          <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 hidden sm:block">{service.description}</p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-3 sm:mt-4 md:mt-6 text-center">
                    <BankingButton variant="default" size="sm" className="sm:text-sm" onClick={onBackToHome}>
                      <ArrowLeft className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Back to Home
                    </BankingButton>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>        
          ) : (         
             /* Ticket Generated View */
          <div className="w-full max-w-2xl px-1 sm:px-2 md:px-0">
            <Card className="shadow-banking bg-card/60 backdrop-blur-md border-2 border-primary/20">
              <CardHeader className="px-3 py-3 sm:px-6 sm:py-4">
                <CardTitle className="text-base sm:text-lg md:text-2xl text-center flex items-center justify-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 md:p-3 rounded-xl bg-primary/10">
                    <UserCheck className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-primary" />
                  </div>
                  Assistance Ticket Generated
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-4 sm:px-6 sm:pb-6 md:px-8 md:pb-8">
                <div className="text-center space-y-3 sm:space-y-4 md:space-y-6">
                  {/* Ticket Details */}                  <div id="assistance-ticket-print" className="bg-card/80 backdrop-blur-sm border-2 border-primary/30 p-3 sm:p-5 md:p-8 rounded-xl max-w-md mx-auto shadow-lg">
                    <h3 className="text-base sm:text-lg font-bold mb-4 sm:mb-6 text-primary">Your Assistance Ticket</h3>
                    
                    <div className="space-y-3 sm:space-y-4 text-left">
                      {/* Selected Service */}
                      {selectedService && (
                        <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-primary/10 border border-primary/20">
                          <div className="p-1.5 sm:p-2 rounded-lg bg-primary/20 flex-shrink-0">
                            {(() => {
                              const Icon = serviceIcons[selectedService.id] || Wallet;
                              return <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />;
                            })()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Service Requested</p>
                            <p className="font-semibold text-sm sm:text-base text-primary truncate">{selectedService.title}</p>
                          </div>
                        </div>
                      )}
                        <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-muted/50">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
                          <Hash className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Ticket ID</p>
                          <p className="font-semibold text-sm sm:text-base truncate">{ticketId}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-muted/50">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 flex-shrink-0">
                          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-xs text-muted-foreground">Generated</p>
                          <p className="font-semibold text-sm sm:text-base truncate">{new Date().toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-lg bg-emerald-100 border border-emerald-200">
                        <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-200 flex-shrink-0">
                          <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-700" />
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-xs text-emerald-600">Queue Number</p>
                          <p className="font-bold text-2xl sm:text-3xl text-emerald-700">#{assignedQueue || '...'}</p>
                        </div>
                      </div>
                    </div>
                  </div>                  {/* Instructions */}                  <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/30 p-3 sm:p-4 md:p-6 rounded-xl backdrop-blur-sm">
                    <h3 className="font-semibold text-sm sm:text-base text-blue-700 dark:text-blue-400 mb-2 sm:mb-3">
                      Next Steps
                    </h3>
                    <ol className="text-left space-y-1.5 sm:space-y-2 text-xs sm:text-sm text-blue-600 dark:text-blue-300">
                      <li className="flex items-start gap-2">
                        <span className="font-semibold">1.</span>
                        Take your printed ticket to the Tellerdesk
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold">2.</span>
                        Wait for your queue number to be called
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold">3.</span>
                        Present this ticket to the Customer Relations Officer
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-semibold">4.</span>
                        Get assistance with your {selectedService?.title.toLowerCase() || 'banking needs'}
                      </li>
                    </ol>
                  </div>                  <div className="flex gap-2 sm:gap-3 md:gap-4 justify-center flex-wrap">
                    <BankingButton
                      variant="outline"
                      size="default"
                      className="text-xs sm:text-sm"
                      onClick={handleBackToServices}
                    >
                      <ArrowLeft className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      Change Service
                    </BankingButton>
                    
                    <BankingButton
                      variant="default"
                      size="default"
                      className="text-xs sm:text-sm"
                      onClick={() => {
                        // Print only the ticket section with custom styles
                        const ticketSection = document.getElementById('assistance-ticket-print');
                        if (ticketSection) {
                          const printWindow = window.open('', '_blank', 'width=400,height=600');
                          printWindow?.document.write(`<!DOCTYPE html><html><head><title>Print Ticket</title>
                            <style>
                              body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
                              .ticket-container { background: #fff; border-radius: 18px; box-shadow: 0 4px 24px #0002; margin: 32px auto; padding: 32px 28px 24px 28px; max-width: 370px; min-width: 320px; }
                              .ticket-title { color: #1d4ed8; font-size: 1.5rem; font-weight: bold; text-align: center; margin-bottom: 22px; letter-spacing: 1px; }
                              .ticket-section { margin-bottom: 18px; }
                              .ticket-label { color: #64748b; font-size: 1rem; margin-bottom: 2px; }
                              .ticket-value { font-size: 1.15rem; font-weight: 600; color: #0f172a; margin-bottom: 10px; }
                              .queue-box { background: #d1fae5; border-radius: 12px; padding: 14px 0; text-align: center; margin: 22px 0 18px 0; border: 2px solid #34d399; }
                              .queue-label { color: #059669; font-size: 1rem; }
                              .queue-number { color: #047857; font-size: 2.5rem; font-weight: bold; letter-spacing: 2px; margin-top: 2px; }
                              .divider { border-top: 1.5px dashed #e5e7eb; margin: 18px 0; }
                              .instructions { background: #f1f5f9; border-radius: 10px; padding: 16px 14px; margin-top: 22px; }
                              .instructions-title { color: #1d4ed8; font-weight: 600; margin-bottom: 10px; font-size: 1.08rem; }
                              .instructions-list { color: #334155; font-size: 1rem; margin: 0; padding-left: 20px; }
                              .instructions-list li { margin-bottom: 7px; }
                              .branding { text-align: center; margin-top: 18px; color: #64748b; font-size: 0.95rem; letter-spacing: 1px; }
                              @media print { body { background: #fff; } .ticket-container { box-shadow: none; margin: 0; } }
                            </style>
                          </head><body><div class='ticket-container'>
                            <div class='ticket-title'>Your Assistance Ticket</div>
                            <div class='ticket-section'>
                              <div class='ticket-label'>Service Requested</div>
                              <div class='ticket-value'>${selectedService ? selectedService.title : ''}</div>
                            </div>
                            <div class='ticket-section'>
                              <div class='ticket-label'>Ticket ID</div>
                              <div class='ticket-value'>${ticketId}</div>
                            </div>
                            <div class='ticket-section'>
                              <div class='ticket-label'>Generated</div>
                              <div class='ticket-value'>${new Date().toLocaleString()}</div>
                            </div>
                            <div class='queue-box'>
                              <div class='queue-label'>Queue Number</div>
                              <div class='queue-number'>#${assignedQueue || '...'}</div>
                            </div>
                            <div class='divider'></div>
                            <div class='instructions'>
                              <div class='instructions-title'>Next Steps</div>
                              <ol class='instructions-list'>
                                <li>Take your printed ticket</li>
                                <li>Wait for your queue number to be called</li>
                                <li>Present this ticket to the Teller</li>
                                <li>Get assistance with your ${selectedService ? selectedService.title.toLowerCase() : 'banking needs'}</li>
                              </ol>
                            </div>
                            <div class='branding'>
                              <span>SecureBank &bull; ${new Date().getFullYear()}</span>
                            </div>
                          </div></body></html>`);
                          printWindow?.document.close();
                          printWindow?.focus();
                          setTimeout(() => printWindow?.print(), 200);
                        } else {
                          window.print(); // fallback
                        }
                      }}
                    >                      <Printer className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                      Print Ticket
                    </BankingButton>
                    
                    <BankingButton
                      variant="secondary"
                      size="default"
                      className="text-xs sm:text-sm"
                      onClick={onBackToHome}
                    >
                      Done
                    </BankingButton>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>      {/* Sticky Footer */}      <footer className="mt-auto px-3 py-3 sm:px-6 sm:py-4 bg-muted/80 backdrop-blur-sm border-t border-border/50 flex-shrink-0 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground leading-relaxed">🏦 TellerDesk Hours: Mon-Fri 9:00 AM - 5:00 PM • Average wait time: 5-10 minutes</p>
        </div>
      </footer>
    </div>
  );
};

export default AssistanceTicket;