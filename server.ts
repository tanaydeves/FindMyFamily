import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { dbRepository } from './src/server/db';

interface LocationData {
  deviceId: string;
  circleId?: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
  name: string;
  heading?: number;
  battery?: number;
  color?: string;
}

interface DistressAlertData {
  senderId: string;
  senderName: string;
  circleId?: string;
  latitude: number;
  longitude: number;
  timestamp: number;
}

interface DeviceProfile {
  deviceId: string;
  name: string;
  circleId: string;
  socketId: string;
  lastSeen: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  heading?: number;
  battery?: number;
  color?: string;
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  app.use(cors());
  app.use(express.json());

  // In-Memory state store
  // Map of deviceId -> DeviceProfile
  const devices = new Map<string, DeviceProfile>();
  // Map of circleId -> Set<deviceId>
  const circles = new Map<string, Set<string>>();
  // Map of socketId -> deviceId
  const socketToDevice = new Map<string, string>();
  // Map of deviceId -> Set<targetDeviceId> for explicit 1-on-1 pairs
  const directPairings = new Map<string, Set<string>>();

  const DEFAULT_CIRCLE = 'KUMBH-2026';

  function getCircleDevices(circleId: string): LocationData[] {
    const devIds = circles.get(circleId) || new Set<string>();
    const list: LocationData[] = [];
    devIds.forEach((id) => {
      const dev = devices.get(id);
      if (dev) {
        list.push({
          deviceId: dev.deviceId,
          circleId: dev.circleId,
          name: dev.name,
          latitude: dev.latitude,
          longitude: dev.longitude,
          accuracy: dev.accuracy,
          timestamp: dev.lastSeen,
          heading: dev.heading,
          battery: dev.battery,
          color: dev.color,
        });
      }
    });
    return list;
  }

  // Dynamic device & circle registration
  // Devices will register dynamically when connecting or posting location

  // REST API Endpoints
  app.get(['/health', '/api/health'], (_req, res) => {
    res.json({
      status: 'ok',
      totalDevices: devices.size,
      activeCircles: circles.size,
      connectedSockets: socketToDevice.size,
      timestamp: Date.now(),
    });
  });

  // Get circle members
  app.get(['/circles/:circleId/devices', '/api/circles/:circleId/devices'], (req, res) => {
    const circleId = (req.params.circleId || DEFAULT_CIRCLE).toUpperCase();
    const members = getCircleDevices(circleId);
    res.json({
      circleId,
      membersCount: members.length,
      members,
    });
  });

  // List all global devices
  app.get(['/devices', '/api/devices'], (_req, res) => {
    const list = Array.from(devices.values()).map((d) => ({
      deviceId: d.deviceId,
      circleId: d.circleId,
      name: d.name,
      latitude: d.latitude,
      longitude: d.longitude,
      accuracy: d.accuracy,
      timestamp: d.lastSeen,
      battery: d.battery,
      color: d.color,
    }));
    res.json(list);
  });

  // Explicit device pairing endpoint
  app.post(['/devices/:deviceId/pair', '/api/devices/:deviceId/pair'], (req, res) => {
    const { deviceId } = req.params;
    const { targetDeviceId } = req.body;

    if (!targetDeviceId) {
      return res.status(400).json({ error: 'targetDeviceId is required' });
    }

    if (!directPairings.has(deviceId)) directPairings.set(deviceId, new Set());
    if (!directPairings.has(targetDeviceId)) directPairings.set(targetDeviceId, new Set());
    directPairings.get(deviceId)!.add(targetDeviceId);
    directPairings.get(targetDeviceId)!.add(deviceId);

    // Notify target device if connected
    const targetDev = devices.get(targetDeviceId);
    if (targetDev && targetDev.socketId) {
      io.to(targetDev.socketId).emit('paired', { pairedDeviceId: deviceId });
    }

    return res.json({ success: true, message: `Paired ${deviceId} <--> ${targetDeviceId}` });
  });

