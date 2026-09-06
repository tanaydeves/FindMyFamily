import React from 'react';
import { ArrowLeft, Compass, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { FamilyMember, LanguageCode } from '../types';
import { calculateDistance, calculateBearing } from '../services/navigationMath';

interface Props {
  lang: LanguageCode;
  myLocation: { latitude: number; longitude: number };
  myDeviceName: string;
  compassHeading: number;
  pairedMembers: FamilyMember[];
  bleActive?: boolean;
  bleDistances?: Map<string, number>;
  onBack: () => void;
  onSelectMember: (member: FamilyMember) => void;
}

export const RadarScreen: React.FC<Props> = ({
  myLocation,
  compassHeading,
  pairedMembers,
  bleActive = false,
  bleDistances,
  onBack,
  onSelectMember,
}) => {
  const maxRangeMeters = 250;
  const radarRadiusPx = 130;

  return (
    <div
      id="radar-screen"
      className="flex-1 flex flex-col justify-between h-full w-full bg-[#F8FAF9] text-[#0D2119] select-none relative overflow-hidden"
    >
      {/* Top Bar */}
      <header className="h-16 px-4 sm:px-6 border-b border-[#E2E8F0] bg-[#F8FAF9] flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center text-[#0D2119] hover:bg-[#E2E8F0]/60 active:scale-95 transition-all cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="headline-md text-lg sm:text-xl text-[#0D2119]">Perimeter Radar</h2>
            <div className="label-sm text-[#5C7168] font-medium">360° Crowd Scan</div>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full bg-white border border-[#E2E8F0] label-sm font-mono text-[#1B4332] font-bold flex items-center gap-1.5 shadow-xs">
          <Compass className="w-3.5 h-3.5 text-[#1B4332]" />
          <span>{Math.round(compassHeading)}° HDG</span>
        </div>
      </header>

      {/* Radar Canvas Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 my-auto">
        <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] rounded-full bg-white border-2 border-[#E2E8F0] shadow-sm flex items-center justify-center overflow-hidden">
          {/* Radar Sweep Arc */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 origin-center pointer-events-none"
          >
            <div className="w-1/2 h-1/2 bg-[conic-gradient(from_0deg,transparent_0deg,rgba(74,222,128,0.25)_60deg,transparent_90deg)] rounded-tl-full" />
          </motion.div>

          {/* Concentric rings */}
          <div className="absolute w-[60px] h-[60px] rounded-full border border-[#E2E8F0] pointer-events-none" />
          <div className="absolute w-[120px] h-[120px] rounded-full border border-[#E2E8F0] pointer-events-none" />
          <div className="absolute w-[180px] h-[180px] rounded-full border border-[#E2E8F0] pointer-events-none" />
          <div className="absolute w-[240px] h-[240px] rounded-full border border-[#CBD5E1] pointer-events-none" />

          {/* Crosshairs */}
          <div className="absolute inset-x-0 top-1/2 h-[1px] bg-[#E2E8F0] pointer-events-none" />
          <div className="absolute inset-y-0 left-1/2 w-[1px] bg-[#E2E8F0] pointer-events-none" />

          {/* Distance Labels */}
          <span className="absolute top-[28%] left-[53%] text-[9px] text-[#94A3B8] font-mono font-semibold">50m</span>
          <span className="absolute top-[18%] left-[53%] text-[9px] text-[#94A3B8] font-mono font-semibold">100m</span>
          <span className="absolute top-[8%] left-[53%] text-[9px] text-[#94A3B8] font-mono font-semibold">200m</span>

          {/* Center User Dot with heading cone */}
          <div className="relative z-10 flex items-center justify-center">
            <div
              className="absolute w-20 h-20 pointer-events-none"
              style={{
                transform: `rotate(${compassHeading}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <div className="w-full h-1/2 bg-gradient-to-t from-transparent to-[#4ADE80]/30 rounded-t-full" />
            </div>

            <div className="w-6 h-6 rounded-full bg-[#1B4332] text-white border-2 border-white shadow-xs flex items-center justify-center text-[9px] font-bold">
              ME
            </div>
          </div>

          {/* Family Blips */}
          {pairedMembers.map((member) => {
            const dist = calculateDistance(
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

            const clampedDist = Math.min(dist, maxRangeMeters);
            const rRatio = clampedDist / maxRangeMeters;
            const rPx = rRatio * radarRadiusPx;
            const angleRad = ((bearing - 90) * Math.PI) / 180;
            const x = rPx * Math.cos(angleRad);
            const y = rPx * Math.sin(angleRad);

            const isBleRange = dist <= 30 || (bleDistances && bleDistances.has(member.id));
            const memberBleDist = bleDistances?.get(member.id);

            return (
              <motion.button
                key={member.id}
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectMember(member)}
                style={{
                  x,
                  y,
                }}
                className="absolute z-20 flex flex-col items-center cursor-pointer"
              >
                <div className="relative flex items-center justify-center">
                  {isBleRange && (
                    <span className="absolute -inset-1 rounded-full border-2 border-[#2563EB] animate-ping pointer-events-none opacity-75" />
                  )}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-[#0D2119] ring-2 ring-white shadow-sm"
                    style={{ backgroundColor: member.color || '#38BDF8' }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs border mt-0.5 whitespace-nowrap ${
                  isBleRange
                    ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
                    : 'bg-white text-[#0D2119] border-[#E2E8F0]'
                }`}>
                  {member.name.split(' ')[0]} ({memberBleDist !== undefined ? `~${memberBleDist}m BLE` : `${dist}m`})
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bottom Switch List */}
      <div className="p-4 sm:px-6 bg-white border-t border-[#E2E8F0] shrink-0 z-10">
        <div className="label-sm font-semibold uppercase tracking-wider text-[#5C7168] mb-2 font-['Inter']">
          Nearby Family in Crowd
        </div>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {pairedMembers.map((member) => {
            const dist = calculateDistance(
              myLocation.latitude,
              myLocation.longitude,
              member.lastLat,
              member.lastLng
            );
            return (
              <button
                key={member.id}
                onClick={() => onSelectMember(member)}
                className="w-full p-2.5 rounded-xl bg-[#F8FAF9] hover:bg-[#ECEEED] border border-[#E2E8F0] flex items-center justify-between text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs text-[#0D2119]"
                    style={{ backgroundColor: member.color || '#38BDF8' }}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-bold text-[#0D2119]">{member.name}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#1B4332]">
                  <span>{dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${dist} m`}</span>
                  <ChevronRight className="w-4 h-4 text-[#94A3B8]" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
