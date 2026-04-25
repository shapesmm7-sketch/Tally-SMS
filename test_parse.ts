import { parseMoMoSMS } from './src/lib/smsParser';

const msgParams = [
  { body: "You have sent UGX 10000 to MTN Uganda", address: "AirtelMoney" },
  { body: "Y'ello. You have received UGX 1000 from Lycamobile", address: "MTNMobMoney" }
];

msgParams.forEach(p => {
  const parsed = parseMoMoSMS(p.body, p.address);
  console.log(`Address: ${p.address}, Provider: ${parsed?.provider}`);
});
