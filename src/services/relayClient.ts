import { io, Socket } from 'socket.io-client';
import { LocationData, DistressAlert } from '../types';

export const DEFAULT_SERVER_URL = 'https://findmyfamily.onrender.com';

class RelayClient {
  private socket: Socket | null = null;
  private myDeviceId: string = '';
  private myDeviceName: string = '';
  private myCircleId: string = 'KUMBH-2026';
  private myColor: string = '#4ADE80';
  private serverUrl: string = DEFAULT_SERVER_URL;
  private isConnectedState = false;

  private locationListeners = new Set<(loc: LocationData) => void>();
  private circleMembersListeners = new Set<(members: LocationData[]) => void>();
  private memberJoinedListeners = new Set<(member: LocationData) => void>();
  private distressListeners = new Set<(alert: DistressAlert) => void>();
  private pairedListeners = new Set<(data: { pairedDeviceId: string }) => void>();
  private connectionListeners = new Set<(connected: boolean) => void>();
  private isOfflineSimulated = false;

  constructor() {
    this.serverUrl = this.resolveInitialServerUrl();
  }

  private resolveInitialServerUrl(): string {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('fmf_server_url');
        if (saved && saved.trim()) return saved.trim().replace(/\/+$/, '');

        // If running in browser and not on local mobile simulator / capacitor
        const origin = window.location.origin;
        if (
          origin &&
          !origin.includes('localhost') &&
          !origin.includes('127.0.0.1') &&
          !origin.startsWith('capacitor:') &&
          !origin.startsWith('file:')
        ) {
          return origin.replace(/\/+$/, '');
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_SERVER_URL;
  }

  getServerUrl(): string {
    return this.serverUrl;
  }

  setServerUrl(newUrl: string) {
    if (!newUrl || !newUrl.trim()) return;
    const cleanUrl = newUrl.trim().replace(/\/+$/, '');
    this.serverUrl = cleanUrl;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('fmf_server_url', cleanUrl);
      }
    } catch {}

