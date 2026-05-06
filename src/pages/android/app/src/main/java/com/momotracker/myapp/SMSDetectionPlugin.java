package com.momotracker.myapp;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "SMSDetection",
    permissions = {
        @Permission(
            alias = "sms",
            strings = {
                Manifest.permission.READ_SMS,
                Manifest.permission.RECEIVE_SMS
            }
        )
    }
)
public class SMSDetectionPlugin extends Plugin {

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsCallback");
        } else {
            JSObject result = new JSObject();
            result.put("sms", "granted");
            call.resolve(result);
        }
    }

    @PermissionCallback
    private void smsCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("sms", getPermissionState("sms").toString());
        call.resolve(result);
    }

    @PluginMethod
    public void checkSmsPermissionNative(PluginCall call) {
        JSObject res = new JSObject();
        res.put("granted", getPermissionState("sms") == PermissionState.GRANTED);
        call.resolve(res);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
        intent.setData(uri);
        getContext().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void getPendingSMS(PluginCall call) {
        // Fallback for getting messages if cordova plugin fails
        call.unimplemented("Not implemented in native helper");
    }
}
