export interface ParsedSMS {
  transaction_type: "received" | "deposit" | "withdrawal" | "sent" | "airtime_bought" | "airtime_sold" | "airtime" | "commission" | "unknown";
  amount: number | null;
  currency: string | null;
  sender_name: string | null;
  receiver_name: string | null;
  phone_number: string | null;
  transaction_id: string | null;
  date: string | null;
  time: string | null;
  balance: number | null;
  fee: number | null;
  provider: string | null;
  confidence_score: number;
  raw_message: string;
}

export function normalizeProviderName(provider: string): string {
  if (!provider) return provider;
  
  // Clean up the string and remove common suffixes that create duplicate categories
  let p = provider.trim().toUpperCase();
  p = p.replace(/(?:\s|-)*(?:MOBILE\s*MONEY|MOBMONEY|MONEY)$/, '');

  if (p.startsWith('MTN') || p === 'MT') return 'MTN';
  if (p.startsWith('AIRTEL')) return 'Airtel';
  if (p.startsWith('LYCA')) return 'Lycamobile';
  if (p.startsWith('M-PESA') || p.startsWith('MPESA')) return 'M-Pesa';
  if (p.startsWith('SAFARICOM')) return 'Safaricom';
  if (p.startsWith('ORANGE')) return 'Orange Money';
  if (p.startsWith('VODAFONE')) return 'Vodafone';
  if (p.startsWith('TIGO')) return 'Tigo';
  if (p.startsWith('ECOCASH')) return 'EcoCash';
  if (p.startsWith('BKASH')) return 'bKash';
  if (p.startsWith('WAVE')) return 'Wave';
  if (p.startsWith('PAYTM')) return 'Paytm';
  if (p.startsWith('HALOPESA')) return 'HaloPesa';
  if (p.startsWith('TELECEL')) return 'Telecel';
  if (p.startsWith('CHIPPER')) return 'Chipper';
  if (p.startsWith('ZAMTEL')) return 'Zamtel';
  if (p.startsWith('SASAPAY')) return 'Sasapay';
  if (p.startsWith('MOMO') || p.startsWith('MO MO')) return 'MoMo';
  
  // For any other provider, format nicely: First letter capitalized, rest lower (e.g., "Hello money" -> "Hello")
  return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
}

