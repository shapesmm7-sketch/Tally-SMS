package com.momotracker.myapp;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONArray;

@CapacitorPlugin(
    name = "SMSDetection",
    permissions = {
        @Permission(
            alias = "sms",
            strings = {Manifest.permission.READ_SMS, Manifest.permission.RECEIVE_SMS}
        )
    }
)
public class SMSDetectionPlugin extends Plugin {
    private static final String TAG = "SMSDetectionPlugin";

    @PluginMethod
    public void getPendingSMS(PluginCall call) {
        try {
            SharedPreferences prefs = getContext().getSharedPreferences("MoMoDetector", Context.MODE_PRIVATE);
            String data = prefs.getString("pending_sms", "[]");
            
            JSObject ret = new JSObject();
            ret.put("messages", new JSONArray(data));
            
            // Clear once retrieved to prevent duplicates
            prefs.edit().putString("pending_sms", "[]").apply();
            
            Log.d(TAG, "Sent pending SMS to JS: " + data);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error in getPendingSMS: " + e.getMessage());
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void isBatteryOptimizationDisabled(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            boolean isIgnoring = pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
            JSObject ret = new JSObject();
            ret.put("disabled", isIgnoring);
            call.resolve(ret);
        } else {
            JSObject ret = new JSObject();
            ret.put("disabled", true);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void checkSmsPermissionNative(PluginCall call) {
        boolean granted = ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_SMS) == PackageManager.PERMISSION_GRANTED &&
                          ContextCompat.checkSelfPermission(getContext(), Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void openBatteryOptimizationSettings(PluginCall call) {
        try {
            Intent intent = new Intent();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                if (getActivity() != null) {
                    getActivity().startActivity(intent);
                } else {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    getContext().startActivity(intent);
                }
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Could not open settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Log.d(TAG, "Opening application settings for package: " + getContext().getPackageName());
            if (getActivity() != null) {
                getActivity().runOnUiThread(() -> {
                    try {
                        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                        Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
                        intent.setData(uri);
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        getContext().startActivity(intent);
                        call.resolve();
                    } catch (Exception e) {
                        call.reject("Could not open app settings: " + e.getMessage());
                    }
                });
            } else {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
                intent.setData(uri);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error opening app settings: " + e.getMessage());
            call.reject("Could not open app settings: " + e.getMessage());
        }
    }
}
