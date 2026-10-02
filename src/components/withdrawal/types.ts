export interface Service {
  id: string;
  title: string;
  description: string;
  tag: string;
}

export interface User {
  name: string;
  account: string;
  balance: number;
}

export type TransactionType = 
  | 'withdrawal' 
  | 'deposit' 
  | 'transfer' 
  | 'bill-payment' 
  | 'pin-reset' 
  | 'account-update'
  | 'fraud-report'
  | 'mfa-setup'
  | 'check-deposit';

export interface TransactionDetails {
  label: string;
  value: string;
}
