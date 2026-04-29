package com.momotracker.myapp;

import android.Manifest;
import android.content.Intent;
import android.util.Log;

import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "OCRScanner",
    permissions = {
        @Permission(
            alias = "camera",
            strings = {Manifest.permission.CAMERA}
        )
    }
)
public class OCRScannerPlugin extends Plugin {
    private static final String TAG = "OCRScannerPlugin";

    @PluginMethod
    public void getPendingOCR(PluginCall call) {
        try {
            android.content.SharedPreferences prefs = getContext().getSharedPreferences("MoMoDetector", android.content.Context.MODE_PRIVATE);
            String data = prefs.getString("pending_ocr", "[]");
            
            JSObject ret = new JSObject();
            ret.put("messages", new org.json.JSONArray(data));
            
            // Clear once retrieved
            prefs.edit().putString("pending_ocr", "[]").apply();
            
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    @PluginMethod
    public void startScan(PluginCall call) {
        if (getPermissionState("camera") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("camera", call, "cameraPermCallback");
        } else {
            openScanner(call);
        }
    }

    @PermissionCallback
    private void cameraPermCallback(PluginCall call) {
        if (getPermissionState("camera") == com.getcapacitor.PermissionState.GRANTED) {
            openScanner(call);
        } else {
            call.reject("Camera permission is required");
        }
    }

    private void openScanner(PluginCall call) {
        saveCall(call);
        Intent intent = new Intent(getContext(), OCRScannerActivity.class);
        startActivityForResult(call, intent, "scanResultCallback");
    }

    @ActivityCallback
    private void scanResultCallback(PluginCall call, ActivityResult result) {
        // This is called when the activity closes. 
        // Real-time results are sent via notifyListeners, 
        // but we can return a final status here.
        JSObject ret = new JSObject();
        ret.put("completed", true);
        call.resolve(ret);
    }
    
    // Helper to send events to webview
    public void notifyOcrResult(String text) {
        JSObject ret = new JSObject();
        ret.put("text", text);
        notifyListeners("ocrResult", ret);
    }
}
