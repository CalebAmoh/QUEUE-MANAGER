import { useState } from 'react';
import { Receipt, Zap, Smartphone, Tv, GraduationCap, Loader2, Check, ArrowRight, AlertTriangle } from 'lucide-react';
import { BankingButton } from '@/components/ui/banking-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface User {
  name: string;
  account: string;
  balance: number;
}

interface BillPaymentsProps {
  user: User;
  onComplete: () => void;
  onBack: () => void;
  onNewTransaction: () => void;
  isAssisted: boolean;
}

type BillCategory = 'utilities' | 'mobile' | 'tv' | 'education';

const billCategories = [
  { id: 'utilities', label: 'Utilities', icon: Zap, color: 'text-yellow-600 bg-yellow-100' },
  { id: 'mobile', label: 'Mobile Top-up', icon: Smartphone, color: 'text-blue-600 bg-blue-100' },
  { id: 'tv', label: 'TV Subscription', icon: Tv, color: 'text-purple-600 bg-purple-100' },
  { id: 'education', label: 'School Fees', icon: GraduationCap, color: 'text-green-600 bg-green-100' },
];

const billers = {
  utilities: [
    { id: 'ecg', name: 'ECG Prepaid', accountLabel: 'Meter Number' },
    { id: 'gwc', name: 'Ghana Water Company', accountLabel: 'Account Number' },
  ],
  mobile: [
    { id: 'mtn', name: 'MTN Airtime', accountLabel: 'Phone Number' },
    { id: 'vodafone', name: 'Vodafone Airtime', accountLabel: 'Phone Number' },
    { id: 'airteltigo', name: 'AirtelTigo Airtime', accountLabel: 'Phone Number' },
  ],
  tv: [
    { id: 'dstv', name: 'DStv', accountLabel: 'Smart Card Number' },
    { id: 'gotv', name: 'GOtv', accountLabel: 'IUC Number' },
    { id: 'startimes', name: 'StarTimes', accountLabel: 'Card Number' },
  ],
  education: [
    { id: 'shs', name: 'SHS Fees', accountLabel: 'Student ID' },
    { id: 'university', name: 'University Fees', accountLabel: 'Student ID' },
  ],
};

const BillPayments: React.FC<BillPaymentsProps> = ({
  user,
  onComplete,
  onBack,
  onNewTransaction,
  isAssisted
}) => {
  const [category, setCategory] = useState<BillCategory>('utilities');
  const [selectedBiller, setSelectedBiller] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };

  const currentBillers = billers[category];
  const currentBillerInfo = currentBillers.find(b => b.id === selectedBiller);

  const handlePayment = async () => {
    const payAmount = parseFloat(amount);
    
    if (!selectedBiller || !accountNumber || !amount) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (payAmount > user.balance) {
      setError('Insufficient funds');
      return;
    }

    setIsLoading(true);
    setError('');
    
    // Simulate payment
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate transaction ID
    const newTransactionId = `BILL-${Date.now()}`;
    setTransactionId(newTransactionId);
    
    setIsLoading(false);
    setIsSuccess(true);
  };
  if (isSuccess) {
    return (
      <div className="space-y-3 max-w-2xl mx-auto text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <Check className="w-6 h-6 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Payment Successful!</h3>
        <p className="text-sm text-muted-foreground">
          {formatCurrency(parseFloat(amount))} paid to {currentBillerInfo?.name}
        </p>
        <div className="bg-muted/50 rounded-xl p-3 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{currentBillerInfo?.accountLabel || 'Account'}</span>
            <span className="font-medium">{accountNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Reference</span>
            <span className="font-medium">{transactionId}</span>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
          <BankingButton variant="outline" size="default" onClick={onBack} className="min-w-[140px]">
            Back to Services
          </BankingButton>
          <BankingButton variant="success" size="default" onClick={onNewTransaction} className="min-w-[160px]">
            Done
            <ArrowRight className="ml-2 h-4 w-4" />
          </BankingButton>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-1">
          <Receipt className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Bill Payments</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Available Balance: <span className="font-semibold text-green-600">{formatCurrency(user.balance)}</span>
        </p>
      </div>

      {/* Category Selection */}
      <div>
        <Label className="text-xs font-medium mb-1.5 block">Select Category</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {billCategories.map(({ id, label, icon: Icon, color }) => (
            <button
              key={id}
              onClick={() => {
                setCategory(id as BillCategory);
                setSelectedBiller('');
              }}
              className={`p-2 rounded-xl border-2 text-center transition-all ${
                category === id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-1 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="font-medium text-xs text-foreground">{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Biller Selection */}
      <div>
        <Label className="text-xs font-medium mb-1.5 block">Select Biller</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {currentBillers.map(({ id, name }) => (
            <button
              key={id}
              onClick={() => setSelectedBiller(id)}
              className={`p-2 rounded-xl border-2 transition-all ${
                selectedBiller === id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <p className="font-medium text-xs text-foreground">{name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Details */}
      {selectedBiller && (
        <div className="space-y-2">
          <div>
            <Label className="text-xs font-medium mb-1 block">{currentBillerInfo?.accountLabel}</Label>
            <Input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder={`Enter ${currentBillerInfo?.accountLabel?.toLowerCase()}`}
              className="h-9 text-sm"
            />
          </div>

          <div>
            <Label className="text-xs font-medium mb-1 block">Amount (GHS)</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-9 text-sm font-semibold"
            />
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert className="border-destructive py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-destructive text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
        <BankingButton variant="outline" size="default" onClick={onBack} className="min-w-[140px]">
          Back to Services
        </BankingButton>
        <BankingButton
          variant="success"
          size="default"
          onClick={handlePayment}
          disabled={!selectedBiller || !accountNumber || !amount || isLoading}
          className="min-w-[180px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Receipt className="mr-2 h-4 w-4" />
              Pay {amount ? formatCurrency(parseFloat(amount)) : ''}
            </>
          )}
        </BankingButton>
      </div>

      {/* CRO Instructions */}
      {isAssisted && (
        <div className="bg-blue-50 border border-blue-200 p-2 rounded-xl">
          <p className="text-xs text-blue-700 font-medium text-center">
            CRO: Verify the biller details and account number before processing payment.
          </p>
        </div>
      )}
    </div>
  );
};

export default BillPayments;
