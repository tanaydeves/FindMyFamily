// Database Repository Layer for QR-Tag Lost Child Recovery
// Implements Supabase / Postgres integration via Prisma Client with automatic resilient fallback
import { QrStatus, AlertStatus, LanguageCode, ChildProfile, LostAlert, VolunteerCenter, QrTag } from '../types';

export interface CreateChildParams {
  qr_id: string;
  child_name?: string;
  mother_name: string;
  father_name: string;
  photo_url: string;
  contact_number_primary: string;
  contact_number_secondary?: string | null;
  language_pref: LanguageCode;
  created_by_user_id: string;
}

export interface CreateAlertParams {
  qr_id: string;
  finder_lat?: number | null;
  finder_lng?: number | null;
  finder_landmark_note?: string | null;
  finder_contact_optional?: string | null;
  finder_ip?: string | null;
  finder_user_agent?: string | null;
}

class DatabaseRepository {
  private prismaClient: any = null;
  private isPrismaReady = false;

  // In-Memory Relational Tables (used when Prisma/Postgres is offline or during testing)
  private qrTags = new Map<string, QrTag>();
  private childProfiles = new Map<string, ChildProfile>();
  private lostAlerts = new Map<string, LostAlert>();
  private volunteerCenters = new Map<string, VolunteerCenter>();

  constructor() {
    this.seedDefaultData();
    this.initPrisma();
  }

  private seedDefaultData() {
    // Seed Volunteer Centers for Kumbh Mela Grounds
    const defaultCenters: VolunteerCenter[] = [
      {
        center_id: 'center-sangam',
        name: 'Sangam Ghat Central Camp',
        location_lat: 25.4285,
        location_lng: 81.8845,
      },
      {
        center_id: 'center-sector4',
        name: 'Sector 4 Administrative Center',
        location_lat: 25.4380,
        location_lng: 81.8620,
      },
      {
        center_id: 'center-dashashwamedh',
        name: 'Dashashwamedh Pilgrim Helpdesk',
        location_lat: 25.4410,
        location_lng: 81.8510,
      },
      {
        center_id: 'center-vip',
        name: 'VIP Ghat Rescue Post',
        location_lat: 25.4320,
        location_lng: 81.8710,
      },
    ];

    defaultCenters.forEach((c) => this.volunteerCenters.set(c.center_id, c));

    // Seed pre-printed unassigned QR tags for volunteer center stock
    for (let i = 1; i <= 15; i++) {
      const pad = String(i).padStart(3, '0');
      const tagId = `QR-KUMBH-${pad}`;
      this.qrTags.set(tagId, {
        qr_id: tagId,
        status: 'unassigned',
        printed_at: new Date().toISOString(),
        assigned_at: null,
        retired_at: null,
        volunteer_center_id: 'center-sangam',
      });
    }

    console.log(`[DB REPOSITORY] Initialized ${this.volunteerCenters.size} volunteer centers and ${this.qrTags.size} pre-printed QR stickers.`);
  }

  private async initPrisma() {
    try {
      if (process.env.DATABASE_URL) {
        // Attempt dynamic load of @prisma/client
        const { PrismaClient } = await import('@prisma/client');
        this.prismaClient = new PrismaClient();
        await this.prismaClient.$connect();
        this.isPrismaReady = true;
        console.log('[DB REPOSITORY] Successfully connected to PostgreSQL via Prisma Client!');
      }
    } catch (err: any) {
      console.warn('[DB REPOSITORY] Prisma client not active (running in resilient relational mode):', err.message);
      this.isPrismaReady = false;
    }
  }

  // --- Volunteer Centers ---
  public async getVolunteerCenters(): Promise<VolunteerCenter[]> {
    if (this.isPrismaReady) {
      try {
        return await this.prismaClient.volunteer_centers.findMany();
      } catch {}
    }
    return Array.from(this.volunteerCenters.values());
  }

  // --- QR Tags ---
  public async getQrTag(qrId: string): Promise<QrTag | null> {
    if (this.isPrismaReady) {
      try {
        return await this.prismaClient.qr_tags.findUnique({
          where: { qr_id: qrId },
        });
      } catch {}
    }
    return this.qrTags.get(qrId) || null;
  }

  public async createBatchQrTags(count: number, prefix = 'QR-KUMBH', centerId?: string): Promise<QrTag[]> {
    const created: QrTag[] = [];
    const timestamp = new Date().toISOString();

    for (let i = 1; i <= count; i++) {
      const randSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const qrId = `${prefix}-${randSuffix}`;
      const tag: QrTag = {
        qr_id: qrId,
        status: 'unassigned',
        printed_at: timestamp,
        assigned_at: null,
        retired_at: null,
        volunteer_center_id: centerId || 'center-sangam',
      };

      if (this.isPrismaReady) {
        try {
          await this.prismaClient.qr_tags.create({
            data: {
              qr_id: qrId,
              status: 'unassigned',
              volunteer_center_id: centerId,
            },
          });
        } catch {}
      }

      this.qrTags.set(qrId, tag);
      created.push(tag);
    }

    return created;
  }

