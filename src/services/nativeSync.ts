import { registerPlugin } from '@capacitor/core';

export interface NativeSyncPlugin {
  requestBluetoothPermissions(): Promise<{ bluetooth: string }>;
  requestSmsPermissions(): Promise<{ sms: string }>;
  checkAllPermissions(): Promise<{ bluetooth: string; sms: string }>;
  sendSMS(options: { phoneNumber: string; message: string }): Promise<{ success: boolean }>;
}

export const NativeSync = registerPlugin<NativeSyncPlugin>('NativeSync');
