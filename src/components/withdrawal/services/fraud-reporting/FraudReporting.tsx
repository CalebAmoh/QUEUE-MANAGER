import { useState } from 'react';
import { AlertOctagon, CreditCard, Smartphone, Globe, Lock, Loader2, Check, ArrowRight, Shield } from 'lucide-react';
import { BankingButton } from '@/components/ui/banking-button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

interface User {
  name: string;
  account: string;
  balance: number;
}

interface FraudReportingProps {
  user: User;
  onComplete: () => void;
  onBack: () => void;
  onNewTransaction: () => void;
  isAssisted: boolean;
}

type FraudType = 'unauthorized' | 'lost-card' | 'phishing' | 'other';

const fraudTypes = [
  { id: 'unauthorized', label: 'Unauthorized Txn', icon: CreditCard, description: 'Transaction I did not make' },
  { id: 'lost-card', label: 'Lost/Stolen Card', icon: CreditCard, description: 'Card is missing' },
  { id: 'phishing', label: 'Phishing/Scam', icon: Globe, description: 'Suspicious messages' },
  { id: 'other', label: 'Other', icon: AlertOctagon, description: 'Other concerns' },
];

const FraudReporting: React.FC<FraudReportingProps> = ({
  user,
  onComplete,
  onBack,
  onNewTransaction,
  isAssisted
}) => {
  const [fraudType, setFraudType] = useState<FraudType | null>(null);
  const [description, setDescription] = useState('');
  const [blockCard, setBlockCard] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [caseNumber, setCaseNumber] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!fraudType) return;

    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newCaseNumber = `FR-${Math.floor(100000 + Math.random() * 900000)}`;
    setCaseNumber(newCaseNumber);
    
    setIsLoading(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* Left - Success Card */}
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Report Submitted!</h3>
              <p className="text-green-100">
                Our security team will investigate immediately.
              </p>
            </CardContent>
          </Card>

          {/* Right - Details & Actions */}
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Case Number</span>
                <span className="font-medium">{caseNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Report Type</span>
                <span className="font-medium">{fraudTypes.find(f => f.id === fraudType)?.label}</span>
              </div>
              {blockCard && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Card Status</span>
                  <span className="font-medium text-red-600">Blocked</span>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Our team will contact you within 24 hours. Call: 0800-100-100
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <BankingButton variant="outline" size="lg" onClick={onBack} className="flex-1">
                Back to Services
              </BankingButton>
              <BankingButton variant="success" size="lg" onClick={onNewTransaction} className="flex-1">
                Done
                <ArrowRight className="ml-2 h-5 w-5" />
              </BankingButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Landscape Layout - Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Header & Fraud Type */}
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertOctagon className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Report Fraud</h2>
              <p className="text-sm text-muted-foreground">Account: {user.account}</p>
            </div>
          </div>

          {/* Fraud Type Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">What type of issue?</Label>
            <div className="grid grid-cols-2 gap-2">
              {fraudTypes.map(({ id, label, icon: Icon, description }) => (
                <button
                  key={id}
                  onClick={() => setFraudType(id as FraudType)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    fraudType === id
                      ? 'border-red-500 bg-red-50'
                      : 'border-border hover:border-red-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      fraudType === id ? 'bg-red-100 text-red-600' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Description & Block Card */}
        <div className="space-y-4">
          {/* Description */}
          <div>
            <Label className="text-sm font-medium mb-1 block">Describe the issue</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide details about the suspicious activity..."
              className="h-24 resize-none"
            />
          </div>

          {/* Block Card Option */}
          {(fraudType === 'unauthorized' || fraudType === 'lost-card') && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-red-600" />
                  <div>
                    <p className="font-medium text-sm text-red-800">Block Card?</p>
                    <p className="text-xs text-red-600">Prevents further transactions</p>
                  </div>
                </div>
                <button
                  onClick={() => setBlockCard(!blockCard)}
                  className={`w-12 h-6 rounded-full transition-all ${blockCard ? 'bg-red-600' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${blockCard ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          )}

          {/* Emergency Contact */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-yellow-600" />
              <p className="text-xs text-yellow-700">
                24/7 Fraud Hotline: <strong>0800-100-100</strong>
              </p>
            </div>
          </div>

          {/* CRO Instructions */}
          {isAssisted && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-xs text-blue-700 font-medium text-center">
                CRO: Document all details. Escalate if card blocking requested.
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
          variant="destructive" 
          size="lg" 
          onClick={handleSubmit}
          disabled={!fraudType || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <AlertOctagon className="mr-2 h-5 w-5" />
              Submit Report
            </>
          )}
        </BankingButton>
      </div>
    </div>
  );
};

export default FraudReporting;
