import { extractMultipleTransactions, parseMoMoSMS } from './src/lib/smsParser';

const text = `CASH DEPOSIT of UGX 2,000 from  OWEN MPIRWE. Bal UGX 2,125. TID 137993360002. 02-January-2026 09:33

PAID.TID 137993393292. UGX 2,000 to BUSINESS Charge UGX 0. Bal UGX 125. 02-January-2026 09:33

CASH DEPOSIT of UGX 2,000 from  OWEN MPIRWE. Bal UGX 2,075. TID 138608354940. 11-January-2026 15:40

PAID.TID 138608517367. UGX 2,000 to BUSINESS Charge UGX 0. Bal UGX 75. 11-January-2026 15:43

CASH DEPOSIT of UGX 65,000 from  EQUITY BANK U LTD EQUITY BANK U LTD. Bal UGX 65,075. TID 138648572137. 12-January-2026 09:10

PAID.TID 138648727215. UGX 61,300 to NUMIDA TECHNOLOGIES UGANDA LIMITED Charge UGX 950. Bal UGX 2,825. 12-January-2026 09:13

PAID.TID 138651792205. UGX 2,000 to BUSINESS Charge UGX 0. Bal UGX 825. 12-January-2026 10:06

PAID.TID 138680164164. UGX 500 to BUSINESS Charge UGX 0. Bal UGX 325. 12-January-2026 17:31

CASH DEPOSIT of UGX 1,000 from  OWEN MPIRWE. Bal UGX 1,325. TID 138713976059. 13-January-2026 08:13

CASH DEPOSIT of UGX 1,000 from  OWEN MPIRWE. Bal UGX 2,325. TID 138714210091. 13-January-2026 08:19

PAID.TID 138714341285. UGX 2,000 to BUSINESS Charge UGX 0. Bal UGX 325. 13-January-2026 08:22

CASH DEPOSIT of UGX 201,000 from  NUMIDA TECHNOLOGIES UGANDA LIMITED NUMIDA TECHNOLOGIES UGANDA LIMITED. Bal UGX 201,325. TID 138738331796. 13-January-2026 14:43

WITHDRAWN. TID 138738965190. UGX174,000 with Agent ID: 104471.Fee UGX 3,575.Tax UGX 870.Bal UGX 22,880. 13-January-2026 14:53.

RECEIVED. TID 138747843891. UGX 12,000 from 708471505, SHIMON NAMURINDA. Bal UGX 34,880. View txns on MyAirtel App https://bit.ly/3ZgpiNw

SENT.TID 138748097113. UGX 11,500 to SHIMON NAMURINDA  0708471505. Fee UGX 500. Bal UGX 22,880. Date 13-January-2026 17:11.

PAID.TID 138750096246. UGX 21,000 to TRADE LANCE LIMITED Charge UGX 650. Bal UGX 1,230. 13-January-2026 17:34

PAID UGX 8,000 to MC PREPAID Charge UGX 0, TID 139595461332. Bal UGX 335 Date: 28-January-2026 18:48. https://bit.ly/3ZgpiNw

Cash deposit of UGX 3,260 from  MC PREPAID MC PREPAID. Balance UGX 3,435. Trans ID:140351303189. Date 08-February-2026 10:48.

You have been debited UGX 3,150. Fee UGX 100. Bal UGX 185. TID 140351527103.Send using MyAirtel App https://bit.ly/3ZgpiNw

CASH DEPOSIT of UGX 20,000 from  MTN MOBILE MONEY UGANDA LTD. Bal UGX 20,185. TID 140593812467. 11-February-2026 18:20

PAID.TID 140596818769. UGX 2,000 to BUSINESS Charge UGX 0. Bal UGX 18,185. 11-February-2026 18:58

SENT.TID 140603939005. UGX 11,000 to MARY KYOHANGIRWE  0742059348. Fee UGX 500. Bal UGX 6,685. Date 11-February-2026 20:06.

PAID.TID 140640964153. UGX 2,000 to BUSINESS Charge UGX 0. Bal UGX 4,685. 12-February-2026 12:22

CASH DEPOSIT of UGX 22,000 from  EQUITY BANK U LTD EQUITY BANK U LTD. Bal UGX 26,685. TID 140682840930. 12-February-2026 21:28

PAID.TID 140683531446. UGX 21,000 to TRADE LANCE LIMITED Charge UGX 650. Bal UGX 5,035. 12-February-2026 21:36

PAID UGX 30,000 to Collections Charge UGX 0, TID 140813782695. Bal UGX 1,936 Date: 14-February-2026 18:24. https://bit.ly/3ZgpiNw

PAID.TID 140974650614. UGX 500 to BUSINESS Charge UGX 0. Bal UGX 39,936. 16-February-2026 22:41

PAID UGX 39,000 to Collections Charge UGX 0, TID 140974823903. Bal UGX 936 Date: 16-February-2026 22:44. https://bit.ly/3ZgpiNw

CASH DEPOSIT of UGX 20,000 from  OWEN MPIRWE. Bal UGX 20,617. TID 141999764963. 03-March-2026 12:38

You have sent Amount: UGX 2,000 to Bank Account: 1052103284738. Txn ID: 142001301174. Bal UGX 17,917 Date: {currentdateTime}

CASH DEPOSIT of UGX 6,000 from  EQUITY BANK U LTD EQUITY BANK U LTD. Bal UGX 23,917. TID 142001784775. 03-March-2026 13:07

PAID.TID 142002075170. UGX 21,000 to TRADE LANCE LIMITED Charge UGX 650. Bal UGX 2,267. 03-March-2026 13:12

CASH DEPOSIT of UGX 37,000 from  EQUITY BANK U LTD EQUITY BANK U LTD. Bal UGX 37,027. TID 143934491614. 30-March-2026 11:20

PAID.TID 144146278514. UGX 2,000 to BUSINESS Charge UGX 0. Bal UGX 9,077. 02-April-2026 12:04

PAID.TID 144191568578. UGX 2,060 to TRADE LANCE LIMITED Charge UGX 120. Bal UGX 6,897. 02-April-2026 21:29

PAID.TID 145367773045. UGX 500 to BUSINESS Charge UGX 0. Bal UGX 597. 19-April-2026 10:47

CASH DEPOSIT of UGX 3,000 from  MTN MOBILE MONEY UGANDA LTD. Bal UGX 3,597. TID 145367929353. 19-April-2026 10:49

You have been debited UGX 3,200. Fee UGX 100. Bal UGX 297. TID 145368439290.Send using MyAirtel App https://bit.ly/3ZgpiNw

CASH DEPOSIT of UGX 1,100 from  MTN MOBILE MONEY UGANDA LTD. Bal UGX 2,732. TID 145469137625. 20-April-2026 17:08

You have been debited UGX 1,000. Fee UGX 100. Bal UGX 1,632. TID 145469311377.Send using MyAirtel App https://bit.ly/3ZgpiNw

RECEIVED UGX 600 from 256779460870,EVAS AMUMPAIRE,1234. Balance UGX 47,552. Trans ID:145904310097. Send using MyAirtel App https://bit.ly/3ZgpiNw.

RECEIVED UGX 1,100 from 256779460870,EVAS AMUMPAIRE,1234. Balance UGX 5,641. Trans ID:146580765308. Send using MyAirtel App https://bit.ly/3ZgpiNw.

You have been debited UGX 5,000. Fee UGX 100. Bal UGX 541. TID 146581398974.Send using MyAirtel App https://bit.ly/3ZgpiNw

RECEIVED UGX 1,100 from 256779460870,EVAS AMUMPAIRE,1234. Balance UGX 1,641. Trans ID:146671771078. Send using MyAirtel App https://bit.ly/3ZgpiNw.

SENT UGX 3,200 to EVAS AMUMPAIRE on 256779460870. Fee UGX 100.0 Bal UGX 297. TID 145368439290. Send using MyAirtel App https://bit.ly/3ZgpiNw

SENT UGX 3,150 to EVAS AMUMPAIRE on 256779460870. Fee UGX 100.0 Bal UGX 185. TID 140351527103. Send using MyAirtel App https://bit.ly/3ZgpiNw

SENT UGX 1,000 to EVAS AMUMPAIRE on 256779460870. Fee UGX 100.0 Bal UGX 1,632. TID 145469311377. Send using MyAirtel App https://bit.ly/3ZgpiNw

SENT UGX 500 to EVAS AMUMPAIRE on 256779460870. Fee UGX 100.0 Bal UGX 46,952. TID 145904409372. Send using MyAirtel App https://bit.ly/3ZgpiNw

SENT UGX 5,000 to EVAS AMUMPAIRE on 256779460870. Fee UGX 100.0 Bal UGX 541. TID 146581398974. Send using MyAirtel App https://bit.ly/3ZgpiNw

You have bought UGX 100 airtime. New MoMo balance: UGX 11.27. Do NOT share your Mobile Money PIN.

You have received UGX 1000 from Airtel Money on 2026-02-14 19:24:21. fee:0. Reason: AGGREY TUMUSIIME , 0755341098. New balance: UGX 1011. ID: 38563292600. Dial *165# or use the MoMo app to pay, borrow, invest and more.

You have received UGX 1100 from Airtel Money on 2026-04-22 14:57:55. fee:0. Reason: AGGREY TUMUSIIME , 0755341098. New balance: UGX 6824. ID: 40152566038. Dial *165# or use the MoMo app to pay, borrow, invest and more.

Y'ello. You have sent UGX 1,000 to 256755341098, AGGREY,TUMUSIIME. Fee:UGX 100.00.  Transaction ID:40152595876. Your Mobile Money balance is now UGX 5,723.77.Thank you for using MTN Mobile Money.

You have received UGX 1100 from Airtel Money on 2026-04-23 13:10:41. fee:0. Reason: AGGREY TUMUSIIME , 0755341098. New balance: UGX 6627. ID: 40175968258. Dial *165# or use the MoMo app to pay, borrow, invest and more.

Y'ello. You have sent UGX 1,000 to 256755341098, AGGREY,TUMUSIIME. Fee:UGX 100.00.  Transaction ID:40176004001. Your Mobile Money balance is now UGX 5,526.77.Thank you for using MTN Mobile Money.

You have received UGX 600 from Airtel Money on 2026-04-23 13:24:15. fee:0. Reason: AGGREY TUMUSIIME , 0755341098. New balance: UGX 6127. ID: 40176255889. Dial *165# or use the MoMo app to pay, borrow, invest and more.

Y'ello. You have sent UGX 500 to 256755341098, AGGREY,TUMUSIIME. Fee:UGX 100.00.  Transaction ID:40176301642. Your Mobile Money balance is now UGX 5,526.77.Thank you for using MTN Mobile Money.

Msg:207:You have received airtime worth UGX 1000/-.New Airtime balance is UGX 723/-.Transaction numberR260210.1637.230012.AIRTEL

Msg:207:You have received airtime worth UGX 2100/-.New Airtime balance is UGX 2046/-.Transaction numberR260210.1708.22000f.AIRTEL

Msg:207:You have received airtime worth UGX 2000/-.New Airtime balance is UGX 2078/-.Transaction numberR260302.1330.22000d.AIRTEL`;

const extracted = extractMultipleTransactions(text);
const messages = text.split(/\n\n+/).map(t => t.trim()).filter(t => t);
const extractedTids = new Set(extracted.map(t => t.transaction_id));

messages.forEach((msg, idx) => {
  const parsed = parseMoMoSMS(msg.split('\n').join(' ')); // using single message parser to see if it even parses
  if (!parsed || !parsed.amount || !parsed.transaction_type) {
    // console.log('UNPARSED (as single):', msg);
  } else {
    // See if it was found in extracted
    if (!extracted.find(t => t.raw_message.includes(msg.substring(0, 20)))) {
       console.log('NOT EXTRACTED FROM BATCH:', msg);
       console.log('TID from single parse:', parsed.transaction_id);
    }
  }
});

extracted.forEach(tx => console.log('EXTRACTED TID:', tx.transaction_id));
