export interface ParsedSMS {
  transaction_type: "deposit" | "sent" | "withdrawal" | "payment" | "airtime" | "unknown";
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

  // 1. Transaction Type Detection
  if (/(received|credited|deposit|cash-in|cashed in)/i.test(lowerText)) result.transaction_type = "deposit";
  else if (/(sent|transferred|paid to|cash-out|cashed out)/i.test(lowerText)) result.transaction_type = "sent";
  else if (/(withdrawn|withdraw|cash out)/i.test(lowerText)) result.transaction_type = "withdrawal";
  else if (/(paid|bill|purchase)/i.test(lowerText)) result.transaction_type = "payment";
  else if (/(airtime|bundle|recharge)/i.test(lowerText)) result.transaction_type = "airtime";

  // 2. Currency Detection
  const currencyMatch = text.match(/(UGX|KES|NGN|GHS|INR|USD|EUR|RWF|TZS|ZAR|XOF|XAF|MWK|ZMW|\$|€|₹)/i);
  if (currencyMatch) result.currency = currencyMatch[1].toUpperCase();

  // Helper to clean numbers (remove commas and spaces)
  const cleanNumber = (str: string) => parseFloat(str.replace(/[, ]/g, ''));

  // 3. Amount Extraction
  // Look for currency followed by numbers or numbers followed by currency
  const amountRegex = /(?:UGX|KES|NGN|GHS|INR|USD|EUR|RWF|TZS|ZAR|XOF|XAF|MWK|ZMW|\$|€|₹)\s*([\d, \.]+\d)|([\d, \.]+\d)\s*(?:UGX|KES|NGN|GHS|INR|USD|EUR|RWF|TZS|ZAR|XOF|XAF|MWK|ZMW|\$|€|₹)/i;
  const amountMatch = text.match(amountRegex) || text.match(/(?:amount|cash deposit of)[:\s]*([\d,.\s]+\d)/i);
  
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

  // 10. Provider
  const providerMatch = text.match(/(M-Pesa|Orange Money|bKash|Paytm|MTN|Airtel|Safaricom|MoMo|HaloPesa|Tigo|Vodafone)/i);
  if (providerMatch) {
    result.provider = providerMatch[1];
  } else if (lowerAddress.includes('mtn')) {
    result.provider = 'MTN';
  } else if (lowerAddress.includes('airtel')) {
    result.provider = 'Airtel';
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

  // If we couldn't even find an amount or type, it's probably not a financial SMS
  if (result.amount === null && result.transaction_type === 'unknown') {
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
