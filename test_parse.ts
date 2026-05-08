import { parseMoMoSMS } from './src/lib/smsParser';

const msgParams = [
  { body: "You have sent UGX 10000 to MTN Uganda", address: "AirtelMoney" },
  { body: "Y'ello. You have received UGX 1000 from Lycamobile", address: "MTNMobMoney" },
  { body: "get 20gb + unlimited on-net calls at only 20,000 shs and stay connected! renew now before your bundle expires. dial *100# and select option 1: buy bundle", address: "Lycamobile" },
  { body: "Airtime of UGX 1,000 bought successfully.", address: "AirtelMoney" },
  { body: "Transaction ID: 123456. You have bought airtime of UGX 1000. Dial *165# for more info.", address: "MTNMobMoney" },
  { body: "Txn ID XXX. You have received a bonus of UGX 5000.", address: "MTNMobMoney"}
];

msgParams.forEach(p => {
  const parsed = parseMoMoSMS(p.body, p.address);
  console.log(`Address: ${p.address}, Provider: ${parsed?.provider}, Result: ${parsed ? JSON.stringify(parsed) : 'null'}`);
});
