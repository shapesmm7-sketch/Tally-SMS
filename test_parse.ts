import { parseMoMoSMS } from './src/lib/smsParser';

const msgParams = [
  { body: "You have been debited UGX 5,000. Fee UGX 100. Bal UGX 541. TID 146581398974.Send using MyAirtel App https://bit.ly/3ZgpiNw", address: "AirtelMoney" },
  { body: "SENT UGX 5,000 to EVAS AMUMPAIRE on 256779460870. Fee UGX 100.0 Bal UGX 541. TID 146581398974. Send using MyAirtel App https://bit.ly/3ZgpiNw", address: "AirtelMoney" },
];

msgParams.forEach(p => {
  const parsed = parseMoMoSMS(p.body, p.address);
  console.log(`Address: ${p.address}, Provider: ${parsed?.provider}, Result: ${parsed ? JSON.stringify(parsed) : 'null'}`);
});
