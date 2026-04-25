export interface ParsedSMS {
  transaction_type: "deposit" | "sent" | "withdrawal" | "payment" | "airtime_bought" | "airtime_sold" | "airtime" | "commission" | "unknown";
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

export function parseMoMoSMS(text: string, address?: string): ParsedSMS | null {
  if (!text || !text.trim()) return null;

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
    raw_message: text
  };

  const lowerText = text.toLowerCase();
  const lowerAddress = (address || '').toLowerCase();

  // Explicitly ignore non-transactional messages like data quota warnings
  if (
    /(data quota|consumed.*data|mb remaining|gb remaining|renew.*bundle)/i.test(lowerText) && 
    !/(recharged|payment|paid|received|sent|transferred|reçu|envoyé|payé|pokea|tuma|lipa|recebido|enviado)/i.test(lowerText)
  ) {
    return null;
  }

  // 1. Transaction Type Detection (English, French, Swahili, Portuguese, Spanish)
  // Check specific types first (commission, airtime)
  if (/(commission|kamisheni|comissao|comisi[oó]n)/i.test(lowerText)) {
    result.transaction_type = "commission";
  }
  else if (/(airtime|bundle|recharge|cr[eé]dit|muda wa maongezi|recarga)/i.test(lowerText)) {
    if (/(sold|sale|vendu|uzwa|vendido)/i.test(lowerText)) {
      result.transaction_type = "airtime_sold";
    } else {
      result.transaction_type = "airtime_bought";
    }
  }
  // Then general types
  else if (/(received|credited|deposit|cash-in|cashed in|reçu|d[eé]p[oô]t|pokea|imepokelewa|weka|recebido|deposito|recibido)/i.test(lowerText)) result.transaction_type = "deposit";
  else if (/(sent|transferred|paid to|cash-out|cashed out|envoy[eé]|transfert|tuma|imetumwa|enviado|transferencia)/i.test(lowerText)) result.transaction_type = "sent";
  else if (/(withdrawn|withdraw|cash out|retrait|retir[eé]|toa|imetolewa|levantamento|retirado|retiro)/i.test(lowerText)) result.transaction_type = "withdrawal";
  else if (/(paid|bill|purchase|pay[eé]|paiement|achat|lipa|imelipwa|pago|pagamento|pagado)/i.test(lowerText)) result.transaction_type = "payment";

  // 2. Global Currency Detection
  const isoCodes = "AED|AFN|ALL|AMD|ANG|AOA|ARS|AUD|AWG|AZN|BAM|BBD|BDT|BGN|BHD|BIF|BMD|BND|BOB|BRL|BSD|BTN|BWP|BZD|CAD|CDF|CHF|CLP|CNY|COP|CRC|CUP|CVE|CZK|DJF|DKK|DOP|DZD|EGP|ERN|ETB|EUR|FJD|FKP|GBP|GEL|GHS|GIP|GMD|GNF|GTQ|GYD|HKD|HNL|HRK|HTG|HUF|IDR|ILS|INR|IQD|IRR|ISK|JMD|JOD|JPY|KES|KGS|KHR|KMF|KPW|KRW|KWD|KYD|KZT|LAK|LBP|LKR|LRD|LSL|LYD|MAD|MDL|MGA|MKD|MMK|MNT|MOP|MRU|MUR|MVR|MWK|MXN|MYR|MZN|NAD|NGN|NIO|NOK|NPR|NZD|OMR|PAB|PEN|PGK|PHP|PKR|PLN|PYG|QAR|RON|RSD|RUB|RWF|SAR|SBD|SCR|SDG|SEK|SGD|SHP|SLL|SOS|SRD|SSP|STN|SYP|SZL|THB|TJS|TMT|TND|TOP|TRY|TTD|TWD|TZS|UAH|UGX|USD|UYU|UZS|VES|VND|VUV|WST|XAF|XCD|XOF|XPF|YER|ZAR|ZMW|ZWL";
  const symbols = "\\$|€|£|¥|₦|₹|₽|₩|₪|₫|฿|¢";
  const aliases = "Ksh|Shs|CFA|Fr|Le|R";
  
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

  // 3. Amount Extraction
  // Look for currency followed by numbers or numbers followed by currency
  const amountRegex = new RegExp(
    `(?:\\b(?:${textCurrencies})\\b|${symbols})\\s*([\\d, \\.]+\\d)|([\\d, \\.]+\\d)\\s*(?:\\b(?:${textCurrencies})\\b|${symbols})`, 
    'i'
  );
  const fallbackAmountRegex = /(?:amount|cash deposit of|paid|received|sent|transferred|montant|somme|kiasi|valor|cantidad)[:\s]*([\d,.\s]+\d)/i;
  
  const amountMatch = text.match(amountRegex) || text.match(fallbackAmountRegex);
  
  if (amountMatch) {
    result.amount = cleanNumber(amountMatch[1] || amountMatch[2]);
  }

  // 4. Name Detection
  const fromMatch = text.match(/from\s+([A-Za-z0-9\s]+?)(?=\.|\s+Bal|\s+TID|\s+ID|\s+Ref|\s+on|$)/i);
  if (fromMatch) result.sender_name = fromMatch[1].trim();

  const toMatch = text.match(/to\s+([A-Za-z0-9\s]+?)(?=\.|\s+Bal|\s+TID|\s+ID|\s+Ref|\s+on|$)/i);
  if (toMatch) result.receiver_name = toMatch[1].trim();

  // 5. Transaction ID
  const tidMatch = text.match(/(?:TID|TxID|Txn|Ref|Reference|Transaction ID|ID)\s*:?\s*([A-Za-z0-9]+)/i);
  if (tidMatch) result.transaction_id = tidMatch[1].trim();

  // 6. Phone Number Extraction
  const phoneRegex = /(?:^|\s)(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}(?=\s|$|\.)/g;
  let match;
  while ((match = phoneRegex.exec(text)) !== null) {
    const phone = match[0].trim();
    const cleanPhone = phone.replace(/[-.\s+()]/g, '');
    if (!result.transaction_id || !result.transaction_id.includes(cleanPhone)) {
      result.phone_number = phone;
      break;
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

  // 10. Provider Detection (Global scope)
  const providerMatch = text.match(/(M-Pesa|Orange Money|bKash|Paytm|MTN|Airtel|Safaricom|MoMo|HaloPesa|Tigo|Vodafone|Ecocash|Telecel|Wave|Chipper|Zamtel|Sasapay)/i);
  const genericProviderMatch = text.match(/(?:from|via)\s+([a-zA-Z0-9\s]+?)(?:\s+mobile\s+money|\s+money|\s+cash|\s+m-pesa|\s+m-shwari)/i);
  
  if (providerMatch) {
    // Normalize to standard capitalization to prevent duplicate buttons (e.g., "mtn", "MTN")
    const p = providerMatch[1].toUpperCase();
    if (p === 'MTN') result.provider = 'MTN';
    else if (p === 'AIRTEL') result.provider = 'Airtel';
    else if (p === 'M-PESA') result.provider = 'M-Pesa';
    else if (p === 'SAFARICOM') result.provider = 'Safaricom';
    else if (p === 'ORANGE MONEY') result.provider = 'Orange Money';
    else if (p === 'VODAFONE') result.provider = 'Vodafone';
    else if (p === 'TIGO') result.provider = 'Tigo';
    else if (p === 'ECOCASH') result.provider = 'EcoCash';
    else if (p === 'BKASH') result.provider = 'bKash';
    else if (p === 'WAVE') result.provider = 'Wave';
    else result.provider = providerMatch[1].charAt(0).toUpperCase() + providerMatch[1].slice(1).toLowerCase();
  } else if (genericProviderMatch) {
    result.provider = genericProviderMatch[1].trim();
    // Capitalize properly
    result.provider = result.provider.charAt(0).toUpperCase() + result.provider.slice(1).toLowerCase();
  } else if (address) {
    // Fallback: If we have a Sender ID (address) and it's alphanumeric (not a standard phone number),
    // use it as the provider name for any unknown global mobile money line.
    if (!/^\+?[\d\s-]+$/.test(address)) {
      if (lowerAddress.includes('mtn')) result.provider = 'MTN';
      else if (lowerAddress.includes('airtel')) result.provider = 'Airtel';
      else if (lowerAddress.includes('mpesa') || lowerAddress.includes('m-pesa')) result.provider = 'M-Pesa';
      else if (lowerAddress.includes('tigo')) result.provider = 'Tigo';
      else if (lowerAddress.includes('vodafone')) result.provider = 'Vodafone';
      else if (lowerAddress.includes('ecocash')) result.provider = 'EcoCash';
      else if (lowerAddress.includes('bkash')) result.provider = 'bKash';
      else if (lowerAddress.includes('wave')) result.provider = 'Wave';
      else {
        // Use the generic sender ID as the provider name (e.g., "Zuku", "Sasapay")
        result.provider = address.trim();
        // Capitalize nicely if it's all uppercase or lowercase
        if (result.provider === result.provider.toUpperCase() || result.provider === result.provider.toLowerCase()) {
           result.provider = result.provider.charAt(0).toUpperCase() + result.provider.slice(1).toLowerCase();
        }
      }
    }
  }

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
    return null;
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
