// Service to monitor and retrieve live device battery percentage

export interface BatteryStatus {
  level: number; // 0 to 100
  isCharging: boolean;
}

type BatteryCallback = (status: BatteryStatus) => void;

class BatteryService {
  private currentStatus: BatteryStatus = {
    level: 92,
    isCharging: false,
  };
  private listeners: Set<BatteryCallback> = new Set();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      // Check if navigator.getBattery is supported (Chrome, Android WebView, Edge, etc.)
      if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        // @ts-ignore - Battery API standard types
        const battery = await (navigator as any).getBattery();
        this.updateFromBattery(battery);

        battery.addEventListener('levelchange', () => {
          this.updateFromBattery(battery);
        });

        battery.addEventListener('chargingchange', () => {
          this.updateFromBattery(battery);
        });
      } else {
        // Simulated fallback for unsupported environments (iOS Safari, etc.)
        this.startSimulatedBattery();
      }
    } catch (err) {
      console.warn('[BatteryService] Failed to initialize battery listener, using fallback:', err);
      this.startSimulatedBattery();
    }
  }

  private updateFromBattery(battery: any) {
    const levelPercent = Math.round((battery.level || 1) * 100);
    this.currentStatus = {
      level: Math.min(100, Math.max(1, levelPercent)),
      isCharging: Boolean(battery.charging),
    };
    this.notifyListeners();
  }

  private startSimulatedBattery() {
    // Read from localStorage if previously stored
    try {
      const saved = localStorage.getItem('fmf_my_battery');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
          this.currentStatus.level = parsed;
        }
      }
    } catch {}

    // Slowly simulate subtle battery consumption over time
    setInterval(() => {
      if (!this.currentStatus.isCharging && this.currentStatus.level > 5) {
        this.currentStatus.level = Math.max(5, this.currentStatus.level - 1);
        try {
          localStorage.setItem('fmf_my_battery', String(this.currentStatus.level));
        } catch {}
        this.notifyListeners();
      }
    }, 900000);
  }

  getBatteryStatus(): BatteryStatus {
    return this.currentStatus;
  }

  subscribe(callback: BatteryCallback): () => void {
    this.listeners.add(callback);
    callback(this.currentStatus);

    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((fn) => fn(this.currentStatus));
  }
}

export const batteryService = new BatteryService();
