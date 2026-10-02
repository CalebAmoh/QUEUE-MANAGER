import { useState } from 'react';
import { Banknote, Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import { BankingButton } from '@/components/ui/banking-button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TransactionComplete from '../../TransactionComplete';
import { pushTicketToQueue } from '@/services/api';
import { BACKEND_URL } from '@/config';

const API_BASE = BACKEND_URL;

interface User {
  name: string;
  account: string;
  balance: number;
}

interface CashDepositProps {
  user: User;
  onComplete: () => void;
  onBack: () => void;
  onNewTransaction: () => void;
  isAssisted: boolean;
  ticketNumber?: string | null;
  transactionId?: string | null;
}

// Ghana Cedi denominations
const DENOMINATIONS = [
  { value: 200, label: 'GHS 200', color: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300' },
  { value: 100, label: 'GHS 100', color: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300' },
  { value: 50, label: 'GHS 50', color: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300' },
  { value: 20, label: 'GHS 20', color: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300' },
  { value: 10, label: 'GHS 10', color: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300' },
  { value: 5, label: 'GHS 5', color: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300' },
  { value: 2, label: 'GHS 2', color: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300' },
  { value: 1, label: 'GHS 1', color: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300' },
];

// type DepositStep = 'amount' | 'denominations' | 'success';
type DepositStep = 'amount' | 'success';

const CashDeposit: React.FC<CashDepositProps> = ({
  user,
  onBack,
  onNewTransaction,
  isAssisted,
  ticketNumber: parentTicketNumber,
  transactionId: parentTransactionId,
}) => {
  const [step, setStep] = useState<DepositStep>('amount');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [queueNumber, setQueueNumber] = useState<number | null>(null);

  const quickAmounts = [50, 100, 200, 500, 1000, 2000];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(value);
  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount);
    if (!amount || depositAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const newTicket = parentTicketNumber ?? Math.floor(100000 + Math.random() * 900000).toString();
      const newTxnId = parentTransactionId ?? `DEP-${Date.now()}`;

      // Write to tb_self_serv_txn and trigger auto-queueing
      const response = await fetch(`${API_BASE}/api/transactions/self-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: newTicket.toString().slice(0, 20),
          crAccount: user.account,
          transType: 'DEPOSIT',
          amount: depositAmount,
          currency: 'GHS',
          docRef: newTxnId.slice(0, 50),
          param1: user.name,
          param3: 'cash_deposit'
        }),
      });

      if (!response.ok) throw new Error('Failed to log deposit');

      const result = await response.json();
      
      setTicketNumber(newTicket.toString());
      setTransactionId(newTxnId);

      // Update state with the backend-assigned sequential queue number
      if (result.data?.queueNumber) {
        setQueueNumber(result.data.queueNumber);
      } else {
        // Fallback for safety
        setQueueNumber(Math.floor(Math.random() * 50) + 1);
      }

      setStep('success');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to process deposit';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };
  if (step === 'success') {
    return (
      <TransactionComplete
        user={{ ...user, balance: user.balance + parseFloat(amount) }}
        amount={parseFloat(amount)}
        ticketNumber={ticketNumber}
        transactionId={transactionId}
        onNewTransaction={onNewTransaction}
        isAssisted={isAssisted}
        transactionType="deposit"
        successMessage={`Your ticket is ready. Queue number #${queueNumber} — please proceed to the cashier with your cash.`}
        customDetails={
          queueNumber !== null
            ? [{ label: 'Queue Number', value: `#${queueNumber}` }]
            : []
        }
      />
    );
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-1">
          <Banknote className="w-5 h-5 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Cash Deposit</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Account: {user.account} &bull; Balance: {formatCurrency(user.balance)}
        </p>
      </div>

      {/* Quick Amount Buttons */}
      <div>
        <h3 className="text-xs font-medium mb-1.5 text-center">Quick Select Amount</h3>
        <div className="grid grid-cols-3 gap-2">
          {quickAmounts.map((q) => (
            <BankingButton
              key={q}
              variant="outline"
              size="sm"
              onClick={() => setAmount(q.toString())}
              className={`rounded-xl ${amount === q.toString() ? 'ring-2 ring-primary' : ''}`}
            >
              {formatCurrency(q)}
            </BankingButton>
          ))}
        </div>
      </div>

      {/* Custom Amount */}
      <div>
        <h3 className="text-xs font-medium mb-1.5 text-center">Or Enter Custom Amount</h3>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
            GHS
          </span>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-14 text-base h-11 text-center font-semibold rounded-xl"
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert className="border-destructive py-2 rounded-xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-destructive text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Balance Preview */}
      {amount && parseFloat(amount) > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-2.5 flex justify-between items-center">
          <span className="text-green-700 text-xs">New Balance After Deposit</span>
          <span className="text-lg font-bold text-green-600">
            {formatCurrency(user.balance + parseFloat(amount))}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
        <BankingButton variant="outline" size="default" onClick={onBack} className="min-w-[130px] rounded-xl">
          Back to Services
        </BankingButton>
        <BankingButton
          variant="default"
          size="default"
          onClick={handleDeposit}
          disabled={!amount || parseFloat(amount) <= 0 || isLoading}
          className="min-w-[160px] rounded-xl"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ArrowRight className="mr-2 h-4 w-4" />
              Confirm Deposit
            </>
          )}
        </BankingButton>
      </div>

      {/* CRO Instructions */}
      {isAssisted && (
        <div className="bg-blue-50 border border-blue-200 p-2 rounded-xl">
          <p className="text-xs text-blue-700 font-medium text-center">
            CRO: Help the customer enter their deposit amount.
          </p>
        </div>
      )}

      {/* NOTE DENOMINATION STEP — disabled
       * Restore type DepositStep = 'amount' | 'denominations' | 'success',
       * DENOMINATIONS array, handleProceedToDenominations(), and the
       * step === 'denominations' JSX block to re-enable.
       */}
    </div>
  );
};

export default CashDeposit;
