package com.kumbhathon.findmyfamily;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.le.AdvertiseCallback;
import android.bluetooth.le.AdvertiseData;
import android.bluetooth.le.AdvertiseSettings;
import android.bluetooth.le.BluetoothLeAdvertiser;
import android.bluetooth.le.BluetoothLeScanner;
import android.bluetooth.le.ScanCallback;
import android.bluetooth.le.ScanFilter;
import android.bluetooth.le.ScanRecord;
import android.bluetooth.le.ScanResult;
import android.bluetooth.le.ScanSettings;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.ParcelUuid;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import android.telephony.SmsManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "NativeSync",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH_SCAN,
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_ADVERTISE
            }
        ),
        @Permission(
            alias = "sms",
            strings = {
                Manifest.permission.SEND_SMS,
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.READ_SMS
            }
        )
    }
)
public class NativeSyncPlugin extends Plugin {
    private BroadcastReceiver smsReceiver = null;

    // BLE state
    private static final String FMF_BLE_UUID_PREFIX = "0000FMF0-0000-1000-8000-";
    private BluetoothLeAdvertiser bleAdvertiser = null;
    private BluetoothLeScanner bleScanner = null;
    private AdvertiseCallback advertiseCallback = null;
    private ScanCallback scanCallback = null;
    private Set<String> targetBleIds = new HashSet<>();

    @Override
    public void load() {
        super.load();
        registerSmsReceiver();
    }

