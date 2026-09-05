import React, { useState, useEffect } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { PermissionsScreen } from './components/PermissionsScreen';
import { LanguageSelectScreen } from './components/LanguageSelectScreen';
import { TopAppBar } from './components/TopAppBar';
import { NavDrawer } from './components/NavDrawer';
import { BottomNavBar, TabType } from './components/BottomNavBar';
import { HomeScreen } from './components/HomeScreen';
import { ArrowScreen } from './components/ArrowScreen';
import { RadarScreen } from './components/RadarScreen';
import { SettingsHubScreen } from './components/SettingsHubScreen';
import { AddMemberSheet } from './components/AddMemberSheet';
import { InviteCircleScreen } from './components/InviteCircleScreen';
import { RoomsScreen } from './components/RoomsScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { ConnectionSettingsScreen } from './components/ConnectionSettingsScreen';
import { DistressConfirmModal } from './components/DistressConfirmModal';
import { HelpSafetyModal } from './components/HelpSafetyModal';
import { SmsHubModal } from './components/SmsHubModal';
import { FamilyMember, LanguageCode, DistressAlert, LocationData } from './types';
import { relayClient } from './services/relayClient';
import { audioHaptics } from './services/audioHaptics';
import { ParsedSms, SmsService } from './services/smsService';
import { Compass, Users } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { NativeSync } from './services/nativeSync';

// Default Sangam, Prayagraj Kumbh Mela seed coordinates
const DEFAULT_LAT = 25.4358;
const DEFAULT_LNG = 81.8463;

export default function App() {
  // Onboarding Screen state
  const [onboardingScreen, setOnboardingScreen] = useState<'splash' | 'permissions' | 'language' | 'done'>('splash');
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
      audioHaptics.startDistressSiren();
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

  // Broadcast location periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await relayClient.pushLocation(
        myLocation.latitude,
        myLocation.longitude,
        3.0,
        myDeviceName,
        compassHeading,
        96,
        myColor
      );

      // If offline mode is enabled, or network push failed, trigger SMS fallback
      if (isOffline || (res && !res.success)) {
        sendSmsToPairedMembers(false);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [myLocation, myDeviceName, compassHeading, myColor, isOffline, pairedMembers]);

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
    relayClient.pushLocation(myLocation.latitude, myLocation.longitude, 3.0, name, compassHeading, 96, color);
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
      audioHaptics.startDistressSiren();
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
            <PermissionsScreen
              lang={lang}
              onGranted={() => setOnboardingScreen('language')}
            />
          </div>
        </div>
      )}

      {onboardingScreen === 'language' && (
        <div className="w-full h-screen flex items-center justify-center p-0">
          <div className="w-full max-w-md h-full bg-[#FFFFFF] shadow-lg flex flex-col">
            <LanguageSelectScreen
              currentLang={lang}
              onSelectLang={handleSelectLang}
              onBack={() => setOnboardingScreen('permissions')}
            />
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
              <RadarScreen
                lang={lang}
                myLocation={myLocation}
                myDeviceName={myDeviceName}
                compassHeading={compassHeading}
                pairedMembers={pairedMembers}
                onBack={() => setShowRadar(false)}
                onSelectMember={(member) => {
                  setSelectedMember(member);
                  setShowRadar(false);
                  setCurrentTab('track');
                }}
              />
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
                onOpenAddMember={() => setAddMemberOpen(true)}
                onRemoveMember={handleRemoveMember}
                onDismissDistress={() => {
                  audioHaptics.stopDistressSiren();
                  setIncomingDistress(null);
                }}
              />
            ) : currentTab === 'track' ? (
              selectedMember ? (
                <ArrowScreen
                  member={selectedMember}
                  myLocation={myLocation}
                  compassHeading={compassHeading}
                  isOffline={isOffline}
                  lang={lang}
                  myDeviceId={myDeviceId}
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

      {/* MODALS & SHEETS */}

      {/* 5.1 Add Member Sheet */}
      <AddMemberSheet
        isOpen={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        circleId={circleId}
        myDeviceId={myDeviceId}
        myDeviceName={myDeviceName}
        myLocation={myLocation}
        onPairMember={handlePairMember}
      />

      {/* 5.2 Invite Circle Sheet */}
      <InviteCircleScreen
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
        circleId={circleId}
      />

      {/* 5.3 Rooms / Switch Circle */}
      <RoomsScreen
        isOpen={roomsOpen}
        onClose={() => setRoomsOpen(false)}
        currentCircleId={circleId}
        onChangeCircle={handleChangeCircle}
      />

      {/* 5.4 My Profile */}
      <ProfileScreen
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        myDeviceName={myDeviceName}
        myPhone={myPhone}
        myColor={myColor}
        myDeviceId={myDeviceId}
        onUpdateProfile={handleUpdateProfile}
      />

      {/* 5.5 Advanced Connection Settings */}
      <ConnectionSettingsScreen
        isOpen={serverSettingsOpen}
        onClose={() => setServerSettingsOpen(false)}
      />

      {/* 5.7 Distress Alert Confirmation Modal */}
      <DistressConfirmModal
        isOpen={distressConfirmOpen}
        onClose={() => setDistressConfirmOpen(false)}
        onConfirm={handleTriggerDistressAlert}
      />

      {/* SMS Hub Modal */}
      <SmsHubModal
        isOpen={smsHubOpen}
        myDeviceId={myDeviceId}
        myDeviceName={myDeviceName}
        myLocation={myLocation}
        onClose={() => setSmsHubOpen(false)}
        onApplyParsedSms={handleReceiveParsedSms}
      />

      {/* Help & Safety Modal */}
      <HelpSafetyModal
        isOpen={helpModalOpen}
        onClose={() => setHelpModalOpen(false)}
        mode={helpModalMode}
      />
    </div>
  );
}
