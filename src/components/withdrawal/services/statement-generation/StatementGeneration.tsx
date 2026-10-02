import { useState } from 'react';
import { FileText, Calendar, Download, Mail, Loader2, Check, ArrowRight } from 'lucide-react';
import { BankingButton } from '@/components/ui/banking-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { requestStatement } from '@/services/api';

interface User {
  name: string;
  account: string;
  acct_link: string;
  balance: number;
}

interface StatementGenerationProps {
  user: User;
  onComplete: () => void;
  onBack: () => void;
  onNewTransaction: () => void;
  isAssisted: boolean;
}

const StatementGeneration: React.FC<StatementGenerationProps> = ({
  user,
  onComplete,
  onBack,
  onNewTransaction,
  isAssisted
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await requestStatement({
        accountId: user.acct_link || user.account,
        startDate: startDate,
        endDate: endDate,
        statementType: 'electronic',
        userId: user.name
      });
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error generating statement:', err);
      setError(err.message || 'Failed to request statement. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const quickRanges = [
    { label: '7 Days', days: 7 },
    { label: '30 Days', days: 30 },
    { label: '3 Months', days: 90 },
    { label: '6 Months', days: 180 },
  ];

  const handleQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
          {/* Left - Success Icon & Message */}
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">Statement Generated!</h3>
              <p className="text-green-100">
                Your electronic statement request has been processed successfully.
              </p>
            </CardContent>
          </Card>

          {/* Right - Details & Actions */}
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Statement Period</span>
                <span className="font-medium">{startDate} to {endDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Account</span>
                <span className="font-medium">{user.account}</span>
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
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {/* Landscape Layout - Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Header & Date Selection */}
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileText className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Generate Statement</h2>
              <p className="text-sm text-muted-foreground">Account: {user.account}</p>
            </div>
          </div>

          {/* Quick Range Selection */}
          <div className="bg-muted/30 rounded-xl p-4">
            <Label className="text-sm font-medium mb-2 block">Quick Select Period</Label>
            <div className="grid grid-cols-4 gap-2">
              {quickRanges.map(({ label, days }) => (
                <BankingButton
                  key={days}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickRange(days)}
                  className="text-xs"
                >
                  {label}
                </BankingButton>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium mb-1 block">Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block">End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Info Box & Instructions */}
        <div className="space-y-4">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-sm text-blue-700">
              Statements are generated in PDF format with all transactions for the selected period.
            </p>
          </div>

          {/* CRO Instructions */}
          {isAssisted && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-xs text-blue-700 font-medium text-center">
                CRO: Verify date range before generating statement.
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
          onClick={handleGenerate}
          disabled={!startDate || !endDate || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-5 w-5" />
              Generate Statement
            </>
          )}
        </BankingButton>
      </div>
    </div>
  );
};

export default StatementGeneration;
