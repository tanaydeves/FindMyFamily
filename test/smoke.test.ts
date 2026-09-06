import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, ChildProcess } from 'node:child_process';
import path from 'node:path';
import { calculateDistance, calculateBearing, calculateArrowAngle, getRelativeDirectionAdvice } from '../src/services/navigationMath';
import { SmsService } from '../src/services/smsService';
import { io as ioClient } from 'socket.io-client';

describe('Navigation Math Service', () => {
  it('calculates 0 distance for identical coordinates', () => {
    const dist = calculateDistance(25.4358, 81.8463, 25.4358, 81.8463);
    assert.equal(dist, 0);
  });

  it('calculates accurate distance between coordinates', () => {
    // 0.001 deg latitude is roughly 111 meters
    const dist = calculateDistance(25.4358, 81.8463, 25.4368, 81.8463);
    assert.ok(dist >= 105 && dist <= 118, `Distance was ${dist}, expected ~111m`);
  });

  it('calculates cardinal bearings accurately', () => {
    // Due North
    const bearingNorth = calculateBearing(25.0, 80.0, 26.0, 80.0);
    assert.ok(Math.abs(bearingNorth - 0) < 1 || Math.abs(bearingNorth - 360) < 1);

    // Due East
    const bearingEast = calculateBearing(25.0, 80.0, 25.0, 81.0);
    assert.ok(Math.abs(bearingEast - 90) < 2, `Expected ~90, got ${bearingEast}`);

    // Due South
    const bearingSouth = calculateBearing(25.0, 80.0, 24.0, 80.0);
    assert.ok(Math.abs(bearingSouth - 180) < 1, `Expected ~180, got ${bearingSouth}`);

    // Due West
    const bearingWest = calculateBearing(25.0, 80.0, 25.0, 79.0);
    assert.ok(Math.abs(bearingWest - 270) < 2, `Expected ~270, got ${bearingWest}`);
  });

  it('calculates arrow needle angle relative to compass heading', () => {
    // Target is due East (90 deg). User faces East (90 deg). Arrow should point Straight Ahead (0 deg)
    const angle1 = calculateArrowAngle(25.0, 80.0, 25.0, 81.0, 90);
    assert.ok(Math.abs(angle1 - 0) < 2 || Math.abs(angle1 - 360) < 2);

    // Target is due East (90 deg). User faces North (0 deg). Arrow should point Right (90 deg)
    const angle2 = calculateArrowAngle(25.0, 80.0, 25.0, 81.0, 0);
    assert.ok(Math.abs(angle2 - 90) < 2);
  });

  it('provides localized relative direction advice', () => {
    assert.equal(getRelativeDirectionAdvice(0, 'en'), 'Straight Ahead');
    assert.equal(getRelativeDirectionAdvice(0, 'hi'), 'सीधे आगे बढ़ें (Straight Ahead)');
    assert.equal(getRelativeDirectionAdvice(0, 'mr'), 'सरळ पुढे जा (Straight Ahead)');

    assert.ok(getRelativeDirectionAdvice(90, 'en').includes('Right'));
    assert.ok(getRelativeDirectionAdvice(180, 'en').includes('Behind') || getRelativeDirectionAdvice(180, 'en').includes('Turn Around'));
    assert.ok(getRelativeDirectionAdvice(270, 'en').includes('Left'));
  });
});

describe('SMS Fallback Service', () => {
  it('encodes and parses location message roundtrip', () => {
    const encoded = SmsService.encodeLocationMessage('dev_123', 25.4358, 81.8463, 'Papa');
    const parsed = SmsService.parseSmsPayload(encoded);

    assert.ok(parsed !== null);
    assert.equal(parsed.deviceId, 'dev_123');
    assert.equal(parsed.name, 'Papa');
    assert.equal(parsed.isDistress, false);
    assert.equal(parsed.source, 'sms');
    assert.ok(Math.abs(parsed.latitude - 25.4358) < 0.0001);
    assert.ok(Math.abs(parsed.longitude - 81.8463) < 0.0001);
  });

  it('encodes and parses distress alert message roundtrip', () => {
    const encoded = SmsService.encodeDistressMessage('dev_456', 25.4358, 81.8463, 'Dadi');
    const parsed = SmsService.parseSmsPayload(encoded);

    assert.ok(parsed !== null);
    assert.equal(parsed.deviceId, 'dev_456');
    assert.equal(parsed.name, 'Dadi');
    assert.equal(parsed.isDistress, true);
    assert.equal(parsed.source, 'sms');
  });

  it('returns null for invalid or corrupted SMS', () => {
    assert.equal(SmsService.parseSmsPayload(''), null);
    assert.equal(SmsService.parseSmsPayload('Hello there!'), null);
    assert.equal(SmsService.parseSmsPayload('FMF_LOC:dev_123|not_a_number|81.8463'), null);
  });

  it('generates sanitized SMS URI', () => {
    const uri = SmsService.getSmsUri('+91 98765-43210', 'Test message');
    assert.equal(uri, 'sms:+919876543210?body=Test%20message');
  });
});

