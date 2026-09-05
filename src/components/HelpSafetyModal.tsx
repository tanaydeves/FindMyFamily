import React from 'react';
import { X, ShieldCheck, Compass, MessageSquare, AlertTriangle, Users } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'help' | 'about';
}

export const HelpSafetyModal: React.FC<Props> = ({
  isOpen,
  onClose,
  mode = 'help',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center select-none">
      {/* Dimmed Scrim */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
      />

      {/* Sheet / Dialog */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-lg bg-[#FFFFFF] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto border border-[#E2E8F0]"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E2E8F0]">
          <h2 className="headline-md text-[#0D2119]">
            {mode === 'about' ? 'About Find My Family' : 'Help & Safety Guide'}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 -mr-2 rounded-xl flex items-center justify-center text-[#5C7168] hover:text-[#0D2119] hover:bg-[#F8FAF9] cursor-pointer transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === 'about' ? (
          <div className="space-y-4 py-2 text-[#0D2119]">
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[#1B4332] text-white flex items-center justify-center mx-auto mb-3 text-2xl font-bold shadow-sm">
                🧭
              </div>
              <h3 className="headline-md text-xl">Find My Family</h3>
              <p className="body-md text-sm text-[#5C7168] mt-0.5">Version 2.0 (Kumbh Mela Edition)</p>
            </div>

            <div className="bg-[#F8FAF9] p-4 rounded-xl border border-[#E2E8F0] space-y-2 text-sm text-[#5C7168] leading-relaxed">
              <p>
                Built specifically for dense gatherings, pilgrimages, and emergency mesh communication where cellular internet towers get congested.
              </p>
              <p>
                Features peer-to-peer relative directional pointing, offline SMS fallback coordinate transmission, and instant multi-device family circle tracking.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#1B4332]/10 text-[#1B4332] flex items-center justify-center shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#0D2119]">Directional Arrow Tracking</h4>
                <p className="body-md text-xs text-[#5C7168] mt-0.5 leading-relaxed">
                  Hold your phone flat like a real compass. The bright green arrow rotates to point directly towards your family member.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#0D2119]">Zero-Internet SMS Fallback</h4>
                <p className="body-md text-xs text-[#5C7168] mt-0.5 leading-relaxed">
                  When mobile internet drops in heavy crowds, the app automatically switches to compact 50-byte encrypted SMS coordinates.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-[#DC2626]/10 text-[#DC2626] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#0D2119]">Emergency Distress Siren</h4>
                <p className="body-md text-xs text-[#5C7168] mt-0.5 leading-relaxed">
                  If someone gets lost, pressing the red "I'm Lost" button alerts all family devices with high-priority audio sirens and immediate navigation lock.
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
