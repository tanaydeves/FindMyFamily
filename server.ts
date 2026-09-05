import express from 'express';
import http from 'http';
import path from 'path';
import cors from 'cors';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';

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
  const PORT = process.env.PORT || 3000;

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
    const existing = devices.get(deviceId) || {
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
    if (circleId) existing.circleId = normCircle;
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

        socket.join(normCircle);
        socketToDevice.set(socket.id, deviceId);

        let dev = devices.get(deviceId);
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

      const existing = devices.get(deviceId);
      if (existing) {
        existing.latitude = latitude;
        existing.longitude = longitude;
        existing.lastSeen = timestamp;
        existing.accuracy = accuracy;
        if (name) existing.name = name;
        if (heading !== undefined) existing.heading = heading;
        if (battery !== undefined) existing.battery = battery;
        if (color) existing.color = color;
        devices.set(deviceId, existing);
      }

      const locData: LocationData = {
        deviceId,
        circleId: normCircle,
        latitude,
        longitude,
        timestamp,
        accuracy,
        name: name || existing?.name || 'Family Member',
        heading,
        battery,
        color: color || existing?.color,
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
