import Dexie, { type Table } from 'dexie';

export interface Transaction {
  id?: number;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  note: string;
  date: string; // ISO string
  createdAt: string;
  tid?: string;
  senderReceiverName?: string;
  smsDate?: string;
  smsTime?: string;
  currency?: string;
  phoneNumber?: string;
  balance?: number;
  fee?: number;
  provider?: string;
  rawMessage?: string;
}

export class MoMoDatabase extends Dexie {
  transactions!: Table<Transaction>;

  constructor() {
    super('MoMoTrackerDB');
    this.version(3).stores({
      transactions: '++id, type, category, date, createdAt, tid'
    });
  }
}

export const db = new MoMoDatabase();
