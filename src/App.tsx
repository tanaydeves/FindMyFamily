import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { TopAppBar } from './components/TopAppBar';
import { NavDrawer } from './components/NavDrawer';
import { BottomNavBar, TabType } from './components/BottomNavBar';
import { HomeScreen } from './components/HomeScreen';
import { ArrowScreen } from './components/ArrowScreen';

// Code-split / Lazy-load secondary screens and modals to ensure instant app boot
const PermissionsScreen = lazy(() => import('./components/PermissionsScreen').then(m => ({ default: m.PermissionsScreen })));
const LanguageSelectScreen = lazy(() => import('./components/LanguageSelectScreen').then(m => ({ default: m.LanguageSelectScreen })));
const RadarScreen = lazy(() => import('./components/RadarScreen').then(m => ({ default: m.RadarScreen })));
const MapScreen = lazy(() => import('./components/MapScreen').then(m => ({ default: m.MapScreen })));
const SettingsHubScreen = lazy(() => import('./components/SettingsHubScreen').then(m => ({ default: m.SettingsHubScreen })));
const AddMemberSheet = lazy(() => import('./components/AddMemberSheet').then(m => ({ default: m.AddMemberSheet })));
const InviteCircleScreen = lazy(() => import('./components/InviteCircleScreen').then(m => ({ default: m.InviteCircleScreen })));
const RoomsScreen = lazy(() => import('./components/RoomsScreen').then(m => ({ default: m.RoomsScreen })));
const ProfileScreen = lazy(() => import('./components/ProfileScreen').then(m => ({ default: m.ProfileScreen })));
const ConnectionSettingsScreen = lazy(() => import('./components/ConnectionSettingsScreen').then(m => ({ default: m.ConnectionSettingsScreen })));
const DistressConfirmModal = lazy(() => import('./components/DistressConfirmModal').then(m => ({ default: m.DistressConfirmModal })));
const HelpSafetyModal = lazy(() => import('./components/HelpSafetyModal').then(m => ({ default: m.HelpSafetyModal })));
const SmsHubModal = lazy(() => import('./components/SmsHubModal').then(m => ({ default: m.SmsHubModal })));

import { FamilyMember, LanguageCode, DistressAlert, LocationData } from './types';
import { relayClient } from './services/relayClient';
import { batteryService } from './services/batteryService';
import { audioHaptics } from './services/audioHaptics';
import { ParsedSms, SmsService } from './services/smsService';
import { bleProximityService } from './services/bleProximityService';
import { calculateDistance } from './services/navigationMath';
import { Compass, Users, AlertTriangle, BellOff, Navigation } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { NativeSync } from './services/nativeSync';

const ScreenLoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center h-full w-full bg-[#F8FAF9] p-8">
    <div className="w-8 h-8 rounded-full border-2 border-[#1B4332]/20 border-t-[#1B4332] animate-spin" />
  </div>
);

// Default Sangam, Prayagraj Kumbh Mela seed coordinates
const DEFAULT_LAT = 25.4358;
const DEFAULT_LNG = 81.8463;

