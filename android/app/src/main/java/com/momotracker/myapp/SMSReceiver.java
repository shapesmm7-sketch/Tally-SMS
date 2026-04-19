package com.momotracker.myapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

public class SMSReceiver extends BroadcastReceiver {
    private static final String TAG = "MoMoSMSReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if ("android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                Object[] pdus = (Object[]) bundle.get("pdus");
                String format = bundle.getString("format");
                if (pdus != null) {
                    for (Object pdu : pdus) {
                        try {
                            SmsMessage smsMessage;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                smsMessage = SmsMessage.createFromPdu((byte[]) pdu, format);
                            } else {
                                smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                            }
                            
                            String sender = smsMessage.getDisplayOriginatingAddress();
                            String messageBody = smsMessage.getDisplayMessageBody();
                            
                            Log.d(TAG, "SMS Received from: " + sender);

                            if (isMoMoMessage(messageBody, sender)) {
                                saveMessageToPending(context, sender, messageBody);
                            }
                        } catch (Exception e) {
                            Log.e(TAG, "Error parsing SMS: " + e.getMessage());
                        }
                    }
                }
            }
        }
    }

    private boolean isMoMoMessage(String body, String sender) {
        if (body == null) return false;
        String lowerBody = body.toLowerCase();
        String lowerSender = (sender != null) ? sender.toLowerCase() : "";
        
        // Comprehensive list of keywords used in Mobile Money transactions globally
        String[] keywords = {
            "received", "sent", "withdrawn", "withdraw", "airtime", "deposit", 
            "payment", "paid", "confirmed", "transfer", "credited", "debited", 
            "recharged", "cash", "transid", "txn:", "ref:", "balance", "float",
            "ugx", "kes", "ghs", "rwf", "tzs", "zar", "ngn", "xof", "xaf", 
            "mzn", "bwp", "zmw", "eur", "usd", "gbp", "etb", "ssp", "mad", 
            "tnd", "egp", "mtn", "airtel", "mpesa", "orange", "vodafone", "tigo",
            "m-pesa", "momo", "halopesa", "ecocash", "telecash", "mukuru"
        };
        
        // If sender is a known MoMo shortcode or contains MoMo keywords
        if (lowerSender.contains("momo") || 
            lowerSender.contains("mpesa") || 
            lowerSender.contains("airtel") || 
            lowerSender.contains("mtn") ||
            lowerSender.contains("money") ||
            lowerSender.contains("payment") ||
            lowerSender.equals("150") || // Common USSD/SMS shortcode
            lowerSender.equals("164") ||
            lowerSender.equals("160")) {
            return true;
        }

        for (String keyword : keywords) {
            if (lowerBody.contains(keyword)) {
                return true;
            }
        }
        
        return false;
    }

    private void saveMessageToPending(Context context, String sender, String body) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("MoMoDetector", Context.MODE_PRIVATE);
            String existingData = prefs.getString("pending_sms", "[]");
            JSONArray array = new JSONArray(existingData);
            
            JSONObject obj = new JSONObject();
            obj.put("sender", sender);
            obj.put("body", body);
            obj.put("timestamp", System.currentTimeMillis());
            
            array.put(obj);
            
            prefs.edit().putString("pending_sms", array.toString()).apply();
            Log.d(TAG, "Saved MoMo message to queue. Queue size: " + array.length());
        } catch (Exception e) {
            Log.e(TAG, "Error saving message to queue: " + e.getMessage());
        }
    }
}
