import Dexie, { type Table } from 'dexie';
import { parseMoMoSMS } from './smsParser';

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
    const seenMessages = new Map<string, any[]>();
    const duplicateIds: number[] = [];
    const idsWithBadPhones: number[] = [];
    const idsToPurge: number[] = [];
    
    await this.transactions.orderBy('date').each(tx => {
      // 1. Check for promotional/subscription/reminder messages we want to delete/purge
      const rawText = tx.rawMessage;
      if (rawText) {
        // Run it through the parser to see if it is classified as a valid transaction
        const parsed = parseMoMoSMS(rawText, tx.provider || undefined);
        if (!parsed) {
          idsToPurge.push(tx.id!);
          return; // Skip other checks for this item
        }
      } else {
        const noteToTest = (tx.note || '').toLowerCase();
        if (noteToTest) {
          const isPromoOrReminder = /(?:boda rider|never has.*change|pay using momo|you have subscribed to daily|\d+min,\d+mb,\d+sms|valid for \d+ hours|repay and avoid|will be collected from your account|late payment fee|repayment reminder|having money problems|loans from|total up to|resolve your financial issues|onelink.me|big savings|aliexpress|instant off|virtual card|download ayoba|just bought you)/i.test(noteToTest);
          if (isPromoOrReminder) {
            idsToPurge.push(tx.id!);
            return; // Skip other checks for this item
          }
        }
      }

      let isDup = false;
      
      if (tx.rawMessage) {
        const raw = tx.rawMessage.trim().toLowerCase();
        const existingList = seenMessages.get(raw);
        if (existingList) {
          const newTxDate = new Date(tx.date).getTime();
          for (const extx of existingList) {
             const existDate = new Date(extx.date).getTime();
             if (Math.abs(newTxDate - existDate) < 120000) {
               isDup = true;
               duplicateIds.push(tx.id!);
               break;
             }
          }
          if (!isDup) {
            existingList.push(tx);
          }
        } else {
          seenMessages.set(raw, [tx]);
        }
      }
      
      if (!isDup && tx.tid) {
        if (seenTids.has(tx.tid)) {
          duplicateIds.push(tx.id!);
        } else {
          seenTids.add(tx.tid);
        }
      }
      
      if (tx.phoneNumber) {
        const strictPhoneRegex = /(?:\+|00)\d{8,15}\b|\b(?:256|254|255|234|27|44|1)[73489]\d{8}\b|\b0[73489]\d{8}\b/;
        if (!strictPhoneRegex.test(tx.phoneNumber)) {
          idsWithBadPhones.push(tx.id!);
        }
      }
    });

    if (idsToPurge.length > 0) {
      console.log(`Purging ${idsToPurge.length} promotional/reminder transactions.`);
      await this.transactions.bulkDelete(idsToPurge);
    }

    if (duplicateIds.length > 0) {
      console.log(`Removing ${duplicateIds.length} duplicate transactions.`);
      await this.transactions.bulkDelete(duplicateIds.filter(id => !idsToPurge.includes(id)));
    }

    if (idsWithBadPhones.length > 0) {
      console.log(`Clearing ${idsWithBadPhones.length} invalid phone numbers.`);
      for (const id of idsWithBadPhones) {
        // Only clear the phone number if it's not a duplicate we just deleted / purged
        if (!duplicateIds.includes(id) && !idsToPurge.includes(id)) {
           await this.transactions.update(id, { phoneNumber: undefined });
        }
      }
    }
  }
}

export const db = new MoMoDatabase();