  // --- Child Linking (Part 4 Steps 5-6) ---
  public async linkChildProfile(params: CreateChildParams): Promise<{ success: boolean; child?: ChildProfile; error?: string }> {
    const { qr_id } = params;
    const tag = await this.getQrTag(qr_id);

    // Strict state machine validation: must exist and must be UNASSIGNED
    if (!tag) {
      return {
        success: false,
        error: 'This QR code is not recognized in the system. Please obtain an official sticker from a volunteer desk.',
      };
    }

    if (tag.status !== 'unassigned') {
      return {
        success: false,
        error: 'This QR is already in use. Please request a new sticker from the volunteer desk.',
      };
    }

    const childId = `child_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const newChild: ChildProfile = {
      child_id: childId,
      qr_id: params.qr_id,
      child_name: params.child_name || `${params.mother_name}'s child`,
      mother_name: params.mother_name,
      father_name: params.father_name,
      photo_url: params.photo_url,
      contact_number_primary: params.contact_number_primary,
      contact_number_secondary: params.contact_number_secondary,
      language_pref: params.language_pref,
      created_by_user_id: params.created_by_user_id,
      created_at: now,
      isPendingSync: false,
    };

    if (this.isPrismaReady) {
      try {
        await this.prismaClient.$transaction([
          this.prismaClient.child_profiles.create({
            data: {
              child_id: newChild.child_id,
              qr_id: newChild.qr_id,
              mother_name: newChild.mother_name,
              father_name: newChild.father_name,
              photo_url: newChild.photo_url,
              contact_number_primary: newChild.contact_number_primary,
              contact_number_secondary: newChild.contact_number_secondary,
              language_pref: newChild.language_pref,
              created_by_user_id: newChild.created_by_user_id,
            },
          }),
          this.prismaClient.qr_tags.update({
            where: { qr_id: params.qr_id },
            data: {
              status: 'assigned',
              assigned_at: new Date(),
            },
          }),
        ]);
      } catch (err: any) {
        console.error('[DB REPOSITORY] Prisma link error:', err);
      }
    }

    // In-memory update
    tag.status = 'assigned';
    tag.assigned_at = now;
    this.qrTags.set(qr_id, tag);
    this.childProfiles.set(qr_id, newChild);

