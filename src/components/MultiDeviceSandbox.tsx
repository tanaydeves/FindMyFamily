import React, { useState } from 'react';
import {
  ArrowLeft,
  Smartphone,
  Compass,
  Footprints,
  RotateCw,
  AlertTriangle,
  Radio,
  Sparkles,
  ArrowUp,
  Volume2,
  Share2,
  Users,
  Maximize2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { LanguageCode } from '../types';
import { calculateDistance, calculateBearing, getRelativeDirectionAdvice } from '../services/navigationMath';
import { audioHaptics } from '../services/audioHaptics';

interface SimulatedDevice {
  id: string;
  name: string;
  lat: number;
  lng: number;
  heading: number;
  color: string;
  isLost: boolean;
  targetId: string;
}

interface Props {
  lang: LanguageCode;
  circleId: string;
  onExitSandbox: () => void;
  onOpenCircleModal: () => void;
}

const DEFAULT_CENTER_LAT = 25.4358;
const DEFAULT_CENTER_LNG = 81.8463;

export const MultiDeviceSandbox: React.FC<Props> = ({
  lang,
  circleId,
  onExitSandbox,
  onOpenCircleModal,
}) => {
  const [devices, setDevices] = useState<SimulatedDevice[]>([
    {
      id: 'dev_sim_rahul',
      name: 'Phone 1 (Rahul)',
      lat: DEFAULT_CENTER_LAT,
      lng: DEFAULT_CENTER_LNG,
      heading: 0,
      color: '#4ADE80',
      isLost: false,
      targetId: 'dev_sim_papa',
    },
    {
      id: 'dev_sim_papa',
      name: 'Phone 2 (Papa)',
      lat: DEFAULT_CENTER_LAT + 0.00065,
      lng: DEFAULT_CENTER_LNG + 0.0005,
      heading: 180,
      color: '#38BDF8',
      isLost: false,
      targetId: 'dev_sim_rahul',
    },
  ]);

  // Handle walking a simulated phone
  const handleWalk = (deviceId: string, deltaLat: number, deltaLng: number) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              lat: d.lat + deltaLat,
              lng: d.lng + deltaLng,
            }
          : d
      )
    );
    audioHaptics.triggerHaptic(30);
  };

  // Handle rotating heading of a simulated phone
  const handleRotate = (deviceId: string, deltaHeading: number) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === deviceId
          ? {
              ...d,
              heading: (d.heading + deltaHeading + 360) % 360,
            }
          : d
      )
    );
    audioHaptics.triggerHaptic(20);
  };

  // Trigger SOS from one simulated phone
  const handleToggleSos = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) => {
        if (d.id === deviceId) {
          const next = !d.isLost;
          if (next) audioHaptics.startDistressSiren();
          else audioHaptics.stopDistressSiren();
          return { ...d, isLost: next };
        }
        return d;
      })
    );
  };

  return (
    <div
      id="multi-device-sandbox"
      className="flex flex-col h-full w-full bg-[#081C15] text-[#D8F3DC] select-none overflow-hidden"
    >
      {/* Sandbox Header */}
      <div className="bg-[#132A22] px-6 py-3.5 border-b border-[#2D6A4F] flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onExitSandbox}
            className="w-9 h-9 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] border border-[#2D6A4F] text-[#4ADE80] flex items-center justify-center transition-all cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white uppercase tracking-tight">
                Multi-Device Real-Time Sandbox
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/30 text-[10px] font-mono font-bold">
                Circle: {circleId}
              </span>
            </div>
            <p className="text-xs text-[#74C69D]">
              Interactive test bench • Move either phone and watch the other adjust live
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenCircleModal}
            className="px-3.5 py-1.5 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] border border-[#2D6A4F] text-[#4ADE80] text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Connect Real Phone</span>
          </button>
        </div>
      </div>

      {/* Grid of Simulated Phones Side-by-Side */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-y-auto">
        {devices.map((dev, idx) => {
          const target = devices.find((d) => d.id === dev.targetId) || devices[idx === 0 ? 1 : 0];
          const dist = calculateDistance(dev.lat, dev.lng, target.lat, target.lng);
          const bearing = calculateBearing(dev.lat, dev.lng, target.lat, target.lng);
          const rawAngle = (bearing - dev.heading + 360) % 360;
          const isDirectlyFacing = rawAngle <= 20 || rawAngle >= 340;
          const advice = getRelativeDirectionAdvice(rawAngle, lang);

          return (
            <div
              key={dev.id}
              className={`rounded-3xl border-2 flex flex-col justify-between overflow-hidden shadow-2xl p-4 sm:p-5 relative ${
                dev.isLost
                  ? 'bg-[#2A0E12] border-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)]'
                  : 'bg-[#132A22] border-[#2D6A4F]'
              }`}
            >
              {/* Phone Device Status Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-[#2D6A4F]/60 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-[#081C15] shadow"
                    style={{ backgroundColor: dev.color }}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">{dev.name}</h3>
                    <div className="text-[10px] text-[#74C69D] flex items-center gap-1 font-mono">
                      <span>Facing {Math.round(dev.heading)}°</span>
                      <span>•</span>
                      <span>Targeting {target.name.split(' ')[0]}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleToggleSos(dev.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-1 border ${
                    dev.isLost
                      ? 'bg-red-600 border-red-400 text-white animate-pulse'
                      : 'bg-[#1B4332] border-[#2D6A4F] text-red-400 hover:bg-red-950/40'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{dev.isLost ? 'SOS ACTIVE' : 'SOS'}</span>
                </button>
              </div>

              {/* Center Compass Arrow HUD */}
              <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
                <div
                  className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-2 border ${
                    isDirectlyFacing
                      ? 'bg-[#1B4332] border-[#4ADE80] text-[#4ADE80]'
                      : 'bg-[#081C15] border-[#2D6A4F] text-[#B7E4C7]'
                  }`}
                >
                  {advice}
                </div>

                {/* Rotating Dial */}
                <div
                  className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full border-4 flex items-center justify-center relative overflow-hidden transition-all duration-300 ${
                    isDirectlyFacing
                      ? 'bg-[#1B4332] border-[#4ADE80] shadow-[0_0_40px_rgba(74,222,128,0.25)]'
                      : 'bg-[#1B4332] border-[#2D6A4F]'
                  }`}
                >
                  <motion.div
                    style={{
                      transform: `rotate(${rawAngle}deg)`,
                      transformOrigin: 'center center',
                    }}
                    className="w-full h-full flex items-center justify-center"
                  >
                    <ArrowUp
                      className={`w-20 h-20 sm:w-24 sm:h-24 ${
                        isDirectlyFacing ? 'text-[#4ADE80] stroke-[3.5]' : 'text-[#4ADE80] stroke-[2.8]'
                      }`}
                    />
                  </motion.div>
                </div>

                {/* Distance Badge */}
                <div className="mt-2 text-center">
                  <div className="text-2xl sm:text-3xl font-black text-white font-mono">
                    {dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${dist} m`}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-[#74C69D]">Distance to {target.name.split(' ')[0]}</div>
                </div>
              </div>

              {/* Controls Toolbar for this phone */}
              <div className="pt-3 border-t border-[#2D6A4F]/60 shrink-0 space-y-2">
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => handleRotate(dev.id, -30)}
                    className="py-1.5 rounded-lg bg-[#1B4332] hover:bg-[#2D6A4F] border border-[#2D6A4F] text-[11px] font-bold text-white flex items-center justify-center gap-0.5 cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3 -scale-x-100 text-[#4ADE80]" />
                    <span>-30°</span>
                  </button>
                  <button
                    onClick={() => handleRotate(dev.id, 30)}
                    className="py-1.5 rounded-lg bg-[#1B4332] hover:bg-[#2D6A4F] border border-[#2D6A4F] text-[11px] font-bold text-white flex items-center justify-center gap-0.5 cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3 text-[#4ADE80]" />
                    <span>+30°</span>
                  </button>
                  <button
                    onClick={() => {
                      const latDiff = target.lat - dev.lat;
                      const lngDiff = target.lng - dev.lng;
                      const len = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) || 1;
                      handleWalk(dev.id, (latDiff / len) * 0.0001, (lngDiff / len) * 0.0001);
                    }}
                    className="py-1.5 rounded-lg bg-[#4ADE80] text-[#081C15] font-black uppercase text-[11px] flex items-center justify-center gap-1 cursor-pointer shadow"
                  >
                    <Footprints className="w-3 h-3" />
                    <span>+10m</span>
                  </button>
                  <button
                    onClick={() => {
                      const latDiff = target.lat - dev.lat;
                      const lngDiff = target.lng - dev.lng;
                      const len = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) || 1;
                      handleWalk(dev.id, -(latDiff / len) * 0.0001, -(lngDiff / len) * 0.0001);
                    }}
                    className="py-1.5 rounded-lg bg-[#1B4332] hover:bg-[#2D6A4F] border border-[#2D6A4F] text-[11px] font-bold text-[#B7E4C7] flex items-center justify-center cursor-pointer"
                  >
                    <span>Away</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
