import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import FormData from 'form-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import FingerprintScan from '../../FingerprintScan';
import AccountDetails from '../../AccountDetails';
import ServiceSelection from '../../ServiceSelection';
import TransactionComplete from '../../TransactionComplete';
import ProgressIndicator from '../../ProgressIndicator';
import {
  BalanceInquiry,
  AccountUpdates,
  StatementGeneration,
  FundTransfers,
  BillPayments,
  CashWithdrawal,
  CashDeposit,
  CheckDeposits,
  PinReset,
  FraudReporting,
  MfaSetup,
} from '..';
import { pushTicketToQueue } from '../../../../services/api'
import { BACKEND_URL, IMAGING_URL, SDK_BASE_URL } from '@/config';

// Set axios base URL
axios.defaults.baseURL = SDK_BASE_URL;

const API_BASE = BACKEND_URL;

type WithdrawalStep = 'scan' | 'account' | 'services' | 'service-flow' | 'complete';

interface KioskService {
  id: number;
  serviceId: string;
  title: string;
  description: string;
  tag: string;
  enabled: boolean;
  displayOrder: number;
}

// Fallback static list used only when the API is unreachable
const FALLBACK_SERVICES: KioskService[] = [
  { id: 1, serviceId: 'cash_withdrawal', title: 'Cash Withdrawal', description: 'Link to the cashier for fast GHC cash withdrawal.', tag: 'Cash', enabled: true, displayOrder: 1 },
  { id: 2, serviceId: 'cash_deposit', title: 'Cash Deposit', description: 'Deposit cash directly into your account instantly.', tag: 'Cash', enabled: true, displayOrder: 2 },
  { id: 3, serviceId: 'check_deposits', title: 'Cheque Deposits', description: 'Capture cheque images with OCR for instant posting.', tag: 'Deposits', enabled: true, displayOrder: 3 },
  { id: 4, serviceId: 'fund_transfers', title: 'Fund Transfers', description: 'Transfer funds intra-bank, via GhIPSS, or to mobile money wallets.', tag: 'Transfers', enabled: true, displayOrder: 4 },
  { id: 5, serviceId: 'bill_payments', title: 'Bill Payments', description: 'Pay utilities, mobile top-ups, TV subscriptions, school fees, and more.', tag: 'Payments', enabled: true, displayOrder: 5 },
  { id: 6, serviceId: 'balance', title: 'Balance Inquiry', description: 'Check balance with detailed mini-statement including recent transactions.', tag: 'Insights', enabled: true, displayOrder: 6 },
  { id: 7, serviceId: 'statement_generation', title: 'Statement Requests', description: 'Select a date range to view, download PDF, or email statements.', tag: 'Documentation', enabled: true, displayOrder: 7 },
  { id: 8, serviceId: 'account_updates', title: 'Account Updates', description: 'Update contact info such as phone number, email, or address.', tag: 'Maintenance', enabled: true, displayOrder: 8 },
  { id: 9, serviceId: 'pin_reset', title: 'PIN / Password Reset', description: 'Self-service reset for online banking credentials.', tag: 'Security', enabled: true, displayOrder: 9 },
  { id: 10, serviceId: 'fraud_reporting', title: 'Fraud Reporting', description: 'Report suspicious activity or lost items with instant block.', tag: 'Security', enabled: true, displayOrder: 10 },
  { id: 11, serviceId: 'mfa_setup', title: 'Multi-Factor Setup', description: 'Enroll additional biometrics or trusted devices.', tag: 'Security', enabled: true, displayOrder: 11 },
];

interface User {
  name: string;
  account: string;
  acct_link: string;
  balance: number;
  cust_tel?: string;
  mobile_no?: string;
  phone_no?: string;
}

