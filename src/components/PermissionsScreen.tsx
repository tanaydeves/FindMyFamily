import React, { useState } from 'react';
import { Bluetooth, MapPin, MessageSquare, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { LanguageCode } from '../types';
import { Capacitor } from '@capacitor/core';
import { NativeSync } from '../services/nativeSync';

interface Props {
  lang?: LanguageCode;
  onGranted: () => void;
  onBack?: () => void;
}

export const PermissionsScreen: React.FC<Props> = ({ onGranted, onBack }) => {
  const [grantedBle, setGrantedBle] = useState(true);
  const [grantedLoc, setGrantedLoc] = useState(true);
  const [grantedSms, setGrantedSms] = useState(true);

  const handleContinue = async () => {
    // Geolocation trigger if supported
    if (grantedLoc && typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve(),
            () => resolve(),
            { timeout: 3000 }
          );
        });
      } catch {}
    }

    // Bluetooth permission request if native and requested
    if (grantedBle && Capacitor.isNativePlatform()) {
      try {
        await NativeSync.requestBluetoothPermissions();
      } catch (err) {
        console.warn('[NativeSync] Bluetooth permission error:', err);
      }
    }

    // SMS permission request if native and requested
    if (grantedSms && Capacitor.isNativePlatform()) {
      try {
        await NativeSync.requestSmsPermissions();
      } catch (err) {
        console.warn('[NativeSync] SMS permission error:', err);
      }
    }

    onGranted();
  };

  return (
    <div
      id="permissions-screen"
      className="flex flex-col justify-between min-h-[580px] h-full w-full bg-[#F8FAF9] text-[#0D2119] select-none font-sans"
    >
      {/* Setup Top Bar */}
      <header className="h-16 px-6 border-b border-[#E2E8F0] flex items-center gap-3 shrink-0 bg-[#F8FAF9]">
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center text-[#0D2119] hover:bg-[#E2E8F0]/60 active:scale-95 transition-all cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <span className="font-semibold text-lg text-[#0D2119]">Setup</span>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <h1 className="headline-lg text-[#0D2119] mb-2">Enable Features</h1>
        <p className="body-md text-[#5C7168] mb-6">
          Find My Family works offline and in crowded areas by using local device sensors and SMS fallback.
        </p>

        <div className="space-y-3.5">
          {/* Card 1: Bluetooth */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            onClick={() => setGrantedBle(!grantedBle)}
            className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] flex items-center justify-between gap-4 cursor-pointer hover:border-[#CBD5E1] transition-all shadow-xs"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-full bg-[#F1F5F3] flex items-center justify-center text-[#1B4332] shrink-0">
                <Bluetooth className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="body-lg font-bold text-[#0D2119]">Bluetooth</div>
                <div className="body-md text-sm text-[#5C7168]">Nearby family phone discovery</div>
              </div>
            </div>

            <div
              className={`w-12 h-7 rounded-full transition-colors relative shrink-0 p-0.5 ${
                grantedBle ? 'bg-[#1B4332]' : 'bg-[#CBD5E1]'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                  grantedBle ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </motion.div>

          {/* Card 2: Location */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            onClick={() => setGrantedLoc(!grantedLoc)}
            className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] flex items-center justify-between gap-4 cursor-pointer hover:border-[#CBD5E1] transition-all shadow-xs"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-full bg-[#F1F5F3] flex items-center justify-center text-[#1B4332] shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="body-lg font-bold text-[#0D2119]">Location</div>
                <div className="body-md text-sm text-[#5C7168]">Real-time distance and arrow pointing</div>
              </div>
            </div>

            <div
              className={`w-12 h-7 rounded-full transition-colors relative shrink-0 p-0.5 ${
                grantedLoc ? 'bg-[#1B4332]' : 'bg-[#CBD5E1]'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                  grantedLoc ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </motion.div>

          {/* Card 3: SMS Fallback */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => setGrantedSms(!grantedSms)}
            className="p-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] flex items-center justify-between gap-4 cursor-pointer hover:border-[#CBD5E1] transition-all shadow-xs"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-full bg-[#F1F5F3] flex items-center justify-center text-[#1B4332] shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="body-lg font-bold text-[#0D2119]">SMS Fallback</div>
                <div className="body-md text-sm text-[#5C7168]">Transmits coordinates when offline</div>
              </div>
            </div>

            <div
              className={`w-12 h-7 rounded-full transition-colors relative shrink-0 p-0.5 ${
                grantedSms ? 'bg-[#1B4332]' : 'bg-[#CBD5E1]'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                  grantedSms ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Fixed Bottom Primary Button */}
      <div className="p-6 bg-[#F8FAF9] border-t border-[#E2E8F0] shrink-0">
        <button
          id="btn-permissions-continue"
          onClick={handleContinue}
          className="w-full h-14 rounded-lg bg-[#1B4332] hover:bg-[#012D1D] active:scale-[0.98] text-white label-lg text-base font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