  // Update device location via REST
  app.post(['/devices/:deviceId/location', '/api/devices/:deviceId/location'], (req, res) => {
    const { deviceId } = req.params;
    const {
      latitude,
      longitude,
      circleId = DEFAULT_CIRCLE,
      timestamp = Date.now(),
      accuracy = 0,
      name = '',
      heading = 0,
      battery = 100,
      color = '#4ADE80',
    } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'latitude and longitude are required' });
    }

    const normCircle = circleId.toUpperCase();
    const prevDev = devices.get(deviceId);
    if (prevDev && prevDev.circleId && prevDev.circleId !== normCircle) {
      circles.get(prevDev.circleId)?.delete(deviceId);
      if (circles.get(prevDev.circleId)?.size === 0) {
        circles.delete(prevDev.circleId);
      }
    }

    const existing = prevDev || {
      deviceId,
      name: name || 'Family Member',
      circleId: normCircle,
      socketId: '',
      lastSeen: timestamp,
      latitude,
      longitude,
      accuracy,
      heading,
      battery,
      color,
    };

    existing.latitude = latitude;
    existing.longitude = longitude;
    existing.lastSeen = timestamp;
    existing.accuracy = accuracy;
    if (name) existing.name = name;
    existing.circleId = normCircle;
    if (heading !== undefined) existing.heading = heading;
    if (battery !== undefined) existing.battery = battery;
    if (color) existing.color = color;

    devices.set(deviceId, existing);

    if (!circles.has(normCircle)) circles.set(normCircle, new Set());
    circles.get(normCircle)!.add(deviceId);

    const locData: LocationData = {
      deviceId,
      circleId: normCircle,
      latitude,
      longitude,
      timestamp,
      accuracy,
      name: existing.name,
      heading,
      battery,
      color: existing.color,
    };

    // Broadcast to room
    io.to(normCircle).emit('location_update', locData);
    io.emit('all_locations', Array.from(devices.values()));

    return res.json({ success: true, location: locData });
  });

  // Trigger lost / distress alert
  app.post(['/devices/:deviceId/lost-alert', '/api/devices/:deviceId/lost-alert'], (req, res) => {
    const { deviceId } = req.params;
    const { name, latitude, longitude, circleId = DEFAULT_CIRCLE } = req.body;
    const normCircle = circleId.toUpperCase();

    const alertPayload: DistressAlertData = {
      senderId: deviceId,
      senderName: name || 'Family Member',
      circleId: normCircle,
      latitude: Number(latitude) || 25.4358,
      longitude: Number(longitude) || 81.8463,
      timestamp: Date.now(),
    };

    console.log(`[DISTRESS ALERT] Circle: ${normCircle} from ${deviceId} (${alertPayload.senderName})`);

    // Broadcast to the whole circle room
    io.to(normCircle).emit('distress_alert', alertPayload);
    // Also global broadcast for multi-tab test ease
    io.emit('distress_alert', alertPayload);

    return res.json({
      success: true,
      deliveredToCircle: normCircle,
      alert: alertPayload,
    });
  });

  // ============================================================
  // QR-TAG LOST CHILD RECOVERY ENDPOINTS (PART 8 - ITEM 2)
  // ============================================================

  // 1. Get Volunteer Centers (Data-driven for landmark dropdown & directions)
  app.get(['/api/volunteer-centers', '/volunteer-centers'], async (_req, res) => {
    try {
      const centers = await dbRepository.getVolunteerCenters();
      res.json(centers);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to get volunteer centers' });
    }
  });

  // 2. Link Child Profile (Part 4 Steps 4-6)
  app.post(['/api/children/link', '/children/link'], async (req, res) => {
    const {
      qr_id,
      child_name,
      mother_name,
      father_name,
      photo_url,
      contact_number_primary,
      contact_number_secondary,
      language_pref = 'en',
      created_by_user_id = 'parent_device',
    } = req.body;

    if (!qr_id || !mother_name || !father_name || !contact_number_primary) {
      return res.status(400).json({
        error: 'qr_id, mother_name, father_name, and contact_number_primary are required.',
      });
    }

    try {
      const result = await dbRepository.linkChildProfile({
        qr_id,
        child_name,
        mother_name,
        father_name,
        photo_url: photo_url || 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=300&auto=format&fit=crop&q=80',
        contact_number_primary,
        contact_number_secondary,
        language_pref,
        created_by_user_id,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json({ success: true, child: result.child });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Internal server error linking child.' });
    }
  });

  // Delete / Unlink Child Profile
  app.delete(['/api/children/:qr_id', '/children/:qr_id'], async (req, res) => {
    const { qr_id } = req.params;
    try {
      await dbRepository.deleteChildProfile(qr_id);
      return res.json({ success: true, message: 'Child profile unlinked successfully.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to delete child profile.' });
    }
  });

  // 3. Public Bystander Tag Status Endpoint (Part 5)
  app.get(['/api/lost/:qr_id', '/lost-status/:qr_id'], async (req, res) => {
    const { qr_id } = req.params;
    try {
      const tag = await dbRepository.getQrTag(qr_id);
      const volunteerCenters = await dbRepository.getVolunteerCenters();

      if (!tag) {
        return res.status(404).json({
          error: 'QR tag not found in system. Please verify the tag ID or consult a volunteer desk.',
          status: 'unknown',
          volunteerCenters,
        });
      }

      if (tag.status === 'unassigned') {
        return res.json({
          status: 'unassigned',
          qr_id,
          volunteerCenters,
          message: 'This tag isn’t linked to a child yet. Please take the child to the nearest volunteer center.',
        });
      }

      const child = await dbRepository.getChildByQrId(qr_id);

      if (tag.status === 'assigned') {
        // Return child details WITHOUT parent phone numbers (privacy protection!)
        return res.json({
          status: 'assigned',
          qr_id,
          child: child
            ? {
                child_id: child.child_id,
                child_name: child.child_name,
                mother_name: child.mother_name,
                father_name: child.father_name,
                photo_url: child.photo_url,
              }
            : null,
          volunteerCenters,
        });
      }

      if (tag.status === 'lost_flagged') {
        const activeAlert = await dbRepository.getActiveAlertForQr(qr_id);
        return res.json({
          status: 'lost_flagged',
          qr_id,
          child: child
            ? {
                child_id: child.child_id,
                child_name: child.child_name,
                photo_url: child.photo_url,
              }
            : null,
          activeAlert: activeAlert
            ? {
                alert_id: activeAlert.alert_id,
                reported_at: activeAlert.reported_at,
                status: activeAlert.status,
              }
            : null,
          volunteerCenters,
          message: 'This has already been reported. Help is on the way — please stay with the child if possible.',
        });
      }

      return res.json({
        status: tag.status,
        qr_id,
        volunteerCenters,
        message: 'This case has been resolved and closed.',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Server error checking tag.' });
    }
  });

  // 4. Submit Lost Alert from Bystander (Part 5)
  app.post(['/api/lost-alerts', '/lost-alerts'], async (req, res) => {
    const { qr_id, finder_lat, finder_lng, finder_landmark_note, finder_contact_optional } = req.body;

    if (!qr_id) {
      return res.status(400).json({ error: 'qr_id is required' });
    }

    try {
      const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Unknown';

      const result = await dbRepository.createLostAlert({
        qr_id,
        finder_lat: finder_lat !== undefined && finder_lat !== null ? Number(finder_lat) : null,
        finder_lng: finder_lng !== undefined && finder_lng !== null ? Number(finder_lng) : null,
        finder_landmark_note: finder_landmark_note || null,
        finder_contact_optional: finder_contact_optional || null,
        finder_ip: clientIp,
        finder_user_agent: userAgent,
      });

      if (!result.success || !result.alert) {
        return res.status(400).json({ error: result.error });
      }

      const alert = result.alert;
      const child = await dbRepository.getChildByQrId(qr_id);

      // 1. Send simulated SMS to child's parent contacts
      const primaryContact = child?.contact_number_primary || 'Parent';
      const childName = child?.child_name || 'your child';
      const landmarkText = finder_landmark_note || 'the event grounds';
      const smsMessage = `Find My Family Alert: A person has reported finding ${childName} near ${landmarkText}. Please head there or contact the nearest volunteer center.`;

      console.log(`\n================== [URGENT SMS DISPATCH] ==================`);
      console.log(`TO: ${primaryContact}${child?.contact_number_secondary ? `, ${child.contact_number_secondary}` : ''}`);
      console.log(`MESSAGE: "${smsMessage}"`);
      console.log(`TIMESTAMP: ${new Date().toISOString()}`);
      console.log(`===========================================================\n`);

      // 2. Broadcast real-time alert onto Volunteer / Police Dashboard
      io.emit('lost_alert_created', alert);

      return res.json({
        success: true,
        alert,
        sms_dispatched_to: primaryContact,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Error processing lost report.' });
    }
  });

  // 5. Dashboard alerts feed (Part 6)
  app.get(['/api/dashboard/alerts', '/dashboard/alerts'], async (req, res) => {
    const role = (req.query.role as string) || 'police';
    const centerId = req.query.centerId as string | undefined;
    const status = req.query.status as string | undefined;

    try {
      const alerts = await dbRepository.getAlerts({ role, centerId, status });
      res.json(alerts);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch dashboard alerts' });
    }
  });

  // 6. Acknowledge Alert (Part 6)
  app.post(['/api/dashboard/alerts/:alertId/acknowledge', '/dashboard/alerts/:alertId/acknowledge'], async (req, res) => {
    const { alertId } = req.params;
    const { userId = 'volunteer_staff' } = req.body;

    try {
      const updated = await dbRepository.acknowledgeAlert(alertId, userId);
      if (!updated) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      io.emit('alert_acknowledged', { alert_id: alertId });
      return res.json({ success: true, alert: updated });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to acknowledge alert' });
    }
  });

  // 7. Resolve Alert (Part 2 & Part 6)
  app.post(['/api/dashboard/alerts/:alertId/resolve', '/dashboard/alerts/:alertId/resolve'], async (req, res) => {
    const { alertId } = req.params;
    const { userId = 'volunteer_staff' } = req.body;

    try {
      const resolved = await dbRepository.resolveAlert(alertId, userId);
      if (!resolved) {
        return res.status(404).json({ error: 'Alert not found' });
      }

      io.emit('alert_resolved', { alert_id: alertId, qr_id: resolved.tag.qr_id });
      return res.json({ success: true, alert: resolved.alert, tag: resolved.tag });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to resolve alert' });
    }
  });

  // 8. Generate QR Tags Batch (Part 8 Item 2)
  app.post(['/api/qr-tags/generate-batch', '/qr-tags/generate-batch'], async (req, res) => {
    const count = Number(req.body.count) || 5;
    const prefix = req.body.prefix || 'QR-KUMBH';
    const centerId = req.body.centerId || 'center-sangam';

    try {
      const created = await dbRepository.createBatchQrTags(count, prefix, centerId);
      res.json({ success: true, count: created.length, tags: created });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate batch QR tags' });
    }
  });

  // 9. Get children for logged in device (for offline sync check & parent view)
  app.get(['/api/children/my', '/children/my'], async (req, res) => {
    const userId = (req.query.userId as string) || '';
    if (!userId) return res.json([]);
    try {
      const children = await dbRepository.getChildrenByUserId(userId);
      res.json(children);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch children' });
    }
  });

  // WebSocket Real-time Handlers
  io.on('connection', (socket) => {
    console.log(`[WS CONNECTED] Socket ID: ${socket.id}`);

    // Register / Join Circle Room
    socket.on(
      'register',
      ({
        deviceId,
        name,
        circleId = DEFAULT_CIRCLE,
        color,
      }: {
        deviceId: string;
        name?: string;
        circleId?: string;
        color?: string;
      }) => {
        if (!deviceId) return;
        const normCircle = (circleId || DEFAULT_CIRCLE).toUpperCase();

        let dev = devices.get(deviceId);
        if (dev && dev.circleId && dev.circleId !== normCircle) {
          // Leave old circle room and cleanup membership
          socket.leave(dev.circleId);
          circles.get(dev.circleId)?.delete(deviceId);
          if (circles.get(dev.circleId)?.size === 0) {
            circles.delete(dev.circleId);
          }
          io.to(dev.circleId).emit('member_left', { deviceId });
        }

        socket.join(normCircle);
        socketToDevice.set(socket.id, deviceId);

        if (!dev) {
          dev = {
            deviceId,
            name: name || 'Family Member',
            circleId: normCircle,
            socketId: socket.id,
            lastSeen: Date.now(),
            latitude: 25.4358 + (Math.random() - 0.5) * 0.002,
            longitude: 81.8463 + (Math.random() - 0.5) * 0.002,
            accuracy: 3.0,
            battery: 90,
            color: color || '#4ADE80',
          };
        } else {
          dev.socketId = socket.id;
          dev.circleId = normCircle;
          if (name) dev.name = name;
          if (color) dev.color = color;
          dev.lastSeen = Date.now();
        }

        devices.set(deviceId, dev);

        if (!circles.has(normCircle)) circles.set(normCircle, new Set());
        circles.get(normCircle)!.add(deviceId);

        console.log(`[DEVICE JOINED] ${dev.name} (${deviceId}) joined Circle [${normCircle}]`);

        // Send current circle members to the newcomer
        const circleMembers = getCircleDevices(normCircle);
        socket.emit('circle_members', { circleId: normCircle, members: circleMembers });

        // Notify other circle members
        socket.to(normCircle).emit('member_joined', {
          deviceId: dev.deviceId,
          name: dev.name,
          circleId: normCircle,
          latitude: dev.latitude,
          longitude: dev.longitude,
          timestamp: dev.lastSeen,
          battery: dev.battery,
          color: dev.color,
        });
      }
    );

    // Push live location from client device
    socket.on('push_location', (data: LocationData) => {
      const {
        deviceId,
        circleId = DEFAULT_CIRCLE,
        latitude,
        longitude,
        timestamp = Date.now(),
        accuracy = 3.0,
        name = '',
        heading,
        battery,
        color,
      } = data;

      if (!deviceId) return;
      const normCircle = circleId.toUpperCase();
      socket.join(normCircle);

      let existing = devices.get(deviceId);
      if (existing) {
        if (existing.circleId !== normCircle) {
          socket.leave(existing.circleId);
          circles.get(existing.circleId)?.delete(deviceId);
          if (circles.get(existing.circleId)?.size === 0) {
            circles.delete(existing.circleId);
          }
          existing.circleId = normCircle;
        }
        existing.latitude = latitude;
        existing.longitude = longitude;
        existing.lastSeen = timestamp;
        existing.accuracy = accuracy;
        existing.socketId = socket.id;
        if (name) existing.name = name;
        if (heading !== undefined) existing.heading = heading;
        if (battery !== undefined) existing.battery = battery;
        if (color) existing.color = color;
        devices.set(deviceId, existing);
      } else {
        existing = {
          deviceId,
          name: name || 'Family Member',
          circleId: normCircle,
          socketId: socket.id,
          lastSeen: timestamp,
          latitude,
          longitude,
          accuracy,
          heading,
          battery: battery ?? 95,
          color: color || '#4ADE80',
        };
        devices.set(deviceId, existing);
      }

      if (!circles.has(normCircle)) circles.set(normCircle, new Set());
      circles.get(normCircle)!.add(deviceId);

      const locData: LocationData = {
        deviceId,
        circleId: normCircle,
        latitude,
        longitude,
        timestamp,
        accuracy,
        name: name || existing.name || 'Family Member',
        heading,
        battery: battery ?? existing.battery,
        color: color || existing.color,
      };

      // Emit to circle room
      io.to(normCircle).emit('location_update', locData);
    });

    // Send distress alert
    socket.on(
      'send_distress',
      (data: {
        deviceId: string;
        name: string;
        circleId?: string;
        latitude: number;
        longitude: number;
      }) => {
        const normCircle = (data.circleId || DEFAULT_CIRCLE).toUpperCase();
        const alertPayload: DistressAlertData = {
          senderId: data.deviceId,
          senderName: data.name || 'Family Member',
          circleId: normCircle,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: Date.now(),
        };

        console.log(`[DISTRESS WS] Circle ${normCircle} sender: ${data.name}`);
        io.to(normCircle).emit('distress_alert', alertPayload);
        io.emit('distress_alert', alertPayload);
      }
    );

    socket.on('disconnect', () => {
      const devId = socketToDevice.get(socket.id);
      if (devId) {
        socketToDevice.delete(socket.id);
        const dev = devices.get(devId);
        if (dev) {
          dev.socketId = '';
          console.log(`[WS DISCONNECTED] Device: ${dev.name} (${devId})`);
        }
      }
    });
  });

  // Serve APK download directly for Wi-Fi connected family phones
  app.get(['/download', '/download/apk', '/FindMyFamily.apk'], (_req, res) => {
    const apkPath = path.join(process.cwd(), 'FindMyFamily.apk');
    res.download(apkPath, 'FindMyFamily.apk', (err) => {
      if (err && !res.headersSent) {
        res.status(404).send('APK not found or not built yet. Run npm run build:apk on the host.');
      }
    });
  });

  // Vite middleware / production serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`=================================================`);
    console.log(`Find My Family Server Hub Running on Port ${PORT}`);
    console.log(`Local Wi-Fi Network URL: http://192.168.31.97:${PORT}`);
    console.log(`Direct APK Download URL: http://192.168.31.97:${PORT}/download`);
    console.log(`Default Circle Room: ${DEFAULT_CIRCLE}`);
    console.log(`=================================================`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