export default function App() {
  // Onboarding Screen state (persisted for instant zero-lag boot)
  const [onboardingScreen, setOnboardingScreen] = useState<'splash' | 'permissions' | 'language' | 'done'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const onboarded = localStorage.getItem('fmf_onboarded');
        if (onboarded === 'true') {
          return 'done';
        }
      }
    } catch {}
    return 'splash';
  });
  const [currentTab, setCurrentTab] = useState<TabType>('family');
  const [lang, setLang] = useState<LanguageCode>('en');

  // Modals & Drawers
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roomsOpen, setRoomsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [serverSettingsOpen, setServerSettingsOpen] = useState(false);
  const [distressConfirmOpen, setDistressConfirmOpen] = useState(false);
  const [smsHubOpen, setSmsHubOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [helpModalMode, setHelpModalMode] = useState<'help' | 'about'>('help');
  const [showRadar, setShowRadar] = useState(false);

  // Persistent Device Profile & Circle Identity
  const [myDeviceId, setMyDeviceId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('fmf_my_device_id');
      if (saved) return saved;
      const gen = `dev_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('fmf_my_device_id', gen);
      return gen;
    } catch {
      return `dev_${Math.random().toString(36).substring(2, 7)}`;
    }
  });

  const [myDeviceName, setMyDeviceName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('fmf_my_device_name');
      if (saved) return saved;
    } catch {}
    return 'My Phone';
  });

  const [myPhone, setMyPhone] = useState<string>(() => {
    try {
      return localStorage.getItem('fmf_my_phone') || '';
    } catch {
      return '';
    }
  });

  const [myColor, setMyColor] = useState<string>(() => {
    try {
      return localStorage.getItem('fmf_my_color') || '#4ADE80';
    } catch {
      return '#4ADE80';
    }
  });

  const [circleId, setCircleId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const qCircle = params.get('circle') || params.get('room') || params.get('group');
      if (qCircle) return qCircle.toUpperCase();
    }
    try {
      return localStorage.getItem('fmf_circle_id') || 'KUMBH-2026';
    } catch {
      return 'KUMBH-2026';
    }
  });

  const [myLocation, setMyLocation] = useState({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });
  const [useRealGps, setUseRealGps] = useState<boolean>(true);
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [myBattery, setMyBattery] = useState<number>(() => batteryService.getBatteryStatus().level);
  const [pairedMembers, setPairedMembers] = useState<FamilyMember[]>(() => {
    try {
      const saved = localStorage.getItem('fmf_paired_members');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [incomingDistress, setIncomingDistress] = useState<DistressAlert | null>(null);
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [isServerConnected, setIsServerConnected] = useState<boolean>(() => relayClient.isConnected());

  // BLE Fusion Mode — activates at <=30m to complement GPS precision
  const BLE_FUSION_THRESHOLD = 30; // meters
  const [bleActive, setBleActive] = useState(false);
  const [bleDistances, setBleDistances] = useState<Map<string, number>>(new Map());

  // Listen to live device battery changes
  useEffect(() => {
    const unsub = batteryService.subscribe((status) => {
      setMyBattery(status.level);
    });
    return unsub;
  }, []);

  // Language & URL params on boot
  useEffect(() => {
    try {
      const savedLang = localStorage.getItem('fmf_lang') as LanguageCode;
      if (savedLang && (savedLang === 'en' || savedLang === 'hi' || savedLang === 'mr')) {
        setLang(savedLang);
      }
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const qName = params.get('name');
        if (qName) {
          setMyDeviceName(qName);
          localStorage.setItem('fmf_my_device_name', qName);
        }
      }
    } catch {}
  }, []);

  // BLE Fusion: auto-activate when GPS distance to tracked member drops to <=30m.
  // GPS keeps running for direction; BLE adds precise proximity. +10m hysteresis on exit.
  useEffect(() => {
    if (!selectedMember) {
      if (bleActive) {
        setBleActive(false);
        setBleDistances(new Map());
        bleProximityService.stopTracking();
      }
      return;
    }

    const gpsDist = calculateDistance(
      myLocation.latitude, myLocation.longitude,
      selectedMember.lastLat, selectedMember.lastLng
    );

    if (gpsDist <= BLE_FUSION_THRESHOLD && !bleActive && bleProximityService.isSupported()) {
      setBleActive(true);
      bleProximityService.startTracking(myDeviceId, [selectedMember.id]);
      bleProximityService.onProximityUpdate(({ deviceId, distanceMeters }) => {
        setBleDistances((prev) => new Map(prev).set(deviceId, distanceMeters));
      });
    } else if (gpsDist > BLE_FUSION_THRESHOLD + 10 && bleActive) {
      // Hysteresis: only turn off BLE when >=40m away to avoid mode flipping
      setBleActive(false);
      setBleDistances(new Map());
      bleProximityService.stopTracking();
    }
  }, [selectedMember?.lastLat, selectedMember?.lastLng, myLocation.latitude, myLocation.longitude]);

  // Clean up BLE when component unmounts
  useEffect(() => {
    return () => { bleProximityService.stopTracking(); };
  }, []);

  // Initialize and Sync with Relay Multi-Device Hub
  useEffect(() => {
    relayClient.init(myDeviceId, myDeviceName, circleId, myColor);

    const unsubscribeCircle = relayClient.onCircleMembers((members: LocationData[]) => {
      setPairedMembers((prev) => {
        const others = members.filter((m) => m.deviceId !== myDeviceId);
        const merged = [...prev];
        others.forEach((netMember) => {
          const idx = merged.findIndex((m) => m.id === netMember.deviceId);
          if (idx >= 0) {
            merged[idx] = {
              ...merged[idx],
              name: netMember.name || merged[idx].name,
              lastLat: netMember.latitude,
              lastLng: netMember.longitude,
              lastUpdated: netMember.timestamp,
              accuracy: netMember.accuracy,
              battery: netMember.battery ?? merged[idx].battery,
              color: netMember.color ?? merged[idx].color,
              heading: netMember.heading,
              source: 'relay',
              isOnline: true,
            };
          } else {
            merged.push({
              id: netMember.deviceId,
              name: netMember.name || 'Family Phone',
              phone: '+919876543210',
              lastLat: netMember.latitude,
              lastLng: netMember.longitude,
              accuracy: netMember.accuracy,
              lastUpdated: netMember.timestamp,
              color: netMember.color || '#38BDF8',
              battery: netMember.battery ?? 90,
              heading: netMember.heading,
              source: 'relay',
              isOnline: true,
            });
          }
        });
        try {
          localStorage.setItem('fmf_paired_members', JSON.stringify(merged));
        } catch {}
        return merged;
      });
    });

    const unsubscribeLoc = relayClient.onLocationUpdate((locData: LocationData) => {
      if (locData.deviceId === myDeviceId) return;

      setPairedMembers((prev) => {
        const exists = prev.some((m) => m.id === locData.deviceId);
        let updated: FamilyMember[];
        if (exists) {
          updated = prev.map((m) =>
            m.id === locData.deviceId
              ? {
                  ...m,
                  name: locData.name || m.name,
                  lastLat: locData.latitude,
                  lastLng: locData.longitude,
                  lastUpdated: locData.timestamp,
                  source: 'relay',
                  accuracy: locData.accuracy,
                  color: locData.color || m.color,
                  battery: locData.battery ?? m.battery,
                  heading: locData.heading,
                  isOnline: true,
                }
              : m
          );
        } else {
          updated = [
            ...prev,
            {
              id: locData.deviceId,
              name: locData.name || 'Family Member',
              phone: '+919876543210',
              lastLat: locData.latitude,
              lastLng: locData.longitude,
              lastUpdated: locData.timestamp,
              source: 'relay',
              color: locData.color || '#38BDF8',
              battery: locData.battery ?? 90,
              heading: locData.heading,
              isOnline: true,
            },
          ];
        }
        try {
          localStorage.setItem('fmf_paired_members', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setSelectedMember((cur) => {
        if (cur && cur.id === locData.deviceId) {
          return {
            ...cur,
            name: locData.name || cur.name,
            lastLat: locData.latitude,
            lastLng: locData.longitude,
            lastUpdated: locData.timestamp,
            color: locData.color || cur.color,
            battery: locData.battery ?? cur.battery,
            source: 'relay',
          };
        }
        return cur;
      });
    });

    const unsubscribeDistress = relayClient.onDistressAlert((alert: DistressAlert) => {
      if (alert.senderId === myDeviceId) return;
      // Use the louder, repeating group alert (not the personal self-siren)
      audioHaptics.startGroupDistressAlert();
      setIncomingDistress(alert);

      setPairedMembers((prev) => {
        const exists = prev.some((m) => m.id === alert.senderId);
        if (exists) {
          return prev.map((m) =>
            m.id === alert.senderId
              ? {
                  ...m,
                  name: alert.senderName || m.name,
                  lastLat: alert.latitude,
                  lastLng: alert.longitude,
                  lastUpdated: alert.timestamp,
                  source: 'relay',
                  color: '#DC2626',
                }
              : m
          );
        }
        return [
          ...prev,
          {
            id: alert.senderId,
            name: alert.senderName || 'Family Member',
            phone: '+919876543210',
            lastLat: alert.latitude,
            lastLng: alert.longitude,
            lastUpdated: alert.timestamp,
            source: 'relay',
            color: '#DC2626',
          },
        ];
      });
    });

    const unsubscribeConn = relayClient.onConnectionChange((connected) => {
      setIsServerConnected(connected);
    });

    return () => {
      unsubscribeConn();
      unsubscribeCircle();
      unsubscribeLoc();
      unsubscribeDistress();
    };
  }, [myDeviceId, myDeviceName, circleId, myColor]);

  // Real GPS Geolocation Watcher
  useEffect(() => {
    let watchId: number | null = null;
    if (useRealGps && typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setMyLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn('[GPS] Geolocation error:', err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
    }
    return () => {
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [useRealGps]);

  // Helper to send coordinates to paired members via SMS when offline
  const sendSmsToPairedMembers = async (isDistress: boolean) => {
    if (!Capacitor.isNativePlatform()) {
      console.log('[SMS Mock] Web platform - simulating sending coordinates. Distress:', isDistress);
      return;
    }

    const payload = isDistress
      ? SmsService.encodeDistressMessage(myDeviceId, myLocation.latitude, myLocation.longitude, myDeviceName)
      : SmsService.encodeLocationMessage(myDeviceId, myLocation.latitude, myLocation.longitude, myDeviceName);

    for (const member of pairedMembers) {
      if (member.phone && member.phone.trim()) {
        try {
          await NativeSync.sendSMS({
            phoneNumber: member.phone,
            message: payload,
          });
          console.log(`[SMS] Coordinates automatically sent to ${member.name} (${member.phone})`);
        } catch (err) {
          console.error(`[SMS] Failed to send coordinates to ${member.name}:`, err);
        }
      }
    }
  };

  // Listen for native SMS coordinates
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    
    const setupSmsListener = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          sub = await NativeSync.addListener('smsReceived', (data: { from: string; body: string }) => {
            console.log('[SMS] Native SMS received:', data);
            const parsed = SmsService.parseSmsPayload(data.body);
            if (parsed) {
              handleReceiveParsedSms(parsed);
            }
          });
        } catch (err) {
          console.warn('[NativeSync] failed to register smsReceived listener:', err);
        }
      }
    };

    setupSmsListener();

    return () => {
      if (sub) {
        sub.remove();
      }
    };
  }, []);

  // Broadcast state ref to prevent interval recreation starvation on compass rotation
  const broadcastStateRef = useRef({
    myLocation,
    myDeviceName,
    compassHeading,
    myBattery,
    myColor,
    isOffline,
  });

  useEffect(() => {
    broadcastStateRef.current = {
      myLocation,
      myDeviceName,
      compassHeading,
      myBattery,
      myColor,
      isOffline,
    };
  }, [myLocation, myDeviceName, compassHeading, myBattery, myColor, isOffline]);

  // Broadcast location periodically (steady 4-second cadence)
  useEffect(() => {
    const interval = setInterval(async () => {
      const state = broadcastStateRef.current;
      const res = await relayClient.pushLocation(
        state.myLocation.latitude,
        state.myLocation.longitude,
        3.0,
        state.myDeviceName,
        state.compassHeading,
        state.myBattery,
        state.myColor
      );

      // If offline mode is enabled, or network push failed, trigger SMS fallback
      if (state.isOffline || (res && !res.success)) {
        sendSmsToPairedMembers(false);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Device orientation / compass
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if ((e as any).webkitCompassHeading !== undefined) {
        setCompassHeading((e as any).webkitCompassHeading);
      } else if (e.alpha !== null) {
        const heading = (360 - e.alpha) % 360;
        setCompassHeading(heading);
      }
    };
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleOrientation);
      }
    };
  }, []);

  // Handlers
  const handleUpdateProfile = (name: string, phone: string, color: string) => {
    setMyDeviceName(name);
    setMyPhone(phone);
    setMyColor(color);
    try {
      localStorage.setItem('fmf_my_device_name', name);
      localStorage.setItem('fmf_my_phone', phone);
      localStorage.setItem('fmf_my_color', color);
    } catch {}
    relayClient.pushLocation(myLocation.latitude, myLocation.longitude, 3.0, name, compassHeading, myBattery, color);
  };

  const handleChangeCircle = (newCircleId: string) => {
    const norm = newCircleId.trim().toUpperCase();
    setCircleId(norm);
    try {
      localStorage.setItem('fmf_circle_id', norm);
    } catch {}
    relayClient.setCircle(norm);
  };

  const handleSelectLang = (newLang: LanguageCode) => {
    setLang(newLang);
    try {
      localStorage.setItem('fmf_lang', newLang);
      localStorage.setItem('fmf_onboarded', 'true');
    } catch {}
    if (onboardingScreen === 'language') {
      setOnboardingScreen('done');
    }
  };

  const handlePairMember = (member: FamilyMember) => {
    relayClient.registerPairing(member.id);
    setPairedMembers((prev) => {
      const filtered = prev.filter((m) => m.id !== member.id);
      const updated = [member, ...filtered];
      try {
        localStorage.setItem('fmf_paired_members', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    setSelectedMember(member);
  };

  const handleRemoveMember = (memberId: string) => {
    setPairedMembers((prev) => {
      const updated = prev.filter((m) => m.id !== memberId);
      try {
        localStorage.setItem('fmf_paired_members', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (selectedMember?.id === memberId) {
      setSelectedMember(null);
    }
  };

  const handleTriggerDistressAlert = async () => {
    audioHaptics.startDistressSiren();
    const res = await relayClient.sendDistressAlert(myLocation.latitude, myLocation.longitude, myDeviceName);
    if (isOffline || (res && res.fallbackToSmsRecommended)) {
      sendSmsToPairedMembers(true);
    }
  };

  const handleToggleOffline = () => {
    const next = !isOffline;
    setIsOffline(next);
    relayClient.setSimulateOffline(next);
  };

  const handleToggleRealGps = () => {
    const next = !useRealGps;
    setUseRealGps(next);
    if (!next) {
      setMyLocation({ latitude: DEFAULT_LAT, longitude: DEFAULT_LNG });
    }
  };

  const handleSimulateStep = (deltaLat: number, deltaLng: number) => {
    setMyLocation((prev) => ({
      latitude: prev.latitude + deltaLat,
      longitude: prev.longitude + deltaLng,
    }));
  };

  const handleReceiveParsedSms = (sms: ParsedSms) => {
    if (sms.isDistress) {
      audioHaptics.startGroupDistressAlert();
      setIncomingDistress({
        senderId: sms.deviceId,
        senderName: sms.name,
        latitude: sms.latitude,
        longitude: sms.longitude,
        timestamp: sms.timestamp,
      });
    }

    setPairedMembers((prev) => {
      const exists = prev.some((m) => m.id === sms.deviceId);
      if (exists) {
        return prev.map((m) =>
          m.id === sms.deviceId
            ? {
                ...m,
                lastLat: sms.latitude,
                lastLng: sms.longitude,
                lastUpdated: sms.timestamp,
                source: 'sms',
              }
            : m
        );
      }
      return [
        ...prev,
        {
          id: sms.deviceId,
          name: sms.name,
          phone: '+919876543210',
          lastLat: sms.latitude,
          lastLng: sms.longitude,
          lastUpdated: sms.timestamp,
          source: 'sms',
          color: sms.isDistress ? '#DC2626' : '#F59E0B',
        },
      ];
    });
  };

  // Determine Screen Title for Top Bar
  const getScreenTitle = () => {
    if (showRadar) return 'Perimeter Radar';
    if (currentTab === 'map') return 'Real-Time Map';
    if (currentTab === 'track') {
      return selectedMember ? `Tracking ${selectedMember.name}` : 'Direction Finder';
    }
    if (currentTab === 'settings') return 'Settings';
    return 'Find My Family';
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#0D2119] flex flex-col font-sans select-none overflow-hidden">
      {/* Onboarding Flow: Splash -> Permissions -> Language */}
      {onboardingScreen === 'splash' && (
        <div className="w-full h-screen flex items-center justify-center p-0">
          <SplashScreen onFinish={() => setOnboardingScreen('permissions')} />
        </div>
      )}

      {onboardingScreen === 'permissions' && (
        <div className="w-full h-screen flex items-center justify-center p-0">
          <div className="w-full max-w-md h-full bg-[#FFFFFF] shadow-lg flex flex-col">
            <Suspense fallback={<ScreenLoadingFallback />}>
              <PermissionsScreen
                lang={lang}
                onGranted={() => setOnboardingScreen('language')}
              />
            </Suspense>
          </div>
        </div>
      )}

      {onboardingScreen === 'language' && (
        <div className="w-full h-screen flex items-center justify-center p-0">
          <div className="w-full max-w-md h-full bg-[#FFFFFF] shadow-lg flex flex-col">
            <Suspense fallback={<ScreenLoadingFallback />}>
              <LanguageSelectScreen
                currentLang={lang}
                onSelectLang={handleSelectLang}
                onBack={() => setOnboardingScreen('permissions')}
              />
            </Suspense>
          </div>
        </div>
      )}

      {/* Main App Layout */}
      {onboardingScreen === 'done' && (
        <div className="flex-1 flex flex-col w-full max-w-md mx-auto h-screen bg-[#F8FAF9] border-x border-[#E2E8F0] shadow-sm relative overflow-hidden">
          {/* Global Top App Bar (Section 3.1) */}
          <TopAppBar
            title={getScreenTitle()}
            myDeviceName={myDeviceName}
            myColor={myColor}
            onOpenDrawer={() => setDrawerOpen(true)}
            onOpenProfile={() => setProfileOpen(true)}
          />

          {/* Navigation Drawer (Section 3.2) */}
          <NavDrawer
            isOpen={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            circleId={circleId}
            myDeviceId={myDeviceId}
            myDeviceName={myDeviceName}
            myColor={myColor}
            isOffline={isOffline}
            isServerConnected={isServerConnected}
            useRealGps={useRealGps}
            currentLang={lang}
            onSelectLang={handleSelectLang}
            onToggleOffline={handleToggleOffline}
            onToggleRealGps={handleToggleRealGps}
            onOpenRooms={() => setRoomsOpen(true)}
            onOpenInvite={() => setInviteOpen(true)}
            onOpenProfile={() => setProfileOpen(true)}
            onOpenServerSettings={() => setServerSettingsOpen(true)}
            onOpenSettings={() => {
              setCurrentTab('settings');
              setShowRadar(false);
            }}
            onOpenHelp={() => {
              setHelpModalMode('help');
              setHelpModalOpen(true);
            }}
          />

          {/* Active Screen Stage */}
          <main className="flex-1 flex flex-col overflow-hidden relative">
            {showRadar ? (
              <Suspense fallback={<ScreenLoadingFallback />}>
                <RadarScreen
                  lang={lang}
                  myLocation={myLocation}
                  myDeviceName={myDeviceName}
                  compassHeading={compassHeading}
                  pairedMembers={pairedMembers}
                  bleActive={bleActive}
                  bleDistances={bleDistances}
                  onBack={() => setShowRadar(false)}
                  onSelectMember={(member) => {
                    setSelectedMember(member);
                    setShowRadar(false);
                    setCurrentTab('track');
                  }}
                />
              </Suspense>
            ) : currentTab === 'family' ? (
              <HomeScreen
                myLocation={myLocation}
                pairedMembers={pairedMembers}
                incomingDistress={incomingDistress}
                isOffline={isOffline}
                onSelectMember={(member) => {
                  setSelectedMember(member);
                  setCurrentTab('track');
                }}
                onOpenMap={(member) => {
                  if (member) setSelectedMember(member);
                  setCurrentTab('map');
                }}
                onOpenAddMember={() => setAddMemberOpen(true)}
                onRemoveMember={handleRemoveMember}
                onDismissDistress={() => {
                  audioHaptics.stopGroupDistressAlert();
                  setIncomingDistress(null);
                }}
              />
            ) : currentTab === 'map' ? (
              <Suspense fallback={<ScreenLoadingFallback />}>
                <MapScreen
                  myLocation={myLocation}
                  myDeviceName={myDeviceName}
                  myColor={myColor}
                  myBattery={myBattery}
                  pairedMembers={pairedMembers}
                  selectedMember={selectedMember}
                  onSelectMember={(member) => setSelectedMember(member)}
                  onNavigateToArrow={(member) => {
                    setSelectedMember(member);
                    setCurrentTab('track');
                  }}
                  onBack={() => setCurrentTab('family')}
                  lang={lang}
                />
              </Suspense>
            ) : currentTab === 'track' ? (
              selectedMember ? (
                <ArrowScreen
                  member={selectedMember}
                  myLocation={myLocation}
                  compassHeading={compassHeading}
                  isOffline={isOffline}
                  lang={lang}
                  myDeviceId={myDeviceId}
                  bleActive={bleActive}
                  bleDistance={bleDistances.get(selectedMember.id)}
                  onBack={() => setCurrentTab('family')}
                  onUpdateMyHeading={(h) => setCompassHeading(h)}
                  onSimulateStep={handleSimulateStep}
                  onOpenDistressModal={() => setDistressConfirmOpen(true)}
                />
              ) : (
                /* Empty state when on track tab without target */
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#F8FAF9]">
                  <div className="w-16 h-16 rounded-full bg-[#1B4332]/10 flex items-center justify-center text-[#1B4332] mb-4">
                    <Compass className="w-8 h-8" />
                  </div>
                  <h3 className="headline-md text-xl text-[#0D2119] mb-1">Select a Family Member</h3>
                  <p className="body-md text-sm text-[#5C7168] max-w-xs mb-6">
                    Choose someone from your family circle to see their live compass pointer and distance.
                  </p>
                  {pairedMembers.length > 0 ? (
                    <button
                      onClick={() => setSelectedMember(pairedMembers[0])}
                      className="px-6 h-12 rounded-lg bg-[#1B4332] hover:bg-[#012D1D] text-white label-lg font-bold shadow-xs cursor-pointer"
                    >
                      Track {pairedMembers[0].name} →
                    </button>
                  ) : (
                    <button
                      onClick={() => setAddMemberOpen(true)}
                      className="px-6 h-12 rounded-lg bg-[#1B4332] hover:bg-[#012D1D] text-white label-lg font-bold shadow-xs cursor-pointer inline-flex items-center gap-2"
                    >
                      <span>+ Add Member</span>
                    </button>
                  )}
                </div>
              )
            ) : (
              /* Settings Hub Tab */
              <Suspense fallback={<ScreenLoadingFallback />}>
                <SettingsHubScreen
                  circleId={circleId}
                  myDeviceName={myDeviceName}
                  currentLang={lang}
                  onOpenProfile={() => setProfileOpen(true)}
                  onOpenLanguage={() => {
                    setOnboardingScreen('language');
                  }}
                  onOpenRooms={() => setRoomsOpen(true)}
                  onOpenServerSettings={() => setServerSettingsOpen(true)}
                  onOpenSmsHub={() => setSmsHubOpen(true)}
                  onOpenHelp={() => {
                    setHelpModalMode('help');
                    setHelpModalOpen(true);
                  }}
                  onOpenAbout={() => {
                    setHelpModalMode('about');
                    setHelpModalOpen(true);
                  }}
                  onLeaveCircle={() => {
                    handleChangeCircle('KUMBH-2026');
                  }}
                />
              </Suspense>
            )}
          </main>

          {/* Global Persistent Bottom Navigation Bar (Section 3.3) */}
          <BottomNavBar
            activeTab={currentTab}
            onSelectTab={(tab) => {
              setShowRadar(false);
              setCurrentTab(tab);
            }}
            hasTrackTarget={!!selectedMember}
          />
        </div>
      )}

      {/* MODALS & SHEETS (Dynamically loaded when triggered) */}

      {/* 5.1 Add Member Sheet */}
      {addMemberOpen && (
        <Suspense fallback={null}>
          <AddMemberSheet
            isOpen={addMemberOpen}
            onClose={() => setAddMemberOpen(false)}
            circleId={circleId}
            myDeviceId={myDeviceId}
            myDeviceName={myDeviceName}
            myLocation={myLocation}
            onPairMember={handlePairMember}
          />
        </Suspense>
      )}

      {/* 5.2 Invite Circle Sheet */}
      {inviteOpen && (
        <Suspense fallback={null}>
          <InviteCircleScreen
            isOpen={inviteOpen}
            onClose={() => setInviteOpen(false)}
            circleId={circleId}
          />
        </Suspense>
      )}

      {/* 5.3 Rooms / Switch Circle */}
      {roomsOpen && (
        <Suspense fallback={null}>
          <RoomsScreen
            isOpen={roomsOpen}
            onClose={() => setRoomsOpen(false)}
            currentCircleId={circleId}
            onChangeCircle={handleChangeCircle}
          />
        </Suspense>
      )}

      {/* 5.4 My Profile */}
      {profileOpen && (
        <Suspense fallback={null}>
          <ProfileScreen
            isOpen={profileOpen}
            onClose={() => setProfileOpen(false)}
            myDeviceName={myDeviceName}
            myPhone={myPhone}
            myColor={myColor}
            myDeviceId={myDeviceId}
            onUpdateProfile={handleUpdateProfile}
          />
        </Suspense>
      )}

      {/* 5.5 Advanced Connection Settings */}
      {serverSettingsOpen && (
        <Suspense fallback={null}>
          <ConnectionSettingsScreen
            isOpen={serverSettingsOpen}
            onClose={() => setServerSettingsOpen(false)}
          />
        </Suspense>
      )}

      {/* 5.7 Distress Alert Confirmation Modal */}
      {distressConfirmOpen && (
        <Suspense fallback={null}>
          <DistressConfirmModal
            isOpen={distressConfirmOpen}
            onClose={() => setDistressConfirmOpen(false)}
            onConfirm={handleTriggerDistressAlert}
          />
        </Suspense>
      )}

      {/* SMS Hub Modal */}
      {smsHubOpen && (
        <Suspense fallback={null}>
          <SmsHubModal
            isOpen={smsHubOpen}
            myDeviceId={myDeviceId}
            myDeviceName={myDeviceName}
            myLocation={myLocation}
            onClose={() => setSmsHubOpen(false)}
            onApplyParsedSms={handleReceiveParsedSms}
          />
        </Suspense>
      )}

      {/* Help & Safety Modal */}
      {helpModalOpen && (
        <Suspense fallback={null}>
          <HelpSafetyModal
            isOpen={helpModalOpen}
            onClose={() => setHelpModalOpen(false)}
            mode={helpModalMode}
          />
        </Suspense>
      )}

      {/* Group Distress Urgent Full-Screen Banner Overlay */}
      {incomingDistress && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-2xl border-2 border-[#DC2626] overflow-hidden">
            {/* Flashing Top Alert Bar */}
            <div className="bg-[#DC2626] text-white px-5 py-4 flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
                <span className="font-extrabold text-sm tracking-wider uppercase">
                  Emergency Distress Alert!
                </span>
              </div>
              <span className="text-xs font-mono font-bold bg-white/20 px-2 py-0.5 rounded">
                CRITICAL
              </span>
            </div>

            <div className="p-5 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-[#FEE2E2] text-[#DC2626] mx-auto flex items-center justify-center animate-bounce shadow-inner">
                <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div>
                <h3 className="headline-md text-xl font-bold text-[#0D2119]">
                  {incomingDistress.senderName || 'Family Member'} is Lost!
                </h3>
                <p className="body-md text-sm text-[#5C7168] mt-1">
                  Sent a distress SOS to the group circle. Phone is beeping and vibrating.
                </p>
                {myLocation && incomingDistress.latitude && (
                  <div className="inline-block mt-2 font-mono text-sm font-bold text-[#DC2626] bg-[#FEF2F2] px-3 py-1 rounded-full border border-[#FECACA]">
                    ~{calculateDistance(
                      myLocation.latitude,
                      myLocation.longitude,
                      incomingDistress.latitude,
                      incomingDistress.longitude
                    )}m away from you
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => {
                    const matched = pairedMembers.find((m) => m.id === incomingDistress.senderId);
                    if (matched) {
                      setSelectedMember(matched);
                    } else {
                      setSelectedMember({
                        id: incomingDistress.senderId,
                        name: incomingDistress.senderName || 'Family Member',
                        lastLat: incomingDistress.latitude,
                        lastLng: incomingDistress.longitude,
                        lastUpdated: incomingDistress.timestamp,
                        source: 'relay',
                        color: '#DC2626',
                      });
                    }
                    audioHaptics.stopGroupDistressAlert();
                    setCurrentTab('track');
                    setShowRadar(false);
                  }}
                  className="w-full h-13 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.98] text-white font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                >
                  <Navigation className="w-5 h-5" />
                  <span>Track {incomingDistress.senderName?.split(' ')[0] || 'Member'} (Arrow + BLE)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const matched = pairedMembers.find((m) => m.id === incomingDistress.senderId);
                      if (matched) setSelectedMember(matched);
                      audioHaptics.stopGroupDistressAlert();
                      setCurrentTab('map');
                      setShowRadar(false);
                    }}
                    className="py-2.5 rounded-xl bg-[#F8FAF9] hover:bg-[#E2E8F0] border border-[#E2E8F0] text-sm font-semibold text-[#0D2119] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Show on Map</span>
                  </button>

                  <button
                    onClick={() => {
                      audioHaptics.stopGroupDistressAlert();
                      setIncomingDistress(null);
                    }}
                    className="py-2.5 rounded-xl bg-[#F8FAF9] hover:bg-[#E2E8F0] border border-[#E2E8F0] text-sm font-semibold text-[#5C7168] flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <BellOff className="w-4 h-4" />
                    <span>Dismiss Siren</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
