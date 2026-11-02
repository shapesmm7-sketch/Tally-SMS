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
    public static final UUID UUID_SPP = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    public static final UUID UUID_DUN = UUID.fromString("00001103-0000-1000-8000-00805F9B34FB");
    public static final UUID UUID_MAP_MAS = UUID.fromString("00001132-0000-1000-8000-00805F9B34FB");
    public static final UUID UUID_PBAP = UUID.fromString("0000112F-0000-1000-8000-00805F9B34FB");
    public static final UUID UUID_PBAP_PSE = UUID.fromString("00001130-0000-1000-8000-00805F9B34FB");

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
            call.reject("Bluetooth permission denied. Please allow Bluetooth permission to view paired devices.");
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

    /**
     * Performs separate detection and testing for MAP and SPP:
     * - Checks MAP separately and tests OBEX connect if present.
     * - Checks SPP separately and tests AT SMS commands (AT+CMGF, AT+CPMS) if present.
     * - Returns accurate diagnostic status without assuming SPP = SMS.
     */
    @PluginMethod
    public void diagnoseDevice(PluginCall call) {
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

                boolean hasMAPUuid = false;
                boolean hasSPPUuid = false;
                boolean hasDUNUuid = false;
                boolean hasPBAPUuid = false;

                if (uuids != null) {
                    for (ParcelUuid parcelUuid : uuids) {
                        UUID u = parcelUuid.getUuid();
                        if (u.equals(UUID_MAP_MAS)) hasMAPUuid = true;
                        if (u.equals(UUID_SPP)) hasSPPUuid = true;
                        if (u.equals(UUID_DUN)) hasDUNUuid = true;
                        if (u.equals(UUID_PBAP) || u.equals(UUID_PBAP_PSE)) hasPBAPUuid = true;
                    }
                }

                boolean mapTestedSuccess = false;
                boolean sppTestedSuccess = false;
                boolean sppSerialOnly = false;

                // 1. Test MAP if advertised
                if (hasMAPUuid) {
                    mapTestedSuccess = testMAPHandshake(device);
                }

                // 2. Test SPP/DUN if advertised OR if UUIDs were null (un-cached SDP)
                if (hasSPPUuid || hasDUNUuid || uuids == null || uuids.length == 0) {
                    UUID targetUuid = hasDUNUuid && !hasSPPUuid ? UUID_DUN : UUID_SPP;
                    int sppResult = testSPPSmsCommands(device, targetUuid);
                    if (sppResult == 1) { // 1 = SMS AT commands supported
                        sppTestedSuccess = true;
                    } else if (sppResult == 2) { // 2 = Serial connects but does NOT support SMS commands
                        sppSerialOnly = true;
                    }
                }

                // Determine final diagnostic status
                String diagnosticStatus;
                String diagnosticMessage;
                String preferredMethod = null;

                if (mapTestedSuccess) {
                    diagnosticStatus = "MAP_SUPPORTED";
                    diagnosticMessage = "MAP detected and tested. Phone supports Bluetooth Message Access Profile.";
                    preferredMethod = "MAP";
                } else if (sppTestedSuccess) {
                    diagnosticStatus = "SPP_SUPPORTED";
                    diagnosticMessage = "SPP detected and tested. Phone modem supports SMS-reading AT commands.";
                    preferredMethod = "SPP";
                } else if (sppSerialOnly) {
                    diagnosticStatus = "UNSUPPORTED";
                    diagnosticMessage = "Bluetooth available but SMS retrieval unsupported. Device provides a serial port but does not support SMS-reading commands.";
                } else if (hasPBAPUuid && !hasMAPUuid && !hasSPPUuid) {
                    diagnosticStatus = "UNSUPPORTED";
                    diagnosticMessage = "Bluetooth available but SMS retrieval unsupported. Device only supports Phonebook Access (PBAP), which does not allow SMS access.";
                } else if (hasMAPUuid || hasSPPUuid) {
                    diagnosticStatus = "UNSUPPORTED";
                    diagnosticMessage = "Bluetooth available but SMS retrieval unsupported. Device did not respond to SMS retrieval requests.";
                } else {
                    diagnosticStatus = "UNDETERMINED";
                    diagnosticMessage = "Compatibility could not be determined. Device did not expose supported SMS profiles.";
                }

                JSObject ret = new JSObject();
                ret.put("address", address);
                ret.put("diagnosticStatus", diagnosticStatus);
                ret.put("diagnosticMessage", diagnosticMessage);
                ret.put("mapSupported", mapTestedSuccess);
                ret.put("sppSupported", sppTestedSuccess);
                ret.put("sppSerialOnly", sppSerialOnly);
                ret.put("pbapOnly", hasPBAPUuid && !hasMAPUuid && !hasSPPUuid);
                ret.put("preferredMethod", preferredMethod);
                ret.put("isCompatible", (mapTestedSuccess || sppTestedSuccess));

                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "Diagnostics error: " + e.getMessage(), e);
                JSObject ret = new JSObject();
                ret.put("address", address);
                ret.put("diagnosticStatus", "UNDETERMINED");
                ret.put("diagnosticMessage", "Compatibility could not be determined: " + e.getMessage());
                ret.put("isCompatible", false);
                call.resolve(ret);
            }
        }).start();
    }

    /**
     * Tests MAP OBEX Connect
     */
    private boolean testMAPHandshake(BluetoothDevice device) {
        BluetoothSocket socket = null;
        try {
            if (bluetoothAdapter.isDiscovering()) {
                bluetoothAdapter.cancelDiscovery();
            }
            socket = device.createRfcommSocketToServiceRecord(UUID_MAP_MAS);
            socket.connect();

            OutputStream out = socket.getOutputStream();
            InputStream in = socket.getInputStream();

            // OBEX Connect with MAP MAS Target (UUID bb582b40-e162-11e0-be50-0800200c9a66)
            byte[] obexConnect = new byte[] {
                (byte) 0x80, 0x00, 0x1A, 0x10, 0x00, (byte) 0x20, 0x00,
                0x46, 0x00, 0x13,
                (byte) 0xBB, 0x58, 0x2B, 0x40, (byte) 0xE1, 0x62, 0x11, (byte) 0xE0,
                (byte) 0xBE, 0x50, 0x08, 0x00, 0x20, 0x0C, (byte) 0x9A, 0x66
            };

            out.write(obexConnect);
            out.flush();

            byte[] resp = new byte[128];
            long start = System.currentTimeMillis();
            while (System.currentTimeMillis() - start < 3000) {
                if (in.available() > 0) {
                    int read = in.read(resp);
                    if (read > 0 && (resp[0] & 0xFF) == 0xA0) { // 0xA0 = OBEX Success
                        return true;
                    }
                }
                Thread.sleep(100);
            }
            return false;
        } catch (Exception e) {
            Log.d(TAG, "MAP Handshake test failed: " + e.getMessage());
            return false;
        } finally {
            closeSocket(socket);
        }
    }

    /**
     * Tests SPP RFCOMM connection and verifies SMS-reading AT commands:
     * Returns:
     *  0: Could not connect to SPP at all
     *  1: Connected AND verified SMS commands (AT+CMGF, AT+CPMS)
     *  2: Connected over SPP, but does NOT support SMS commands
     */
    private int testSPPSmsCommands(BluetoothDevice device, UUID targetUuid) {
        BluetoothSocket socket = null;
        try {
            if (bluetoothAdapter.isDiscovering()) {
                bluetoothAdapter.cancelDiscovery();
            }
            socket = device.createRfcommSocketToServiceRecord(targetUuid);
            socket.connect();

            OutputStream out = socket.getOutputStream();
            InputStream in = socket.getInputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));

            // Test 1: Basic AT ping
            out.write("AT\r\n".getBytes(StandardCharsets.UTF_8));
            out.flush();

            boolean respondedToAt = false;
            long start = System.currentTimeMillis();
            while (System.currentTimeMillis() - start < 2500) {
                if (in.available() > 0) {
                    respondedToAt = true;
                    break;
                }
                Thread.sleep(100);
            }

            if (!respondedToAt) {
                return 0; // Not a responding serial port
            }

            // Flush buffer
            while (in.available() > 0) in.read();

            // Test 2: Test SMS mode command (AT+CMGF=1)
            out.write("AT+CMGF=1\r\n".getBytes(StandardCharsets.UTF_8));
            out.flush();

            StringBuilder cmgfResp = new StringBuilder();
            start = System.currentTimeMillis();
            while (System.currentTimeMillis() - start < 3000) {
                if (reader.ready()) {
                    char[] cbuf = new char[128];
                    int r = reader.read(cbuf);
                    if (r > 0) {
                        cmgfResp.append(cbuf, 0, r);
                        if (cmgfResp.toString().contains("OK") || cmgfResp.toString().contains("ERROR")) {
                            break;
                        }
                    }
                }
                Thread.sleep(100);
            }

            boolean supportsCmgf = cmgfResp.toString().contains("OK");

            // Test 3: Test storage command (AT+CPMS=?)
            out.write("AT+CPMS=?\r\n".getBytes(StandardCharsets.UTF_8));
            out.flush();

            StringBuilder cpmsResp = new StringBuilder();
            start = System.currentTimeMillis();
            while (System.currentTimeMillis() - start < 3000) {
                if (reader.ready()) {
                    char[] cbuf = new char[128];
                    int r = reader.read(cbuf);
                    if (r > 0) {
                        cpmsResp.append(cbuf, 0, r);
                        if (cpmsResp.toString().contains("OK") || cpmsResp.toString().contains("ERROR")) {
                            break;
                        }
                    }
                }
                Thread.sleep(100);
            }

            boolean supportsCpms = cpmsResp.toString().contains("OK") || cpmsResp.toString().contains("+CPMS:");

            if (supportsCmgf || supportsCpms) {
                return 1; // Supported SMS AT commands!
            } else {
                return 2; // SPP serial port exists, but SMS commands are not supported
            }

        } catch (Exception e) {
            Log.d(TAG, "SPP SMS test failed: " + e.getMessage());
            return 0;
        } finally {
            closeSocket(socket);
        }
    }

    @PluginMethod
    public void syncMessages(PluginCall call) {
        String address = call.getString("address");
        String method = call.getString("method", "SPP");

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

                UUID uuidToUse = "MAP".equalsIgnoreCase(method) ? UUID_MAP_MAS : UUID_SPP;
                socket = device.createRfcommSocketToServiceRecord(uuidToUse);
                socket.connect();
                activeSocket = socket;

                List<JSObject> messages = new ArrayList<>();

                if ("MAP".equalsIgnoreCase(method)) {
                    messages = retrieveMessagesViaMAP(socket);
                } else {
                    messages = retrieveMessagesViaSPP(socket);
                }

                // If 0 messages retrieved, report failure
                if (messages == null || messages.isEmpty()) {
                    JSObject ret = new JSObject();
                    ret.put("success", false);
                    ret.put("count", 0);
                    ret.put("method", method);
                    ret.put("error", "No SMS messages could be retrieved from the device.");
                    call.resolve(ret);
                    return;
                }

                JSArray messagesArray = new JSArray();
                for (JSObject msg : messages) {
                    messagesArray.put(msg);
                }

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("method", method);
                ret.put("count", messages.size());
                ret.put("messages", messagesArray);
                call.resolve(ret);

            } catch (Exception e) {
                Log.e(TAG, "Sync error: " + e.getMessage(), e);
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("count", 0);
                ret.put("error", "Sync connection failed: " + e.getMessage());
                call.resolve(ret);
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

            while (System.currentTimeMillis() - startRead < 7000) {
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
                (byte) 0x80, 0x00, 0x1A, 0x10, 0x00, (byte) 0x20, 0x00,
                0x46, 0x00, 0x13,
                (byte) 0xBB, 0x58, 0x2B, 0x40, (byte) 0xE1, 0x62, 0x11, (byte) 0xE0,
                (byte) 0xBE, 0x50, 0x08, 0x00, 0x20, 0x0C, (byte) 0x9A, 0x66
            };

            out.write(obexConnect);
            out.flush();
            Thread.sleep(500);

            byte[] resp = new byte[256];
            int read = in.read(resp);
            if (read > 0 && (resp[0] & 0xFF) == 0xA0) {
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

        String deviceTypeStr = "Bluetooth Device";
        try {
            BluetoothClass btClass = device.getBluetoothClass();
            if (btClass != null) {
                int major = btClass.getMajorDeviceClass();
                if (major == BluetoothClass.Device.Major.PHONE) {
                    deviceTypeStr = "Phone";
                } else if (major == BluetoothClass.Device.Major.AUDIO_VIDEO) {
                    deviceTypeStr = "Audio Device";
                } else if (major == BluetoothClass.Device.Major.COMPUTER) {
                    deviceTypeStr = "Computer";
                }
                obj.put("deviceClass", btClass.getDeviceClass());
            }
        } catch (SecurityException ignored) {}

        obj.put("deviceType", deviceTypeStr);
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
