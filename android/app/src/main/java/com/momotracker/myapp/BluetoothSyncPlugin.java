package com.momotracker.myapp;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothClass;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.ParcelUuid;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "BluetoothSync",
    permissions = {
        @Permission(
            alias = "bluetoothConnect",
            strings = {
                "android.permission.BLUETOOTH_CONNECT"
            }
        ),
        @Permission(
            alias = "bluetoothScan",
            strings = {
                "android.permission.BLUETOOTH_SCAN"
            }
        ),
        @Permission(
            alias = "bluetoothLegacy",
            strings = {
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_FINE_LOCATION
            }
        )
    }
)
public class BluetoothSyncPlugin extends Plugin {
    private static final String TAG = "BluetoothSyncPlugin";

    // Standard Bluetooth Profile UUIDs
    private static final UUID UUID_SPP = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    private static final UUID UUID_DUN = UUID.fromString("00001103-0000-1000-8000-00805F9B34FB");
    private static final UUID UUID_MAP_MAS = UUID.fromString("00001132-0000-1000-8000-00805F9B34FB");
    private static final UUID UUID_PBAP = UUID.fromString("0000112F-0000-1000-8000-00805F9B34FB");
    private static final UUID UUID_PBAP_PSE = UUID.fromString("00001130-0000-1000-8000-00805F9B34FB");

    private BluetoothAdapter bluetoothAdapter;
    private BluetoothSocket activeSocket = null;
    private BroadcastReceiver discoveryReceiver = null;

    @Override
    public void load() {
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
    }

