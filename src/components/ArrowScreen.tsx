import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  AlertTriangle,
  Mic,
  Volume2,
  VolumeX,
  Phone,
  MessageSquare,
  Footprints,
  RotateCw,
  Navigation,
  Battery,
  MapPin,
  Bluetooth,
} from 'lucide-react';
import { motion } from 'motion/react';
import { FamilyMember, LanguageCode } from '../types';
import {
  calculateDistance,
  calculateBearing,
  getRelativeDirectionAdvice,
} from '../services/navigationMath';
import { audioHaptics } from '../services/audioHaptics';
import { SmsService } from '../services/smsService';

interface Props {
  member: FamilyMember;
  myLocation: { latitude: number; longitude: number };
  compassHeading: number;
  isOffline: boolean;
  lang: LanguageCode;
  myDeviceId: string;
  bleActive?: boolean;
  bleDistance?: number;
  showDemoSimulator?: boolean;
  onBack: () => void;
  onUpdateMyHeading: (heading: number) => void;
  onSimulateStep: (deltaLat: number, deltaLng: number) => void;
  onOpenDistressModal: () => void;
}

export const ArrowScreen: React.FC<Props> = ({
  member,
  myLocation,
  compassHeading,
  isOffline,
  lang,
  myDeviceId,
  bleActive = false,
  bleDistance,
  showDemoSimulator = false,
  onBack,
  onUpdateMyHeading,
  onSimulateStep,
  onOpenDistressModal,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [simulatorActive, setSimulatorActive] = useState(showDemoSimulator);
  const lastAngleRef = useRef(0);
  const [smoothAngle, setSmoothAngle] = useState(0);

  // Compute navigation metrics
  const distance = calculateDistance(
    myLocation.latitude,
    myLocation.longitude,
    member.lastLat,
    member.lastLng
  );

  const bearing = calculateBearing(
    myLocation.latitude,
    myLocation.longitude,
    member.lastLat,
    member.lastLng
  );

  // Relative pointer angle = Bearing - Compass heading
  const rawAngle = (bearing - compassHeading + 360) % 360;

  // Smooth continuous angle transition
  useEffect(() => {
    let delta = rawAngle - (lastAngleRef.current % 360);
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    const nextAngle = lastAngleRef.current + delta;
    lastAngleRef.current = nextAngle;
    setSmoothAngle(nextAngle);

    if (soundEnabled && Math.abs(delta) < 15 && distance < 30) {
      audioHaptics.playRadarPing(distance);
    }
  }, [rawAngle, distance, soundEnabled]);

  const directionAdvice = getRelativeDirectionAdvice(rawAngle, lang);

  // Voice Guidance Trigger
  const handleTriggerVoice = () => {
    audioHaptics.triggerHaptic(50);
    audioHaptics.speakGuidance(member.name, distance, directionAdvice, lang);
  };

  // Walk simulation
  const handleWalk = (closer: boolean) => {
    const latDiff = member.lastLat - myLocation.latitude;
    const lngDiff = member.lastLng - myLocation.longitude;
    const len = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) || 1;
    const step = 0.00009; // approx 10m
    const factor = closer ? 1 : -1;
    onSimulateStep((latDiff / len) * step * factor, (lngDiff / len) * step * factor);
    audioHaptics.triggerHaptic(30);
  };

  const handleTurn = (deg: number) => {
    onUpdateMyHeading((compassHeading + deg + 360) % 360);
    audioHaptics.triggerHaptic(20);
  };

  return (
    <div
      id="arrow-screen"
      className="flex-1 flex flex-col justify-between h-full w-full bg-[#F8FAF9] text-[#0D2119] select-none relative overflow-hidden"
    >
      {/* Top Bar: Back Chevron + "Tracking [Name]" Title */}
      <header className="h-16 px-4 sm:px-6 border-b border-[#E2E8F0] bg-[#F8FAF9] flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            id="btn-tracking-back"
            onClick={onBack}
            className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center text-[#0D2119] hover:bg-[#E2E8F0]/60 active:scale-95 transition-all cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="headline-md text-lg sm:text-xl text-[#0D2119] truncate">
              Tracking {member.name}
            </h2>
            <div className="label-sm font-medium flex items-center gap-1.5">
              {bleActive ? (
                <div className="flex items-center gap-1 text-[#2563EB]">
                  <Bluetooth className="w-3.5 h-3.5 animate-pulse text-[#2563EB]" />
                  <span className="font-bold">GPS+BLE Fusion</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[#006D36]">
                  <span className="w-2 h-2 rounded-full bg-[#4ADE80] shrink-0" />
                  <span>Live Lock</span>
                </div>
              )}
              <span className="text-[#CBD5E1]">•</span>
              <span className="font-mono text-[#166534] font-bold">🔋 {member.battery ?? 90}%</span>
            </div>
          </div>
        </div>

        {/* Audio & Voice & External Nav Tools */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${member.lastLat},${member.lastLng}&travelmode=walking`;
              window.open(url, '_blank');
            }}
            className="w-10 h-10 rounded-xl bg-[#1B4332] text-white flex items-center justify-center transition-all cursor-pointer shadow-xs hover:bg-[#012D1D]"
            title="Open in Google Maps"
          >
            <Navigation className="w-5 h-5 text-[#4ADE80]" />
          </button>
          <button
            onClick={handleTriggerVoice}
            className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAF9] text-[#1B4332] flex items-center justify-center transition-all cursor-pointer shadow-xs"
            title="Listen to Voice Guidance"
          >
            <Mic className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="w-10 h-10 rounded-xl bg-white border border-[#E2E8F0] hover:bg-[#F8FAF9] text-[#1B4332] flex items-center justify-center transition-all cursor-pointer shadow-xs"
            title={soundEnabled ? 'Mute Proximity Ping' : 'Enable Proximity Ping'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-[#94A3B8]" />}
          </button>
          <button
            id="btn-toggle-arrow-simulator"
            onClick={() => setSimulatorActive(!simulatorActive)}
            className={`w-10 h-10 rounded-xl border transition-all cursor-pointer shadow-xs flex items-center justify-center ${
              simulatorActive
                ? 'bg-[#1B4332] text-white border-[#1B4332]'
                : 'bg-white border-[#E2E8F0] hover:bg-[#F8FAF9] text-[#1B4332]'
            }`}
            title={simulatorActive ? 'Hide Walk Simulator' : 'Test Walk Simulator'}
            aria-label="Toggle Simulator Controls"
          >
            <Footprints className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* BLE Fusion Active Banner */}
      {bleActive && (
        <div className="bg-[#EFF6FF] text-[#1E40AF] border-b border-[#BFDBFE] px-4 py-2 text-xs font-semibold flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Bluetooth className="w-4 h-4 text-[#2563EB] animate-bounce" />
            <span>High-Precision BLE + GPS Active (≤30m)</span>
          </div>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#DBEAFE] font-bold text-[#1D4ED8]">
            {bleDistance !== undefined ? `~${bleDistance}m BLE` : 'SCANNING'}
          </span>
        </div>
      )}

      {/* Offline Amber Banner (if disconnected) */}
      {isOffline && (
        <div className="bg-[#FEF3C7] text-[#92400E] border-b border-[#FDE68A] px-4 py-2 text-xs font-semibold flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#D97706]" />
            <span>Using SMS Fallback (Offline)</span>
          </div>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#FDE68A]">SMS SYNC</span>
        </div>
      )}

      {/* CENTRAL FOCUS LAYOUT: Central ~60% Viewport Dial */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 relative my-auto z-10 py-4">
        {/* Large Concentric-Ring Compass Dial */}
        <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] flex items-center justify-center">
          {/* Light Gray Concentric Rings on Background */}
          <div className="absolute inset-0 border border-[#E2E8F0] rounded-full pointer-events-none" />
          <div className="absolute inset-6 border border-[#E2E8F0] rounded-full pointer-events-none" />
          <div className="absolute inset-12 border border-[#CBD5E1] rounded-full pointer-events-none" />

          {/* If BLE Active: Concentric Blue Pulsing Rings */}
          {bleActive && (
            <>
              <div className="absolute inset-2 border-2 border-[#3B82F6]/40 rounded-full animate-ping pointer-events-none" />
              <div className="absolute inset-8 border border-[#2563EB]/50 rounded-full pointer-events-none" />
            </>
          )}

          {/* Central White Disc Surface */}
          <div className="w-[210px] h-[210px] sm:w-[240px] sm:h-[240px] rounded-full bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center relative overflow-hidden">
            {/* Cardinal Markers */}
            <span className="absolute top-2 text-[10px] font-bold text-[#94A3B8]">N</span>
            <span className="absolute bottom-2 text-[10px] font-bold text-[#94A3B8]">S</span>
            <span className="absolute right-2 text-[10px] font-bold text-[#94A3B8]">E</span>
            <span className="absolute left-2 text-[10px] font-bold text-[#94A3B8]">W</span>

            {/* Smoothly Rotating Bold Arrow (Green for GPS, Blue tint for BLE Fusion) */}
            <motion.div
              style={{
                transform: `rotate(${smoothAngle}deg)`,
                transformOrigin: 'center center',
              }}
              className="w-full h-full flex items-center justify-center transition-transform duration-150 ease-out"
            >
              <div className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center">
                <svg
                  viewBox="0 0 100 100"
                  className={`w-full h-full drop-shadow-sm transition-colors ${
                    bleActive ? 'text-[#2563EB]' : 'text-[#4ADE80]'
                  }`}
                  fill="currentColor"
                >
                  {/* Rounded bold arrow shape */}
                  <path
                    d="M 50 12 C 52 12 53.5 13 54.5 14.5 L 78 48 C 80 51 78.5 55 75 55 L 60 55 C 58.5 55 57 56.5 57 58 L 57 82 C 57 85 54.5 87 51.5 87 L 48.5 87 C 45.5 87 43 85 43 82 L 43 58 C 43 56.5 41.5 55 40 55 L 25 55 C 21.5 55 20 51 22 48 L 45.5 14.5 C 46.5 13 48 12 50 12 Z"
                  />
                </svg>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Directly Below: distance-display large number */}
        <div className="mt-5 text-center">
          <div className="font-distance-display text-[#0D2119] tracking-tight flex items-baseline justify-center gap-1">
            {bleActive && bleDistance !== undefined ? (
              <>
                <span className="text-[#2563EB]">~{bleDistance} m</span>
                <span className="text-xs font-mono font-bold text-[#2563EB] bg-[#EFF6FF] px-1.5 py-0.5 rounded border border-[#BFDBFE]">BLE</span>
              </>
            ) : (
              <span>{distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`}</span>
            )}
          </div>

          {/* Below that: body-md directional or proximity hint */}
          <div className="body-md text-[#5C7168] mt-1 font-medium">
            {bleActive && bleDistance !== undefined && bleDistance < 5
              ? "🔵 You're right next to them — look around!"
              : directionAdvice}
          </div>
        </div>
      </div>

      {/* Simulator Toolbar (Crowd walk & compass rotate testing - toggled via Footprints icon) */}
      {simulatorActive && (
        <div className="px-4 sm:px-6 py-2.5 bg-white border-t border-[#E2E8F0] shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="label-sm font-semibold text-[#5C7168] uppercase font-['Inter']">
              Simulator
            </span>
            <span className="label-sm font-mono text-[#1B4332] font-bold">
              {Math.round(bearing)}° Bearing
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => handleTurn(-30)}
              className="py-2 px-2 rounded-lg bg-[#F8FAF9] hover:bg-[#E2E8F0] border border-[#E2E8F0] label-sm font-semibold text-[#0D2119] flex items-center justify-center gap-1 cursor-pointer"
              title="Turn -30°"
            >
              <RotateCw className="w-3.5 h-3.5 -scale-x-100 text-[#1B4332]" />
              <span>-30°</span>
            </button>
            <button
              onClick={() => handleTurn(30)}
              className="py-2 px-2 rounded-lg bg-[#F8FAF9] hover:bg-[#E2E8F0] border border-[#E2E8F0] label-sm font-semibold text-[#0D2119] flex items-center justify-center gap-1 cursor-pointer"
              title="Turn +30°"
            >
              <RotateCw className="w-3.5 h-3.5 text-[#1B4332]" />
              <span>+30°</span>
            </button>
            <button
              onClick={() => handleWalk(true)}
              className="py-2 px-2 rounded-lg bg-[#1B4332] hover:bg-[#012D1D] text-white label-sm font-bold flex items-center justify-center gap-1 cursor-pointer shadow-xs"
              title="Step 10m closer"
            >
              <Footprints className="w-3.5 h-3.5" />
              <span>+10m</span>
            </button>
            <button
              onClick={() => handleWalk(false)}
              className="py-2 px-2 rounded-lg bg-[#F8FAF9] hover:bg-[#E2E8F0] border border-[#E2E8F0] label-sm font-semibold text-[#5C7168] flex items-center justify-center gap-1 cursor-pointer"
              title="Step 10m away"
            >
              <span>Away</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom of Screen: Full-width error-red Distress Alert Button */}
      <div className="p-4 sm:px-6 sm:py-5 bg-white border-t border-[#E2E8F0] shrink-0">
        <button
          id="btn-arrow-distress-alert"
          onClick={onOpenDistressModal}
          className="w-full h-14 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.98] text-white label-lg text-base font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2.5"
        >
          <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
          <span>I'm Lost — Send Distress Alert</span>
        </button>
      </div>
    </div>
  );
};
