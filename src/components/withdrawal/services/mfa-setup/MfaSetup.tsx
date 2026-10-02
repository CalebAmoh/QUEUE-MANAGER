import { useState } from 'react';
import { Fingerprint, Smartphone, Shield, QrCode, Loader2, Check, ArrowRight, Plus } from 'lucide-react';
import { BankingButton } from '@/components/ui/banking-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

interface User {
  name: string;
  account: string;
  balance: number;
}

interface MfaSetupProps {
  user: User;
  onComplete: () => void;
  onBack: () => void;
  onNewTransaction: () => void;
  isAssisted: boolean;
}

type MfaMethod = 'biometric' | 'authenticator' | 'sms';

const mfaMethods = [
  { 
    id: 'biometric', 
    label: 'Biometric', 
    icon: Fingerprint, 
    description: 'Fingerprint or face',
    enrolled: true 
  },
  { 
    id: 'authenticator', 
    label: 'Authenticator', 
    icon: QrCode, 
    description: 'Google/Microsoft Auth',
    enrolled: false 
  },
  { 
    id: 'sms', 
    label: 'SMS OTP', 
    icon: Smartphone, 
    description: 'Codes via SMS',
    enrolled: true 
  },
];

const MfaSetup: React.FC<MfaSetupProps> = ({
  user,
  onComplete,
  onBack,
  onNewTransaction,
  isAssisted
}) => {
  const [selectedMethod, setSelectedMethod] = useState<MfaMethod | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [methods, setMethods] = useState(mfaMethods);

  const handleEnroll = async () => {
    if (!selectedMethod) return;

    setIsLoading(true);
    
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    setMethods(prev => prev.map(m => 
      m.id === selectedMethod ? { ...m, enrolled: true } : m
    ));
    
    setIsLoading(false);
    setIsSuccess(true);
  };

  if (isSuccess) {
    const methodName = mfaMethods.find(m => m.id === selectedMethod)?.label || '';
    
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* Left - Success Card */}
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">MFA Setup Complete!</h3>
              <p className="text-green-100">
                {methodName} has been configured for your account.
              </p>
            </CardContent>
          </Card>

          {/* Right - Details & Actions */}
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">MFA Method</span>
                <span className="font-medium">{methodName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-green-600">Enrolled</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Your account is now protected with additional security.
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
        {/* Left Column - Header & Status */}
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">MFA Setup</h2>
              <p className="text-sm text-muted-foreground">Add extra security to your account</p>
            </div>
          </div>

          {/* Current Status */}
          <div className="bg-muted/30 rounded-xl p-4">
            <h3 className="font-medium text-foreground text-sm mb-2">Current MFA Status</h3>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full" />
              <span className="text-sm text-muted-foreground">
                {methods.filter(m => m.enrolled).length} method(s) active
              </span>
            </div>
          </div>

          {/* Enrollment Info */}
          {selectedMethod && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-blue-700 text-xs">
                {selectedMethod === 'authenticator' 
                  ? 'Scan QR code with your authenticator app to complete setup.'
                  : selectedMethod === 'sms'
                  ? 'A verification code will be sent to your registered phone.'
                  : 'Register your biometric data to complete setup.'
                }
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Right Column - MFA Methods */}
        <div className="space-y-4">
          <Label className="text-sm font-medium block">Authentication Methods</Label>
          <div className="space-y-2">
            {methods.map(({ id, label, icon: Icon, description, enrolled }) => (
              <button
                key={id}
                onClick={() => !enrolled && setSelectedMethod(id as MfaMethod)}
                disabled={enrolled}
                className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                  enrolled 
                    ? 'border-green-200 bg-green-50 cursor-default'
                    : selectedMethod === id
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      enrolled 
                        ? 'bg-green-100 text-green-600' 
                        : selectedMethod === id
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </div>
                  {enrolled ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <Check className="w-4 h-4" />
                      <span className="text-xs font-medium">Active</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Plus className="w-4 h-4" />
                      <span className="text-xs">Add</span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* CRO Instructions */}
          {isAssisted && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-xs text-blue-700 font-medium text-center">
                CRO: Guide customer through MFA enrollment process.
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
          onClick={handleEnroll}
          disabled={!selectedMethod || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-5 w-5" />
              Enroll Method
            </>
          )}
        </BankingButton>
      </div>
    </div>
  );
};

export default MfaSetup;