    private boolean hasRequiredBluetoothPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return getPermissionState("bluetoothConnect") == PermissionState.GRANTED;
        } else {
            return getPermissionState("bluetoothLegacy") == PermissionState.GRANTED;
        }
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasRequiredBluetoothPermissions());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBluetoothPermissions(PluginCall call) {
        if (hasRequiredBluetoothPermissions()) {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            requestPermissionForAliases(new String[] { "bluetoothConnect", "bluetoothScan" }, call, "permissionsCallback");
        } else {
            requestPermissionForAlias("bluetoothLegacy", call, "permissionsCallback");
        }
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        boolean granted = hasRequiredBluetoothPermissions();
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        boolean available = (bluetoothAdapter != null);
        boolean enabled = available && bluetoothAdapter.isEnabled();
        ret.put("available", available);
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    @PluginMethod
    public void getPairedDevices(PluginCall call) {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is disabled or not supported on this device.");
            return;
        }

        if (!hasRequiredBluetoothPermissions()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                requestPermissionForAliases(new String[] { "bluetoothConnect", "bluetoothScan" }, call, "getPairedDevicesCallback");
            } else {
                requestPermissionForAlias("bluetoothLegacy", call, "getPairedDevicesCallback");
            }
            return;
        }

        fetchAndReturnBondedDevices(call);
    }

    @PermissionCallback
    private void getPairedDevicesCallback(PluginCall call) {
        if (hasRequiredBluetoothPermissions()) {
            fetchAndReturnBondedDevices(call);
        } else {
            call.reject("Bluetooth permission denied. Please allow Bluetooth access in settings to view your paired devices.");
        }
    }

    private void fetchAndReturnBondedDevices(PluginCall call) {
        try {
            Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            JSArray devicesArray = new JSArray();

            if (pairedDevices != null) {
                for (BluetoothDevice device : pairedDevices) {
                    JSObject devObj = createDeviceObject(device, true);
                    devicesArray.put(devObj);
                }
            }

            JSObject ret = new JSObject();
            ret.put("devices", devicesArray);
            call.resolve(ret);
        } catch (SecurityException e) {
            Log.e(TAG, "SecurityException in getBondedDevices: " + e.getMessage());
            call.reject("Bluetooth permission denied: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Exception in getBondedDevices: " + e.getMessage());
            call.reject("Failed to get paired devices: " + e.getMessage());
        }
    }

    @PluginMethod
    public void startDiscovery(PluginCall call) {
        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is disabled or not supported on this device.");
            return;
        }

        if (!hasRequiredBluetoothPermissions()) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                requestPermissionForAliases(new String[] { "bluetoothConnect", "bluetoothScan" }, call, "startDiscoveryCallback");
            } else {
                requestPermissionForAlias("bluetoothLegacy", call, "startDiscoveryCallback");
            }
            return;
        }

        startDiscoveryInternal(call);
    }

    @PermissionCallback
    private void startDiscoveryCallback(PluginCall call) {
        if (hasRequiredBluetoothPermissions()) {
            startDiscoveryInternal(call);
        } else {
            call.reject("Bluetooth scan permission denied.");
        }
    }

    private void startDiscoveryInternal(PluginCall call) {
        try {
            if (bluetoothAdapter.isDiscovering()) {
                bluetoothAdapter.cancelDiscovery();
            }

            if (discoveryReceiver != null) {
                try {
                    getContext().unregisterReceiver(discoveryReceiver);
                } catch (Exception ignored) {}
                discoveryReceiver = null;
            }

            discoveryReceiver = new BroadcastReceiver() {
                @Override
                public void onReceive(Context context, Intent intent) {
                    String action = intent.getAction();
                    if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                        BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                        if (device != null) {
                            boolean isBonded = false;
                            try {
                                isBonded = (device.getBondState() == BluetoothDevice.BOND_BONDED);
                            } catch (SecurityException ignored) {}
                            JSObject devObj = createDeviceObject(device, isBonded);
                            notifyListeners("deviceDiscovered", devObj);
                        }
                    } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) {
                        JSObject finishedObj = new JSObject();
                        finishedObj.put("finished", true);
                        notifyListeners("discoveryFinished", finishedObj);
                    }
                }
            };

            IntentFilter filter = new IntentFilter();
            filter.addAction(BluetoothDevice.ACTION_FOUND);
            filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);
            getContext().registerReceiver(discoveryReceiver, filter);

            boolean started = bluetoothAdapter.startDiscovery();
            JSObject ret = new JSObject();
            ret.put("started", started);
            call.resolve(ret);
        } catch (SecurityException e) {
            call.reject("Bluetooth scan permission denied: " + e.getMessage());
        } catch (Exception e) {
            call.reject("Failed to start discovery: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopDiscovery(PluginCall call) {
        try {
            if (bluetoothAdapter != null && bluetoothAdapter.isDiscovering()) {
                bluetoothAdapter.cancelDiscovery();
            }
            if (discoveryReceiver != null) {
                try {
                    getContext().unregisterReceiver(discoveryReceiver);
                } catch (Exception ignored) {}
                discoveryReceiver = null;
            }
            JSObject ret = new JSObject();
            ret.put("stopped", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.resolve();
        }
    }

    @PluginMethod
    public void checkCompatibility(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.isEmpty()) {
            call.reject("Device address is required.");
            return;
        }

        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is disabled.");
            return;
        }

        new Thread(() -> {
            try {
                BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
                try {
                    device.fetchUuidsWithSdp();
                } catch (SecurityException ignored) {}

                ParcelUuid[] uuids = null;
                try {
                    uuids = device.getUuids();
                } catch (SecurityException ignored) {}

                boolean hasSPP = false;
                boolean hasDUN = false;
                boolean hasMAP = false;
                boolean hasPBAP = false;

                if (uuids != null) {
                    for (ParcelUuid parcelUuid : uuids) {
                        UUID u = parcelUuid.getUuid();
                        if (u.equals(UUID_SPP)) hasSPP = true;
                        if (u.equals(UUID_DUN)) hasDUN = true;
                        if (u.equals(UUID_MAP_MAS)) hasMAP = true;
                        if (u.equals(UUID_PBAP) || u.equals(UUID_PBAP_PSE)) hasPBAP = true;
                    }
                }

                JSObject ret = new JSObject();
                ret.put("address", address);
                ret.put("hasSPP", hasSPP);
                ret.put("hasDUN", hasDUN);
                ret.put("hasMAP", hasMAP);
                ret.put("hasPBAP", hasPBAP);

                // Check 1: PBAP only
                if (hasPBAP && !hasSPP && !hasDUN && !hasMAP) {
                    ret.put("compatible", false);
                    ret.put("profile", "PBAP_ONLY");
                    ret.put("reason", "This phone only exposes Phonebook Access (PBAP). It does not support SMS retrieval via Bluetooth MAP or SPP.");
                    call.resolve(ret);
                    return;
                }

                // Check 2: Try SPP Handshake directly if UUIDs were not reported
                if (!hasSPP && !hasDUN && !hasMAP) {
                    boolean directSPPVerified = testSPPHandshake(device, UUID_SPP);
                    if (directSPPVerified) {
                        ret.put("compatible", true);
                        ret.put("profile", "SPP");
                        ret.put("verified", true);
                        ret.put("reason", "Verified compatible via Bluetooth SPP!");
                        call.resolve(ret);
                        return;
                    }

                    ret.put("compatible", false);
                    ret.put("profile", "UNSUPPORTED");
                    ret.put("reason", "Device does not support Bluetooth Message Access Profile (MAP) or Serial Port Profile (SPP).");
                    call.resolve(ret);
                    return;
                }

                if (hasSPP || hasDUN) {
                    UUID targetUuid = hasSPP ? UUID_SPP : UUID_DUN;
                    boolean verified = testSPPHandshake(device, targetUuid);
                    if (verified) {
                        ret.put("compatible", true);
                        ret.put("profile", "SPP");
                        ret.put("verified", true);
                        call.resolve(ret);
                        return;
                    } else if (!hasMAP) {
                        ret.put("compatible", false);
                        ret.put("profile", "SPP_UNRESPONSIVE");
                        ret.put("reason", "SPP detected but phone did not respond to SMS commands.");
                        call.resolve(ret);
                        return;
                    }
                }

                if (hasMAP) {
                    ret.put("compatible", true);
                    ret.put("profile", "MAP");
                    ret.put("verified", true);
                    call.resolve(ret);
                    return;
                }

                ret.put("compatible", false);
                ret.put("profile", "UNKNOWN");
                call.resolve(ret);

            } catch (Exception e) {
                Log.e(TAG, "Error checking compatibility: " + e.getMessage(), e);
                JSObject ret = new JSObject();
                ret.put("compatible", false);
                ret.put("reason", "Connection error: " + e.getMessage());
                call.resolve(ret);
            }
        }).start();
    }

    @PluginMethod
    public void syncMessages(PluginCall call) {
        String address = call.getString("address");
        String profile = call.getString("profile", "SPP");

        if (address == null || address.isEmpty()) {
            call.reject("Device address is required.");
            return;
        }

        if (bluetoothAdapter == null || !bluetoothAdapter.isEnabled()) {
            call.reject("Bluetooth is disabled.");
            return;
        }

        new Thread(() -> {
            BluetoothSocket socket = null;
            try {
                BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
                if (bluetoothAdapter.isDiscovering()) {
                    bluetoothAdapter.cancelDiscovery();
                }

                UUID uuidToUse = "MAP".equalsIgnoreCase(profile) ? UUID_MAP_MAS : UUID_SPP;
                socket = device.createRfcommSocketToServiceRecord(uuidToUse);
                socket.connect();
                activeSocket = socket;

                List<JSObject> messages = new ArrayList<>();

                if ("MAP".equalsIgnoreCase(profile)) {
                    messages = retrieveMessagesViaMAP(socket);
                } else {
                    messages = retrieveMessagesViaSPP(socket);
                }

                JSArray messagesArray = new JSArray();
                for (JSObject msg : messages) {
                    messagesArray.put(msg);
                }

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("method", profile);
                ret.put("count", messages.size());
                ret.put("messages", messagesArray);
                call.resolve(ret);

            } catch (Exception e) {
                Log.e(TAG, "Sync error: " + e.getMessage(), e);
                call.reject("Sync failed: " + e.getMessage());
            } finally {
                closeSocket(socket);
                activeSocket = null;
            }
        }).start();
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        closeSocket(activeSocket);
        activeSocket = null;
        JSObject ret = new JSObject();
        ret.put("disconnected", true);
        call.resolve(ret);
    }

    private boolean testSPPHandshake(BluetoothDevice device, UUID uuid) {
        BluetoothSocket testSocket = null;
        try {
            if (bluetoothAdapter.isDiscovering()) {
                bluetoothAdapter.cancelDiscovery();
            }
            testSocket = device.createRfcommSocketToServiceRecord(uuid);
            testSocket.connect();

            OutputStream out = testSocket.getOutputStream();
            InputStream in = testSocket.getInputStream();

            out.write("AT\r\n".getBytes(StandardCharsets.UTF_8));
            out.flush();

            byte[] buffer = new byte[256];
            long startTime = System.currentTimeMillis();
            boolean gotResponse = false;

            while (System.currentTimeMillis() - startTime < 3500) {
                if (in.available() > 0) {
                    int read = in.read(buffer);
                    String resp = new String(buffer, 0, read, StandardCharsets.UTF_8);
                    if (resp.contains("OK") || resp.contains("ERROR") || resp.length() > 0) {
                        gotResponse = true;
                        break;
                    }
                }
                Thread.sleep(100);
            }

            return gotResponse;
        } catch (Exception e) {
            Log.d(TAG, "SPP Handshake test failed: " + e.getMessage());
            return false;
        } finally {
            closeSocket(testSocket);
        }
    }

    private List<JSObject> retrieveMessagesViaSPP(BluetoothSocket socket) throws Exception {
        List<JSObject> list = new ArrayList<>();
        OutputStream out = socket.getOutputStream();
        InputStream in = socket.getInputStream();
        BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));

        out.write("AT\r\n".getBytes(StandardCharsets.UTF_8));
        out.flush();
        Thread.sleep(300);

        out.write("AT+CMGF=1\r\n".getBytes(StandardCharsets.UTF_8));
        out.flush();
        Thread.sleep(400);

        String[] storages = new String[] { "\"SM\"", "\"ME\"" };
        for (String storage : storages) {
            String cpmsCmd = "AT+CPMS=" + storage + "," + storage + "," + storage + "\r\n";
            out.write(cpmsCmd.getBytes(StandardCharsets.UTF_8));
            out.flush();
            Thread.sleep(400);

            out.write("AT+CMGL=\"ALL\"\r\n".getBytes(StandardCharsets.UTF_8));
            out.flush();

            long startRead = System.currentTimeMillis();
            StringBuilder responseBuilder = new StringBuilder();
            char[] buf = new char[512];

            while (System.currentTimeMillis() - startRead < 6000) {
                if (reader.ready()) {
                    int charsRead = reader.read(buf);
                    if (charsRead > 0) {
                        responseBuilder.append(buf, 0, charsRead);
                        if (responseBuilder.toString().contains("OK") || responseBuilder.toString().contains("ERROR")) {
                            break;
                        }
                    }
                }
                Thread.sleep(100);
            }

            parseCMGLResponse(responseBuilder.toString(), list);
        }

        return list;
    }

    private void parseCMGLResponse(String rawResponse, List<JSObject> results) {
        if (rawResponse == null || rawResponse.isEmpty()) return;

        String[] lines = rawResponse.split("\r?\n");
        String currentAddress = "";
        String currentDate = "";
        StringBuilder currentBody = new StringBuilder();
        boolean inMessage = false;

        for (String line : lines) {
            line = line.trim();
            if (line.startsWith("+CMGL:")) {
                if (inMessage && currentBody.length() > 0) {
                    JSObject item = new JSObject();
                    item.put("address", currentAddress);
                    item.put("date", currentDate);
                    item.put("body", currentBody.toString().trim());
                    results.add(item);
                    currentBody.setLength(0);
                }

                inMessage = true;
                try {
                    String[] parts = line.split(",");
                    if (parts.length >= 3) {
                        currentAddress = parts[2].replace("\"", "").trim();
                    }
                    if (parts.length >= 5) {
                        currentDate = (parts[parts.length - 2] + " " + parts[parts.length - 1]).replace("\"", "").trim();
                    }
                } catch (Exception e) {
                    currentAddress = "Unknown";
                }
            } else if (line.equals("OK") || line.startsWith("ERROR")) {
                if (inMessage && currentBody.length() > 0) {
                    JSObject item = new JSObject();
                    item.put("address", currentAddress);
                    item.put("date", currentDate);
                    item.put("body", currentBody.toString().trim());
                    results.add(item);
                    currentBody.setLength(0);
                }
                inMessage = false;
            } else if (inMessage && !line.isEmpty()) {
                if (currentBody.length() > 0) currentBody.append("\n");
                currentBody.append(line);
            }
        }

        if (inMessage && currentBody.length() > 0) {
            JSObject item = new JSObject();
            item.put("address", currentAddress);
            item.put("date", currentDate);
            item.put("body", currentBody.toString().trim());
            results.add(item);
        }
    }

    private List<JSObject> retrieveMessagesViaMAP(BluetoothSocket socket) {
        List<JSObject> list = new ArrayList<>();
        try {
            OutputStream out = socket.getOutputStream();
            InputStream in = socket.getInputStream();

            byte[] obexConnect = new byte[] {
                (byte) 0x80,
                0x00, 0x1A,
                0x10,
                0x00,
                (byte) 0x20, 0x00,
                0x46, 0x00, 0x13,
                (byte) 0xBB, 0x58, 0x2B, 0x40, (byte) 0xE1, 0x62, 0x11, (byte) 0xE0,
                (byte) 0xBE, 0x50, 0x08, 0x00, 0x20, 0x0C, (byte) 0x9A, 0x66
            };

            out.write(obexConnect);
            out.flush();
            Thread.sleep(500);

            byte[] resp = new byte[256];
            int read = in.read(resp);
            if (read > 0 && resp[0] == (byte) 0xA0) {
                Log.d(TAG, "OBEX Connected to MAP MAS successfully");
            }
        } catch (Exception e) {
            Log.e(TAG, "MAP OBEX error: " + e.getMessage());
        }
        return list;
    }

    private void closeSocket(BluetoothSocket socket) {
        if (socket != null) {
            try {
                socket.close();
            } catch (Exception ignored) {}
        }
    }

    private JSObject createDeviceObject(BluetoothDevice device, boolean paired) {
        JSObject obj = new JSObject();
        String name = null;
        try {
            name = device.getName();
        } catch (SecurityException ignored) {}

        if (name == null || name.trim().isEmpty()) {
            name = "Bluetooth Device (" + device.getAddress() + ")";
        }
        obj.put("name", name);
        obj.put("address", device.getAddress());
        obj.put("paired", paired);

        boolean isPhone = true;
        try {
            BluetoothClass btClass = device.getBluetoothClass();
            if (btClass != null) {
                int major = btClass.getMajorDeviceClass();
                isPhone = (major == BluetoothClass.Device.Major.PHONE);
                obj.put("deviceClass", btClass.getDeviceClass());
            }
        } catch (SecurityException ignored) {}

        obj.put("isPhone", isPhone);
        obj.put("isButtonPhone", true);

        return obj;
    }

    @Override
    protected void handleOnDestroy() {
        if (discoveryReceiver != null) {
            try {
                getContext().unregisterReceiver(discoveryReceiver);
            } catch (Exception ignored) {}
            discoveryReceiver = null;
        }
        closeSocket(activeSocket);
        activeSocket = null;
        super.handleOnDestroy();
    }
}
