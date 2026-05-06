package com.momotracker.myapp;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.provider.Settings;
import com.getcapacitor.JSObject;
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
    public void checkSmsPermissionNative(PluginCall call) {
        boolean hasPermission = getPermissionState("sms") == com.getcapacitor.PermissionState.GRANTED;
        JSObject ret = new JSObject();
        ret.put("granted", hasPermission);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (getPermissionState("sms") == com.getcapacitor.PermissionState.GRANTED) {
            JSObject ret = new JSObject();
            ret.put("sms", "granted");
            call.resolve(ret);
        } else {
            requestPermissionForAlias("sms", call, "permissionsCallback");
        }
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        JSObject ret = new JSObject();
        if (getPermissionState("sms") == com.getcapacitor.PermissionState.GRANTED) {
            ret.put("sms", "granted");
        } else {
            ret.put("sms", "denied");
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
        intent.setData(uri);
        getContext().startActivity(intent);
        call.resolve();
    }
}
