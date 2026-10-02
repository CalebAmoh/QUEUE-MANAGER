import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Download, Home, RotateCcw, Shield } from 'lucide-react';
import { BankingButton } from '@/components/ui/banking-button';
import { Card, CardContent } from '@/components/ui/card';

interface User {
  name: string;
  account: string;
  balance: number;
}

export type TransactionType = 
  | 'withdrawal' 
  | 'deposit' 
  | 'transfer' 
  | 'bill-payment' 
  | 'pin-reset' 
  | 'account-update'
  | 'fraud-report'
  | 'mfa-setup'
  | 'check-deposit';

interface TransactionDetails {
  label: string;
  value: string;
}

interface TransactionCompleteProps {
  user: User;
  amount?: number; // Optional - not all services involve amounts
  ticketNumber: string | null;
  transactionId: string | null;
  onNewTransaction: () => void;
  isAssisted: boolean;
  serviceName?: string;
  transactionType?: TransactionType;
  customDetails?: TransactionDetails[]; // For service-specific details
  successMessage?: string;
  instructions?: string[];
  timeoutSeconds?: number; // auto-return to home after this many seconds (admin setting)
}

const TransactionComplete: React.FC<TransactionCompleteProps> = ({ 
  user, 
  amount, 
  ticketNumber, 
  transactionId, 
  onNewTransaction, 
  isAssisted,
  serviceName,
  transactionType = 'withdrawal',
  customDetails = [],
  successMessage,
  instructions,
  timeoutSeconds = 7,
}) => {
  const navigate = useNavigate();
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(value);
  };

  const getServiceLabel = () => {
    switch (transactionType) {
      case 'withdrawal': return 'Cash Withdrawal';
      case 'deposit': return 'Cash Deposit';
      case 'transfer': return 'Fund Transfer';
      case 'bill-payment': return 'Bill Payment';
      case 'pin-reset': return 'PIN/Password Reset';
      case 'account-update': return 'Account Update';
      case 'fraud-report': return 'Fraud Report';
      case 'mfa-setup': return 'MFA Setup';
      case 'check-deposit': return 'Check Deposit';
      default: return serviceName || 'Transaction';
    }
  };

  const getSuccessMessage = () => {
    if (successMessage) return successMessage;
    switch (transactionType) {
      case 'withdrawal': return 'Please collect your cash from the dispenser';
      case 'deposit': return 'Your deposit has been recorded. Please proceed to the cashier.';
      case 'transfer': return 'Your transfer has been processed successfully';
      case 'bill-payment': return 'Your payment has been processed successfully';
      case 'pin-reset': return 'Your credentials have been updated successfully';
      case 'account-update': return 'Your account details have been updated';
      case 'fraud-report': return 'Your report has been submitted. Our team will investigate.';
      case 'mfa-setup': return 'Multi-factor authentication has been configured';
      case 'check-deposit': return 'Your check has been submitted for processing';
      default: return 'Your request has been processed successfully';
    }
  };

  const getInstructions = () => {
    if (instructions) return instructions;
    switch (transactionType) {
      case 'withdrawal':
        return [
          'Please proceed to the teller counter with your ticket',
          'Present your ticket number to the teller for cash collection',
          'Verify the amount with the teller before accepting cash',
          'Keep your ticket copy for your records'
        ];
      case 'deposit':
        return [
          'Please proceed to the cashier with your cash',
          'Present your ticket number to complete the deposit',
          'Get a receipt for your records'
        ];
      case 'transfer':
        return [
          'The recipient will receive funds shortly',
          'Keep your transaction ID for reference',
          'Contact support if funds are not received within 24 hours'
        ];
      case 'bill-payment':
        return [
          'Your payment confirmation will be sent via SMS',
          'Keep your transaction ID for reference',
          'Allow up to 24 hours for the payment to reflect'
        ];
      default:
        return ['Keep your transaction ID for your records'];
    }
  };

  const transactionDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const newBalance = amount ? user.balance - (transactionType === 'deposit' ? -amount : amount) : user.balance;

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const startTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (isAssisted) {
          handleReturnToOracle();
        } else {
          navigate('/');
        }
      }, timeoutSeconds * 1000);
    };

    startTimer();

    const handleInteraction = () => {
      startTimer();
    };

    const rootElement = document.getElementById('transaction-complete-root');
    if (rootElement) {
      rootElement.addEventListener('click', handleInteraction);
    }

    return () => {
      clearTimeout(timer);
      if (rootElement) {
        rootElement.removeEventListener('click', handleInteraction);
      }
    };
  }, [isAssisted, navigate, timeoutSeconds]);  const handlePrintTicket = () => {
    const queueDetail = customDetails.find(d => d.label === 'Queue Number');
    const printContent = `
CUSTOMER ${getServiceLabel().toUpperCase()} TICKET
=========================
Date: ${transactionDate}
Ticket Number: ${ticketNumber || 'N/A'}
${queueDetail ? `Queue Number: ${queueDetail.value}` : ''}
Account: ${user.account}
Customer: ${user.name}
${amount ? `Amount: ${formatCurrency(amount)}` : ''}
=========================
${transactionType === 'withdrawal' ? 'Present this ticket to the teller\nto collect your cash withdrawal' :
  transactionType === 'deposit' ? 'Present this ticket to the cashier\nwith your cash to complete the deposit' :
  'Keep this ticket for your records'}
    `.trim();

    const win = window.open('', '_blank', 'width=380,height=500');
    if (win) {
      win.document.write(`<pre style="font-family:monospace;padding:16px">${printContent}</pre>`);
      win.document.close();
      win.focus();
      win.print();
      win.close();
    }
  };

  const handleReturnToOracle = () => {
    window.postMessage({ 
      type: 'TRANSACTION_COMPLETE', 
      data: { ticketNumber: ticketNumber || 'N/A', transactionId: transactionId || 'N/A', amount }
    }, '*');
    window.close();
  };

  return (
    <div id="transaction-complete-root" className="h-full flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-banking-success rounded-full mb-3 animate-pulse">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-banking-success mb-1">
                {getServiceLabel()} Successful!
              </h2>
              <p className="text-sm text-muted-foreground">
                {getSuccessMessage()}
              </p>
            </div>

            <Card className="bg-gradient-success shadow-card-banking rounded-2xl overflow-hidden">
              <CardContent className="p-5">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-center flex-1">
                      <div className="text-xs text-white/80 mb-1">Ticket Number</div>
                      <div className="text-lg font-semibold font-mono text-white">
                        {ticketNumber || 'N/A'}
                      </div>
                    </div>
                    {amount !== undefined && amount > 0 && (
                      <div className="text-center flex-1 border-l border-white/20 pl-4">
                        <div className="text-xs text-white/80 mb-1">
                          {transactionType === 'deposit' ? 'Amount Deposited' : 
                           transactionType === 'transfer' ? 'Amount Transferred' :
                           transactionType === 'bill-payment' ? 'Amount Paid' : 
                           'Amount'}
                        </div>
                        <div className="text-2xl font-bold text-white">
                          {formatCurrency(amount)}
                        </div>
                      </div>
                    )}
                  </div>

                  {customDetails.length > 0 && (
                    <div className="pt-3 border-t border-white/20">
                      {customDetails.map((detail, index) => (
                        <div key={index} className="flex justify-between text-white py-1 text-sm">
                          <span className="text-white/80">{detail.label}</span>
                          <span className="font-semibold">{detail.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-white pt-3 border-t border-white/20">
                    <div>
                      <div className="text-xs text-white/80">Transaction ID</div>
                      <div className="font-semibold font-mono text-sm">{transactionId || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/80">Date & Time</div>
                      <div className="font-semibold text-sm">{transactionDate}</div>
                    </div>
                    <div>
                      <div className="text-xs text-white/80">Account</div>
                      <div className="font-semibold text-sm">{user.account}</div>
                    </div>
                    {amount !== undefined && (
                      <div>
                        <div className="text-xs text-white/80">
                          {transactionType === 'deposit' ? 'New Balance' : 'Remaining Balance'}
                        </div>
                        <div className="font-semibold text-sm">{formatCurrency(newBalance)}</div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 flex flex-col">
            <div className="bg-banking-warning/10 border border-banking-warning/20 p-4 rounded-2xl flex-1">
              <h3 className="font-semibold text-banking-warning mb-2 flex items-center text-sm">
                <CheckCircle className="w-4 h-4 mr-2" />
                Important Reminders
              </h3>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {getInstructions().map((instruction, index) => (
                  <li key={index}>• {instruction}</li>
                ))}
              </ul>
            </div>

            {isAssisted && (
              <div className="bg-banking-info/10 border border-banking-info/20 p-3 rounded-2xl">
                <p className="text-xs text-banking-info font-medium text-center">
                  CRO: {getServiceLabel()} completed successfully. Ticket Number: {ticketNumber || 'N/A'}. 
                  {transactionType === 'withdrawal' && ' Please guide customer to the teller counter.'}
                  {transactionType === 'deposit' && ' Please guide customer to the cashier.'}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <BankingButton
                variant="outline"
                size="default"
                onClick={handlePrintTicket}
                className="flex-1 rounded-xl h-11"
              >
                <Download className="mr-2 h-4 w-4" />
                Print Ticket
              </BankingButton>
              
              {isAssisted ? (
                <BankingButton
                  variant="default"
                  size="default"
                  onClick={handleReturnToOracle}
                  className="flex-1 rounded-xl h-11"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Return to System
                </BankingButton>
              ) : (
                <BankingButton
                  variant="default"
                  size="default"
                  onClick={onNewTransaction}
                  className="flex-1 rounded-xl h-11"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  New Transaction
                </BankingButton>
              )}
            </div>

            <div className="bg-muted p-3 rounded-2xl flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">Transaction Complete:</span> Your ticket has been 
                generated. Please proceed to the teller counter.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionComplete;