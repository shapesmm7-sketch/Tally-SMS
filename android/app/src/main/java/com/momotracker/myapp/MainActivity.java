package com.momotracker.myapp;

import android.os.Bundle;
import android.content.Intent;
import android.content.SharedPreferences;
import android.app.AlertDialog;
import com.getcapacitor.BridgeActivity;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.UpdateAvailability;
import com.google.android.gms.tasks.Task;

public class MainActivity extends BridgeActivity {
    private static final int UPDATE_REQUEST_CODE = 999;
    private AppUpdateManager appUpdateManager;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SMSDetectionPlugin.class);
        registerPlugin(MediaStorePlugin.class);
        super.onCreate(savedInstanceState);

        appUpdateManager = AppUpdateManagerFactory.create(this);
        checkForUpdates();
    }

    private void checkForUpdates() {
        try {
            SharedPreferences prefs = getSharedPreferences("AppUpdatePrefs", MODE_PRIVATE);
            long lastCheckTime = prefs.getLong("last_check_time", 0);
            long currentTime = System.currentTimeMillis();
            long sixHoursInMillis = 6 * 60 * 60 * 1000;

            if (currentTime - lastCheckTime < sixHoursInMillis) {
                return;
            }

            Task<AppUpdateInfo> appUpdateInfoTask = appUpdateManager.getAppUpdateInfo();
            appUpdateInfoTask.addOnSuccessListener(appUpdateInfo -> {
                if (appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE
                        && appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)) {
                    
                    showUpdateDialog(appUpdateInfo);
                    // Update the last check time when an update is detected or checked
                    prefs.edit().putLong("last_check_time", currentTime).apply();
                } else {
                    // Update check time even if no update is available to respect the 6-hour interval
                    prefs.edit().putLong("last_check_time", currentTime).apply();
                }
            }).addOnFailureListener(e -> {
                // Silently fail if something goes wrong (e.g. no internet)
                e.printStackTrace();
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void showUpdateDialog(AppUpdateInfo appUpdateInfo) {
        try {
            new AlertDialog.Builder(this)
                .setTitle("Update Available")
                .setMessage("A new version of this app is available. Please update to continue.")
                .setPositiveButton("Update", (dialog, which) -> {
                    startUpdate(appUpdateInfo);
                })
                .setCancelable(false)
                .show();
        } catch (Exception e) {
            e.printStackTrace();
            // Fallback: try starting the update directly if dialog fails
            startUpdate(appUpdateInfo);
        }
    }

    private void startUpdate(AppUpdateInfo appUpdateInfo) {
        try {
            appUpdateManager.startUpdateFlowForResult(
                appUpdateInfo,
                AppUpdateType.IMMEDIATE,
                this,
                UPDATE_REQUEST_CODE);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (appUpdateManager != null) {
            appUpdateManager.getAppUpdateInfo().addOnSuccessListener(appUpdateInfo -> {
                if (appUpdateInfo.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS) {
                    try {
                        appUpdateManager.startUpdateFlowForResult(
                            appUpdateInfo,
                            AppUpdateType.IMMEDIATE,
                            this,
                            UPDATE_REQUEST_CODE);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == UPDATE_REQUEST_CODE) {
            if (resultCode != RESULT_OK) {
                // If the update is cancelled or fails, we might want to check again next time or log it
                // For immediate update, Play Store usually handles the blocking UI
            }
        }
    }
}
