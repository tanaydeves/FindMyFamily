package com.kumbhathon.findmyfamily;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import android.telephony.SmsManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

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
}