    console.log(`[DB REPOSITORY] Successfully linked QR ${qr_id} to child "${newChild.child_name}" (Parents: ${newChild.mother_name} / ${newChild.father_name})`);
    return { success: true, child: newChild };
  }

  public async getChildByQrId(qrId: string): Promise<ChildProfile | null> {
    if (this.isPrismaReady) {
      try {
        const found = await this.prismaClient.child_profiles.findUnique({
          where: { qr_id: qrId },
        });
        if (found) return found;
      } catch {}
    }
    return this.childProfiles.get(qrId) || null;
  }

  public async getChildrenByUserId(userId: string): Promise<ChildProfile[]> {
    if (this.isPrismaReady) {
      try {
        return await this.prismaClient.child_profiles.findMany({
          where: { created_by_user_id: userId },
        });
      } catch {}
    }
    return Array.from(this.childProfiles.values()).filter((c) => c.created_by_user_id === userId);
  }

  // --- Lost Alerts (Part 5 & Part 6) ---
  public async createLostAlert(params: CreateAlertParams): Promise<{ success: boolean; alert?: LostAlert; error?: string }> {
    const { qr_id } = params;
    const tag = await this.getQrTag(qr_id);

    if (!tag) {
      return { success: false, error: 'Tag not found.' };
    }

    // Anti-misuse safeguard: Reject duplicate reports if already in lost_flagged state
    if (tag.status === 'lost_flagged') {
      return {
        success: false,
        error: 'An active lost alert is already in progress for this child. Rescue teams have already been dispatched.',
      };
    }

    const child = await this.getChildByQrId(qr_id);
    const alertId = `alert_${Math.random().toString(36).substring(2, 9)}`;
    const now = new Date().toISOString();

    const alert: LostAlert = {
      alert_id: alertId,
      qr_id,
      reported_at: now,
      finder_lat: params.finder_lat,
      finder_lng: params.finder_lng,
      finder_landmark_note: params.finder_landmark_note,
      finder_contact_optional: params.finder_contact_optional,
      sms_sent_at: now,
      dashboard_alerted_at: now,
      status: 'open',
      finder_ip: params.finder_ip || '127.0.0.1',
      finder_user_agent: params.finder_user_agent || 'Mozilla/5.0',
      child: child
        ? {
            child_id: child.child_id,
            child_name: child.child_name,
            mother_name: child.mother_name,
            father_name: child.father_name,
            photo_url: child.photo_url,
            contact_number_primary: child.contact_number_primary,
            contact_number_secondary: child.contact_number_secondary,
          }
        : undefined,
    };

    if (this.isPrismaReady) {
      try {
        await this.prismaClient.$transaction([
          this.prismaClient.lost_alerts.create({
            data: {
              alert_id: alert.alert_id,
              qr_id: alert.qr_id,
              finder_lat: alert.finder_lat,
              finder_lng: alert.finder_lng,
              finder_landmark_note: alert.finder_landmark_note,
              finder_contact_optional: alert.finder_contact_optional,
              sms_sent_at: new Date(),
              dashboard_alerted_at: new Date(),
              status: 'open',
              finder_ip: alert.finder_ip,
              finder_user_agent: alert.finder_user_agent,
            },
          }),
          this.prismaClient.qr_tags.update({
            where: { qr_id },
            data: { status: 'lost_flagged' },
          }),
        ]);
      } catch (err: any) {
        console.error('[DB REPOSITORY] Prisma createLostAlert error:', err);
      }
    }

    // In-memory update
    tag.status = 'lost_flagged';
    this.qrTags.set(qr_id, tag);
    this.lostAlerts.set(alertId, alert);

    return { success: true, alert };
  }

  public async getAlerts(filter?: { role?: string; centerId?: string; status?: string }): Promise<LostAlert[]> {
    let list = Array.from(this.lostAlerts.values());

    // Filter by status if specified
    if (filter?.status) {
      list = list.filter((a) => a.status === filter.status);
    }

    // Role-based filtering:
    // - Volunteer role: sees alerts within assigned center/zone
    // - Police role: sees all alerts system-wide
    if (filter?.role === 'volunteer' && filter?.centerId && filter.centerId !== 'all') {
      const center = this.volunteerCenters.get(filter.centerId);
      if (center) {
        list = list.filter((a) => {
          // If landmark note mentions center name or coordinates match
          if (a.finder_landmark_note?.toLowerCase().includes(center.name.toLowerCase())) return true;
          if (a.finder_lat && a.finder_lng) {
            const dLat = Math.abs(a.finder_lat - center.location_lat);
            const dLng = Math.abs(a.finder_lng - center.location_lng);
            return dLat < 0.02 && dLng < 0.02; // ~2km zone
          }
          return true; // Include unlocalized alerts for volunteer awareness
        });
      }
    }

    // Sort most recent first
    list.sort((a, b) => new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime());
    return list;
  }

  public async getActiveAlertForQr(qrId: string): Promise<LostAlert | null> {
    const list = Array.from(this.lostAlerts.values());
    const open = list.find((a) => a.qr_id === qrId && a.status !== 'resolved');
    return open || null;
  }

  // --- Acknowledge Alert (Part 6) ---
  public async acknowledgeAlert(alertId: string, userId: string): Promise<LostAlert | null> {
    const alert = this.lostAlerts.get(alertId);
    if (!alert) return null;

    alert.status = 'acknowledged';

    if (this.isPrismaReady) {
      try {
        await this.prismaClient.lost_alerts.update({
          where: { alert_id: alertId },
          data: { status: 'acknowledged' },
        });
      } catch {}
    }

    this.lostAlerts.set(alertId, alert);
    return alert;
  }

  // --- Resolve Alert (Part 2 & Part 6) ---
  public async resolveAlert(alertId: string, userId: string): Promise<{ alert: LostAlert; tag: QrTag } | null> {
    const alert = this.lostAlerts.get(alertId);
    if (!alert) return null;

    const now = new Date().toISOString();
    alert.status = 'resolved';
    alert.resolved_by_user_id = userId;
    alert.resolved_at = now;

    const tag = this.qrTags.get(alert.qr_id);
    if (tag) {
      // POLICY DECISION FOR THIS BUILD (Part 2 & Part 7):
      // TODO [DECISION 1 - QR REUSE POLICY]: After a case is marked RESOLVED, the QR moves to RETIRED
      // by default rather than looping back to UNASSIGNED for reuse. This avoids any risk of stale data
      // (old photos, old contact numbers, old alert history) leaking into a new child's profile.
      // If sticker reuse is approved later, implement an explicit admin-only "Wipe and Recycle" endpoint.
      tag.status = 'retired';
      tag.retired_at = now;
      this.qrTags.set(tag.qr_id, tag);
    }

    if (this.isPrismaReady) {
      try {
        await this.prismaClient.$transaction([
          this.prismaClient.lost_alerts.update({
            where: { alert_id: alertId },
            data: {
              status: 'resolved',
              resolved_by_user_id: userId,
              resolved_at: new Date(),
            },
          }),
          this.prismaClient.qr_tags.update({
            where: { qr_id: alert.qr_id },
            data: {
              status: 'retired',
              retired_at: new Date(),
            },
          }),
        ]);
      } catch (err: any) {
        console.error('[DB REPOSITORY] Prisma resolveAlert error:', err);
      }
    }

    return { alert, tag: tag! };
  }
}

export const dbRepository = new DatabaseRepository();
