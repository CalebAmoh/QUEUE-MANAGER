import { useEffect, useState } from 'react';
import { Wallet, TrendingUp, TrendingDown, ArrowRight, Download, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { BankingButton } from '@/components/ui/banking-button';
import { Card, CardContent } from '@/components/ui/card';
import { getAccountBalance } from '@/services/api';

interface User {
  name: string;
  account: string;
  acct_link: string;
  // balance: number;
}

interface BalanceDetails {
  avBalance: string;
  product: string;
  accountName: string;
  brCode: string;
  lastDBTransDate: string;
  lastCDTransDate: string;
  currency: string;
}

interface BalanceInquiryProps {
  user: User;
  onComplete: () => void;
  onBack: () => void;
  onNewTransaction: () => void;
  isAssisted: boolean;
}

// Mock transaction data - reduced to 4 for compact display
// const transactions = [
//   { id: 1, type: 'credit', description: 'Salary Deposit', amount: 5000, date: '2026-01-18', balance: 12500 },
//   { id: 2, type: 'debit', description: 'Utility Payment', amount: 250, date: '2026-01-17', balance: 7500 },
//   { id: 3, type: 'debit', description: 'ATM Withdrawal', amount: 500, date: '2026-01-15', balance: 7750 },
//   { id: 4, type: 'credit', description: 'Transfer Received', amount: 1200, date: '2026-01-14', balance: 8250 },
// ];

const BalanceInquiry: React.FC<BalanceInquiryProps> = ({
  user,
  onBack,
  onNewTransaction,
  isAssisted
}) => {
  const [showBalance, setShowBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currency, setCurrency] = useState('GHS');
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState<BalanceDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [thisMonthIn, setThisMonthIn] = useState(0);
  const [thisMonthOut, setThisMonthOut] = useState(0);

  const formatCurrency = (amount: number, currency: string = 'GHS') => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };


  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTransactionHistory();
    setIsRefreshing(false);
  };
  const handleDownloadStatement = () => {
    const win = window.open('', '_blank', 'width=400,height=500');
    if (win) {
      const lines = transactions
        .map((t: any) => `${t.postingDate}  ${t.transactionDetails.padEnd(30)}  ${t.amt}`)
        .join('\n');
      win.document.write(`<pre style="font-family:monospace;padding:16px">MINI STATEMENT\nAccount: ${user.acct_link || user.account}\n\n${lines}</pre>`);
      win.document.close();
      win.print();
      win.close();
    }  };

  // Account balance enquiry API integration
  const fetchTransactionHistory = async () => {
    try {
      setError(null);
      const data = await getAccountBalance(user.acct_link);
      
      // Support nested balance or root-level balance structure
      let currentBalance: BalanceDetails | null = null;
      if (data.balance) {
        currentBalance = data.balance;
        setBalance(data.balance);
      } else if (data.avBalance !== undefined) {
        currentBalance = data;
        setBalance(data);
      } else {
        setBalance(null);
      }
      
      // Support nested transactions or root-level transactions list
      const txs = data.data?.transactions || data.transactions || [];
      setTransactions(txs);

      // Calculate monthly totals
      let totalIn = 0;
      let totalOut = 0;
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();

      txs.forEach((txn: any) => {
        const date = new Date(txn.postingDate);
        const isCurrentMonth = !isNaN(date.getTime()) && 
                               date.getFullYear() === currentYear && 
                               date.getMonth() === currentMonth;
                               
        if (isCurrentMonth) {
          const cleanAmtStr = txn.amt.replace(/[^\d.-]/g, '');
          const amt = parseFloat(cleanAmtStr);
          if (!isNaN(amt)) {
            if (amt > 0) {
              totalIn += amt;
            } else if (amt < 0) {
              totalOut += Math.abs(amt);
            }
          }
        }
      });

      setThisMonthIn(totalIn);
      setThisMonthOut(totalOut);
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      setError('Failed to fetch balance. Please try again.');
    }
  };


  useEffect(() => {
    fetchTransactionHistory();
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto">
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      {/* Landscape Layout - Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Balance Card */}
        <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground overflow-hidden relative">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-24 translate-x-24" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-16 -translate-x-16" />
          <CardContent className="p-6 relative h-full flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm opacity-80">Available Balance</p>
                  <p className="text-xs opacity-60">{user.acct_link || user.account}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleRefresh}
                  className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            
            <div className="text-center py-4">
              <p className="text-4xl font-bold tracking-tight">
                {balance
                  ? showBalance
                    ? formatCurrency(parseFloat(balance.avBalance), balance.currency)
                    : '••••••'
                  : 'Loading...'}
              </p>
              <p className="text-xs opacity-70 mt-1">As of {new Date().toLocaleDateString()}</p>
            </div>

            <div className="flex justify-center gap-6 pt-4 border-t border-white/20">
              <div className="text-center">
                <p className="text-xl font-semibold text-green-300">+{formatCurrency(thisMonthIn, balance?.currency)}</p>
                <p className="text-xs opacity-70">This Month In</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-semibold text-red-300">-{formatCurrency(thisMonthOut, balance?.currency)}</p>
                <p className="text-xs opacity-70">This Month Out</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Column - Mini Statement */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-foreground">Recent Transactions</h3>
            <BankingButton variant="ghost" size="sm" onClick={handleDownloadStatement}>
              <Download className="w-4 h-4 mr-1" />
              Print
            </BankingButton>
          </div>

          <div className="space-y-2 flex-1">
            {transactions.map((txn) => (
              <div
                key={txn.documentRef}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    txn.amt.startsWith('-')
                      ? 'bg-red-100 text-red-600'     // Debit (negative)
                      : 'bg-green-100 text-green-600'  // Credit (positive)
                  }`}>
                    {txn.amt.startsWith('-') ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <TrendingUp className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-foreground">{txn.transactionDetails}</p>
                    <p className="text-xs text-muted-foreground">{txn.postingDate}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold text-sm ${
                    txn.amt.startsWith('-') ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatCurrency(txn.amt, txn.currency)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons - Always visible */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t">
        <BankingButton variant="outline" size="lg" onClick={onBack}>
          Back to Services
        </BankingButton>
        
        {isAssisted && (
          <p className="text-sm text-blue-600 font-medium">
            CRO: Confirm customer has reviewed their balance
          </p>
        )}
        
        <BankingButton variant="success" size="lg" onClick={onNewTransaction}>
          Done
          <ArrowRight className="ml-2 h-5 w-5" />
        </BankingButton>
      </div>
    </div>
  );
};

export default BalanceInquiry;