export function parseMoMoSMS(text: string, address?: string): ParsedSMS | null {
  if (!text || !text.trim()) return null;

  let cleanText = text;
  
  // Move any leading date/time lines to the bottom, but don't truncate arbitrary lines
  const cleanLines = cleanText.split('\n');
  const linesToMove = [];
  let moveCount = 0;
  
  for (let i = 0; i < cleanLines.length; i++) {
    const l = cleanLines[i].trim();
    // Only move date/time if it's explicitly a date or time line
    const isDateOrTime = /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[, ]|^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[, ]*[0-9]{1,2}/i.test(l) || 
                         /^[0-9]{1,2}:[0-9]{2}(?:\s*(?:AM|PM))?/i.test(l) ||
                         /^(?:Yesterday|Today)/i.test(l);
    if (isDateOrTime) {
      linesToMove.push(cleanLines[i]);
      moveCount++;
    } else {
      break;
    }
  }

  if (moveCount > 0) {
    cleanLines.splice(0, moveCount);
    cleanLines.push(...linesToMove);
    cleanText = cleanLines.join('\n');
  }

  const result: ParsedSMS = {
    transaction_type: "unknown",
    amount: null,
    currency: null,
    sender_name: null,
    receiver_name: null,
    phone_number: null,
    transaction_id: null,
    date: null,
    time: null,
    balance: null,
    fee: null,
    provider: null,
    confidence_score: 0.0,
    raw_message: cleanText
  };

  const lowerText = cleanText.toLowerCase();
  const lowerAddress = (address || '').toLowerCase();

  const hasTIDPattern = /(?:\b(?:Transaction number|Transaction ID|Trans ID|Txn ID|Id de transacci[oó]n|ID transa[cç][aã]o|R[eé]f[eé]rence|Reference|TxID|Txn|TID|Ref|R[eé]f|ID)\b)\s*[:\-\.]?\s*[A-Za-z0-9]+/i.test(lowerText);
  const hasStrongTxnKeyword = /(?:was successful|successful|has been completed|you have received|you have sent|you have bought|you have recharged|transferred to|cash deposit of|cash in|cash out|payment of|paid to|withdrawn from|withdrawn\b|deposited into)/i.test(lowerText);

  // Explicitly ignore initiation messages (e.g. Airtel withdrawal secret code, MTN withdrawal requests)
  if (
    (/\binitiated\b/i.test(lowerText) && /\bsecret code\b/i.test(lowerText)) ||
    (/\brequested a withdrawal\b/i.test(lowerText) && /\bauthorize\b/i.test(lowerText)) ||
    /\bselect My Approvals\b/i.test(lowerText)
  ) {
    return null;
  }

  // Explicitly ignore promotional, marketing, and lottery messages
  // If it's purely asking to renew, buy a bundle, etc., it's not a transaction record.
  if (
    /(you have won|to unlock|offer only|extra data|bonus\b|promotional|promo\b|win up to|sweepstakes|lucky winner|dear customer, claim|free gift|reward|special offer|renew now|renew your|subscribed to|you have subscribed|recharged (?:with|your)|get \d+\s*(?:gb|mb|sms|min|mins|minutes|sec)|great news!|is now available|available again|bundle at only|to activate|skip the hassle|pay using momo|no charges on payments|dnd\*\d+|boda rider|never has.*change|reminder:|will be collected|to repay|repay and avoid|late payment fee|having money problems|loans from|total up to|resolve your financial issues|onelink.me|valid for \d+\s*(?:hour|hours|day|days)|check your volume|subscribed to daily|\d+min,\d+mb,\d+sms)/i.test(lowerText) ||
    (/\bdial\s*\*(\d+)/i.test(lowerText) && !hasStrongTxnKeyword)
  ) {
    if (!hasTIDPattern && !hasStrongTxnKeyword) {
      return null;
    }
  }

  // Explicitly ignore non-transactional messages like data quota warnings
  if (
    /(data quota|consumed.*data|mb remaining|gb remaining|renew.*bundle|recharge today|dial \d*\*\d+|select option)/i.test(lowerText) && 
    !(hasTIDPattern || hasStrongTxnKeyword || /(recharged|payment|paid|received|sent|transferred|reçu|envoy[eé]|pay[eé]|pokea|tuma|lipa|recebido|enviado|buy\s+airtime|bought\s+airtime|purchase|spend|spent|withdraw|withdrawn|deposit|deposited|cash|credited|debited)/i.test(lowerText))
  ) {
    return null;
  }

  // 1. Transaction Type Detection (English, French, Swahili, Portuguese, Spanish)
  // Check specific types first (commission, airtime)
  if (/(commission|kamisheni|comissao|comisi[oó]n)/i.test(lowerText)) {
    result.transaction_type = "commission";
  }
  else if (/(airtime|bundle|recharge|cr[eé]dit|worth|muda wa maongezi|recarga)/i.test(lowerText)) {
    if (/(sold|sale|vendu|uzwa|vendido)/i.test(lowerText)) {
      result.transaction_type = "airtime_sold";
    } else {
      result.transaction_type = "airtime_bought";
    }
  }
  // Then general types
  else if (/(received|credited|pokea|imepokelewa|reçu|recebido|recibido)/i.test(lowerText)) result.transaction_type = "received";
  else if (/(deposit|deposited|cash in|weka|d[eé]p[oô]t|deposito)/i.test(lowerText)) result.transaction_type = "deposit";
  else if (/(withdrawn|withdraw|withdrawal|cash out|retrait|retir[eé]|toa|imetolewa|idimbulwa|levantamento|retirado|retiro|saque)/i.test(lowerText)) result.transaction_type = "withdrawal";
  else if (/(sent|paid|debited|bill|purchase|envoy[eé]|transfert|tuma|imetumwa|enviado|transferencia|pago|pagamento|pagado|trasferimento|payment|entrega|buy|bought|spend|spent|pay|paying)/i.test(lowerText)) result.transaction_type = "sent";
  // fallback for cash if no context
  else if (/(cash)/i.test(lowerText) && result.transaction_type === "unknown") result.transaction_type = "unknown"; // cash is ambiguous without in/out
  else if (/\bto\s+[A-Za-z]+/.test(lowerText) && result.transaction_type === "unknown") result.transaction_type = "sent";
  else if (/\bfrom\s+[A-Za-z]+/.test(lowerText) && result.transaction_type === "unknown") result.transaction_type = "received";

  // 2. Global Currency Detection
  const isoCodes = "AED|AFN|ALL|AMD|ANG|AOA|ARS|AUD|AWG|AZN|BAM|BBD|BDT|BGN|BHD|BIF|BMD|BND|BOB|BRL|BSD|BTN|BWP|BZD|CAD|CDF|CHF|CLP|CNY|COP|CRC|CUP|CVE|CZK|DJF|DKK|DOP|DZD|EGP|ERN|ETB|EUR|FJD|FKP|GBP|GEL|GHS|GIP|GMD|GNF|GTQ|GYD|HKD|HNL|HRK|HTG|HUF|IDR|ILS|INR|IQD|IRR|ISK|JMD|JOD|JPY|KES|KGS|KHR|KMF|KPW|KRW|KWD|KYD|KZT|LAK|LBP|LKR|LRD|LSL|LYD|MAD|MDL|MGA|MKD|MMK|MNT|MOP|MRU|MUR|MVR|MWK|MXN|MYR|MZN|NAD|NGN|NIO|NOK|NPR|NZD|OMR|PAB|PEN|PGK|PHP|PKR|PLN|PYG|QAR|RON|RSD|RUB|RWF|SAR|SBD|SCR|SDG|SEK|SGD|SHP|SLL|SOS|SRD|SSP|STN|SYP|SZL|THB|TJS|TMT|TND|TOP|TRY|TTD|TWD|TZS|UAH|UGX|USD|UYU|UZS|VES|VND|VUV|WST|XAF|XCD|XOF|XPF|YER|ZAR|ZMW|ZWL";
  const symbols = "\\$|€|£|¥|₦|₹|₽|₩|₪|₫|฿|¢";
  const aliases = "Ksh|Shs|UG shs|CFA|Fr|Le|R";
  
  const textCurrencies = `${isoCodes}|${aliases}`;
  
  const currencyMatch = text.match(new RegExp(`\\b(${textCurrencies})\\b`, 'i')) || text.match(new RegExp(`(${symbols})`, 'i'));
  if (currencyMatch) result.currency = currencyMatch[1].toUpperCase();

  // Helper to clean numbers (remove spaces, and handle international comma/dot decimals)
  const cleanNumber = (str: string) => {
    const cleanStr = str.replace(/[ ]/g, '');
    let parsedString = cleanStr;

    const lastCommaIndex = cleanStr.lastIndexOf(',');
    const lastDotIndex = cleanStr.lastIndexOf('.');

    if (lastCommaIndex > lastDotIndex) {
      // Comma is the decimal separator (e.g., 1.234,56 or 1234,56)
      if (lastDotIndex > -1) {
        parsedString = cleanStr.replace(/\./g, '').replace(',', '.');
      } else {
        // Determine if comma is a thousands separator by checking digits after it
        // If exactly 3 digits follow, it might be a thousands separator (e.g., 50,000)
        // Usually, decimal parts are 2 digits for currency (e.g., ,56). 
        // We'll assume if it's strictly 3 digits, it's a thousands separator if there are no dots.
        const parts = cleanStr.split(',');
        if (parts.length > 1 && parts[parts.length - 1].length === 3) {
          parsedString = cleanStr.replace(/,/g, '');
        } else {
          parsedString = cleanStr.replace(',', '.');
        }
      }
    } else if (lastDotIndex > lastCommaIndex) {
      // Dot is the decimal separator (e.g., 1,234.56 or 1234.56)
      if (lastCommaIndex > -1) {
        parsedString = cleanStr.replace(/,/g, '');
      } else {
        parsedString = cleanStr;
      }
    } else {
      parsedString = cleanStr.replace(/[,. ]/g, '');
    }

    return parseFloat(parsedString) || 0;
  };

  // 4. Transaction ID (Extracted Early for Masking)
  const tidMatch = text.match(/(?:\b(?:Transaction number|Transaction ID|Trans ID|Txn ID|Id de transacci[oó]n|ID transa[cç][aã]o|R[eé]f[eé]rence|Reference|TxID|Txn|TID|Ref|R[eé]f|ID)\b)\s*[:\-\.]?\s*([A-Za-z0-9]+(?:[\.\-][A-Za-z0-9]+)*)/i);
  let tid = tidMatch ? tidMatch[1].trim() : null;
  if (tid) {
    // Strip common attached words due to missing spaces (e.g. 140351527103.Send)
    tid = tid.replace(/\.(?:Send|View|Dial).*$/i, '');
    result.transaction_id = tid.replace(/\.$/, '');
  }

  // 5. Amount Extraction
  // Look for currency followed by numbers or numbers followed by currency
  // We remove the trailing \b for text currencies to allow them to be immediately followed by digits (e.g. UGX1000)
  const amountRegex = new RegExp(
    `(?:\\b(?:${textCurrencies})|${symbols})\\s*(\\d(?:[\\d, \\.]*\\d)?)|(\\d(?:[\\d, \\.]*\\d)?)\\s*(?:(?:${textCurrencies})\\b|${symbols})`, 
    'i'
  );
  const fallbackAmountRegex = /(?:amount|cash deposit of|cash in|paid|pay|received|sent|transferred|withdrawn|withdraw|montant|somme|kiasi|valor|cantidad|pokea|weka|toa|tuma|reçu|recu|dépôt|depot|retrait|envoyé|envoye|recebido|deposito|levantamento|enviado|buy|bought|spend|spent|cash|credited|debited)[:\s.,\-]*([A-Za-z]{2,3}(?:\s*shs)?)?[:\s.,\-]*(\d(?:[\d,.\s]*\d)?)/i;
  
  // Mask the transaction ID and phone number before looking for amounts 
  // so we don't accidentally parse a TID or phone number as an amount.
  let textForAmount = text;

  // Mask known secondary amounts (fee, tax, balance) to avoid confusion
  // We match the whole pattern but only replace the numerical part to keep the text structure
  const feePattern = /(?:Fee|Charge|Cost|Tax|Taxa|Taxe)[^\d]*(\d(?:[\d, \.]*\d)?)/i;
  const balPattern = /(?:Balance|New balance|Available balance|Bal|Amt)[^\d]*(\d(?:[\d, \.]*\d)?)/i;
  
  const tempFeeMatch = textForAmount.match(feePattern);
  if (tempFeeMatch) {
    textForAmount = textForAmount.replace(tempFeeMatch[0], "SECONDARY_AMT_MATCH");
  }
  
  const tempBalMatch = textForAmount.match(balPattern);
  if (tempBalMatch) {
    textForAmount = textForAmount.replace(tempBalMatch[0], "SECONDARY_AMT_MATCH");
  }

  if (result.transaction_id) {
    textForAmount = textForAmount.replace(result.transaction_id, "XXXXX");
  }
  
  const amountMatch = textForAmount.match(amountRegex) || textForAmount.match(fallbackAmountRegex);
  
  if (amountMatch) {
    // If it's the fallback regex with 3 groups, the amount is in group 2
    // amountRegex has 2 potential amount groups (group 1 or group 2)
    // fallback with 2 groups (no currency group) -> amount is in group 1
    // fallback with 3 groups (action, currency, amount) -> amount is in group 2
    const val = amountMatch[2] || amountMatch[1];
    result.amount = cleanNumber(val);
    
    // Also capture currency from fallback if found
    if (amountMatch.length > 2 && amountMatch[1] && /[A-Z]{2,3}/i.test(amountMatch[1]) && !result.currency) {
      result.currency = amountMatch[1].toUpperCase();
    }
  }

  // 6. Name Detection
  const nameCaptureRegex = /([A-Za-z0-9\s,\-']+?)(?=\.|\s+(?:Bal|Balance|TID|Txn|TxId|ID|Ref|on|Charge|Fee|New|Date|$))/i;
  
  const extractName = (source: string) => {
    if (!source) return null;
    let name = source.trim();
    
    // Remove leading phone number if present (e.g. "0771234567 Name" or "256771234567 Name")
    name = name.replace(/^(?:\+?\d{8,15}\b|(?:\+?256|\+?\d{1,4})?\d{9,12}\b)[,\s.\-]*/i, '').trim();

    // Remove trailing numbers like phone or agent IDs (e.g. ", 1234" or "0708471505")
    name = name.replace(/[,\s.\-]+(?:\+?\d{8,15}\b|(?:\+?256|\+?\d{1,4})?\d{9,12}\b|\d{3,6})\s*$/i, '').trim();

    // Replace commas with spaces
    name = name.replace(/,/g, ' ').trim().replace(/\s+/g, ' ');

    // Deduplicate repeating parts (e.g. "MC PREPAID MC PREPAID")
    const words = name.split(' ');
    const half = Math.floor(words.length / 2);
    if (words.length > 1 && words.length % 2 === 0) {
      const firstHalf = words.slice(0, half).join(' ');
      const secondHalf = words.slice(half).join(' ');
      if (firstHalf.toLowerCase() === secondHalf.toLowerCase()) {
        name = firstHalf;
      }
    }

    // Capitalize properly
    name = name.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    
    // Remove any trailing punctuation
    name = name.replace(/[.,;:!)\]}]+$/, '');

    // Final check: if it's purely numeric or too short, it's likely not a name
    if (!/[A-Z]/i.test(name) || name.trim().length < 2 || /^\d+$/.test(name.trim())) return null;

    // Reject common false positive phrases
    if (/\b(?:pay|borrow|invest|airtime|balance|fee|charge)\b/i.test(name)) return null;

    return name.trim();
  };

  const fromMatchContext = text.match(new RegExp(`(?:\\b(?:from|de|mutu|kutoka|reçu de|recebido de|recibido de|paid by|sent by)\\b)\\s+${nameCaptureRegex.source}`, 'i'));
  const toMatchContext = text.match(new RegExp(`(?:\\b(?:to|pour|para|kwa|envoy[eé] [aà]|enviado para|paid to|sent to)\\b)\\s+${nameCaptureRegex.source}`, 'i'));
  const reasonMatchContext = text.match(new RegExp(`(?:\\b(?:Reason|Message|For)\\b)\\s*:\\s*${nameCaptureRegex.source}`, 'i'));

  if (fromMatchContext) result.sender_name = extractName(fromMatchContext[1]);
  if (toMatchContext) result.receiver_name = extractName(toMatchContext[1]);
  
  // Prefer Reason field if it contains a valid name, especially for networks that mask the sender name (like Airtel Money)
  if (reasonMatchContext) {
    const reasonName = extractName(reasonMatchContext[1]);
    if (reasonName) {
       if (result.transaction_type === "received" || result.transaction_type === "deposit") {
         if (!result.sender_name || result.sender_name.toLowerCase().includes("money") || result.sender_name.toLowerCase().includes("bank")) {
           result.sender_name = reasonName;
         }
       } else if (result.transaction_type === "sent" || result.transaction_type === "withdrawal") {
         if (!result.receiver_name || result.receiver_name.toLowerCase().includes("money") || result.receiver_name.toLowerCase().includes("bank")) {
           result.receiver_name = reasonName;
         }
       }
    }
  }

  // 6. Phone Number Extraction
  // Flexible regex for global numbers:
  // - International: starting with + or 00 followed by 8-15 digits
  // - Local/Regional: stricter sequences (starting with 0 or country codes) to prevent matching arbitrary IDs/TIDs
  const phoneRegex = /(?:\+|00)\d{8,15}\b|\b(?:256|254|255|234|27|44|1)[73489]\d{8}\b|\b0[73489]\d{8}\b/g;
  
  // Strategy: Try to find the phone number in the source/destination context first
  const findPhoneInContext = (context: string | undefined | null) => {
    if (!context) return null;
    
    // We create a fresh regex based on phoneRegex source to avoid lastIndex issues
    const localPhoneRegex = new RegExp(phoneRegex.source, 'g');
    let match;
    
    while ((match = localPhoneRegex.exec(context)) !== null) {
      const phone = match[0].trim();
      // Ensure it's not the amount or TID
      if (result.amount && phone.includes(result.amount.toString())) continue;
      if (result.transaction_id && result.transaction_id.includes(phone)) continue;
      
      return phone;
    }
    return null;
  };

  const phoneInFrom = findPhoneInContext(fromMatchContext?.[1]);
  const phoneInTo = findPhoneInContext(toMatchContext?.[1]);
  
  if (phoneInFrom) {
    result.phone_number = phoneInFrom;
  } else if (phoneInTo) {
    result.phone_number = phoneInTo;
  } else {
    // Fallback: Scan entire message
    let match;
    phoneRegex.lastIndex = 0;
    while ((match = phoneRegex.exec(text)) !== null) {
      const phone = match[0].trim();
      const cleanPhone = phone.replace(/[^\d]/g, '');
      // Ensure we don't pick up the TID as a phone number
      if (!result.transaction_id || !result.transaction_id.includes(cleanPhone)) {
        result.phone_number = phone;
        break;
      }
    }
  }

  // 7. Date & Time
  const dateMatch = text.match(/\b(\d{2}[-/\s.]\d{2}[-/\s.]\d{4}|\d{4}[-/\s.]\d{2}[-/\s.]\d{2}|\d{2}[-/\s.][A-Za-z]{3,9}[-/\s.]\d{4})\b/);
  if (dateMatch) result.date = dateMatch[1];

  const timeMatch = text.match(/\b(\d{2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?)\b/);
  if (timeMatch) result.time = timeMatch[1];

  // 8. Balance
  const balMatch = text.match(/(?:Balance|New balance|Available balance|Bal|Amt)[^\d]*([\d, \.]+\d)/i);
  if (balMatch) result.balance = cleanNumber(balMatch[1]);

  // 9. Fee
  const feeMatch = text.match(/(?:Fee|Charge|Cost)[^\d]*([\d, \.]+\d)/i);
  if (feeMatch) result.fee = cleanNumber(feeMatch[1]);

  // If airtime has no TID, we will keep it undefined and deduplicate using rawMessage instead.

  // 10. Provider Detection (Global scope)
  let foundProvider = null;

  // Prioritize the Sender ID (address) over the body text to distinguish providers accurately
  if (address && !/^\+?[\d\s-]+$/.test(address)) {
    foundProvider = normalizeProviderName(address);
  }

  if (!foundProvider) {
    const providerMatch = text.match(/(M-Pesa|Orange Money|bKash|Paytm|MTN|Airtel|Safaricom|MoMo|HaloPesa|Tigo|Vodafone|Ecocash|Telecel|Wave|Chipper|Zamtel|Sasapay|Opay|Palmpay|PhonePe|Google Pay|GPay|Apple Pay|Zelle|Venmo|Cash App|Revolut)/i);
    const genericProviderMatch = text.match(/(?:from|via)\s+([a-zA-Z0-9\s]+?)(?:\s+mobile\s+money|\s+money|\s+cash|\s+m-pesa|\s+m-shwari|\s+bank)/i);
    
    if (providerMatch) {
      foundProvider = normalizeProviderName(providerMatch[1]);
    } else if (genericProviderMatch) {
      foundProvider = normalizeProviderName(genericProviderMatch[1]);
    }
  }

  result.provider = foundProvider;

  // 11. Confidence Score Calculation
  const fieldsToScore = [
    'transaction_type', 'amount', 'currency', 'sender_name', 
    'receiver_name', 'phone_number', 'transaction_id', 
    'date', 'time', 'balance', 'fee', 'provider'
  ];
  
  let validFields = 0;
  fieldsToScore.forEach(field => {
    if (result[field as keyof ParsedSMS] !== null && result[field as keyof ParsedSMS] !== 'unknown') {
      validFields++;
    }
  });

  result.confidence_score = parseFloat((validFields / fieldsToScore.length).toFixed(2));

  // If we couldn't find an amount, or if it's 0, it's not a valid financial transaction SMS for our purposes.
  if (result.amount === null || result.amount === 0) {
    return null;
  }

  // If we couldn't even find a type, it's probably not a financial SMS
  if (result.transaction_type === 'unknown') {
    if (result.transaction_id && result.amount !== null) {
      if (result.fee && result.fee > 0) {
        result.transaction_type = 'withdrawal'; // usually receiving has no fee
      }
    } else {
      return null;
    }
  }

  return result;
}

