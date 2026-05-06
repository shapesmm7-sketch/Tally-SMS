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

    this.version(4).stores({
      transactions: '++id, type, category, date, createdAt, &tid'
    }).upgrade(async trans => {
      const seenTids = new Set<string>();
      const duplicateIds: number[] = [];
      await trans.table('transactions').orderBy('date').each(tx => {
        if (tx.tid) {
          if (seenTids.has(tx.tid)) {
            duplicateIds.push(tx.id!);
          } else {
            seenTids.add(tx.tid);
          }
        }
      });
      if (duplicateIds.length > 0) {
        await trans.table('transactions').bulkDelete(duplicateIds);
      }
    });
  }

  async removeDuplicates() {
    // Keep a set of seen tids
    const seenTids = new Set<string>();
    const duplicateIds: number[] = [];
    
    await this.transactions.orderBy('date').each(tx => {
      if (tx.tid) {
        if (seenTids.has(tx.tid)) {
          duplicateIds.push(tx.id!);
        } else {
          seenTids.add(tx.tid);
        }
      }
    });

    if (duplicateIds.length > 0) {
      console.log(`Removing ${duplicateIds.length} duplicate transactions.`);
      await this.transactions.bulkDelete(duplicateIds);
    }
  }
}

export const db = new MoMoDatabase();

