import { Capacitor } from "@capacitor/core";
import { NativeSync } from "./nativeSync";
import type { PluginListenerHandle } from "@capacitor/core";

export interface ProximityUpdate {
  deviceId: string;
  /** Estimated distance in meters derived from RSSI */
  distanceMeters: number;
  rssi: number;
}

type ProximityCallback = (update: ProximityUpdate) => void;

/**
 * BLE Proximity Service
 *
 * When GPS distance falls to <=30m, this service runs alongside GPS to provide
 * direct device-to-device RSSI-based proximity (1-5m accuracy).
 *
 * On the web / PWA it silently no-ops - no crash, no error, just does nothing.
 */
class BleProximityService {
  private isRunning = false;
  private bleListener: PluginListenerHandle | null = null;
  private callbacks: Set<ProximityCallback> = new Set();

  /** True only on a real Android/iOS native build */
  isSupported(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Converts BLE RSSI to an estimated distance in meters.
   * Formula: d = 10 ^ ((TxPower - RSSI) / (10 * n))
   * txPower ~= -59 dBm (calibrated RSSI at 1 m)
   * n ~= 2.0 (free-space path loss exponent; higher in dense crowds)
   */
  rssiToDistance(rssi: number, txPower = -59, n = 2.0): number {
    if (rssi === 0) return -1; // unknown
    const ratio = (txPower - rssi) / (10 * n);
    return Math.round(Math.pow(10, ratio) * 10) / 10; // round to 0.1m
  }

  /**
   * Start BLE advertising (so others can detect this device) and scanning
   * (to detect targetDeviceIds).
   */
  async startTracking(myDeviceId: string, targetDeviceIds: string[]): Promise<void> {
    if (this.isRunning) return;
    if (!this.isSupported()) {
      console.info("[BLE] Not on native platform - BLE proximity is a no-op");
      return;
    }

    try {
      this.isRunning = true;

      // Advertise this device so others can find us
      await NativeSync.startBleAdvertise({ deviceId: myDeviceId });

      // Scan for our target family members
      if (targetDeviceIds.length > 0) {
        await NativeSync.startBleScan({ targetDeviceIds });
      }

      // Listen for scan results and convert RSSI to distance
      this.bleListener = await NativeSync.addListener("bleDeviceFound", (data) => {
        const distanceMeters = this.rssiToDistance(data.rssi);
        this.callbacks.forEach((cb) =>
          cb({ deviceId: data.deviceId, distanceMeters, rssi: data.rssi })
        );
      });

      console.info(`[BLE] Tracking started - advertising as ${myDeviceId}, scanning for:`, targetDeviceIds);
    } catch (err) {
      console.warn("[BLE] Failed to start BLE proximity:", err);
      this.isRunning = false;
    }
  }

  /** Stop advertising + scanning and clean up the event listener */
  async stopTracking(): Promise<void> {
    if (!this.isRunning) return;
    this.isRunning = false;

    try {
      if (this.bleListener) {
        await this.bleListener.remove();
        this.bleListener = null;
      }
      if (this.isSupported()) {
        await NativeSync.stopBle();
      }
      console.info("[BLE] Tracking stopped");
    } catch (err) {
      console.warn("[BLE] Error stopping BLE:", err);
    }
  }

  /** Register a callback to receive proximity updates. Returns an unsubscribe fn. */
  onProximityUpdate(cb: ProximityCallback): () => void {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }

  get active(): boolean {
    return this.isRunning;
  }
}

export const bleProximityService = new BleProximityService();
