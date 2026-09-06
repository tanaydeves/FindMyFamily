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

// QR-Tag Lost Child Recovery Types
export type QrStatus = 'unassigned' | 'assigned' | 'lost_flagged' | 'resolved' | 'retired';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';
export type DashboardRole = 'volunteer' | 'police';

export interface QrTag {
  qr_id: string;
  status: QrStatus;
  printed_at: string;
  assigned_at?: string | null;
  retired_at?: string | null;
  volunteer_center_id?: string | null;
}

export interface ChildProfile {
  child_id: string;
  qr_id: string;
  child_name?: string;
  mother_name: string;
  father_name: string;
  photo_url: string;
  contact_number_primary: string;
  contact_number_secondary?: string | null;
  language_pref: LanguageCode;
  created_by_user_id: string;
  created_at: string;
  // Offline sync status
  isPendingSync?: boolean;
}

export interface LostAlert {
  alert_id: string;
  qr_id: string;
  reported_at: string;
  finder_lat?: number | null;
  finder_lng?: number | null;
  finder_landmark_note?: string | null;
  finder_contact_optional?: string | null;
  sms_sent_at?: string | null;
  dashboard_alerted_at?: string | null;
  status: AlertStatus;
  resolved_by_user_id?: string | null;
  resolved_at?: string | null;
  finder_ip?: string | null;
  finder_user_agent?: string | null;
  // Attached relations
  child?: {
    child_id: string;
    child_name?: string;
    mother_name: string;
    father_name: string;
    photo_url: string;
    contact_number_primary?: string;
    contact_number_secondary?: string | null;
  };
  center?: VolunteerCenter | null;
}

export interface VolunteerCenter {
  center_id: string;
  name: string;
  location_lat: number;
  location_lng: number;
}
