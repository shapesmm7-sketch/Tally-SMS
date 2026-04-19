package com.momotracker.myapp;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

public class SMSReceiver extends BroadcastReceiver {
    private static final String TAG = "MoMoSMSReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent.getAction().equals("android.provider.Telephony.SMS_RECEIVED")) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                Object[] pdus = (Object[]) bundle.get("pdus");
                if (pdus != null) {
                    for (Object pdu : pdus) {
                        try {
                            SmsMessage smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                            String sender = smsMessage.getDisplayOriginatingAddress();
                            String messageBody = smsMessage.getDisplayMessageBody();
                            
                            Log.d(TAG, "SMS Received from: " + sender + " Body: " + messageBody);

                            if (isMoMoMessage(messageBody)) {
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

    private boolean isMoMoMessage(String body) {
        if (body == null) return false;
        String lowerBody = body.toLowerCase();
        
        // Comprehensive list of keywords used in Mobile Money transactions globally
        String[] keywords = {
            "received", "sent", "withdrawn", "withdraw", "airtime", "deposit", 
            "payment", "paid", "confirmed", "transfer", "credited", "debited", 
            "recharged", "cash", "transid", "txn:", "ref:", "balance", "float",
            "ugx", "kes", "ghs", "rwf", "tzs", "zar", "ngn", "xof", "xaf", 
            "mzn", "bwp", "zmw", "eur", "usd", "gbp", "etb", "ssp", "mad", 
            "tnd", "egp", "mtn", "airtel", "mpesa", "orange", "vodafone", "tigo"
        };
        
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
