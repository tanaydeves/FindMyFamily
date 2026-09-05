export type LanguageCode = 'en' | 'hi' | 'mr';

export type ScreenType =
  | 'splash'
  | 'permissions'
  | 'language'
  | 'home'
  | 'arrow'
  | 'radar'
  | 'sms_hub'
  | 'sandbox';

export interface LocationData {
  deviceId: string;
  circleId?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  name: string;
  heading?: number;
  battery?: number;
  color?: string;
  source?: 'relay' | 'sms' | 'gps' | 'ble';
}

export interface FamilyMember {
  id: string;
  name: string;
  circleId?: string;
  phone?: string;
  lastLat: number;
  lastLng: number;
  accuracy?: number;
  lastUpdated: number;
  source?: 'relay' | 'sms' | 'gps' | 'ble';
  color?: string;
  battery?: number;
  rssi?: number;
  heading?: number;
  isOnline?: boolean;
}

export interface DistressAlert {
  senderId: string;
  senderName: string;
  circleId?: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

export interface DiscoveredBleDevice {
  id: string;
  name: string;
  rssi: number;
  phone?: string;
  lat?: number;
  lng?: number;
}

export interface CircleInfo {
  circleId: string;
  circleName: string;
  membersCount: number;
  connectedCount: number;
}