    // Reconnect with new URL
    if (this.myDeviceId) {
      this.init(this.myDeviceId, this.myDeviceName, this.myCircleId, this.myColor);
    }
  }

  isConnected(): boolean {
    return this.isConnectedState && !this.isOfflineSimulated;
  }

  init(deviceId: string, name: string, circleId = 'KUMBH-2026', color = '#4ADE80') {
    this.myDeviceId = deviceId;
    this.myDeviceName = name;
    this.myCircleId = circleId.toUpperCase();
    this.myColor = color;

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    try {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 4000,
      });

      this.socket.on('connect', () => {
        console.log(`[RELAY CLIENT] Connected to ${this.serverUrl}. Socket ID:`, this.socket?.id);
        this.isConnectedState = true;
        this.notifyConnectionState(true);

        this.socket?.emit('register', {
          deviceId: this.myDeviceId,
          name: this.myDeviceName,
          circleId: this.myCircleId,
          color: this.myColor,
        });
      });

      this.socket.on('disconnect', () => {
        console.log('[RELAY CLIENT] Disconnected from server');
        this.isConnectedState = false;
        this.notifyConnectionState(false);
      });

      this.socket.on('connect_error', (err) => {
        console.warn(`[RELAY CLIENT] Connection error to ${this.serverUrl}:`, err.message);
        this.isConnectedState = false;
        this.notifyConnectionState(false);
      });

      this.socket.on('circle_members', (data: { circleId: string; members: LocationData[] }) => {
        if (this.isOfflineSimulated) return;
        this.circleMembersListeners.forEach((fn) => fn(data.members));
      });

      this.socket.on('member_joined', (member: LocationData) => {
        if (this.isOfflineSimulated) return;
        this.memberJoinedListeners.forEach((fn) => fn(member));
      });

      this.socket.on('location_update', (data: LocationData) => {
        if (this.isOfflineSimulated) return;
        this.locationListeners.forEach((fn) => fn(data));
      });

      this.socket.on('distress_alert', (data: DistressAlert) => {
        this.distressListeners.forEach((fn) => fn(data));
      });

      this.socket.on('paired', (data: { pairedDeviceId: string }) => {
        this.pairedListeners.forEach((fn) => fn(data));
      });
    } catch (err) {
      console.warn('[RELAY CLIENT] Socket init failed:', err);
    }

    // Also fetch current circle members immediately via REST with 3.5s timeout
    this.fetchCircleDevices(this.myCircleId);
  }

  private notifyConnectionState(connected: boolean) {
    this.connectionListeners.forEach((fn) => fn(connected && !this.isOfflineSimulated));
  }

  setCircle(circleId: string) {
    this.myCircleId = circleId.toUpperCase();
    if (this.socket && this.socket.connected) {
      this.socket.emit('register', {
        deviceId: this.myDeviceId,
        name: this.myDeviceName,
        circleId: this.myCircleId,
        color: this.myColor,
      });
    }
    this.fetchCircleDevices(this.myCircleId);
  }

  getCircleId(): string {
    return this.myCircleId;
  }

  setSimulateOffline(offline: boolean) {
    this.isOfflineSimulated = offline;
    if (offline && this.socket) {
      this.socket.disconnect();
    } else if (!offline && this.socket) {
      this.socket.connect();
    }
    this.notifyConnectionState(!offline && (this.socket?.connected ?? false));
  }

  getIsOffline(): boolean {
    return this.isOfflineSimulated;
  }

  async fetchCircleDevices(circleId: string): Promise<LocationData[]> {
    if (this.isOfflineSimulated) return [];
    try {
      const res = await fetch(`${this.serverUrl}/api/circles/${encodeURIComponent(circleId)}/devices`, {
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.members && Array.isArray(data.members)) {
          this.circleMembersListeners.forEach((fn) => fn(data.members));
          return data.members;
        }
      }
    } catch {
      // offline fallback
    }
    return [];
  }

  async registerPairing(targetDeviceId: string): Promise<{ success: boolean; offline?: boolean }> {
    if (this.isOfflineSimulated) {
      return { success: true, offline: true };
    }
    try {
      const res = await fetch(`${this.serverUrl}/api/devices/${encodeURIComponent(this.myDeviceId)}/pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDeviceId }),
        signal: AbortSignal.timeout(3500),
      });
      return await res.json();
    } catch {
      return { success: true, offline: true };
    }
  }

  async pushLocation(
    latitude: number,
    longitude: number,
    accuracy = 3.0,
    name = '',
    heading?: number,
    battery = 95,
    color?: string
  ): Promise<{ success: boolean; method: string }> {
    if (this.isOfflineSimulated) {
      return { success: false, method: 'offline' };
    }

    const payload: LocationData = {
      deviceId: this.myDeviceId,
      circleId: this.myCircleId,
      latitude,
      longitude,
      accuracy,
      name: name || this.myDeviceName,
      heading,
      battery,
      color: color || this.myColor,
      timestamp: Date.now(),
    };

    if (this.socket && this.socket.connected) {
      this.socket.emit('push_location', payload);
      return { success: true, method: 'websocket' };
    }

    try {
      const res = await fetch(`${this.serverUrl}/api/devices/${encodeURIComponent(this.myDeviceId)}/location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) return { success: true, method: 'http' };
    } catch {
      // offline
    }
    return { success: false, method: 'none' };
  }

  async sendDistressAlert(
    latitude: number,
    longitude: number,
    name = ''
  ): Promise<{ success: boolean; fallbackToSmsRecommended?: boolean; alert?: DistressAlert }> {
    const payload = {
      deviceId: this.myDeviceId,
      circleId: this.myCircleId,
      name: name || this.myDeviceName,
      latitude,
      longitude,
    };

    if (this.socket && this.socket.connected && !this.isOfflineSimulated) {
      this.socket.emit('send_distress', payload);
    }

    if (this.isOfflineSimulated) {
      return { success: false, fallbackToSmsRecommended: true };
    }

    try {
      const res = await fetch(`${this.serverUrl}/api/devices/${encodeURIComponent(this.myDeviceId)}/lost-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3500),
      });
      return await res.json();
    } catch {
      return { success: false, fallbackToSmsRecommended: true };
    }
  }

  /**
   * Safely clears cached network states and temporary storage without breaking credentials
   */
  clearAppCache(): { success: boolean; message: string } {
    try {
      if (typeof window !== 'undefined') {
        if ('caches' in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          });
        }
      }
      return { success: true, message: 'Cache memory cleaned successfully' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Failed to clear cache' };
    }
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionListeners.add(callback);
    callback(this.isConnected());
    return () => this.connectionListeners.delete(callback);
  }

  onLocationUpdate(callback: (loc: LocationData) => void) {
    this.locationListeners.add(callback);
    return () => this.locationListeners.delete(callback);
  }

  onCircleMembers(callback: (members: LocationData[]) => void) {
    this.circleMembersListeners.add(callback);
    return () => this.circleMembersListeners.delete(callback);
  }

  onMemberJoined(callback: (member: LocationData) => void) {
    this.memberJoinedListeners.add(callback);
    return () => this.memberJoinedListeners.delete(callback);
  }

  onDistressAlert(callback: (alert: DistressAlert) => void) {
    this.distressListeners.add(callback);
    return () => this.distressListeners.delete(callback);
  }

  onPaired(callback: (data: { pairedDeviceId: string }) => void) {
    this.pairedListeners.add(callback);
    return () => this.pairedListeners.delete(callback);
  }
}

export const relayClient = new RelayClient();
