import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface NativeSyncPlugin {
  requestBluetoothPermissions(): Promise<{ bluetooth: string }>;
  requestSmsPermissions(): Promise<{ sms: string }>;
  checkAllPermissions(): Promise<{ bluetooth: string; sms: string }>;
  sendSMS(options: { phoneNumber: string; message: string }): Promise<{ success: boolean }>;
  addListener(
    eventName: 'smsReceived',
    listenerFunc: (data: { from: string; body: string }) => void
  ): Promise<PluginListenerHandle>;
}

export const NativeSync = registerPlugin<NativeSyncPlugin>('NativeSync');
