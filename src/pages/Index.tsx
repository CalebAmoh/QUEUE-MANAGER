import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { WithdrawalApp } from '@/components/withdrawal/services';
import AssistanceTicket from '@/components/withdrawal/AssistanceTicket';
import { Fingerprint, Users, ArrowRight, Wrench } from 'lucide-react';
import { BACKEND_URL } from '@/config';

const API_BASE = BACKEND_URL;

interface PublicSettings {
  maintenanceMode: boolean;
  sessionTimeout: number; // seconds
}

const Index = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'services' | 'assistance-ticket' | 'default'>('default');
  const [isAssisted, setIsAssisted] = useState(false);
  const [currentSvgSlide, setCurrentSvgSlide] = useState(0);
  const [currentFlowSlide, setCurrentFlowSlide] = useState(0);
  const [currentSecuritySlide, setCurrentSecuritySlide] = useState(0);
  const [publicSettings, setPublicSettings] = useState<PublicSettings>({ maintenanceMode: false, sessionTimeout: 300 });
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch public settings on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/settings/public`)
      .then((r) => r.json())
      .then((data: PublicSettings) => setPublicSettings(data))
      .catch(() => { /* keep defaults */ });
  }, []);

  // SVG slides data (using public folder SVGs)
  const svgSlides = [
    { src: '/fingerprint-animate.svg', label: '1. Scan Your Fingerprint', sublabel: 'Quick & Secure Authentication' },
    { src: '/security-on-animate.svg', label: '2. Identity Verified', sublabel: 'Bank-Grade Security' },
    { src: '/e-wallet-animate.svg', label: '3. Choose Your Service', sublabel: 'Multiple Banking Options' },
    { src: '/banknote-animate.svg', label: '4. Transaction Complete', sublabel: 'Fast & Reliable' },
  ];

  // Flow steps for right side top slider
  const flowSteps = [
    { label: '1. Scan', sublabel: 'Place finger on scanner', color: '#a5d8ff' },
    { label: '2. Verify', sublabel: 'Identity confirmed', color: '#b2f2bb' },
    { label: '3. Select', sublabel: 'Choose your service', color: '#d0bfff' },
    { label: '4. Process', sublabel: 'Processing transaction', color: '#ffd8a8' },
    { label: '5. Complete', sublabel: 'Transaction done', color: '#96f2d7' },
  ];

  // Security features for right side bottom slider
  const securityFeatures = [
    { label: 'Protected', sublabel: 'Bank-grade security', color: '#fcc2d7' },
    { label: 'Instant', sublabel: '2-second verification', color: '#ffd8a8' },
    { label: 'Accessible', sublabel: 'Available 24/7', color: '#99e9f2' },
    { label: 'Secure', sublabel: 'Encrypted data', color: '#ffec99' },
  ];
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    const assisted = searchParams.get('assisted');
    
    if (urlMode === 'services') {
      setMode('services');
      setIsAssisted(assisted === 'true');
    } else if (urlMode === 'assistance') {
      setMode('assistance-ticket');
    } else {
      setMode('default');
      setIsAssisted(false);
    }
  }, [searchParams]);

  // Idle-timeout: reset to home page after sessionTimeout seconds of inactivity
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    const timeoutMs = (publicSettings.sessionTimeout || 300) * 1000;
    idleTimerRef.current = setTimeout(() => {
      // Navigate back to home if the user is mid-session
      if (mode !== 'default') {
        window.history.pushState({}, '', '/');
        setMode('default');
        setIsAssisted(false);
      }
    }, timeoutMs);
  }, [publicSettings.sessionTimeout, mode]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'];
    events.forEach((e) => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [resetIdleTimer]);

  // Auto-rotate SVG slides
  useEffect(() => {
    if (mode !== 'default') return;
    const interval = setInterval(() => {
      setCurrentSvgSlide((prev) => (prev + 1) % svgSlides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [mode, svgSlides.length]);

  // Auto-rotate flow slides
  useEffect(() => {
    if (mode !== 'default') return;
    const interval = setInterval(() => {
      setCurrentFlowSlide((prev) => (prev + 1) % flowSteps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [mode, flowSteps.length]);

  // Auto-rotate security slides
  useEffect(() => {
    if (mode !== 'default') return;
    const interval = setInterval(() => {
      setCurrentSecuritySlide((prev) => (prev + 1) % securityFeatures.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [mode, securityFeatures.length]);

  if (publicSettings.maintenanceMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-background to-amber-100 dark:from-amber-950/30 dark:to-background">
        <div className="text-center space-y-6 px-8 max-w-lg">
          <div className="mx-auto w-24 h-24 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <Wrench className="w-12 h-12 text-amber-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-amber-800 dark:text-amber-300">System Maintenance</h1>
            <p className="mt-3 text-muted-foreground text-lg">
              This kiosk is temporarily unavailable while we perform scheduled maintenance.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Please visit a teller or try again shortly. We apologise for the inconvenience.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Maintenance in progress
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'services') {
    return <WithdrawalApp isAssisted={isAssisted} />;
  }

  if (mode === 'assistance-ticket') {
    const handleBackToHome = () => {
      setMode('default');
      window.history.pushState({}, '', '/');
    };
    return <AssistanceTicket onBackToHome={handleBackToHome} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/15 via-background to-primary/20 relative overflow-hidden">
      {/* Decorative blur circles */}
      <div className="absolute top-20 right-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-primary/15 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/10 rounded-full blur-3xl" />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-8 lg:px-16 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16 items-center">
          
          {/* Left Column - SVG Slider */}
          <div className="flex flex-col items-center space-y-6">
            <div className="relative w-80 h-80 lg:w-96 lg:h-96">
              {svgSlides.map((slide, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-all duration-700 ${
                    index === currentSvgSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                  }`}
                >
                  <img src={slide.src} alt={slide.label} className="w-full h-full object-contain" />
                </div>
              ))}
            </div>
            <div className="text-center">
              <h3 className="text-xl font-semibold text-foreground">{svgSlides[currentSvgSlide].label}</h3>
              <p className="text-base text-muted-foreground">{svgSlides[currentSvgSlide].sublabel}</p>
            </div>
          </div>

          {/* Center Column - Action Cards */}
          <div className="flex flex-col items-center space-y-6">
            <div className="text-center mb-4">
              <h1 className="text-4xl font-bold text-primary mb-2">Banking Portal</h1>
              <p className="text-muted-foreground">Secure fingerprint-based banking services</p>
            </div>

            {/* Customer Mode Card */}
            <a
              href="/?mode=services"
              className="group w-full max-w-sm p-8 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 backdrop-blur-sm hover:border-primary/50 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Fingerprint className="h-8 w-8 text-primary" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-foreground">Customer Mode</h2>
                    <p className="text-sm text-muted-foreground">Self-service banking</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-primary opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </a>

            {/* Request Assistance Card */}
            <a
              href="/?mode=assistance"
              className="group w-full max-w-sm p-8 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-secondary/10 via-secondary/15 to-secondary/10 backdrop-blur-sm hover:border-secondary/60 hover:shadow-xl hover:shadow-secondary/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                    <Users className="h-8 w-8 text-secondary-foreground" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-foreground">Request Assistance</h2>
                    <p className="text-sm text-muted-foreground">CRO assisted transaction</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-secondary-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </a>
          </div>

          {/* Right Column - Two SVG Sliders */}
          <div className="flex flex-col items-center space-y-8">
            {/* Top Slider - Flow Steps */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-36 h-36 lg:w-40 lg:h-40">
                {flowSteps.map((step, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
                      index === currentFlowSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                    }`}
                  >
                    <svg viewBox="0 0 120 120" className="w-full h-full">
                      {index === 0 && (
                        // Fingerprint/Scan
                        <g>
                          <circle cx="60" cy="60" r="50" fill={step.color} opacity="0.3">
                            <animate attributeName="r" values="45;50;45" dur="2s" repeatCount="indefinite" />
                          </circle>
                          <circle cx="60" cy="60" r="35" fill={step.color} opacity="0.5" />
                          <path d="M60 30 C30 30 30 90 60 90 C90 90 90 30 60 30" fill="none" stroke="#339af0" strokeWidth="3" strokeLinecap="round">
                            <animate attributeName="stroke-dasharray" values="0,200;200,0" dur="2s" repeatCount="indefinite" />
                          </path>
                          <path d="M60 40 C40 40 40 80 60 80 C80 80 80 40 60 40" fill="none" stroke="#339af0" strokeWidth="2" strokeLinecap="round" />
                          <path d="M60 50 C50 50 50 70 60 70 C70 70 70 50 60 50" fill="none" stroke="#339af0" strokeWidth="2" strokeLinecap="round" />
                        </g>
                      )}
                      {index === 1 && (
                        // Checkmark/Verify
                        <g>
                          <circle cx="60" cy="60" r="45" fill={step.color} opacity="0.3" />
                          <circle cx="60" cy="60" r="35" fill={step.color} opacity="0.5" />
                          <path d="M40 60 L55 75 L80 45" fill="none" stroke="#37b24d" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                      )}
                      {index === 2 && (
                        // Grid/Select
                        <g>
                          {/* <circle cx="60" cy="60" r="45" fill={step.color} opacity="0.3" /> */}
                          <rect x="30" y="30" width="20" height="20" rx="4" fill="#9775fa">
                            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite" />
                          </rect>
                          <rect x="55" y="30" width="20" height="20" rx="4" fill="#9775fa">
                            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.2s" repeatCount="indefinite" />
                          </rect>
                          <rect x="80" y="30" width="20" height="20" rx="4" fill="#9775fa">
                            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.4s" repeatCount="indefinite" />
                          </rect>
                          <rect x="30" y="55" width="20" height="20" rx="4" fill="#9775fa">
                            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.6s" repeatCount="indefinite" />
                          </rect>
                          <rect x="55" y="55" width="20" height="20" rx="4" fill="#9775fa">
                            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="0.8s" repeatCount="indefinite" />
                          </rect>
                          <rect x="80" y="55" width="20" height="20" rx="4" fill="#9775fa">
                            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" begin="1s" repeatCount="indefinite" />
                          </rect>
                        </g>
                      )}
                      {index === 3 && (
                        // Process/Loading
                        <g>
                          <circle cx="60" cy="60" r="45" fill={step.color} opacity="0.3" />
                          <circle cx="60" cy="60" r="35" fill={step.color} opacity="0.5" />
                          <circle cx="60" cy="60" r="22" fill="none" stroke="#fd7e14" strokeWidth="4" strokeLinecap="round" strokeDasharray="20 60">
                            <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="1.2s" repeatCount="indefinite" />
                          </circle>
                          <circle cx="60" cy="60" r="14" fill="none" stroke="#fd7e14" strokeWidth="3" strokeLinecap="round" strokeDasharray="12 40" opacity="0.6">
                            <animateTransform attributeName="transform" type="rotate" from="360 60 60" to="0 60 60" dur="0.9s" repeatCount="indefinite" />
                          </circle>
                          <circle cx="60" cy="60" r="5" fill="#fd7e14">
                            <animate attributeName="opacity" values="1;0.4;1" dur="1s" repeatCount="indefinite" />
                          </circle>
                        </g>
                      )}
                      {index === 4 && (
                        // Complete
                        <g>
                          <circle cx="60" cy="60" r="45" fill={step.color} opacity="0.3">
                            <animate attributeName="r" values="40;45;40" dur="1.5s" repeatCount="indefinite" />
                          </circle>
                          <circle cx="60" cy="60" r="35" fill={step.color} opacity="0.5" />
                          <circle cx="60" cy="60" r="25" fill="#20c997" />
                          <path d="M50 60 L57 67 L72 52" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                      )}
                    </svg>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">{flowSteps[currentFlowSlide].label}</p>
                <p className="text-sm text-muted-foreground">{flowSteps[currentFlowSlide].sublabel}</p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-24 h-px bg-border" />

            {/* Bottom Slider - Security Features */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-32 h-32 lg:w-36 lg:h-36">
                {securityFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ${
                      index === currentSecuritySlide ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                    }`}
                  >
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      {index === 0 && (
                        // Shield
                        <g>
                          <path d="M50 10 L85 25 L85 50 C85 70 70 85 50 95 C30 85 15 70 15 50 L15 25 Z" fill={feature.color} opacity="0.3">
                            <animate attributeName="opacity" values="0.2;0.4;0.2" dur="2s" repeatCount="indefinite" />
                          </path>
                          <path d="M50 18 L78 30 L78 50 C78 66 66 78 50 86 C34 78 22 66 22 50 L22 30 Z" fill={feature.color} opacity="0.6" />
                          <path d="M40 50 L48 58 L62 42" fill="none" stroke="#e64980" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                      )}
                      {index === 1 && (
                        // Speed/Clock
                        <g>
                          <circle cx="50" cy="50" r="40" fill={feature.color} opacity="0.3" />
                          <circle cx="50" cy="50" r="32" fill={feature.color} opacity="0.6" />
                          <circle cx="50" cy="50" r="4" fill="#fd7e14" />
                          <line x1="50" y1="50" x2="50" y2="28" stroke="#fd7e14" strokeWidth="3" strokeLinecap="round">
                            <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="4s" repeatCount="indefinite" />
                          </line>
                          <line x1="50" y1="50" x2="65" y2="50" stroke="#fd7e14" strokeWidth="2" strokeLinecap="round">
                            <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="1s" repeatCount="indefinite" />
                          </line>
                        </g>
                      )}
                      {index === 2 && (
                        // Globe
                        <g>
                          <circle cx="50" cy="50" r="38" fill={feature.color} opacity="0.3" />
                          <circle cx="50" cy="50" r="30" fill="none" stroke="#22b8cf" strokeWidth="2" />
                          <ellipse cx="50" cy="50" rx="12" ry="30" fill="none" stroke="#22b8cf" strokeWidth="2" />
                          <line x1="20" y1="50" x2="80" y2="50" stroke="#22b8cf" strokeWidth="2" />
                          <line x1="50" y1="20" x2="50" y2="80" stroke="#22b8cf" strokeWidth="2" />
                          <ellipse cx="50" cy="50" rx="30" ry="10" fill="none" stroke="#22b8cf" strokeWidth="1.5" strokeDasharray="4,2">
                            <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="8s" repeatCount="indefinite" />
                          </ellipse>
                        </g>
                      )}
                      {index === 3 && (
                        // Lock
                        <g>
                          <rect x="25" y="45" width="50" height="40" rx="5" fill={feature.color} opacity="0.6" />
                          <rect x="30" y="50" width="40" height="30" rx="3" fill="#fab005" />
                          <path d="M35 45 L35 35 C35 22 65 22 65 35 L65 45" fill="none" stroke={feature.color} strokeWidth="6" strokeLinecap="round" />
                          <circle cx="50" cy="65" r="5" fill="#ffffff">
                            <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
                          </circle>
                          <rect x="48" y="68" width="4" height="8" fill="#ffffff" />
                        </g>
                      )}
                    </svg>
                  </div>
                ))}
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">{securityFeatures[currentSecuritySlide].label}</p>
                <p className="text-sm text-muted-foreground">{securityFeatures[currentSecuritySlide].sublabel}</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Index;