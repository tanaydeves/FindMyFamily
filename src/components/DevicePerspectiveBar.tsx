import React from 'react';
import { Smartphone, Wifi, WifiOff, MapPin, Users, UserPlus, Edit3, Globe } from 'lucide-react';
import { LanguageCode } from '../types';

interface Props {
  currentDeviceId: string;
  currentDeviceName: string;
  currentDeviceColor?: string;
  circleId: string;
  isOffline: boolean;
  isServerConnected?: boolean;
  useRealGps: boolean;
  currentLang: LanguageCode;
  connectedCount: number;
  onOpenCircleModal: () => void;
  onOpenProfileModal: () => void;
  onOpenAddMemberModal: () => void;
  onToggleOffline: () => void;
  onToggleRealGps: () => void;
  onSelectLang: (lang: LanguageCode) => void;
}

export const DevicePerspectiveBar: React.FC<Props> = ({
  currentDeviceId,
  currentDeviceName,
  currentDeviceColor = '#4ADE80',
  circleId,
  isOffline,
  isServerConnected = true,
  useRealGps,
  currentLang,
  connectedCount,
  onOpenCircleModal,
  onOpenProfileModal,
  onOpenAddMemberModal,
  onToggleOffline,
  onToggleRealGps,
  onSelectLang,
}) => {
  return (
    <div className="w-full bg-[#081C15] text-[#D8F3DC] px-3 sm:px-4 py-2 border-b border-[#2D6A4F] flex flex-wrap items-center justify-between gap-2 text-xs select-none">
      {/* Left: Circle ID & My Phone Profile Name */}
      <div className="flex items-center gap-2">
        {/* Circle Room Badge */}
        <button
          onClick={onOpenCircleModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#132A22] hover:bg-[#1B4332] border border-[#2D6A4F] text-[#4ADE80] font-bold text-[11px] cursor-pointer transition-all shadow-sm"
          title="Open Family Circle & Multi-Device Settings (Wi-Fi / Server / QR)"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Circle: {circleId}</span>
          <span
            className={`w-2 h-2 rounded-full ${
              isOffline
                ? 'bg-yellow-400'
                : isServerConnected
                ? 'bg-[#4ADE80] animate-pulse'
                : 'bg-red-400 animate-ping'
            }`}
            title={isOffline ? 'Offline / SMS Mode' : isServerConnected ? 'Connected to Hub' : 'Connecting to Server...'}
          />
        </button>

        {/* My Phone Profile Badge with Direct Rename */}
        <button
          onClick={onOpenProfileModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#132A22] hover:bg-[#1B4332] border border-[#2D6A4F] text-white hover:text-[#4ADE80] text-[11px] font-semibold transition-all cursor-pointer shadow-sm group"
          title="Click to Change Your Phone's Name & Color"
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
            style={{ backgroundColor: currentDeviceColor }}
          />
          <span className="font-bold text-white max-w-[120px] truncate">{currentDeviceName}</span>
          <Edit3 className="w-3 h-3 text-[#74C69D] group-hover:text-[#4ADE80]" />
        </button>

        {/* Quick Add Family Phone */}
        <button
          onClick={onOpenAddMemberModal}
          className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#1B4332] hover:bg-[#2D6A4F] border border-[#2D6A4F] text-[#4ADE80] font-bold text-[11px] cursor-pointer transition-all shadow-sm"
          title="Add a Family Member's Phone"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>+ Add Phone</span>
        </button>
      </div>

      {/* Right: GPS, Offline Mode, Language */}
      <div className="flex items-center gap-2">
        {/* Real GPS Toggle */}
        <button
          onClick={onToggleRealGps}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-bold text-[11px] ${
            useRealGps
              ? 'bg-[#4ADE80]/20 text-[#4ADE80] border-[#4ADE80]/50 shadow-[0_0_10px_rgba(74,222,128,0.2)]'
              : 'bg-[#132A22] text-[#95D5B2] hover:text-white border-[#2D6A4F]'
          }`}
          title={useRealGps ? 'Using Real Hardware GPS' : 'Using Kumbh Mela Simulation'}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>{useRealGps ? 'Live GPS' : 'Sim GPS'}</span>
        </button>

        {/* Offline Toggle */}
        <button
          id="btn-toggle-offline-mode"
          onClick={onToggleOffline}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-bold text-[11px] ${
            isOffline
              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40 shadow-[0_0_10px_rgba(234,179,8,0.2)]'
              : 'bg-[#132A22] text-[#95D5B2] hover:text-white border-[#2D6A4F]'
          }`}
          title={isOffline ? 'Switch back to online relay mode' : 'Simulate mobile data outage / SMS mode'}
        >
          {isOffline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5 text-[#4ADE80]" />}
          <span>{isOffline ? 'SMS Only' : 'Relay'}</span>
        </button>

        {/* Language selector */}
        <div className="flex items-center gap-0.5 bg-[#132A22] p-0.5 rounded-lg border border-[#2D6A4F]">
          <button
            onClick={() => onSelectLang('en')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
              currentLang === 'en'
                ? 'bg-[#4ADE80] text-[#081C15] shadow-[0_0_8px_rgba(74,222,128,0.3)]'
                : 'text-[#74C69D] hover:text-white'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => onSelectLang('hi')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
              currentLang === 'hi'
                ? 'bg-[#4ADE80] text-[#081C15] shadow-[0_0_8px_rgba(74,222,128,0.3)]'
                : 'text-[#74C69D] hover:text-white'
            }`}
          >
            हिंदी
          </button>
          <button
            onClick={() => onSelectLang('mr')}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
              currentLang === 'mr'
                ? 'bg-[#4ADE80] text-[#081C15] shadow-[0_0_8px_rgba(74,222,128,0.3)]'
                : 'text-[#74C69D] hover:text-white'
            }`}
          >
            मराठी
          </button>
        </div>
      </div>
    </div>
  );
};
