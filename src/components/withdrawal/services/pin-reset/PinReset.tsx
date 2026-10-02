import { useState } from 'react';
import { KeyRound, Lock, Eye, EyeOff, Loader2, Check, ArrowRight, AlertTriangle, Shield } from 'lucide-react';
import { BankingButton } from '@/components/ui/banking-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';

interface User {
  name: string;
  account: string;
  balance: number;
}

interface PinResetProps {
  user: User;
  onComplete: () => void;
  onBack: () => void;
  onNewTransaction: () => void;
  isAssisted: boolean;
}

type ResetType = 'pin' | 'password';

const PinReset: React.FC<PinResetProps> = ({
  user,
  onComplete,
  onBack,
  onNewTransaction,
  isAssisted
}) => {
  const [resetType, setResetType] = useState<ResetType>('pin');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  const validatePin = () => {
    if (resetType === 'pin') {
      if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
        return 'PIN must be exactly 4 digits';
      }
    } else {
      if (newPin.length < 8) {
        return 'Password must be at least 8 characters';
      }
      if (!/[A-Z]/.test(newPin) || !/[a-z]/.test(newPin) || !/[0-9]/.test(newPin)) {
        return 'Password must contain uppercase, lowercase, and numbers';
      }
    }
    if (newPin !== confirmPin) {
      return resetType === 'pin' ? 'PINs do not match' : 'Passwords do not match';
    }
    return null;
  };

  const handleReset = async () => {
    const validationError = validatePin();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
              <h3 className="text-2xl font-semibold mb-2">
                {resetType === 'pin' ? 'PIN' : 'Password'} Reset Successful!
              </h3>
              <p className="text-green-100">
                Your {resetType === 'pin' ? 'PIN' : 'password'} has been updated.
              </p>
            </CardContent>
          </Card>

          {/* Right - Details & Actions */}
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reset Type</span>
                <span className="font-medium">{resetType === 'pin' ? 'ATM PIN' : 'Online Password'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-green-600">Active</span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Do not share your credentials with anyone.
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
        {/* Left Column - Header & Reset Type */}
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
              <KeyRound className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">PIN / Password Reset</h2>
              <p className="text-sm text-muted-foreground">Reset credentials for: {user.name}</p>
            </div>
          </div>

          {/* Reset Type Selection */}
          <div>
            <Label className="text-sm font-medium mb-2 block">What would you like to reset?</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setResetType('pin'); setNewPin(''); setConfirmPin(''); setError(''); }}
                className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                  resetType === 'pin' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <KeyRound className={`w-5 h-5 ${resetType === 'pin' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-left">
                  <p className="font-medium text-sm">ATM PIN</p>
                  <p className="text-xs text-muted-foreground">4-digit PIN</p>
                </div>
              </button>
              <button
                onClick={() => { setResetType('password'); setNewPin(''); setConfirmPin(''); setError(''); }}
                className={`p-3 rounded-xl border-2 flex items-center gap-3 transition-all ${
                  resetType === 'password' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <Lock className={`w-5 h-5 ${resetType === 'password' ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="text-left">
                  <p className="font-medium text-sm">Online Password</p>
                  <p className="text-xs text-muted-foreground">Internet banking</p>
                </div>
              </button>
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-muted/30 rounded-xl p-3">
            <p className="text-sm font-medium text-foreground mb-2">Requirements:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {resetType === 'pin' ? (
                <>
                  <li>• Exactly 4 digits</li>
                  <li>• Avoid sequential (1234) or repeated (1111)</li>
                </>
              ) : (
                <>
                  <li>• At least 8 characters</li>
                  <li>• Include uppercase, lowercase & numbers</li>
                </>
              )}
            </ul>
          </div>
        </div>

        {/* Right Column - PIN/Password Entry */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium mb-1 block">
                New {resetType === 'pin' ? 'PIN' : 'Password'}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPin ? 'text' : 'password'}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  className="pl-10 pr-10 h-11"
                  placeholder={resetType === 'pin' ? 'Enter 4-digit PIN' : 'Enter new password'}
                  maxLength={resetType === 'pin' ? 4 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-1 block">
                Confirm {resetType === 'pin' ? 'PIN' : 'Password'}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPin ? 'text' : 'password'}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  className="pl-10 h-11"
                  placeholder={resetType === 'pin' ? 'Re-enter 4-digit PIN' : 'Re-enter password'}
                  maxLength={resetType === 'pin' ? 4 : undefined}
                />
              </div>
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="border-destructive py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-destructive text-sm">{error}</AlertDescription>
            </Alert>
          )}

          {/* CRO Instructions */}
          {isAssisted && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-xs text-blue-700 font-medium text-center">
                CRO: Ensure customer privacy while entering credentials.
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
          onClick={handleReset}
          disabled={!newPin || !confirmPin || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Resetting...
            </>
          ) : (
            <>
              <KeyRound className="mr-2 h-5 w-5" />
              Reset {resetType === 'pin' ? 'PIN' : 'Password'}
            </>
          )}
        </BankingButton>
      </div>
    </div>
  );
};

export default PinReset;