export function parseTransactionDate(dateStr?: string | null, timeStr?: string | null): string {
  if (!dateStr) return new Date().toISOString();
  
  let cleanDate = dateStr.replace(/\//g, '-');
  
  // If DD-MM-YYYY, convert to YYYY-MM-DD for standard parsing
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
      // Assuming DD-MM-YYYY
      cleanDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  let dateTimeStr = cleanDate;
  if (timeStr) {
    dateTimeStr += ` ${timeStr}`;
  }

  const parsedDate = new Date(dateTimeStr);
  if (!isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString();
  }
  
  return new Date().toISOString();
}

export function extractMultipleTransactions(text: string): ParsedSMS[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const results: ParsedSMS[] = [];
  
  let currentBlock: string[] = [];
  let foundTIDs = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Pattern to detect start of a new message/transaction block
    const isDate = /^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[, ]|^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[, ]*[0-9]{1,2}/i.test(line);
    const isKeyword = /^(?:SENT|RECEIVED|CASH|DEPOSIT|WITHDRAWAL|TRANSFER|PAYMENT|YOU HAVE|TRANSFERRED|PAID|AMOUNT|CONFIRM|Y'ELLO|HELLO|MSG:|POKEA|REÇU|RECU|RECEBIDO|RECIBIDO|WEKA|DÉPÔT|DEPOT|DEPOSITO|RETRAIT|RETIRÉ|RETIRE|TOA|LEVANTAMENTO|RETIRADO|RETIRO|SAQUE|ENVOYÉ|ENVOYE|TUMA|ENVIADO|TRANSFERENCIA|PAGO|PAGAMENTO|PAGADO|TRASFERIMENTO|AIRTIME|BUNDLE|RECHARGE|CRÉDIT|CREDIT|MUDA|RECARGA|COMMISSION|KAMISHENI|COMISSAO|COMISIÓN|COMISION|BUY|BOUGHT|SPEND|SPENT|CREDITED|DEBITED)/i.test(line) ||
      /^.*(?:TID|TxId|Txn|Txn ID|Ref|Reference|ID|Transaction number|Amount)/i.test(line);
    
    // Also consider it a keyword block start if there's a currency symbol at the start
    const isCurrencyKeyword = /^(?:\$|€|£|¥|₦|₹|₽|₩|₪|₫|฿|¢|Ksh|Shs|UG shs|[A-Z]{3})\s*\d/i.test(line);
    
    const blockHasActionWord = currentBlock.some(l => 
      /^(?:SENT|RECEIVED|CASH|DEPOSIT|WITHDRAWAL|TRANSFER|PAYMENT|YOU HAVE|TRANSFERRED|PAID|AMOUNT|CONFIRM|Y'ELLO|HELLO|MSG:|POKEA|REÇU|RECU|RECEBIDO|RECIBIDO|WEKA|DÉPÔT|DEPOT|DEPOSITO|RETRAIT|RETIRÉ|RETIRE|TOA|LEVANTAMENTO|RETIRADO|RETIRO|SAQUE|ENVOYÉ|ENVOYE|TUMA|ENVIADO|TRANSFERENCIA|PAGO|PAGAMENTO|PAGADO|TRASFERIMENTO|AIRTIME|BUNDLE|RECHARGE|CREDIT|CRÉDIT|MUDA|RECARGA|COMMISSION|KAMISHENI|COMISSAO|COMISIÓN|COMISION|BUY|BOUGHT|SPEND|SPENT|CREDITED|DEBITED)/i.test(l) || 
      /\b(?:TID|TxId|Txn|Txn ID|Ref|R[eé]f|Reference|ID|Transaction number|Transferred|Paid|Received|Sent|Deposit|Withdraw|Pokea|Reçu|Recu|Recebido|Recibido|Weka|Dépôt|Depot|Deposito|Retrait|Retiré|Retire|Toa|Levantamento|Retirado|Retiro|Saque|Envoyé|Envoye|Tuma|Enviado|Transferencia|Pago|Pagamento|Pagado|Trasferimento|Buy|Bought|Spend|Spent|Credited|Debited|Amount|Bal|Balance|Fee|Charge)\b/i.test(l) ||
      /\b(?:\$|€|£|¥|₦|₹|₽|₩|₪|₫|฿|¢)\s*\d\b/.test(l) ||
      /\b(?:UGX|KES|RWF|TZS|NGN|USD|EUR|GBP|ZAR|GHS|XOF|XAF|KSH|SHS|UG SHS|[A-Z]{3})\s*\d\b/i.test(l)
    );
    
    if (currentBlock.length > 0 && blockHasActionWord && (isDate || isKeyword || isCurrencyKeyword)) {
       const parsed = parseMoMoSMS(currentBlock.join('\n'));
       if (parsed && parsed.amount && parsed.transaction_type) {
         if (!parsed.transaction_id || !foundTIDs.has(parsed.transaction_id)) {
           // We allow 'unknown' if it has a transaction ID
           if (parsed.transaction_type !== "unknown" || parsed.transaction_id) {
             results.push(parsed);
             if (parsed.transaction_id) foundTIDs.add(parsed.transaction_id);
           }
         }
       }
       currentBlock = [];
    }
    
    currentBlock.push(line);
  }
  
  if (currentBlock.length > 0) {
    const parsed = parseMoMoSMS(currentBlock.join('\n'));
    if (parsed && parsed.amount && parsed.transaction_type) {
      if (!parsed.transaction_id || !foundTIDs.has(parsed.transaction_id)) {
        if (parsed.transaction_type !== "unknown" || parsed.transaction_id) {
          results.push(parsed);
        }
      }
    }
  }
  
  if (results.length === 0) {
    const fallback = parseMoMoSMS(text);
    if (fallback && fallback.amount) {
      if (fallback.transaction_type !== "unknown" || fallback.transaction_id) {
        results.push(fallback);
      }
    }
  }
  
  return results;
}

