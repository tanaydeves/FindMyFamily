import { registerPlugin, PluginListenerHandle } from '@capacitor/core';

export interface NativeSyncPlugin {
  requestBluetoothPermissions(): Promise<{ bluetooth: string }>;
  checkAllPermissions(): Promise<{ bluetooth: string }>;

  // BLE proximity methods
  startBleAdvertise(options: { deviceId: string }): Promise<{ success: boolean }>;
  startBleScan(options: { targetDeviceIds: string[] }): Promise<{ success: boolean }>;
  stopBle(): Promise<{ success: boolean }>;

  addListener(
    eventName: 'bleDeviceFound',
    listenerFunc: (data: { deviceId: string; rssi: number }) => void
  ): Promise<PluginListenerHandle>;
}

export const NativeSync = registerPlugin<NativeSyncPlugin>('NativeSync');
