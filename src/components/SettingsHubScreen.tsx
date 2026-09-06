import React, { useState } from 'react';
import {
  User,
  Globe,
  Users,
  Server,
  MessageSquare,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { LanguageCode } from '../types';
import { relayClient } from '../services/relayClient';

interface Props {
  circleId: string;
  myDeviceName: string;
  currentLang: LanguageCode;
  onOpenProfile: () => void;
  onOpenLanguage: () => void;
  onOpenRooms: () => void;
  onOpenServerSettings: () => void;
  onOpenSmsHub: () => void;
  onOpenHelp: () => void;
  onOpenAbout: () => void;
  onLeaveCircle: () => void;
}

export const SettingsHubScreen: React.FC<Props> = ({
  circleId,
  myDeviceName,
  currentLang,
  onOpenProfile,
  onOpenLanguage,
  onOpenRooms,
  onOpenServerSettings,
  onOpenSmsHub,
  onOpenHelp,
  onOpenAbout,
  onLeaveCircle,
}) => {
  const [cacheCleared, setCacheCleared] = useState(false);
  const langLabelMap: Record<LanguageCode, string> = {
    en: 'English',
    hi: 'हिंदी',
    mr: 'मराठी',
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAF9] text-[#0D2119] overflow-y-auto select-none p-6 sm:p-8">
      <h1 className="headline-lg text-[#0D2119] mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Group 1: Identity & Preferences */}
        <div className="space-y-2">
          <div className="label-sm font-semibold uppercase tracking-wider text-[#5C7168] px-1 font-['Inter']">
            Preferences & Identity
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs divide-y divide-[#E2E8F0]">
            <button
              onClick={onOpenProfile}
              className="w-full min-h-[52px] p-4 flex items-center justify-between hover:bg-[#F8FAF9] active:bg-[#ECEEED] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <User className="w-5 h-5 text-[#5C7168]" />
                <span className="body-md font-medium text-[#0D2119]">My Profile</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="label-sm text-[#5C7168]">{myDeviceName}</span>
                <ChevronRight className="w-4 h-4 text-[#5C7168]" />
              </div>
            </button>

            <button
              onClick={onOpenLanguage}
              className="w-full min-h-[52px] p-4 flex items-center justify-between hover:bg-[#F8FAF9] active:bg-[#ECEEED] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <Globe className="w-5 h-5 text-[#5C7168]" />
                <span className="body-md font-medium text-[#0D2119]">Language</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="label-sm text-[#5C7168]">{langLabelMap[currentLang]}</span>
                <ChevronRight className="w-4 h-4 text-[#5C7168]" />
              </div>
            </button>
          </div>
        </div>

        {/* Group 2: Circle & Mesh Network */}
        <div className="space-y-2">
          <div className="label-sm font-semibold uppercase tracking-wider text-[#5C7168] px-1 font-['Inter']">
            Circle & Mesh
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs divide-y divide-[#E2E8F0]">
            <button
              onClick={onOpenRooms}
              className="w-full min-h-[52px] p-4 flex items-center justify-between hover:bg-[#F8FAF9] active:bg-[#ECEEED] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <Users className="w-5 h-5 text-[#5C7168]" />
                <span className="body-md font-medium text-[#0D2119]">Circle Management</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="label-sm font-mono text-[#5C7168]">{circleId}</span>
                <ChevronRight className="w-4 h-4 text-[#5C7168]" />
              </div>
            </button>

            <button
              onClick={onOpenServerSettings}
              className="w-full min-h-[52px] p-4 flex items-center justify-between hover:bg-[#F8FAF9] active:bg-[#ECEEED] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <Server className="w-5 h-5 text-[#5C7168]" />
                <span className="body-md font-medium text-[#0D2119]">Connection (Advanced)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#5C7168]" />
            </button>

            <button
              onClick={onOpenSmsHub}
              className="w-full min-h-[52px] p-4 flex items-center justify-between hover:bg-[#F8FAF9] active:bg-[#ECEEED] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <MessageSquare className="w-5 h-5 text-[#5C7168]" />
                <span className="body-md font-medium text-[#0D2119]">SMS Hub / Fallback</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#5C7168]" />
            </button>
          </div>
        </div>

        {/* Group 3: Safety & Info */}
        <div className="space-y-2">
          <div className="label-sm font-semibold uppercase tracking-wider text-[#5C7168] px-1 font-['Inter']">
            Support & Information
          </div>
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden shadow-xs divide-y divide-[#E2E8F0]">
            <button
              onClick={onOpenHelp}
              className="w-full min-h-[52px] p-4 flex items-center justify-between hover:bg-[#F8FAF9] active:bg-[#ECEEED] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <HelpCircle className="w-5 h-5 text-[#5C7168]" />
                <span className="body-md font-medium text-[#0D2119]">Help & Safety Info</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#5C7168]" />
            </button>

            <button
              onClick={onOpenAbout}
              className="w-full min-h-[52px] p-4 flex items-center justify-between hover:bg-[#F8FAF9] active:bg-[#ECEEED] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <Info className="w-5 h-5 text-[#5C7168]" />
                <span className="body-md font-medium text-[#0D2119]">About</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="label-sm text-[#5C7168]">v2.0 (Kumbh 2026)</span>
                <ChevronRight className="w-4 h-4 text-[#5C7168]" />
              </div>
            </button>

            <button
              onClick={() => {
                relayClient.clearAppCache();
                setCacheCleared(true);
                setTimeout(() => setCacheCleared(false), 3000);
              }}
              className="w-full min-h-[52px] p-4 flex items-center justify-between hover:bg-[#F8FAF9] active:bg-[#ECEEED] transition-colors cursor-pointer text-left"
            >
              <div className="flex items-center gap-3.5">
                <Trash2 className="w-5 h-5 text-[#5C7168]" />
                <span className="body-md font-medium text-[#0D2119]">Clear Cache Memory</span>
              </div>
              <div className="flex items-center gap-2">
                {cacheCleared ? (
                  <span className="label-sm text-[#006D36] font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Cleared
                  </span>
                ) : (
                  <span className="label-sm text-[#5C7168]">Clean & Optimize</span>
                )}
                <ChevronRight className="w-4 h-4 text-[#5C7168]" />
              </div>
            </button>
          </div>
        </div>

        {/* Destructive Action: Leave Circle */}
        <div className="pt-4 pb-8">
          <button
            onClick={() => {
              if (confirm('Leave current circle and switch to default?')) {
                onLeaveCircle();
              }
            }}
            className="w-full min-h-[52px] p-4 rounded-xl border border-[#FCA5A5] bg-[#FEF2F2] hover:bg-[#FEE2E2] flex items-center justify-center gap-2 text-[#DC2626] label-lg font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
            <span>Leave Circle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
