# Find My Family

A resilience-first family reunification app for mass-gathering events like Kumbh Mela — built solo for the **Kumbhathon Innovation S.P.R.I.N.T. 2026** (AI/Software track), a three-day hackathon held in Nashik.

🔗 **Live app:** [findmyfamily.onrender.com](https://findmyfamily.onrender.com)

---

## The Problem

At mass-gathering events with 40M+ attendees, families get separated — and the usual fallback, mobile networks, degrades or collapses entirely under extreme crowd load. Most reunification tools assume connectivity that simply isn't there.

## The Solution

Find My Family is built around **multi-transport fallback**: if one channel fails, the app gracefully drops to the next, so reunification never depends on a single point of failure.

```
BLE Pairing  →  GPS / Compass Arrow Navigation  →  SMS Fallback
(short range)    (mid range, no internet needed)    (last resort)
```

- **BLE Pairing** — family members' devices pair directly over Bluetooth Low Energy when in proximity, no network required.
- **GPS / Compass Arrow Navigation** — once paired, an AirTag-style directional arrow guides users toward each other's last known location.
- **SMS Fallback** — when both BLE and data connectivity fail, SMS keeps a location/status channel alive.

### QR Lost Child Recovery (additive feature)

Pre-printed QR stickers can be applied to children's wrists. A bystander who finds a lost child scans the QR code, which opens a public web page that:
- Alerts the child's registered parents
- Notifies volunteer dashboards
- Does **not** expose personal data publicly

---

## Design System — "Calm Reliability"

| Element | Choice |
|---|---|
| Primary | Dark green `#1A4331` |
| Accent | Bright green |
| Alert | Red — reserved exclusively for SOS |
| Background | Off-white |
| Shapes | Rounded cards |
| Typography | Minimal sans-serif |

Applied consistently across the app UI, presentation deck, and supporting materials.

---

## Tech Stack

**App**
- [Expo](https://expo.dev/) / React Native
- Node.js / Express
- Socket.IO (real-time communication)
- Supabase / PostgreSQL
- Prisma ORM
- i18n-js — English, Hindi, Marathi

**Supporting tools**
- Presentation: pptxgenjs, Canva AI
- UI generation: Google Antigravity
- Coding agent: Gemini
- Video: Google Veo (planned)

---

## Project Status

Post-hackathon. The Kumbhathon event has concluded; the project has moved from active build mode into documentation, presentation, and reflection. Planned next steps include a scene-by-scene demo video (Veo-based) and further presentation polish.

---

## Getting Started

> Fill in with actual setup steps for your environment.

```bash
git clone <repo-url>
cd find-my-family
npm install
npx expo start
```

Configure environment variables for Supabase and any SMS/BLE service credentials before running.

---

## License

TBD
