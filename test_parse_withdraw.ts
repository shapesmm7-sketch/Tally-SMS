import { parseTransactionDate, parseMoMoSMS } from './src/lib/smsParser';

const testMsg = "You have withdrawn UGX 40,000 on 2026-06-17 19:08:11. Fee: UGX 1,210, Tax: UGX 200. New balance: UGX 74,824.77. Download MoMo App http://bit.ly/3KGlEJJ to get 500MBs";

const parsed = parseMoMoSMS(testMsg, 'MTN');
console.log(parsed);
console.log(parseTransactionDate(parsed?.date, parsed?.time));