// Helper: fire-and-forget service activity log to the backend
function logActivity(payload: {
  serviceId: string;
  serviceName: string;
  action: string;
  status: 'success' | 'failure' | 'pending';
  duration?: number;
  errorMessage?: string;
  userId?: string;
}) {
  fetch(`${API_BASE}/api/service-activity/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => { /* non-critical */ });
}

interface WithdrawalAppProps {
  isAssisted?: boolean; // Optional, determined by query param
}

const WithdrawalApp: React.FC<WithdrawalAppProps> = ({ isAssisted: propIsAssisted }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine isAssisted from query param or prop
  const queryParams = new URLSearchParams(location.search);
  const mode = queryParams.get('mode');
  const isAssisted = propIsAssisted ?? (mode === 'assisted');
  const [currentStep, setCurrentStep] = useState<WithdrawalStep>('scan');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [withdrawalAmount, setWithdrawalAmount] = useState<number>(0);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);  const [services, setServices] = useState<KioskService[]>([]);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [serviceSelectionTimeout, setServiceSelectionTimeout] = useState<number>(300);
  const [transactionCompleteTimeout, setTransactionCompleteTimeout] = useState<number>(7);
  const [queueNumber, setQueueNumber] = useState<number | null>(null);

  // Fetch enabled services from the API — poll every 30 s so admin toggles propagate live
  useEffect(() => {
    const loadServices = () => {
      fetch(`${API_BASE}/api/services/self-service`)
        .then((r) => r.json())
        .then((data: KioskService[]) => {
          if (Array.isArray(data)) {
            setServices(data.length > 0 ? data : FALLBACK_SERVICES);
          }
          setServicesLoaded(true);
        })
        .catch(() => {
          // Only fall back to static list if we haven't successfully loaded yet
          setServices((prev) => (prev.length === 0 ? FALLBACK_SERVICES : prev));
          setServicesLoaded(true);
        });
    };    loadServices();
    const poll = setInterval(loadServices, 30_000);
    return () => clearInterval(poll);
  }, []);

  // If a poll removes a service the customer had selected (admin disabled it mid-session),
  // clear the selection so they can't proceed with a disabled service
  useEffect(() => {
    if (!selectedServiceId || services.length === 0) return;
    const stillExists = services.some((s) => s.serviceId === selectedServiceId);
    if (!stillExists) {
      setSelectedServiceId(null);
    }
  }, [services, selectedServiceId]);

  // Fetch public settings for customer-side session timeouts
  useEffect(() => {
    fetch(`${API_BASE}/api/settings/public`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.serviceSelectionTimeout) setServiceSelectionTimeout(data.serviceSelectionTimeout);
        if (data?.transactionCompleteTimeout) setTransactionCompleteTimeout(data.transactionCompleteTimeout);
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  // Initialize Suprema scanner on mount with retry logic
  useEffect(() => {
    const initScanner = async () => {

      setIsLoading(true);
      setError(null);
      const maxRetries = 1;
      let attempts = 0;

      while (attempts < maxRetries) {
        try {
          const config = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${SDK_BASE_URL}/init`,
            headers: { 
              'Accept': 'application/json',
            },
          };
          const response = await axios.request(config);
          // console.log('Scanner init response:', JSON.stringify(response.data.success));
          if (response.data === 1) {
            setIsLoading(false);
            return;
          } else {
            throw new Error(response.data.message || 'Scanner initialization failed');
          }        } catch (err) {
          attempts++;
          if (attempts === maxRetries) {
            setIsLoading(false);
            let errorMessage = 'Failed to initialize fingerprint scanner. Please check scanner connection or contact support.';
            if (axios.isAxiosError(err) && err.response?.data?.message) {
              errorMessage = err.response.data.message;
            } else if (err instanceof Error) {
              errorMessage = err.message;
            }
            setError(errorMessage);
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    };
    initScanner();
  }, []);

  // Reset state on navigation to ensure fresh start
  useEffect(() => {
    setCurrentStep('scan');
    setUsers([]);
    setSelectedAccountId(null);
    setWithdrawalAmount(0);    setTicketNumber(null);
    setTransactionId(null);
    setQueueNumber(null);
    setError(null);
  }, [location.pathname, location.search]);

  const handleFingerprintSuccess = useCallback(async (fingerprintData: string) => {
    setIsLoading(true);
    setError(null);

    try {
      // Generate ticket number and transaction ID
      const newTicketNumber = Math.floor(100000 + Math.random() * 900000).toString();
      setTicketNumber(newTicketNumber);
      const newTransactionId = `TXN-${Date.now()}`;
      setTransactionId(newTransactionId);

      // Call /verify
      const formData = new FormData();
      formData.append('fingerprintData', fingerprintData);
      const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: '/verify',
        headers: { 
          'Accept': 'application/json',
        },
        data: formData,
      };      const response = await axios.request(config);
      const data = response.data;
      if (data.user_verified) {
        // Normalize to an array — some SDK versions return a single object
        const user_details = data.customer_details;
        const userList = Array.isArray(user_details)
          ? (user_details as User[])
          : (user_details ? [user_details] : []);
        setUsers(userList);
        if (userList.length === 1) {
          setSelectedAccountId(userList[0].account);
          setSelectedServiceId((prev) => prev || services[0]?.serviceId || null);
        }
        logActivity({ serviceId: 'fingerprint_auth', serviceName: 'Fingerprint Authentication', action: 'fingerprint_scan', status: 'success', userId: userList[0]?.account });
        setCurrentStep('account');
        setIsLoading(false);
      } else {
        logActivity({ serviceId: 'fingerprint_auth', serviceName: 'Fingerprint Authentication', action: 'fingerprint_scan', status: 'failure', errorMessage: 'No matching fingerprint found' });
        setError('No matching fingerprint found.');
        setUsers([]);
        setTicketNumber(null);
        setTransactionId(null);
        setIsLoading(false);
      }
    } catch (err) {
      let errorMessage = 'Failed to verify fingerprint.';
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      logActivity({ serviceId: 'fingerprint_auth', serviceName: 'Fingerprint Authentication', action: 'fingerprint_scan', status: 'failure', errorMessage });
      setError(errorMessage);
      setUsers([]);
      setTicketNumber(null);
      setTransactionId(null);
      setIsLoading(false);
    }
  }, [services]);

  const handleAccountConfirm = useCallback((accountId: string) => {
    setSelectedAccountId(accountId);
    setCurrentStep('services');
  }, []);
  const handleServiceConfirm = useCallback(() => {
    if (selectedServiceId) {
      const svc = services.find(s => s.serviceId === selectedServiceId);
      logActivity({ serviceId: selectedServiceId, serviceName: svc?.title ?? selectedServiceId, action: 'service_selected', status: 'pending' });
      setCurrentStep('service-flow');
    }
  }, [selectedServiceId, services]);
  const handleServiceFlowComplete = useCallback(() => {
    if (selectedServiceId) {
      const svc = services.find(s => s.serviceId === selectedServiceId);
      logActivity({ serviceId: selectedServiceId, serviceName: svc?.title ?? selectedServiceId, action: 'service_completed', status: 'success' });
    }
    setCurrentStep('complete');
  }, [selectedServiceId, services]);

  const handleBackToServices = useCallback(() => {
    setCurrentStep('services');
  }, []);

  const handleServiceSelect = useCallback((serviceId: string) => {
    setSelectedServiceId(serviceId);
  }, []);
  const handleAmountSubmit = useCallback(async (amount: number) => {
    const selectedUser = users.find(user => user.account === selectedAccountId);

    // Guard: need a valid user and a positive amount
    if (!selectedAccountId || !selectedUser) {
      setError('No account selected. Please restart the session.');
      return;
    }
    if (amount <= 0 || amount > selectedUser.balance) {
      setError('Invalid amount or insufficient balance.');
      return;
    }

    // Generate ticket/transactionId now if they were somehow cleared
    const resolvedTicket = ticketNumber ?? Math.floor(100000 + Math.random() * 900000).toString();
    const resolvedTxnId  = transactionId  ?? `TXN-${Date.now()}`;
    if (!ticketNumber)    setTicketNumber(resolvedTicket);
    if (!transactionId)   setTransactionId(resolvedTxnId);
    setIsLoading(true);
    setError(null);
    setWithdrawalAmount(amount);

    try {
      // Write to tb_self_serv_txn and trigger auto-queueing
      const response = await fetch(`${API_BASE}/api/transactions/self-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId:  resolvedTicket.slice(0, 20),
          drAccount: selectedUser.account,
          transType: 'WITHDRAWAL',
          amount,
          currency: 'GHS',
          docRef:   resolvedTxnId.slice(0, 50),
          param1:   selectedUser.name,
          param3:   'cash_withdrawal' // Maps to serviceId
        }),
      });

      if (!response.ok) throw new Error('Failed to log transaction');
      
      const result = await response.json();
      
      // Update state with the backend-assigned sequential queue number
      if (result.data?.queueNumber) {
        setQueueNumber(result.data.queueNumber);
      } else {
        // Fallback for safety
        setQueueNumber(Math.floor(Math.random() * 50) + 1);
      }

      // Notify external imaging API (fire-and-forget)
      fetch(`${IMAGING_URL}/make_bio_transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketNumber: resolvedTicket,
          transactionId: resolvedTxnId,
          accountNo: selectedUser.account,
          customer_name: selectedUser.name,
          amount,
          timestamp: new Date().toISOString(),
          transactionType: 'withdrawal',
        }),
      }).catch(() => {/* non-critical */});

      logActivity({
        serviceId: 'cash_withdrawal',
        serviceName: 'Cash Withdrawal',
        action: 'withdrawal_completed',
        status: 'success',
        userId: selectedAccountId ?? undefined,
      });

      setCurrentStep('complete');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to complete transaction';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId, users, ticketNumber, transactionId]);

  const handleNewTransaction = useCallback(() => {
    if (isAssisted) {
      window.location.href = `forms://complete?status=success&ticket=${ticketNumber || 'N/A'}&txn=${transactionId || 'N/A'}`;
    } else {
      // Reset state and return to service selection
      setSelectedServiceId(null);
      setTicketNumber(null);
      setTransactionId(null);
      setCurrentStep('services');
    }
  }, [isAssisted, ticketNumber, transactionId]);
  const steps = [
    { id: 'scan', label: 'Scan' },
    { id: 'account', label: 'Account' },
    { id: 'services', label: 'Services' },
    { id: 'service-flow', label: 'Transact' },
    { id: 'complete', label: 'Done' },
  ];

  // Get current step index
  const getStepIndex = () => {
    return steps.findIndex(step => step.id === currentStep);
  };
  
  const currentStepIndex = getStepIndex();
  const selectedUser = (Array.isArray(users) ? users : []).find(user => user.account === selectedAccountId) || null;
  const selectedService = services.find(s => s.serviceId === selectedServiceId);

  // Map DB services to the shape ServiceSelection expects
  const serviceSelectionList = services.map((s) => ({
    id: s.serviceId,
    title: s.title,
    description: s.description,
    tag: s.tag,
  }));
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground px-4 py-2.5 shadow-banking flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold leading-tight">Secure Banking Kiosk</h1>
            <p className="text-primary-foreground/70 text-xs">
              {isAssisted ? 'CRO-Assisted Transaction' : 'Self-Service Terminal'}
            </p>
          </div>          {selectedUser && (
            <div className="hidden sm:block text-center">
              <div className="text-xs opacity-70">Customer</div>
              <div className="text-sm font-semibold">{selectedUser.name}</div>
              <div className="text-xs opacity-70 font-mono">{selectedUser.acct_link || selectedUser.account}</div>
            </div>
          )}
          <div className="text-right">
            <div className="text-xs opacity-70">
              {isAssisted ? 'CRO Session' : 'Session Active'}
            </div>
            <div className="text-sm font-semibold font-mono">
              {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>
      </header>      {/* Main Content */}
      <main className="flex-1 flex flex-col p-3 w-full mt-8 overflow-hidden">
        <div className="w-full max-w-6xl mx-auto">
          {/* Progress Steps at Top */}
          <ProgressIndicator 
            steps={steps} 
            currentStep={currentStepIndex} 
            className="mb-3" 
          />
        </div>
          {/* Centered Card Content */}
        <div className="flex-1 flex items-start justify-center w-full overflow-hidden">
          <div className={`w-full ${currentStep === 'services' ? 'max-w-6xl' : 'max-w-5xl'}`}>            <Card className="shadow-banking bg-gradient-card">
              {/* {currentStep !== 'service-flow' && currentStep !== 'complete' && (
                <CardHeader className="py-2 px-5 border-b">
                  <CardTitle className="text-base text-center font-semibold text-muted-foreground">
                    {currentStep === 'scan' && 'Fingerprint Authentication'}
                    {currentStep === 'account' && 'Confirm Your Account'}
                    {currentStep === 'services' && 'Select a Service'}
                  </CardTitle>
                </CardHeader>
              )} */}
              <CardContent className={currentStep === 'services' ? 'p-3' : currentStep === 'complete' ? 'p-4' : 'p-5'}>
                {currentStep === 'scan' && (
                  <FingerprintScan 
                    onSuccess={handleFingerprintSuccess}
                    isAssisted={isAssisted}
                    isLoading={isLoading}
                    error={error}
                  />
                )}
                
                {currentStep === 'account' && (
                  <AccountDetails 
                    users={users}
                    onConfirm={handleAccountConfirm}
                    isAssisted={isAssisted}
                    isLoading={isLoading}
                    error={error}
                    onRetry={() => handleFingerprintSuccess('retry')}
                  />
                )}                {currentStep === 'services' && (
                  !servicesLoaded
                    ? (
                      <div className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground">
                        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <p className="text-sm">Loading available services…</p>
                      </div>
                    )
                    : (
                      <ServiceSelection
                        services={serviceSelectionList}
                        selectedServiceId={selectedServiceId}
                        onServiceSelect={handleServiceSelect}
                        onConfirm={handleServiceConfirm}
                        onBack={() => setCurrentStep('account')}
                        showBackButton={users.length >= 2}
                        isEnabled={!!selectedAccountId}
                        isLoading={isLoading}
                        timeoutSeconds={serviceSelectionTimeout}
                      />
                    )
                )}

                {currentStep === 'service-flow' && selectedUser && selectedServiceId && (
                  <>
                    {selectedServiceId === 'balance' && (
                      <BalanceInquiry
                        user={selectedUser}
                        onComplete={handleServiceFlowComplete}
                        onBack={handleBackToServices}
                        onNewTransaction={handleNewTransaction}
                        isAssisted={isAssisted}
                      />
                    )}
                    {selectedServiceId === 'account_updates' && (
                      <AccountUpdates
                        user={selectedUser}
                        onComplete={handleServiceFlowComplete}
                        onBack={handleBackToServices}
                        onNewTransaction={handleNewTransaction}
                        isAssisted={isAssisted}
                      />
                    )}
                    {selectedServiceId === 'statement_generation' && (
                      <StatementGeneration
                        user={selectedUser}
                        onComplete={handleServiceFlowComplete}
                        onBack={handleBackToServices}
                        onNewTransaction={handleNewTransaction}
                        isAssisted={isAssisted}
                      />
                    )}
                    {selectedServiceId === 'fund_transfers' && (
                      <FundTransfers
                        user={selectedUser}
                        onComplete={handleServiceFlowComplete}
                        onBack={handleBackToServices}
                        onNewTransaction={handleNewTransaction}
                        isAssisted={isAssisted}
                      />
                    )}
                    {selectedServiceId === 'bill_payments' && (
                      <BillPayments
                        user={selectedUser}
                        onComplete={handleServiceFlowComplete}
                        onBack={handleBackToServices}
                        onNewTransaction={handleNewTransaction}
                        isAssisted={isAssisted}
                      />
                    )}                    {selectedServiceId === 'cash_deposit' && (
                      <CashDeposit
                        user={selectedUser}
                        onComplete={handleServiceFlowComplete}
                        onBack={handleBackToServices}
                        onNewTransaction={handleNewTransaction}
                        isAssisted={isAssisted}
                        ticketNumber={ticketNumber}
                        transactionId={transactionId}
                      />
                    )}
                    {selectedServiceId === 'check_deposits' && (
                      <CheckDeposits
                        user={selectedUser}
                        onComplete={handleServiceFlowComplete}
                        onBack={handleBackToServices}
                        onNewTransaction={handleNewTransaction}
                        isAssisted={isAssisted}
                      />
                    )}
                    {selectedServiceId === 'pin_reset' && (
                      <PinReset
                        user={selectedUser}
                        onComplete={handleServiceFlowComplete}
                        onBack={handleBackToServices}
                        onNewTransaction={handleNewTransaction}
                        isAssisted={isAssisted}
                      />
                    )}
                    {selectedServiceId === 'fraud_reporting' && (
                      <FraudReporting
                        user={selectedUser}
                        onComplete={handleServiceFlowComplete}
                        onBack={handleBackToServices}
                        onNewTransaction={handleNewTransaction}
                        isAssisted={isAssisted}
                      />
                    )}
                    {selectedServiceId === 'mfa_setup' && (
                      <MfaSetup
                        user={selectedUser}
                        onComplete={handleServiceFlowComplete}
                        onBack={handleBackToServices}
                        onNewTransaction={handleNewTransaction}
                        isAssisted={isAssisted}
                      />
                    )}
                    {selectedServiceId === 'cash_withdrawal' && (
                      <CashWithdrawal 
                        user={selectedUser}
                        onSubmit={handleAmountSubmit}
                        isLoading={isLoading}
                        isAssisted={isAssisted}
                        onBack={handleBackToServices}
                      />
                    )}
                  </>
                )}                {currentStep === 'complete' && selectedUser && (
                  <TransactionComplete 
                    user={selectedUser}
                    amount={withdrawalAmount}
                    ticketNumber={ticketNumber}
                    transactionId={transactionId}
                    onNewTransaction={handleNewTransaction}
                    isAssisted={isAssisted}
                    timeoutSeconds={transactionCompleteTimeout}
                    serviceName={selectedService?.title}
                    transactionType={
                      selectedServiceId === 'cash_withdrawal' ? 'withdrawal'
                      : selectedServiceId === 'cash_deposit' ? 'deposit'
                      : selectedServiceId === 'fund_transfers' ? 'transfer'
                      : selectedServiceId === 'bill_payments' ? 'bill-payment'
                      : selectedServiceId === 'pin_reset' ? 'pin-reset'
                      : selectedServiceId === 'account_updates' ? 'account-update'
                      : selectedServiceId === 'fraud_reporting' ? 'fraud-report'
                      : selectedServiceId === 'mfa_setup' ? 'mfa-setup'
                      : selectedServiceId === 'check_deposits' ? 'check-deposit'
                      : 'withdrawal'
                    }
                    customDetails={
                      (selectedServiceId === 'cash_withdrawal' || selectedServiceId === 'cash_deposit') && queueNumber !== null
                        ? [{ label: 'Queue Number', value: `#${queueNumber}` }]
                        : []
                    }
                    successMessage={
                      selectedServiceId === 'cash_withdrawal'
                        ? `Your ticket is ready. Queue number #${queueNumber} — please proceed to the teller counter.`
                        : selectedServiceId === 'cash_deposit'
                        ? `Your ticket is ready. Queue number #${queueNumber} — please proceed to the cashier with your cash.`
                        : undefined
                    }
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>      {/* Security Footer */}
      <footer className="py-2 px-4 bg-muted text-center text-xs text-muted-foreground flex-shrink-0">
        🔒 Secured with 256-bit encryption · All transactions are monitored for security
      </footer>
    </div>
  );
};

export default WithdrawalApp;