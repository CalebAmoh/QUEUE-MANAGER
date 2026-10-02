import { useState } from 'react';
import { Send, Building2, Smartphone, User, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { BankingButton } from '@/components/ui/banking-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TransactionComplete from '../../TransactionComplete';
import { FUND_TRANSFER_API_SECRET, FUND_TRANSFER_POST_BY, FUND_TRANSFER_CHANNEL } from '@/config';

// ── Intra-bank API — routed through local Express proxy to avoid CORS / self-signed cert issues.
// Uses a relative URL so the Vite dev proxy (/api → :9002) and production both work without
// hard-coding a port. Falls back to the absolute address for kiosk builds served directly.
const INTRA_BANK_PROXY = '/api/proxy/funds-transfer';

const API_SECRET = FUND_TRANSFER_API_SECRET;
const POST_BY    = FUND_TRANSFER_POST_BY;
const CHANNEL    = FUND_TRANSFER_CHANNEL;

/** Generate a doc_ref in yyyyMMddHHmmss format */
function makeDocRef(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    String(now.getFullYear()) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

interface UserData {
  name: string;
  account: string;
  acct_link: string;
  balance: number;
  cust_tel?: string;
  mobile_no?: string;
  phone_no?: string;
}

interface FundTransfersProps {
  user: UserData;
  onComplete: () => void;
  onBack: () => void;
  onNewTransaction: () => void;
  isAssisted: boolean;
}

type TransferType = 'intra-bank' | 'ghipss' | 'mobile-money';
type Step = 'form' | 'success';

const FundTransfers: React.FC<FundTransfersProps> = ({
  user,
  onBack,
  onNewTransaction,
  isAssisted,
}) => {
  const [transferType,     setTransferType]     = useState<TransferType>('intra-bank');
  const [recipientAccount, setRecipientAccount] = useState('');
  const [recipientName,    setRecipientName]    = useState('');
  const [amount,           setAmount]           = useState('');
  const [reference,        setReference]        = useState('');
  const [isLoading,        setIsLoading]        = useState(false);
  const [step,             setStep]             = useState<Step>('form');
  const [error,            setError]            = useState('');
  const [txnId,            setTxnId]            = useState<string | null>(null);
  const [ticketNo,         setTicketNo]         = useState<string | null>(null);

  const transferAmount = parseFloat(amount) || 0;
  const fee   = transferType === 'intra-bank' ? 0 : 2;
  const total = transferAmount + fee;

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(v);

  const transferTypes = [
    { id: 'intra-bank',   label: 'Intra-Bank',  icon: Building2,  description: 'Transfer within the bank' },
    { id: 'ghipss',       label: 'GhIPSS',       icon: Send,        description: 'Transfer to other banks' },
    { id: 'mobile-money', label: 'Mobile Money', icon: Smartphone,  description: 'MTN, Vodafone, AirtelTigo' },
  ] as const;

  // ── Intra-bank: real API call ────────────────────────────────────────────
  const executeIntraBank = async (): Promise<void> => {
    const docRef   = makeDocRef();
    const newTxnId = `TXN-${Date.now()}`;
    const ticket   = Math.floor(100000 + Math.random() * 900000).toString();    const payload = {
      acct_link_vvv:    recipientAccount.trim(),  // destination account link / number
      amt:              transferAmount,
      narration:        reference.trim() || 'Fund Transfer',
      doc_ref:          docRef,
      post_by:          POST_BY,
      app_by:           POST_BY,
      post_terminal:    'API',
      cust_tel:         user.cust_tel || user.mobile_no || user.phone_no || '0000000000',
      trans_by:         POST_BY,
      trans_type:       'FTR',
      db_acct_link_vvv: user.acct_link,           // source account link
      channel_code_v:   CHANNEL,
      api_secret_v:     API_SECRET,
    };

    const response = await fetch(INTRA_BANK_PROXY, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });

    const text = await response.text();
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(text); } catch { /* non-JSON error body */ }

    if (!response.ok) {
      throw new Error(
        (data?.message as string) || (data?.error as string) || (data?.msg as string) ||
        `Transfer failed (HTTP ${response.status})`
      );
    }

    // Some banking APIs return status:'fail' inside a 200
    const status = String(data?.status ?? '').toLowerCase();
    if (status === 'fail' || status === 'error') {
      throw new Error((data?.message as string) || (data?.msg as string) || 'Transfer declined by bank');
    }

    setTxnId(newTxnId);
    setTicketNo(ticket);
  };

  // ── GhIPSS: stub until endpoint is provided ─────────────────────────────
  const executeGhIPSS = async (): Promise<void> => {
    await new Promise((r) => setTimeout(r, 2000));
    setTxnId(`GHIPSS-${Date.now()}`);
    setTicketNo(Math.floor(100000 + Math.random() * 900000).toString());
  };

  // ── Mobile Money: stub until endpoint is provided ───────────────────────
  const executeMobileMoney = async (): Promise<void> => {
    await new Promise((r) => setTimeout(r, 2000));
    setTxnId(`MOMO-${Date.now()}`);
    setTicketNo(Math.floor(100000 + Math.random() * 900000).toString());
  };

  const handleTransfer = async () => {
    if (!recipientAccount.trim() || !amount) {
      setError('Please fill in all required fields.');
      return;
    }
    if (transferAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (total > user.balance) {
      setError('Insufficient funds for this transfer including fees.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      if (transferType === 'intra-bank')        await executeIntraBank();
      else if (transferType === 'ghipss')       await executeGhIPSS();
      else                                       await executeMobileMoney();
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success screen ───────────────────────────────────────────────────────
  if (step === 'success') {
    const typeLabel =
      transferType === 'intra-bank'   ? 'Intra-Bank Transfer' :
      transferType === 'ghipss'       ? 'GhIPSS Transfer'     :
                                        'Mobile Money Transfer';
    return (
      <TransactionComplete
        user={{ ...user, balance: user.balance - total }}
        amount={transferAmount}
        ticketNumber={ticketNo}
        transactionId={txnId}
        onNewTransaction={onNewTransaction}
        isAssisted={isAssisted}
        transactionType="transfer"
        successMessage={`${fmt(transferAmount)} sent successfully to ${recipientName.trim() || recipientAccount.trim()}.`}
        customDetails={[
          { label: 'Transfer Type', value: typeLabel },
          { label: 'Recipient',     value: recipientName.trim() || recipientAccount.trim() },
          ...(fee > 0 ? [{ label: 'Fee', value: fmt(fee) }] : []),
          { label: 'Reference',     value: reference.trim() || '—' },
        ]}
      />
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-1">
          <Send className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Fund Transfer</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Available Balance:{' '}
          <span className="font-semibold text-green-600">{fmt(user.balance)}</span>
        </p>
      </div>

      {/* Transfer Type tabs */}
      <div>
        <Label className="text-xs font-medium mb-1.5 block">Transfer Type</Label>
        <div className="grid grid-cols-3 gap-2">
          {transferTypes.map(({ id, label, icon: Icon, description }) => (
            <button
              key={id}
              onClick={() => { setTransferType(id); setError(''); }}
              className={`p-2 rounded-xl border-2 text-center transition-all ${
                transferType === id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Icon className={`w-5 h-5 mx-auto mb-1 ${transferType === id ? 'text-primary' : 'text-muted-foreground'}`} />
              <p className="font-medium text-xs text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 hidden sm:block">{description}</p>
            </button>
          ))}
        </div>
        {(transferType === 'ghipss' || transferType === 'mobile-money') && (
          <p className="text-[11px] text-amber-600 mt-1.5 text-center">
            ⚠ {transferType === 'ghipss' ? 'GhIPSS' : 'Mobile Money'} integration is in simulation mode — no real funds will move.
          </p>
        )}
      </div>

      {/* Fields */}
      <div className="space-y-2">
        <div>
          <Label className="text-xs font-medium mb-1 block">
            {transferType === 'mobile-money' ? 'Mobile Number' :
             transferType === 'intra-bank'   ? 'Recipient Account Link / Number' :
                                               'Recipient Account Number'}
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              value={recipientAccount}
              onChange={(e) => setRecipientAccount(e.target.value)}
              className="pl-10 h-9 text-sm"
              placeholder={
                transferType === 'mobile-money' ? '024 XXX XXXX' :
                transferType === 'intra-bank'   ? 'e.g. 000221059466' :
                                                  'Enter account number'
              }
            />
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium mb-1 block">Recipient Name (Optional)</Label>
          <Input
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Enter recipient name"
            className="h-9 text-sm"
          />
        </div>

        <div>
          <Label className="text-xs font-medium mb-1 block">Amount (GHS)</Label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="h-9 text-sm font-semibold"
          />
        </div>

        <div>
          <Label className="text-xs font-medium mb-1 block">Narration / Reference</Label>
          <Input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. School fees, Rent"
            className="h-9 text-sm"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert className="border-destructive py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-destructive text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary */}
      {transferAmount > 0 && (
        <div className="bg-muted/50 rounded-xl p-3 space-y-1.5">
          <h4 className="font-medium text-foreground text-sm mb-1">Transfer Summary</h4>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-medium">{fmt(transferAmount)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Fee</span>
            <span className="font-medium">{fee === 0 ? 'Free' : fmt(fee)}</span>
          </div>
          <div className="flex justify-between text-xs pt-1.5 border-t">
            <span className="font-medium text-foreground">Total Deducted</span>
            <span className={`font-bold ${total > user.balance ? 'text-destructive' : 'text-primary'}`}>{fmt(total)}</span>
          </div>
          {total > user.balance && (
            <p className="text-xs text-destructive">⚠ Total exceeds your available balance.</p>
          )}
        </div>
      )}

      {/* Sender info (intra-bank only) */}
      {transferType === 'intra-bank' && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-2.5 text-xs text-blue-700 dark:text-blue-300">
          <span className="font-semibold">From:</span> {user.name} &bull; Account link:{' '}
          <span className="font-mono">{user.acct_link}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-2 justify-center pt-1">
        <BankingButton variant="outline" size="default" onClick={onBack} className="min-w-[140px]">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </BankingButton>
        <BankingButton
          variant="success"
          size="default"
          onClick={handleTransfer}
          disabled={!recipientAccount.trim() || !amount || isLoading || total > user.balance}
          className="min-w-[180px]"
        >
          {isLoading ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing…</>
          ) : (
            <><Send className="mr-2 h-4 w-4" />Transfer {amount ? fmt(transferAmount) : ''}</>
          )}
        </BankingButton>
      </div>

      {isAssisted && (
        <div className="bg-blue-50 border border-blue-200 p-2 rounded-xl">
          <p className="text-xs text-blue-700 font-medium text-center">
            CRO: Verify the recipient account number and amount with the customer before processing.
          </p>
        </div>
      )}
    </div>
  );
};

export default FundTransfers;
