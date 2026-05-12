import { parseMoMoSMS } from './src/lib/smsParser.js';
// We need to compile or run ts-node. Let's just create a test ts file.
import { parseMoMoSMS as parser } from './src/lib/smsParser';

const testMsg = "great news! the 60 minutes + 5mb + 5 sms bundle at only 1,000 ugx is now available again for you. dial 100*111# to activate now!";
const result = parser(testMsg, "Airtel");
console.log(JSON.stringify(result));