describe('Backend Server Hub Integration', () => {
  const SERVER_URL = 'http://localhost:3000';
  let serverProcess: ChildProcess | null = null;

  before(async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // Server not currently responding, proceed to start
    }

    const tsxCli = path.resolve('node_modules/tsx/dist/cli.mjs');
    serverProcess = spawn(process.execPath, [tsxCli, 'server.ts'], {
      stdio: 'ignore',
      env: { ...process.env, PORT: '3000' },
      windowsHide: true,
    });

    const start = Date.now();
    while (Date.now() - start < 15000) {
      try {
        const res = await fetch(`${SERVER_URL}/api/health`);
        if (res.ok) return;
      } catch {
        await new Promise((r) => setTimeout(r, 250));
      }
    }
    throw new Error('Server failed to start within 15 seconds');
  });

  after(() => {
    if (serverProcess && serverProcess.pid) {
      try {
        process.kill(serverProcess.pid, 'SIGKILL');
      } catch {
        // Process might have already exited
      }
    }
  });

  it('responds to health check endpoint', async () => {
    const res = await fetch(`${SERVER_URL}/api/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.ok('totalDevices' in data);
  });

  it('registers and updates location via REST API', async () => {
    const devId = `smoke_test_${Date.now()}`;
    const locPayload = {
      latitude: 25.4360,
      longitude: 81.8470,
      circleId: 'SMOKE-TEST',
      name: 'Smoke Tester',
      battery: 88,
    };

    const postRes = await fetch(`${SERVER_URL}/api/devices/${devId}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locPayload),
    });
    assert.equal(postRes.status, 200);
    const postData = await postRes.json();
    assert.equal(postData.success, true);
    assert.equal(postData.location.deviceId, devId);

    // Verify it is listed in the circle
    const circleRes = await fetch(`${SERVER_URL}/api/circles/SMOKE-TEST/devices`);
    assert.equal(circleRes.status, 200);
    const circleData = await circleRes.json();
    assert.ok(circleData.members.some((m: any) => m.deviceId === devId));
  });

  it('pairs devices via REST API', async () => {
    const devA = `smoke_a_${Date.now()}`;
    const devB = `smoke_b_${Date.now()}`;

    const res = await fetch(`${SERVER_URL}/api/devices/${devA}/pair`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetDeviceId: devB }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
  });

  it('triggers distress alert via REST API', async () => {
    const devId = `distress_dev_${Date.now()}`;
    const alertPayload = {
      name: 'Distressed Member',
      circleId: 'SMOKE-TEST',
      latitude: 25.4358,
      longitude: 81.8463,
    };

    const res = await fetch(`${SERVER_URL}/api/devices/${devId}/lost-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alertPayload),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.alert.senderId, devId);
  });

  it('communicates via WebSocket (register, location, distress)', async () => {
    const socketA = ioClient(SERVER_URL, { transports: ['websocket'] });
    const socketB = ioClient(SERVER_URL, { transports: ['websocket'] });

    await Promise.all([
      new Promise<void>((resolve) => socketA.on('connect', () => resolve())),
      new Promise<void>((resolve) => socketB.on('connect', () => resolve())),
    ]);

    const circleId = `WS-TEST-${Date.now()}`;
    const devA = `ws_a_${Date.now()}`;
    const devB = `ws_b_${Date.now()}`;

    // Register A and B and wait for server to ack join via circle_members
    const regA = new Promise<void>((res) => socketA.once('circle_members', () => res()));
    const regB = new Promise<void>((res) => socketB.once('circle_members', () => res()));

    socketA.emit('register', { deviceId: devA, name: 'Alice', circleId });
    socketB.emit('register', { deviceId: devB, name: 'Bob', circleId });

    await Promise.all([regA, regB]);

    // Wait for B to receive location update from A
    const locPromise = new Promise<any>((resolve) => {
      socketB.on('location_update', (loc) => {
        if (loc.deviceId === devA) resolve(loc);
      });
    });

    socketA.emit('push_location', {
      deviceId: devA,
      circleId,
      name: 'Alice',
      latitude: 25.4400,
      longitude: 81.8500,
      battery: 92,
    });

    const receivedLoc = await locPromise;
    assert.equal(receivedLoc.deviceId, devA);
    assert.equal(receivedLoc.latitude, 25.4400);

    // Wait for B to receive distress alert from A
    const distressPromise = new Promise<any>((resolve) => {
      socketB.on('distress_alert', (alert) => {
        if (alert.senderId === devA) resolve(alert);
      });
    });

    socketA.emit('send_distress', {
      deviceId: devA,
      name: 'Alice',
      circleId,
      latitude: 25.4400,
      longitude: 81.8500,
    });

    const receivedAlert = await distressPromise;
    assert.equal(receivedAlert.senderId, devA);
    assert.equal(receivedAlert.senderName, 'Alice');

    socketA.disconnect();
    socketB.disconnect();
  });

  it('correctly migrates circle membership when switching circles', async () => {
    const devId = `migrating_dev_${Date.now()}`;
    const circle1 = `CAMP1_${Date.now()}`;
    const circle2 = `CAMP2_${Date.now()}`;

    // Join circle 1
    await fetch(`${SERVER_URL}/api/devices/${devId}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        circleId: circle1,
        latitude: 25.4358,
        longitude: 81.8463,
        name: 'Camp Wanderer',
      }),
    });

    const c1Res = await fetch(`${SERVER_URL}/api/circles/${circle1}/devices`);
    const c1Data = await c1Res.json();
    assert.ok(c1Data.members.some((m: any) => m.deviceId === devId));

    // Switch to circle 2
    await fetch(`${SERVER_URL}/api/devices/${devId}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        circleId: circle2,
        latitude: 25.4360,
        longitude: 81.8465,
        name: 'Camp Wanderer',
      }),
    });

    // Verify it is in circle 2
    const c2Res = await fetch(`${SERVER_URL}/api/circles/${circle2}/devices`);
    const c2Data = await c2Res.json();
    assert.ok(c2Data.members.some((m: any) => m.deviceId === devId));

    // Verify it is NO LONGER in circle 1
    const c1AfterRes = await fetch(`${SERVER_URL}/api/circles/${circle1}/devices`);
    const c1AfterData = await c1AfterRes.json();
    assert.ok(!c1AfterData.members.some((m: any) => m.deviceId === devId));
  });

  it('auto-registers device profile on push_location before register', async () => {
    const socket = ioClient(SERVER_URL, { transports: ['websocket'] });
    await new Promise<void>((resolve) => socket.on('connect', () => resolve()));

    const devId = `auto_reg_${Date.now()}`;
    const circleId = `AUTOREG_${Date.now()}`;

    socket.emit('push_location', {
      deviceId: devId,
      circleId,
      name: 'Pushed First',
      latitude: 25.4410,
      longitude: 81.8510,
      battery: 85,
    });

    // Wait a brief moment for server to process
    await new Promise((r) => setTimeout(r, 100));

    const res = await fetch(`${SERVER_URL}/api/circles/${circleId}/devices`);
    const data = await res.json();
    assert.ok(data.members.some((m: any) => m.deviceId === devId));

    socket.disconnect();
  });

  describe('QR-Tag Lost Child Recovery System (Part 8 Task List)', () => {
    let testQrId = '';

  it('1. retrieves volunteer centers list (data-driven)', async () => {
    const res = await fetch(`${SERVER_URL}/api/volunteer-centers`);
    assert.equal(res.status, 200);
    const centers = await res.json();
    assert.ok(Array.isArray(centers));
    assert.ok(centers.length > 0);
    assert.ok(centers.some((c: any) => c.center_id === 'center-sangam'));
  });

  it('2. generates batch unassigned QR tags for volunteer desk stock', async () => {
    const res = await fetch(`${SERVER_URL}/api/qr-tags/generate-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ count: 2, prefix: 'QR-TEST' }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.tags.length, 2);
    testQrId = data.tags[0].qr_id;
    assert.ok(testQrId.startsWith('QR-TEST-'));
  });

  it('3. checks public tag status for UNASSIGNED state', async () => {
    const res = await fetch(`${SERVER_URL}/api/lost/${testQrId}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'unassigned');
    assert.equal(data.qr_id, testQrId);
    assert.ok(data.volunteerCenters && data.volunteerCenters.length > 0);
    assert.ok(data.message.includes('nearest volunteer center'));
  });

  it('4. rejects child linking when mandatory fields are missing', async () => {
    const res = await fetch(`${SERVER_URL}/api/children/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qr_id: testQrId, mother_name: 'Pooja' }), // missing father_name and contact_number_primary
    });
    assert.equal(res.status, 400);
  });

  it('5. links child profile and transitions QR status to ASSIGNED', async () => {
    const linkPayload = {
      qr_id: testQrId,
      child_name: 'Aarav Sharma',
      mother_name: 'Pooja Sharma',
      father_name: 'Rohit Sharma',
      photo_url: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=300',
      contact_number_primary: '+919876543210',
      contact_number_secondary: '+919876543211',
      language_pref: 'hi',
      created_by_user_id: 'test_parent_device_1',
    };

    const res = await fetch(`${SERVER_URL}/api/children/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(linkPayload),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.child.qr_id, testQrId);
    assert.equal(data.child.child_name, 'Aarav Sharma');
  });

  it('6. rejects re-linking an already ASSIGNED QR tag (state machine guard)', async () => {
    const duplicatePayload = {
      qr_id: testQrId,
      child_name: 'Another Child',
      mother_name: 'Meena',
      father_name: 'Raj',
      contact_number_primary: '+919111122222',
      language_pref: 'en',
    };

    const res = await fetch(`${SERVER_URL}/api/children/link`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duplicatePayload),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('already in use'));
  });

  it('7. checks public tag status for ASSIGNED state (protects parent privacy)', async () => {
    const res = await fetch(`${SERVER_URL}/api/lost/${testQrId}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'assigned');
    assert.equal(data.child.child_name, 'Aarav Sharma');
    assert.ok(data.child.photo_url);
    // Crucial privacy check: parent phone number MUST NOT be exposed on public web endpoint
    assert.equal((data.child as any).contact_number_primary, undefined);
    assert.equal((data.child as any).contact_number_secondary, undefined);
  });

  it('8. submits bystander "Mark as Lost" report and triggers alert', async () => {
    const alertPayload = {
      qr_id: testQrId,
      finder_lat: 25.4380,
      finder_lng: 81.8620,
      finder_landmark_note: 'Sector 4 Administrative Center - Near Gate 3',
      finder_contact_optional: '+919998887776',
    };

    const res = await fetch(`${SERVER_URL}/api/lost-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'IntegrationTestBrowser/1.0',
      },
      body: JSON.stringify(alertPayload),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.alert.qr_id, testQrId);
    assert.equal(data.alert.status, 'open');
    assert.equal(data.alert.finder_contact_optional, '+919998887776');
  });

  it('9. enforces anti-misuse safeguard against duplicate reports for same QR', async () => {
    const duplicateAlert = {
      qr_id: testQrId,
      finder_landmark_note: 'Spam report attempt',
    };

    const res = await fetch(`${SERVER_URL}/api/lost-alerts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duplicateAlert),
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('already in progress'));
  });

  it('10. checks public tag status for LOST_FLAGGED state', async () => {
    const res = await fetch(`${SERVER_URL}/api/lost/${testQrId}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'lost_flagged');
    assert.ok(data.message.includes('already been reported'));
    assert.ok(data.activeAlert);
  });

  it('11. manages alerts feed, acknowledge, and resolve on Dashboard', async () => {
    // 1. Fetch dashboard alerts
    const listRes = await fetch(`${SERVER_URL}/api/dashboard/alerts?role=police`);
    assert.equal(listRes.status, 200);
    const alerts = await listRes.json();
    const myAlert = alerts.find((a: any) => a.qr_id === testQrId);
    assert.ok(myAlert, 'Created alert must be present in dashboard feed');
    assert.equal(myAlert.status, 'open');

    // 2. Acknowledge alert
    const ackRes = await fetch(`${SERVER_URL}/api/dashboard/alerts/${myAlert.alert_id}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'volunteer_sector4' }),
    });
    assert.equal(ackRes.status, 200);
    const ackData = await ackRes.json();
    assert.equal(ackData.alert.status, 'acknowledged');

    // 3. Resolve alert with reunion confirmation
    const resolveRes = await fetch(`${SERVER_URL}/api/dashboard/alerts/${myAlert.alert_id}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'police_officer_raj' }),
    });
    assert.equal(resolveRes.status, 200);
    const resolveData = await resolveRes.json();
    assert.equal(resolveData.alert.status, 'resolved');
    // Policy verification: Tag is cascade retired
    assert.equal(resolveData.tag.status, 'retired');

    // 4. Verify tag is now retired on status endpoint
    const finalTagRes = await fetch(`${SERVER_URL}/api/lost/${testQrId}`);
    assert.equal(finalTagRes.status, 200);
    const finalTagData = await finalTagRes.json();
    assert.equal(finalTagData.status, 'retired');
  });
  });
});


