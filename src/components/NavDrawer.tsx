import React, { useState } from 'react';
import {
  X,
  Users,
  UserPlus,
  Edit3,
  Copy,
  Check,
  MapPin,
  Wifi,
  WifiOff,
  Server,
  Settings,
  HelpCircle,
  ChevronRight,
  Radio,
  Share2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LanguageCode } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  circleId: string;
  myDeviceId: string;
  myDeviceName: string;
  myColor: string;
  isOffline: boolean;
  isServerConnected?: boolean;
  useRealGps: boolean;
  currentLang: LanguageCode;
  onSelectLang: (lang: LanguageCode) => void;
  onToggleOffline: () => void;
  onToggleRealGps: () => void;
  onOpenRooms: () => void;
  onOpenInvite: () => void;
  onOpenProfile: () => void;
  onOpenServerSettings: () => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
}

export const NavDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  circleId,
  myDeviceId,
  myDeviceName,
  myColor,
  isOffline,
  isServerConnected = true,
  useRealGps,
  currentLang,
  onSelectLang,
  onToggleOffline,
  onToggleRealGps,
  onOpenRooms,
  onOpenInvite,
  onOpenProfile,
  onOpenServerSettings,
  onOpenSettings,
  onOpenHelp,
}) => {
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(myDeviceId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex select-none">
          {/* Dimmed Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
          />

          {/* Drawer Sheet (Slide in from Left) */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative w-full max-w-[320px] sm:max-w-[340px] h-full bg-[#FFFFFF] text-[#0D2119] shadow-2xl flex flex-col z-10 border-r border-[#E2E8F0] overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#E2E8F0] flex items-center justify-between shrink-0 bg-[#F8FAF9]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1B4332] text-white flex items-center justify-center font-bold text-sm">
                  🧭
                </div>
                <span className="font-bold text-[#1B4332] text-base tracking-tight">Find My Family</span>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 -mr-2 rounded-xl flex items-center justify-center text-[#5C7168] hover:text-[#0D2119] hover:bg-[#E2E8F0]/50 transition-all cursor-pointer"
                aria-label="Close Drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Section Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* SECTION: CIRCLE */}
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-wider text-[#5C7168] mb-2 font-['Inter']">
                  Circle
                </div>
                <div className="bg-[#F8FAF9] border border-[#E2E8F0] rounded-xl p-3 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80] shrink-0" />
                    <span className="font-bold text-base text-[#0D2119] font-mono">{circleId}</span>
                  </div>
                  <span className="text-[11px] font-medium text-[#5C7168]">Connected</span>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenRooms();
                    }}
                    className="w-full min-h-[48px] px-3 py-2.5 rounded-lg hover:bg-[#F8FAF9] active:bg-[#ECEEED] flex items-center justify-between text-sm font-medium text-[#0D2119] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-[#5C7168]" />
                      <span>Switch or Join Circle</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#5C7168]" />
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      onOpenInvite();
                    }}
                    className="w-full min-h-[48px] px-3 py-2.5 rounded-lg hover:bg-[#F8FAF9] active:bg-[#ECEEED] flex items-center justify-between text-sm font-medium text-[#0D2119] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Share2 className="w-4 h-4 text-[#5C7168]" />
                      <span>Invite to this Circle</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#5C7168]" />
                  </button>
                </div>
              </div>

              {/* SECTION: THIS DEVICE */}
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-wider text-[#5C7168] mb-2 font-['Inter']">
                  This Device
                </div>
                <div className="bg-[#F8FAF9] border border-[#E2E8F0] rounded-xl p-3 mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-[#0D2119] shrink-0"
                      style={{ backgroundColor: myColor }}
                    >
                      {myDeviceName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-[#0D2119] truncate">{myDeviceName}</div>
                      <div className="text-[11px] font-mono text-[#5C7168] truncate">{myDeviceId}</div>
                    </div>
                  </div>

                  <button
                    onClick={handleCopyId}
                    className="w-9 h-9 rounded-lg bg-white border border-[#E2E8F0] hover:bg-[#F8FAF9] flex items-center justify-center text-[#5C7168] hover:text-[#0D2119] transition-all cursor-pointer shrink-0"
                    title="Copy Device ID"
                  >
                    {copiedId ? <Check className="w-4 h-4 text-[#1B4332]" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onOpenProfile();
                  }}
                  className="w-full min-h-[48px] px-3 py-2.5 rounded-lg hover:bg-[#F8FAF9] active:bg-[#ECEEED] flex items-center justify-between text-sm font-medium text-[#0D2119] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Edit3 className="w-4 h-4 text-[#5C7168]" />
                    <span>Edit Profile</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#5C7168]" />
                </button>
              </div>

              {/* SECTION: CONNECTIVITY */}
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-wider text-[#5C7168] mb-2 font-['Inter']">
                  Connectivity
                </div>
                <div className="space-y-3">
                  {/* Live GPS Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0]">
                    <div className="pr-2">
                      <div className="font-bold text-sm text-[#0D2119]">Live GPS</div>
                      <div className="text-[11px] text-[#5C7168] mt-0.5">Share my live location with circle</div>
                    </div>
                    <button
                      onClick={onToggleRealGps}
                      className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer shrink-0 p-0.5 ${
                        useRealGps ? 'bg-[#1B4332]' : 'bg-[#CBD5E1]'
                      }`}
                      aria-label="Toggle Live GPS"
                    >
                      <div
                        className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                          useRealGps ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Relay Toggle / Status */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0]">
                    <div className="pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#0D2119]">Relay (Data Network)</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isOffline ? 'bg-[#F59E0B]' : isServerConnected ? 'bg-[#4ADE80]' : 'bg-red-400'
                          }`}
                        />
                      </div>
                      <div className="text-[11px] text-[#5C7168] mt-0.5">
                        {isOffline ? 'Offline / SMS Mode' : 'Online data mesh synchronization'}
                      </div>
                    </div>
                    <button
                      onClick={onToggleOffline}
                      className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer shrink-0 p-0.5 ${
                        !isOffline ? 'bg-[#1B4332]' : 'bg-[#CBD5E1]'
                      }`}
                      aria-label="Toggle Relay"
                    >
                      <div
                        className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                          !isOffline ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Advanced Connection Status summary */}
                  <button
                    onClick={() => {
                      onClose();
                      onOpenServerSettings();
                    }}
                    className="w-full min-h-[48px] px-3 py-2.5 rounded-lg hover:bg-[#F8FAF9] active:bg-[#ECEEED] flex items-center justify-between text-left transition-colors cursor-pointer border border-[#E2E8F0]"
                  >
                    <div>
                      <div className="text-xs font-bold text-[#0D2119]">Connection Status</div>
                      <div className="text-[11px] text-[#5C7168]">
                        {isOffline ? 'Offline • SMS Fallback Ready' : 'Good signal • Relay connected'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[#1B4332] text-xs font-semibold">
                      <span className="text-[10px] bg-[#1B4332]/10 px-1.5 py-0.5 rounded">Advanced</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                </div>
              </div>

              {/* SECTION: LANGUAGE */}
              <div>
                <div className="text-[12px] font-semibold uppercase tracking-wider text-[#5C7168] mb-2 font-['Inter']">
                  Language
                </div>
                <div className="space-y-2">
                  {[
                    { code: 'en' as LanguageCode, label: 'English', native: 'English' },
                    { code: 'hi' as LanguageCode, label: 'Hindi', native: 'हिंदी' },
                    { code: 'mr' as LanguageCode, label: 'Marathi', native: 'मराठी' },
                  ].map((l) => {
                    const isSelected = currentLang === l.code;
                    return (
                      <button
                        key={l.code}
                        onClick={() => onSelectLang(l.code)}
                        className={`w-full min-h-[48px] px-3 py-2.5 rounded-xl border flex items-center justify-between transition-all cursor-pointer text-left ${
                          isSelected
                            ? 'bg-white border-[#1B4332] shadow-xs'
                            : 'bg-[#F8FAF9] border-[#E2E8F0] hover:border-[#CBD5E1]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#0D2119]">{l.native}</span>
                          <span className="text-xs text-[#5C7168]">({l.label})</span>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            isSelected ? 'border-2 border-[#1B4332]' : 'border border-[#CBD5E1]'
                          }`}
                        >
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#1B4332]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Pinned Footer */}
            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAF9] space-y-1 shrink-0">
              <button
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="w-full min-h-[48px] px-3 py-2 rounded-lg hover:bg-white flex items-center gap-3 text-sm font-semibold text-[#0D2119] transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-[#5C7168]" />
                <span>Settings</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onOpenHelp();
                }}
                className="w-full min-h-[48px] px-3 py-2 rounded-lg hover:bg-white flex items-center gap-3 text-sm font-semibold text-[#0D2119] transition-colors cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-[#5C7168]" />
                <span>Help & Safety Info</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