    private void registerSmsReceiver() {
        if (smsReceiver != null) return;
        
        smsReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
                    for (SmsMessage smsMessage : Telephony.Sms.Intents.getMessagesFromIntent(intent)) {
                        String messageBody = smsMessage.getMessageBody();
                        String sender = smsMessage.getOriginatingAddress();
                        
                        if (messageBody != null && (messageBody.startsWith("FMF_LOC:") || messageBody.startsWith("FMF_LOST:"))) {
                            JSObject data = new JSObject();
                            data.put("from", sender);
                            data.put("body", messageBody);
                            notifyListeners("smsReceived", data);
                        }
                    }
                }
            }
        };

        IntentFilter filter = new IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION);
        if (Build.VERSION.SDK_INT >= 33) {
            getContext().registerReceiver(smsReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            getContext().registerReceiver(smsReceiver, filter);
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (smsReceiver != null) {
            try {
                getContext().unregisterReceiver(smsReceiver);
            } catch (Exception e) {
                // ignore
            }
            smsReceiver = null;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void requestBluetoothPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31) {
            requestPermissionForAlias("bluetooth", call, "bluetoothCallback");
        } else {
            // Under API 31, these permissions are granted at install time
            JSObject res = new JSObject();
            res.put("bluetooth", "granted");
            call.resolve(res);
        }
    }

    @PermissionCallback
    private void bluetoothCallback(PluginCall call) {
        JSObject res = new JSObject();
        res.put("bluetooth", getPermissionState("bluetooth").toString());
        call.resolve(res);
    }

    @PluginMethod
    public void requestSmsPermissions(PluginCall call) {
        requestPermissionForAlias("sms", call, "smsCallback");
    }

    @PermissionCallback
    private void smsCallback(PluginCall call) {
        JSObject res = new JSObject();
        res.put("sms", getPermissionState("sms").toString());
        call.resolve(res);
    }

    @PluginMethod
    public void checkAllPermissions(PluginCall call) {
        JSObject res = new JSObject();
        res.put("bluetooth", getPermissionState("bluetooth").toString());
        res.put("sms", getPermissionState("sms").toString());
        call.resolve(res);
    }

    @PluginMethod
    public void sendSMS(PluginCall call) {
        String phoneNumber = call.getString("phoneNumber");
        String message = call.getString("message");

        if (phoneNumber == null || phoneNumber.isEmpty()) {
            call.reject("phoneNumber is required");
            return;
        }
        if (message == null || message.isEmpty()) {
            call.reject("message is required");
            return;
        }

        try {
            SmsManager smsManager;
            if (Build.VERSION.SDK_INT >= 31) {
                smsManager = getContext().getSystemService(SmsManager.class);
            } else {
                smsManager = SmsManager.getDefault();
            }
            
            ArrayList<String> parts = smsManager.divideMessage(message);
            if (parts.size() > 1) {
                smsManager.sendMultipartTextMessage(phoneNumber, null, parts, null, null);
            } else {
                smsManager.sendTextMessage(phoneNumber, null, message, null, null);
            }
            
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed to send SMS: " + e.getMessage());
        }
    }

    // ─── BLE Proximity Methods ────────────────────────────────────────────────

    /**
     * Advertise this device as a BLE beacon using a custom FMF UUID derived
     * from the deviceId. Other FindMyFamily devices scan for this UUID to find us.
     */
    @PluginMethod
    public void startBleAdvertise(PluginCall call) {
        if (Build.VERSION.SDK_INT < 21) {
            call.reject("BLE advertising requires Android 5.0+");
            return;
        }
        try {
            String deviceId = call.getString("deviceId", "");
            // Derive a deterministic UUID from the deviceId (pad to 12 hex chars)
            String idHex = String.format("%-12s", deviceId.replaceAll("[^a-zA-Z0-9]", "")).replace(' ', '0');
            String uuidStr = FMF_BLE_UUID_PREFIX + idHex;
            UUID serviceUuid = UUID.fromString(uuidStr);

            BluetoothManager bm = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
            BluetoothAdapter adapter = bm.getAdapter();
            bleAdvertiser = adapter.getBluetoothLeAdvertiser();

            AdvertiseSettings settings = new AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_BALANCED)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM)
                .setConnectable(false)
                .build();

            AdvertiseData data = new AdvertiseData.Builder()
                .addServiceUuid(new ParcelUuid(serviceUuid))
                .setIncludeDeviceName(false)
                .build();

            advertiseCallback = new AdvertiseCallback() {
                @Override public void onStartSuccess(AdvertiseSettings settingsInEffect) {}
                @Override public void onStartFailure(int errorCode) {
                    notifyListeners("bleAdvertiseError", new JSObject().put("code", errorCode));
                }
            };

            bleAdvertiser.startAdvertising(settings, data, advertiseCallback);

            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed to start BLE advertising: " + e.getMessage());
        }
    }

    /**
     * Scan for BLE beacons from the given targetDeviceIds.
     * Fires "bleDeviceFound" listener event with { deviceId, rssi } for each match.
     */
    @PluginMethod
    public void startBleScan(PluginCall call) {
        if (Build.VERSION.SDK_INT < 21) {
            call.reject("BLE scanning requires Android 5.0+");
            return;
        }
        try {
            JSArray ids = call.getArray("targetDeviceIds");
            targetBleIds.clear();
            for (int i = 0; i < ids.length(); i++) {
                String rawId = ids.getString(i).replaceAll("[^a-zA-Z0-9]", "");
                String idHex = String.format("%-12s", rawId).replace(' ', '0');
                targetBleIds.add(idHex);
            }

            BluetoothManager bm = (BluetoothManager) getContext().getSystemService(Context.BLUETOOTH_SERVICE);
            bleScanner = bm.getAdapter().getBluetoothLeScanner();

            ScanSettings scanSettings = new ScanSettings.Builder()
                .setScanMode(ScanSettings.SCAN_MODE_BALANCED)
                .build();

            scanCallback = new ScanCallback() {
                @Override
                public void onScanResult(int callbackType, ScanResult result) {
                    ScanRecord record = result.getScanRecord();
                    if (record == null) return;
                    List<ParcelUuid> uuids = record.getServiceUuids();
                    if (uuids == null) return;

                    for (ParcelUuid puuid : uuids) {
                        String uuidStr = puuid.getUuid().toString();
                        if (!uuidStr.startsWith("0000fmf0") && !uuidStr.startsWith("0000FMF0")) continue;

                        // Extract the deviceId hex suffix
                        String suffix = uuidStr.substring(uuidStr.lastIndexOf('-') + 1).toLowerCase();
                        if (!targetBleIds.contains(suffix)) continue;

                        // Reconstruct a readable deviceId prefix (best-effort)
                        String matchedId = suffix;
                        for (String tid : targetBleIds) {
                            if (tid.equals(suffix)) { matchedId = tid; break; }
                        }

                        JSObject event = new JSObject();
                        event.put("deviceId", matchedId);
                        event.put("rssi", result.getRssi());
                        notifyListeners("bleDeviceFound", event);
                    }
                }

                @Override
                public void onScanFailed(int errorCode) {
                    notifyListeners("bleAdvertiseError", new JSObject().put("code", errorCode));
                }
            };

            bleScanner.startScan(null, scanSettings, scanCallback);

            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed to start BLE scan: " + e.getMessage());
        }
    }

    /** Stop both BLE advertising and scanning and clean up callbacks */
    @PluginMethod
    public void stopBle(PluginCall call) {
        try {
            if (bleAdvertiser != null && advertiseCallback != null) {
                bleAdvertiser.stopAdvertising(advertiseCallback);
                advertiseCallback = null;
                bleAdvertiser = null;
            }
            if (bleScanner != null && scanCallback != null) {
                bleScanner.stopScan(scanCallback);
                scanCallback = null;
                bleScanner = null;
            }
            targetBleIds.clear();
            JSObject res = new JSObject();
            res.put("success", true);
            call.resolve(res);
        } catch (Exception e) {
            call.reject("Failed to stop BLE: " + e.getMessage());
        }
    }
}
