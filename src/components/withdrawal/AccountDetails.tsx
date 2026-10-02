
import { Check, User, CreditCard, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';
import { BankingButton } from '@/components/ui/banking-button';
import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';

interface User {
  name: string;
  acct_link: string; // New field for account link
  account: string;
  balance: number;
}

interface AccountDetailsProps {
  users: User[];
  onConfirm: (selectedAccountId: string) => void;
  isAssisted: boolean;
  isLoading?: boolean; // New prop for loading state
  onRetry?: () => void; // New prop for retry action
  error?: string | null; // New prop for backend errors
}

const AccountDetails: React.FC<AccountDetailsProps> = ({
  users,
  onConfirm,
  isAssisted,
  isLoading = false,
  onRetry,
  error = null
}) => {
  const [selectedAccount, setSelectedAccount] = useState<User | null>(users.length === 1 ? users[0] : null);

  useEffect(() => {
    if (users.length === 1) {
      setSelectedAccount(users[0]);
    } else {
      setSelectedAccount(null);
    }
  }, [users]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'GHC'
    }).format(amount);
  };

  const handleAccountSelect = (accountId: string) => {
    const selected = users.find(user => user.account === accountId);
    setSelectedAccount(selected || null);
  };

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {/* Loading State */}
      {isLoading && (
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-banking-info animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading account details...</p>
        </div>
      )}

      {/* Backend Error */}
      {!isLoading && error && (
        <div className="bg-banking-error/10 border border-banking-error/20 p-4 rounded-lg text-center">
          <AlertCircle className="w-6 h-6 text-banking-error mx-auto mb-2" />
          <p className="text-sm text-banking-error font-medium">
            {error || 'Failed to load accounts. Please try again.'}
          </p>
          {onRetry && (
            <BankingButton
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-4"
            >
              Retry
            </BankingButton>
          )}
        </div>
      )}

      {/* Success Message */}
      {!isLoading && !error && users.length > 0 && (
        <div className="text-center">          <div className="inline-flex items-center justify-center w-10 h-10 bg-banking-success rounded-full mb-2">
            <Check className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-semibold text-foreground mb-1">
            Identity Verified Successfully
          </h2>
          <p className="text-sm text-muted-foreground">
            {users.length > 1 
              ? 'Please select an account to proceed with withdrawal'
              : 'Please verify your account information below'}
          </p>
        </div>
      )}

      {/* No Accounts Case */}
      {!isLoading && !error && users.length === 0 && (
        
        <div className="bg-banking-error/10 border border-banking-error/20 p-4 rounded-lg text-center">
          <AlertCircle className="w-6 h-6 text-banking-error mx-auto mb-2" />
          <p className="text-sm text-banking-error font-medium">
            No accounts are associated with this fingerprint. 
            {isAssisted ? 'Please verify customer details or contact support.' : 'Please contact a CRO.'}
          </p>
          {onRetry && (
            <BankingButton
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="mt-4"
            >
              Retry Scan
            </BankingButton>
          )}
        </div>
      )}

      {/* Account Selection (Multiple Accounts) */}
      {!isLoading && !error && users.length > 1 && (
        <div className="bg-gradient-card p-4 rounded-lg shadow-card-banking">
          <label htmlFor="accountSelect" className="text-sm font-semibold text-foreground">
            Select Account
          </label>
          <select
            id="accountSelect"
            className="mt-2 w-full p-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-banking-success"
            value={selectedAccount?.account || ''}
            onChange={(e) => handleAccountSelect(e.target.value)}
          >
            <option value="" disabled>Select an account</option>
            {users.map(user => (
              <option key={user.account} value={user.account}>
                {user.account} - {user.name} ({formatCurrency(user.balance)})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Account Information Card (Single or Selected Account) */}
      {!isLoading && !error && selectedAccount && (        <Card className="bg-gradient-card shadow-card-banking">
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Account Holder */}
              <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-9 h-9 bg-primary rounded-full flex-shrink-0">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Account Holder</div>
                  <div className="text-sm font-semibold">{selectedAccount.name}</div>
                </div>
              </div>

              {/* Account Number */}
              <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-9 h-9 bg-primary rounded-full flex-shrink-0">
                  <CreditCard className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Account Number</div>
                  <div className="text-sm font-semibold font-mono">{selectedAccount.acct_link}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Notice */}
      {!isLoading && !error && selectedAccount && (
        <div className="bg-muted/50 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            <span className="font-medium">Privacy:</span> Account information is displayed securely.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      {!isLoading && !error && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <BankingButton
            variant="outline"
            size="default"
            onClick={() => window.location.href = '/'}
            className="min-w-[120px]"
          >
            Back
          </BankingButton>
          <BankingButton
            variant="success"
            size="default"
            onClick={() => selectedAccount && onConfirm(selectedAccount.account)}
            disabled={!selectedAccount}
            className="min-w-[160px]"
          >
            <Check className="mr-2 h-4 w-4" />
            Confirm Account
          </BankingButton>
        </div>
      )}

      {/* CRO Instructions */}
      {!isLoading && !error && isAssisted && (
        <div className="bg-banking-info/10 border border-banking-info/20 p-3 rounded-lg">
          <p className="text-xs text-banking-info text-center">
            CRO: Verify customer identity against their ID before proceeding.
          </p>
        </div>
      )}
    </div>
  );
};

export default AccountDetails;
