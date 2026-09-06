# FindMyFamily Architecture Documentation

> A real-time family location-sharing app built for crowded events like Kumbh Mela, with offline SMS fallback.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Frontend](#3-frontend)
4. [Backend](#4-backend)
5. [Storage](#5-storage)
6. [Authentication and Identity](#6-authentication-and-identity)
7. [Maps and Navigation](#7-maps-and-navigation)
8. [Communication Layers](#8-communication-layers)
9. [Native Android Layer](#9-native-android-layer)
10. [Deployment](#10-deployment)
11. [Build Scripts](#11-build-scripts)
12. [Environment Variables](#12-environment-variables)
13. [Data Flow Diagrams](#13-data-flow-diagrams)

---

## 1. Project Overview

**FindMyFamily** is a cross-platform (Web + Android APK) real-time location tracking app designed for large crowded events like Kumbh Mela. It allows family members to share their GPS location within a named "Circle" (group), view each other on a live map, and trigger distress alerts — even when offline via SMS fallback.

### Key Goals

- **No-account, zero-friction onboarding** — Identity is device-generated, no sign-in required.
- **Multi-transport resilience** — WebSocket to HTTP polling to SMS fallback, in order of preference.
- **Offline-first** — Full offline mode with SMS coordinate broadcasting.
- **Cross-platform** — Runs as a web app and as a native Android APK via Capacitor.

---

## 2. High-Level Architecture

```
+-----------------------------------------------------+
|                   CLIENT (React SPA)                |
|                                                     |
|  +-----------+  +----------+  +----------------+   |
|  | React UI  |  | Services |  | Capacitor      |   |
|  | Components|  | Layer    |  | Native Plugins |   |
|  +-----+-----+  +----+-----+  +-------+--------+   |
|        |              |               |             |
|        +--------------+---------------+             |
|                       |                             |
+---------------------- | ----------------------------+
                        | WebSocket / HTTP REST
                        v
+-----------------------------------------------------+
|             SERVER (Node.js / Express)              |
|                                                     |
|  +------------+   +------------+                   |
|  | REST API   |   | Socket.IO  |                   |
|  | Endpoints  |   | Real-time  |                   |
|  +------+-----+   +------+-----+                   |
|         |                |                         |
|         +----------------+                         |
|                  |                                  |
|       +----------v----------+                       |
|       | In-Memory State     |                       |
|       | (Map<deviceId,...>) |                       |
|       +---------------------+                       |
+-----------------------------------------------------+
                        | SMS (offline fallback)
                        v
               +-----------------+
               | Android Native  |
               | SMS Send/Receive|
               +-----------------+
```

---

## 3. Frontend

### Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 19.0.1 |
| Language | TypeScript | ~5.8.2 |
| Build Tool | Vite | 6.2.3 |
| CSS | Tailwind CSS v4 | 4.1.14 |
| Icons | Lucide React | 0.546.0 |
| Animations | Motion (Framer Motion) | 12.23.24 |
| Real-time | Socket.IO Client | 4.8.3 |

### Application Entry Points

| File | Role |
|---|---|
| `index.html` | HTML shell — loads Leaflet CDN, injects `<script>` |
| `src/main.tsx` | React root mount |
| `src/App.tsx` | Root component: state orchestrator, routing logic |
| `src/index.css` | Global CSS / Tailwind base |
| `src/types.ts` | All shared TypeScript types and interfaces |

### Screen / Component Architecture

The app uses a **single-page tab-based router** managed entirely via React state in `App.tsx`. There is **no React Router** — navigation is state-driven.

#### Onboarding Flow (sequential gate)

```
splash --> permissions --> language --> done (main app)
```

| Screen | File | Description |
|---|---|---|
| `SplashScreen` | `SplashScreen.tsx` | Animated brand splash, auto-advances |
| `PermissionsScreen` | `PermissionsScreen.tsx` | Requests GPS, SMS, Bluetooth permissions |
| `LanguageSelectScreen` | `LanguageSelectScreen.tsx` | Picks app language (English / Hindi / Marathi) |

#### Main App Tabs (after onboarding)

| Tab Key | Component | Description |
|---|---|---|
| `family` | `HomeScreen.tsx` | Family circle member list, distress banner |
| `map` | `MapScreen.tsx` | Live Leaflet map with member pins |
| `track` | `ArrowScreen.tsx` | Compass-based direction arrow to selected member |
| `settings` | `SettingsHubScreen.tsx` | App configuration and settings |
| `radar` | `RadarScreen.tsx` | Perimeter radar view (overlays on top of tab) |

#### Modals and Sheets

| Component | Purpose |
|---|---|
| `AddMemberSheet.tsx` | Add a family member by Device ID, QR, or SMS |
| `InviteCircleScreen.tsx` | Generate and share circle invite links / QR codes |
| `RoomsScreen.tsx` | Switch between named circles/rooms |
| `ProfileScreen.tsx` | Edit user name, color, phone number |
| `ConnectionSettingsScreen.tsx` | Change relay server URL |
| `DistressConfirmModal.tsx` | Confirm before sending distress alert |
| `HelpSafetyModal.tsx` | In-app help documentation |
| `SmsHubModal.tsx` | SMS-based offline location hub |
| `MultiDeviceModal.tsx` | Multi-device simulation/testing panel |
| `NavDrawer.tsx` | Hamburger side navigation drawer |

#### Persistent Layout Components

| Component | Purpose |
|---|---|
| `TopAppBar.tsx` | Title bar with hamburger icon and profile avatar |
| `BottomNavBar.tsx` | 4-tab bottom navigation (Family, Map, Track, Settings) |

### Services Layer (`src/services/`)

| Service | File | Responsibility |
|---|---|---|
| `relayClient` | `relayClient.ts` | Socket.IO + REST hybrid client for real-time comms |
| `batteryService` | `batteryService.ts` | Live device battery % monitoring via Web Battery API |
| `audioHaptics` | `audioHaptics.ts` | Distress siren audio and haptic vibration |
| `smsService` | `smsService.ts` | SMS message encoding/decoding (FMF_LOC / FMF_LOST) |
| `navigationMath` | `navigationMath.ts` | Haversine distance, bearing, arrow angle calculations |
| `nativeSync` | `nativeSync.ts` | Capacitor plugin bridge for native SMS send/receive |
| `qrGenerator` | `qrGenerator.ts` | QR code generation for invite links |

### State Management

State is managed entirely via **React `useState` hooks** in `App.tsx`, passed down as props. No external state library (Redux/Zustand) is used.

Key state variables in `App.tsx`:

| State | Type | Persisted To |
|---|---|---|
| `myDeviceId` | `string` | `localStorage` |
| `myDeviceName` | `string` | `localStorage` |
| `myColor` | `string` | `localStorage` |
| `circleId` | `string` | `localStorage` |
| `pairedMembers` | `FamilyMember[]` | `localStorage` |
| `myLocation` | `{latitude, longitude}` | Reactive (GPS watcher) |
| `compassHeading` | `number` | Reactive (DeviceOrientation API) |
| `myBattery` | `number` | Reactive (BatteryService) |
| `lang` | `LanguageCode` | `localStorage` |

---

## 4. Backend

### Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | Current LTS |
| Framework | Express | 4.21.2 |
| Real-time | Socket.IO | 4.8.3 |
| Language | TypeScript (via tsx) | ~5.8.2 |
| Dev Execution | tsx (direct TS execution) | 4.21.0 |
| Production Build | esbuild | 0.25.0 |

### Server Entry Point

```
server.ts  <--  Single file: Express + Socket.IO + Vite middleware (dev) / static serving (prod)
```

### REST API Endpoints

All routes are available with or without the `/api` prefix for compatibility.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Server health check — returns device/socket counts |
| `GET` | `/circles/:circleId/devices` | List all members in a circle |
| `GET` | `/devices` | List all connected devices globally |
| `POST` | `/devices/:deviceId/location` | Update device location via HTTP (polling fallback) |
| `POST` | `/devices/:deviceId/pair` | Create explicit 1-on-1 device pairing |
| `POST` | `/devices/:deviceId/lost-alert` | Broadcast distress alert to circle |
| `GET` | `/download` | Serve the FindMyFamily.apk for Wi-Fi distribution |

### Socket.IO Events

#### Client to Server

| Event | Payload | Description |
|---|---|---|
| `register` | `{ deviceId, name, circleId, color }` | Join a circle room |
| `push_location` | `LocationData` | Push live GPS update |
| `send_distress` | `{ deviceId, name, circleId, lat, lng }` | Send distress alert |

#### Server to Client

| Event | Payload | Description |
|---|---|---|
| `circle_members` | `{ circleId, members[] }` | Initial member list on join |
| `member_joined` | `LocationData` | New member joined the circle |
| `location_update` | `LocationData` | Another device's location changed |
| `distress_alert` | `DistressAlertData` | Incoming distress from circle member |
| `all_locations` | `DeviceProfile[]` | Global broadcast after REST location update |
| `paired` | `{ pairedDeviceId }` | Confirmation of successful device pairing |

### In-Memory State Store

The server maintains all state in **RAM** — there is no database. State is lost on server restart.

```typescript
devices:        Map<deviceId, DeviceProfile>   // All registered devices
circles:        Map<circleId, Set<deviceId>>   // Circle room membership
socketToDevice: Map<socketId, deviceId>        // Socket to device mapping
directPairings: Map<deviceId, Set<deviceId>>   // Explicit 1-on-1 pairs
```

> **Default Circle:** `KUMBH-2026`. Devices that join without specifying a circle are placed here automatically.

---

## 5. Storage

### No Database — All In-Memory or Local

| Storage Layer | Scope | What It Stores | Persistence |
|---|---|---|---|
| **Server RAM** (`Map<>`) | Server | Device profiles, circle membership, socket mappings | Lost on restart |
| **`localStorage`** | Browser/WebView | Device ID, name, color, circle ID, server URL, paired members, language | Persists across app restarts |
| **Web Battery API** | Browser/Device | Battery level (polled live) | Not persisted |

### localStorage Keys

| Key | Type | Purpose |
|---|---|---|
| `fmf_my_device_id` | `string` | Unique device identity |
| `fmf_my_device_name` | `string` | User display name |
| `fmf_my_color` | `string` | Avatar hex color |
| `fmf_my_phone` | `string` | Phone number for SMS |
| `fmf_my_battery` | `string` | Battery fallback value |
| `fmf_circle_id` | `string` | Current circle/room name |
| `fmf_server_url` | `string` | Custom relay server URL |
| `fmf_lang` | `LanguageCode` | Selected language (en/hi/mr) |
| `fmf_paired_members` | JSON string | Array of `FamilyMember` objects |

---

## 6. Authentication and Identity

> **FindMyFamily has no traditional authentication.** There are no accounts, passwords, or tokens.

### Device Identity Model

Each device gets a **randomly generated device ID** on first launch:

```typescript
const gen = `dev_${Math.random().toString(36).substring(2, 7)}`;
localStorage.setItem('fmf_my_device_id', gen);
```

This ID is:
- Persisted in `localStorage` to survive app restarts
- Used as the unique key on the server
- Included in every location push and distress alert

### Circle Identity

Family groups are identified by a **Circle ID** (e.g., `KUMBH-2026`). Anyone knowing the Circle ID can join. There is no access control — circles are purely name-based rooms.

Circle ID can be set via:
1. **URL parameter** — `?circle=MY_FAMILY_2026`
2. **Rooms screen** in the app UI
3. **QR code invite** generated by `InviteCircleScreen`

### Security Model

| Threat | Mitigation |
|---|---|
| Unauthorized circle access | None — circles are open by name (by design) |
| Fake device IDs | None — IDs are client-generated |
| Data eavesdropping | HTTPS in production (Render.com TLS termination) |

> This is intentional — the app prioritizes frictionless family reunification over strict security.

---

## 7. Maps and Navigation

### Map Library: Leaflet (loaded via CDN)

The map is loaded via `<script>` tag in `index.html`, not via npm. It is declared as a global type:

```typescript
// MapScreen.tsx
declare const L: any;
```

**Tile Provider:** OpenStreetMap (free, no API key required)

```
https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
Subdomains: a, b, c  |  Max Zoom: 19
```

### Map Features

| Feature | Implementation |
|---|---|
| "Me" marker | Animated pulsing green circle (CSS `ping` animation via `DivIcon`) |
| Family member pins | Color-coded `DivIcon` with name label and battery % badge |
| Selected member route | Dashed polyline — color `#1B4332`, `dashArray: '8,8'` |
| Fit All | `L.latLngBounds(points).fitBounds()` with 50px padding |
| Re-center on me | `map.setView()` / `map.panTo()` |
| External directions | Opens `google.com/maps` walking directions URL in new tab |

### Navigation Math (`src/services/navigationMath.ts`)

All spatial calculations are done **client-side** using pure TypeScript math — no external mapping API needed.

| Function | Algorithm | Output |
|---|---|---|
| `calculateDistance()` | Haversine formula (Earth R = 6371 km) | Distance in meters |
| `calculateBearing()` | Great-Circle initial bearing | Cardinal direction 0–360 degrees |
| `calculateArrowAngle()` | `(bearing - compassHeading + 360) % 360` | UI arrow needle rotation angle |
| `getRelativeDirectionAdvice()` | 8-sector angle bucketing | Human-readable direction in EN / HI / MR |

### Compass Integration

Device orientation is read from the Web `DeviceOrientation` API:

```typescript
window.addEventListener('deviceorientation', (e) => {
  // iOS uses: e.webkitCompassHeading
  // Android uses: (360 - e.alpha) % 360
});
```

---

## 8. Communication Layers

FindMyFamily uses a **three-tier fallback communication** strategy, automatically degrading when a higher tier is unavailable.

### Tier 1 — WebSocket (Socket.IO) — Primary

- Transport: WebSocket with long-polling fallback
- Reconnection: 30 attempts, 1s delay, 8s timeout
- Location push interval: every **4 seconds**
- Key events: `push_location`, `register`, `send_distress`

### Tier 2 — HTTP REST — Network Fallback

Used automatically when WebSocket is disconnected.

- `POST /api/devices/:id/location` — location updates
- `POST /api/devices/:id/lost-alert` — distress alerts
- `GET /api/circles/:id/devices` — fetch member list

### Tier 3 — SMS — Offline Fallback

Activates when `isOffline = true` OR when a network push fails.

Sends compact encoded strings to all paired members' phone numbers.

**SMS Message Formats:**

| Type | Format |
|---|---|
| Location | `FMF_LOC:deviceId|lat|lng|timestamp|name` |
| Distress | `FMF_LOST:deviceId|lat|lng|timestamp|name` |

Incoming SMS is intercepted natively on Android via the `NativeSync` Capacitor plugin, parsed by `smsService.parseSmsPayload()`, and merged into the `pairedMembers` React state.

---

## 9. Native Android Layer

### Capacitor Configuration

```typescript
// capacitor.config.ts
{
  appId: 'com.kumbhathon.findmyfamily',
  appName: 'Find My Family',
  webDir: 'dist',
  server: { androidScheme: 'https', cleartext: true },
  android: { allowMixedContent: true }
}
```

### Capacitor Plugins Used

| Plugin | Package | Purpose |
|---|---|---|
| Core | `@capacitor/core` | Plugin registration, `Capacitor.isNativePlatform()` |
| Android | `@capacitor/android` | Android runtime bridge |
| NativeSync | Custom (`nativeSync.ts`) | SMS send/receive, Bluetooth and SMS permissions |

### Custom Capacitor Plugin: NativeSync

Registered via `registerPlugin<NativeSyncPlugin>('NativeSync')`.

**Exposed Methods:**

```typescript
requestBluetoothPermissions(): Promise<{ bluetooth: string }>
requestSmsPermissions():       Promise<{ sms: string }>
checkAllPermissions():         Promise<{ bluetooth: string; sms: string }>
sendSMS({ phoneNumber, message }): Promise<{ success: boolean }>
addListener('smsReceived', fn): Promise<PluginListenerHandle>
```

The corresponding native Android (Java/Kotlin) implementation lives in the `/android` directory and is managed by Android Studio.

---

## 10. Deployment

### Production: Render.com

The app is deployed to **Render.com** as a Node.js web service.

| Setting | Value |
|---|---|
| Default server URL | `https://findmyfamily.onrender.com` |
| Protocol | HTTPS (TLS terminated by Render) |
| Port | `process.env.PORT` (defaults to `3000`) |
| Bind address | `0.0.0.0` |

**Client-side server URL auto-detection:**
1. Checks `localStorage['fmf_server_url']` for custom override
2. Falls back to `window.location.origin` if running on a real host
3. Falls back to `https://findmyfamily.onrender.com`

### Local Wi-Fi Mode (Kumbh Mela use-case)

The server can run on a laptop on a shared Wi-Fi network. Family members on the same network can:
1. Visit `http://<laptop-ip>:3000` to use the web app
2. Download the APK directly via `http://<laptop-ip>:3000/download`

The server logs the local IP on startup:

```
Find My Family Server Hub Running on Port 3000
Local Wi-Fi Network URL: http://192.168.31.97:3000
Direct APK Download URL: http://192.168.31.97:3000/download
```

### Development Mode

```bash
npm run dev
# Starts tsx server.ts (Express + Vite HMR middleware on a single port)
```

In development, Vite runs as **middleware inside Express** — not a separate port — enabling HMR.

### Production Mode

```bash
npm run build
# Vite builds frontend to /dist
# esbuild bundles server.ts to dist/server.cjs

npm run start
# node dist/server.cjs — serves /dist SPA + Socket.IO
```

---

## 11. Build Scripts

| Script | Command | Description |
|---|---|---|
| `dev` | `tsx server.ts` | Dev server with Vite HMR middleware |
| `build` | `vite build && esbuild server.ts --bundle ...` | Build frontend + compile server |
| `start` | `node dist/server.cjs` | Run production server |
| `preview` | `vite preview` | Preview Vite production build only |
| `cap:sync` | `vite build && cap sync` | Build frontend and sync to Android project |
| `cap:open` | `cap open android` | Open Android project in Android Studio |
| `build:apk` | `vite build && cap sync && gradlew assembleDebug` | Full Android APK build pipeline |
| `lint` | `tsc --noEmit` | TypeScript type checking (no emit) |

---

## 12. Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Express server listening port |
| `NODE_ENV` | — | `production` switches from Vite middleware to static file serving |
| `GEMINI_API_KEY` | — | Google Gemini AI API key (for AI-powered features) |
| `APP_URL` | — | Cloud Run hosted URL for self-referential links and callbacks |
| `DISABLE_HMR` | — | Set to `true` in AI Studio to disable Vite HMR and file watching |

---

## 13. Data Flow Diagrams

### Location Update Flow (Online)

```
[Device GPS]
     |  navigator.geolocation.watchPosition()
     v
[App.tsx: myLocation state]
     |  every 4 seconds (setInterval)
     v
[relayClient.pushLocation()]
     |
     +-- if socket connected -->  Socket.IO: emit('push_location')
     |                                 |
     |                                 v  Server
     |                          io.to(circleId).emit('location_update')
     |                                 |
     |                                 v  Other Devices
     |                          socket.on('location_update')
     |                          --> setPairedMembers(updated)
     |
     +-- if NOT connected --> HTTP POST /api/devices/:id/location
                                       |
                                       v  Server
                                io.to(circleId).emit('location_update')
```

### Distress Alert Flow

```
[User taps SOS button]
     |
     v
[DistressConfirmModal: user confirms]
     |
     v
[handleTriggerDistressAlert()]
     |
     +-- audioHaptics.startDistressSiren()
     |
     +-- relayClient.sendDistressAlert()
     |       |
     |       +-- socket.emit('send_distress') --> Server --> circle broadcast
     |       +-- POST /api/devices/:id/lost-alert  (redundant HTTP backup)
     |
     +-- if offline --> sendSmsToPairedMembers(isDistress=true)
                              |
                              v
                  NativeSync.sendSMS() for each member.phone
```

### SMS Offline Receive Flow

```
[Android device receives SMS]
     |  NativeSync Capacitor plugin intercepts it
     v
[NativeSync.addListener('smsReceived')]
     |
     v
[SmsService.parseSmsPayload(body)]
     |  Checks for FMF_LOC: or FMF_LOST: prefix
     v
[handleReceiveParsedSms(parsed)]
     |
     +-- if isDistress --> audioHaptics.startDistressSiren()
     |                 --> setIncomingDistress(alert)
     |
     +-- setPairedMembers(updated with new lat/lng, source: 'sms')
```

---

## Appendix: Key Files Reference

| File | Path | Role |
|---|---|---|
| App Root | `src/App.tsx` | Global state, routing, lifecycle effects |
| Server | `server.ts` | Node.js backend: REST API + WebSocket |
| Relay Client | `src/services/relayClient.ts` | Client-side Socket.IO / HTTP hybrid |
| Types | `src/types.ts` | Shared TypeScript interfaces |
| Map Screen | `src/components/MapScreen.tsx` | Leaflet map integration |
| Navigation Math | `src/services/navigationMath.ts` | Haversine distance and bearing |
| SMS Service | `src/services/smsService.ts` | SMS message encode/decode |
| Native Bridge | `src/services/nativeSync.ts` | Capacitor plugin registration |
| Battery Service | `src/services/batteryService.ts` | Device battery level monitoring |
| Capacitor Config | `capacitor.config.ts` | Android app packaging configuration |
| Vite Config | `vite.config.ts` | Frontend build tooling configuration |
| Package | `package.json` | Dependencies and build scripts |
