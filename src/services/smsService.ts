export interface ParsedSms {
  deviceId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  name: string;
  isDistress: boolean;
  source: 'sms';
}

export const SMS_PREFIX = 'FMF_LOC:';
export const DISTRESS_PREFIX = 'FMF_LOST:';

export const SmsService = {
  /**
   * Encodes coordinate payload into a compact SMS string
   * Format: FMF_LOC:deviceId|latitude|longitude|timestamp|name
   */
  encodeLocationMessage(deviceId: string, latitude: number, longitude: number, name = ''): string {
    return `${SMS_PREFIX}${deviceId}|${latitude.toFixed(6)}|${longitude.toFixed(6)}|${Date.now()}|${encodeURIComponent(name)}`;
  },

  /**
   * Encodes distress alert message
   * Format: FMF_LOST:deviceId|latitude|longitude|timestamp|name
   */
  encodeDistressMessage(deviceId: string, latitude: number, longitude: number, name = ''): string {
    return `${DISTRESS_PREFIX}${deviceId}|${latitude.toFixed(6)}|${longitude.toFixed(6)}|${Date.now()}|${encodeURIComponent(name)}`;
  },

  /**
   * Parses incoming SMS body string
   */
  parseSmsPayload(messageBody: string): ParsedSms | null {
    if (!messageBody) return null;

    let isDistress = false;
    let payload = '';

    if (messageBody.startsWith(DISTRESS_PREFIX)) {
      isDistress = true;
      payload = messageBody.replace(DISTRESS_PREFIX, '');
    } else if (messageBody.startsWith(SMS_PREFIX)) {
      payload = messageBody.replace(SMS_PREFIX, '');
    } else {
      return null;
    }

    const parts = payload.split('|');
    if (parts.length < 3) return null;

    const [deviceId, latStr, lngStr, timeStr, nameEncoded] = parts;
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lngStr);

    if (isNaN(latitude) || isNaN(longitude)) return null;

    return {
      deviceId,
      latitude,
      longitude,
      timestamp: timeStr ? parseInt(timeStr, 10) : Date.now(),
      name: nameEncoded ? decodeURIComponent(nameEncoded) : 'Family Member',
      isDistress,
      source: 'sms',
    };
  },

  /**
   * Creates a simulated native SMS intent URI (sms:+919876543210?body=...)
   */
  getSmsUri(phoneNumber: string, body: string): string {
    const cleanPhone = phoneNumber.replace(/[^0-9+]/g, '');
    return `sms:${cleanPhone}?body=${encodeURIComponent(body)}`;
  },
};
