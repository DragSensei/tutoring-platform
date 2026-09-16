import { LedgerItem } from '../components/transaction-ledger';

export interface StudentWalletData {
  balance: number;
  isFlaggedOverdraft: boolean;
  transactions: LedgerItem[];
}
