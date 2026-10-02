import { useState } from 'react';
import { FileCheck, Camera, Upload, Loader2, Check, AlertTriangle } from 'lucide-react';
import { BankingButton } from '@/components/ui/banking-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TransactionComplete from '../../TransactionComplete';

interface User {
  name: string;
  account: string;
  balance: number;
}

interface CheckDepositsProps {
  user: User;
  onComplete: () => void;
  onBack: () => void;
  onNewTransaction: () => void;
  isAssisted: boolean;
}

const CheckDeposits: React.FC<CheckDepositsProps> = ({
  user,
  onComplete,
  onBack,
  onNewTransaction,
  isAssisted
}) => {
  const [checkNumber, setCheckNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [issuerBank, setIssuerBank] = useState('');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS'
    }).format(amount);
  };

  const handleImageCapture = (side: 'front' | 'back') => {
    if (side === 'front') {
      setFrontImage('check_front_captured');
    } else {
      setBackImage('check_back_captured');
    }
  };

  const handleSubmit = async () => {
    if (!checkNumber || !amount || !frontImage) {
      setError('Please fill in required fields and capture check image');
      return;
    }

    setIsLoading(true);
    setError('');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const newTicketNumber = Math.floor(100000 + Math.random() * 900000).toString();
    const newTransactionId = `CHK-${Date.now()}`;
    setTicketNumber(newTicketNumber);
    setTransactionId(newTransactionId);
    
    setIsLoading(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <TransactionComplete
        user={user}
        amount={parseFloat(amount)}
        ticketNumber={ticketNumber}
        transactionId={transactionId}
        onNewTransaction={onNewTransaction}
        isAssisted={isAssisted}
        transactionType="check-deposit"
        customDetails={[
          { label: 'Check Number', value: checkNumber },
          { label: 'Issuing Bank', value: issuerBank || 'N/A' },
          { label: 'Status', value: 'Pending (2-3 Days)' }
        ]}
        successMessage="Check submitted for processing. Funds available once cleared."
        instructions={[
          'Check clears in 2-3 business days',
          'SMS notification when funds available',
          'Keep your receipt for reference'
        ]}
      />
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Landscape Layout - Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Header & Check Details */}
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileCheck className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Check Deposit</h2>
              <p className="text-sm text-muted-foreground">Deposit into: {user.account}</p>
            </div>
          </div>

          {/* Check Details */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium mb-1 block">Check Number</Label>
                <Input
                  type="text"
                  value={checkNumber}
                  onChange={(e) => setCheckNumber(e.target.value)}
                  placeholder="Enter check number"
                  className="h-10"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block">Amount (GHS)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="h-10 font-semibold"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1 block">Issuing Bank (Optional)</Label>
              <Input
                type="text"
                value={issuerBank}
                onChange={(e) => setIssuerBank(e.target.value)}
                placeholder="e.g., GCB Bank, Ecobank"
                className="h-10"
              />
            </div>
          </div>
        </div>

        {/* Right Column - Image Capture */}
        <div className="space-y-4">
          <Label className="text-sm font-medium block">Capture Check Images</Label>
          <div className="grid grid-cols-2 gap-3">
            <div 
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                frontImage ? 'border-green-500 bg-green-50' : 'border-border hover:border-primary'
              }`}
              onClick={() => handleImageCapture('front')}
            >
              {frontImage ? (
                <div className="space-y-1">
                  <Check className="w-8 h-8 text-green-500 mx-auto" />
                  <p className="text-sm font-medium text-green-600">Front Captured</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Camera className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm font-medium">Capture Front</p>
                </div>
              )}
            </div>
            
            <div 
              className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                backImage ? 'border-green-500 bg-green-50' : 'border-border hover:border-primary'
              }`}
              onClick={() => handleImageCapture('back')}
            >
              {backImage ? (
                <div className="space-y-1">
                  <Check className="w-8 h-8 text-green-500 mx-auto" />
                  <p className="text-sm font-medium text-green-600">Back Captured</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-sm font-medium">Capture Back</p>
                </div>
              )}
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="border-destructive py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-destructive text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-xs text-blue-700">
              OCR will read check details. Ensure images are clear and well-lit.
            </p>
          </div>

          {/* CRO Instructions */}
          {isAssisted && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-xs text-blue-700 font-medium text-center">
                CRO: Verify check is valid and properly signed before processing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - Always visible */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <BankingButton variant="outline" size="lg" onClick={onBack}>
          Back to Services
        </BankingButton>
        
        <BankingButton 
          variant="success" 
          size="lg" 
          onClick={handleSubmit}
          disabled={!checkNumber || !amount || !frontImage || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing OCR...
            </>
          ) : (
            <>
              <FileCheck className="mr-2 h-5 w-5" />
              Submit Deposit
            </>
          )}
        </BankingButton>
      </div>
    </div>
  );
};

export default CheckDeposits;
