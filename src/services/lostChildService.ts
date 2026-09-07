// Lost Child QR Service: Handles child linking, lost reports, dashboard, and volunteer centers
import { ChildProfile, LostAlert, VolunteerCenter, QrStatus, DashboardRole } from '../types';
import { offlineKidQueue } from './offlineKidQueue';
import { relayClient } from './relayClient';

export interface LinkChildParams {
  qr_id: string;
  child_name?: string;
  mother_name: string;
  father_name: string;
  photo_url: string;
  contact_number_primary: string;
  contact_number_secondary?: string;
  language_pref: 'en' | 'hi' | 'mr';
  created_by_user_id: string;
}

export interface LostAlertSubmission {
  qr_id: string;
  finder_lat?: number | null;
  finder_lng?: number | null;
  finder_landmark_note?: string | null;
  finder_contact_optional?: string | null;
}

export interface TagStatusResponse {
  status: QrStatus;
  qr_id: string;
  child?: {
    child_id: string;
    child_name?: string;
    photo_url: string;
    mother_name?: string;
    father_name?: string;
  };
  volunteerCenters: VolunteerCenter[];
  activeAlert?: {
    alert_id: string;
    reported_at: string;
    status: string;
  };
  message?: string;
}

class LostChildService {
  private getBaseUrl(): string {
    return relayClient.getServerUrl();
  }

  /**
   * Link child to an unassigned QR sticker.
   * If network fails or device is offline, queues locally with exponential backoff.
   */
  async linkChild(params: LinkChildParams): Promise<{ success: boolean; profile?: ChildProfile; error?: string; isOffline?: boolean }> {
    // Check if definitely offline
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const queued = offlineKidQueue.enqueue(params);
      const profile: ChildProfile = {
        child_id: `offline_${params.qr_id}`,
        qr_id: params.qr_id,
        child_name: params.child_name || `${params.mother_name}'s child`,
        mother_name: params.mother_name,
        father_name: params.father_name,
        photo_url: params.photo_url,
        contact_number_primary: params.contact_number_primary,
        contact_number_secondary: params.contact_number_secondary,
        language_pref: params.language_pref,
        created_by_user_id: params.created_by_user_id,
        created_at: new Date().toISOString(),
        isPendingSync: true,
      };
      return { success: true, profile, isOffline: true };
    }

    try {
      const response = await fetch(`${this.getBaseUrl()}/api/children/link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'Failed to link QR tag to child profile.',
        };
      }

      // Remove from offline queue if it was queued
      offlineKidQueue.removeFromQueue(params.qr_id);

      return {
        success: true,
        profile: data.child,
        isOffline: false,
      };
    } catch (networkError: any) {
      // Network call failed (e.g. poor connection or server unreachable)
      // Queue locally so parent doesn't lose typed data
      console.warn('[LOST CHILD SERVICE] Network request failed. Queuing for offline sync:', networkError);
      offlineKidQueue.enqueue(params);
      const profile: ChildProfile = {
        child_id: `offline_${params.qr_id}`,
        qr_id: params.qr_id,
        child_name: params.child_name || `${params.mother_name}'s child`,
        mother_name: params.mother_name,
        father_name: params.father_name,
        photo_url: params.photo_url,
        contact_number_primary: params.contact_number_primary,
        contact_number_secondary: params.contact_number_secondary,
        language_pref: params.language_pref,
        created_by_user_id: params.created_by_user_id,
        created_at: new Date().toISOString(),
        isPendingSync: true,
      };
      return { success: true, profile, isOffline: true };
    }
  }

  /**
   * Delete / Unlink child profile from server and clear from offline queue
   */
  async deleteChild(qr_id: string): Promise<{ success: boolean; error?: string }> {
    offlineKidQueue.removeFromQueue(qr_id);
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/children/${encodeURIComponent(qr_id)}`, {
        method: 'DELETE',
      });
      return { success: res.ok };
    } catch (err: any) {
      return { success: true };
    }
  }

  /**
   * Fetch tag status and public payload for bystander web flow
   */
  async getTagStatus(qr_id: string): Promise<TagStatusResponse> {
    const res = await fetch(`${this.getBaseUrl()}/api/lost/${encodeURIComponent(qr_id)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch tag status: ${res.status}`);
    }
    return res.json();
  }

  /**
   * Submit bystander "Mark as Lost" report
   */
  async submitLostAlert(data: LostAlertSubmission): Promise<{ success: boolean; alert?: LostAlert; error?: string }> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/lost-alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: resData.error || 'Failed to submit lost child alert.',
        };
      }
      return { success: true, alert: resData.alert };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error submitting report.' };
    }
  }

  /**
   * Fetch all registered volunteer centers for location mapping and fallback dropdowns
   */
  async getVolunteerCenters(): Promise<VolunteerCenter[]> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/volunteer-centers`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  /**
   * Fetch alerts feed for the Volunteer / Police Dashboard
   */
  async getDashboardAlerts(role: DashboardRole, centerId?: string): Promise<LostAlert[]> {
    try {
      const params = new URLSearchParams();
      params.set('role', role);
      if (centerId && role === 'volunteer') {
        params.set('centerId', centerId);
      }
      const res = await fetch(`${this.getBaseUrl()}/api/dashboard/alerts?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  /**
   * Acknowledge alert by volunteer / police
   */
  async acknowledgeAlert(alertId: string, userId: string = 'volunteer_user'): Promise<boolean> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/dashboard/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Resolve alert: marks alert resolved and cascades QR tag to resolved/retired
   */
  async resolveAlert(alertId: string, userId: string = 'volunteer_user'): Promise<boolean> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/dashboard/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fetch children registered by the parent phone
   */
  async getMyChildren(userId: string): Promise<ChildProfile[]> {
    // Combine server-fetched with local pending sync
    const offlinePending = offlineKidQueue.getPendingForUser(userId);
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/children/my?userId=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const serverChildren: ChildProfile[] = await res.json();
        // Merge without duplicates
        const serverQrIds = new Set(serverChildren.map((c) => c.qr_id));
        const combined = [
          ...serverChildren,
          ...offlinePending.filter((c) => !serverQrIds.has(c.qr_id)),
        ];
        return combined;
      }
    } catch {
      // offline
    }
    return offlinePending;
  }
}

export const lostChildService = new LostChildService();
