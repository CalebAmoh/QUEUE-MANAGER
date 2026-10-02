import { useState } from 'react';
import { DollarSign, AlertTriangle, Loader2, Banknote } from 'lucide-react';
import { BankingButton } from '@/components/ui/banking-button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

interface User {
  name: string;
  account: string;
  balance: number;
}

interface WithdrawalAmountProps {
  user: User;
  onSubmit: (amount: number) => void;
  onBack: () => void;
  isLoading: boolean;
  isAssisted: boolean;
}

const WithdrawalAmount: React.FC<WithdrawalAmountProps> = ({ 
  user, 
  onSubmit, 
  isLoading, 
  isAssisted, 
  onBack
}) => {
  const [amount, setAmount] = useState<string>('');
  const [error, setError] = useState<string>('');

  const quickAmounts = [20, 50, 100, 200, 500, 1000];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };
  const validateAmount = (value: number): string | null => {
    if (value <= 0) {
      return 'Amount must be greater than zero';
    }
    if (value > user.balance) {
      return 'Insufficient funds available';
    }
    if (value % 10 !== 0) {
      return 'Amount must be in multiples of GHS 10';
    }
    return null;
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
    setError('');
    
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      const validationError = validateAmount(numValue);
      if (validationError) {
        setError(validationError);
      }
    }
  };

  const handleQuickAmount = (value: number) => {
    setAmount(value.toString());
    setError('');
  };

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      setError('Please enter a valid amount');
      return;
    }

    const validationError = validateAmount(numAmount);
    if (validationError) {
      setError(validationError);
      return;
    }

    onSubmit(numAmount);
  };

  const isValid = amount && !error && !isNaN(parseFloat(amount));

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Landscape Layout - Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Header & Quick Amounts */}
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
              <Banknote className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Cash Withdrawal</h2>
              <p className="text-sm text-muted-foreground">
                Balance: <span className="text-green-600 font-medium">{formatCurrency(user.balance)}</span>
              </p>
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Quick Select Amount</Label>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((quickAmount) => (
                <BankingButton
                  key={quickAmount}
                  variant="outline"
                  size="lg"
                  onClick={() => handleQuickAmount(quickAmount)}
                  disabled={quickAmount > user.balance}
                  className={`h-12 ${amount === quickAmount.toString() ? 'ring-2 ring-primary' : ''}`}
                >
                  {formatCurrency(quickAmount)}
                </BankingButton>
              ))}
            </div>
          </div>

          {/* Validation Rules */}          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              • Multiples of GHS 10 • Min: GHS 20
            </p>
          </div>
        </div>

        {/* Right Column - Custom Amount & Summary */}
        <div className="space-y-4">
          {/* Custom Amount Input */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Or Enter Custom Amount</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">GHS</span>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-14 text-xl h-14 text-center font-semibold"                min="0"
                step="10"
                max={user.balance}
              />
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="border-destructive py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-destructive text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Large Withdrawal Notice */}
          {parseFloat(amount) > 1000 && !error && (
            <Alert className="border-yellow-500 bg-yellow-50 py-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-700 text-sm">
                Large withdrawals may require additional verification
              </AlertDescription>
            </Alert>
          )}

          {/* New Balance Preview */}
          {amount && parseFloat(amount) > 0 && !error && (
            <div className="bg-muted/50 rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">New Balance After Withdrawal</span>
                <span className="text-xl font-bold text-foreground">
                  {formatCurrency(user.balance - parseFloat(amount))}
                </span>
              </div>
            </div>
          )}

          {/* CRO Instructions */}
          {isAssisted && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-xs text-blue-700 font-medium text-center">
                CRO: Verify withdrawal request before processing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - Always visible */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <BankingButton
          variant="outline"
          size="lg"
          onClick={onBack}
          disabled={isLoading}
        >
          Back
        </BankingButton>
        
        <BankingButton
          variant="success"
          size="lg"
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Banknote className="mr-2 h-5 w-5" />
              Withdraw {amount ? formatCurrency(parseFloat(amount)) : ''}
            </>
          )}
        </BankingButton>
      </div>
    </div>
  );
};

export default WithdrawalAmount;