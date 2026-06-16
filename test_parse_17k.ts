import { parseMoMoSMS } from './src/lib/smsParser';

const testMsg = "17000.00 UGX was successfully sent to EVAS AMUMPAIRE 256779460870. MTN Ref. A944F2DF6BF56. Ref. A944F2DF6BF56 on 16/06/26 at 15:27:25 EAT. Charges 1150.00 UGX";
const parsed = parseMoMoSMS(testMsg, "Mobile Money");
console.log(JSON.stringify(parsed, null, 2));
