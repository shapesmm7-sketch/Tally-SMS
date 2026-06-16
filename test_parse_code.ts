import { parseMoMoSMS } from './src/lib/smsParser';

const testMsg = "never share this code with anyone, including us. use code 760694 to send 17000.00 ugx to 256779460870 via mtn.";
const parsed = parseMoMoSMS(testMsg, "Mobile Money");
console.log(JSON.stringify(parsed, null, 2));

const testMsg2 = "use code 12345 to send 1000 ugx";
const parsed2 = parseMoMoSMS(testMsg2, "Mobile Money");
console.log("Parsed 2:", parsed2);
