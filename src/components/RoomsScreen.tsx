import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentCircleId: string;
  onChangeCircle: (newCircleId: string) => void;
}

const PRESET_CIRCLES = ['KUMBH-2026', 'SHARMA-FAMILY', 'SANGAM-CAMP-4', 'VIP-GROUP-108'];

export const RoomsScreen: React.FC<Props> = ({
  isOpen,
  onClose,
  currentCircleId,
  onChangeCircle,
}) => {
  const [inputCode, setInputCode] = useState('');

  if (!isOpen) return null;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    onChangeCircle(inputCode.trim().toUpperCase());
    onClose();
    setInputCode('');
  };

  const handleSelectPreset = (circle: string) => {
    onChangeCircle(circle);
    onClose();
  };

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

      {/* Modal / Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full max-w-lg bg-[#FFFFFF] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto border border-[#E2E8F0]"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E2E8F0]">
          <h2 className="headline-md text-[#0D2119]">Join or Switch Circle</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 -mr-2 rounded-xl flex items-center justify-center text-[#5C7168] hover:text-[#0D2119] hover:bg-[#F8FAF9] cursor-pointer transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleJoin} className="mb-6">
          <label className="label-sm font-semibold text-[#0D2119] block mb-1.5">
            Circle ID / Code
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              required
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="e.g. KUMBH-2026, 582910"
              className="flex-1 px-4 py-3 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] focus:border-[#1B4332] text-[#0D2119] text-base font-mono uppercase tracking-wider outline-none"
            />
            <button
              type="submit"
              className="px-6 h-12 rounded-lg bg-[#1B4332] hover:bg-[#012D1D] text-white label-lg font-bold transition-all shadow-xs cursor-pointer"
            >
              Join
            </button>
          </div>
        </form>

        {/* Section: Your Recent Circles */}
        <div>
          <div className="label-sm font-semibold uppercase tracking-wider text-[#5C7168] mb-3 font-['Inter']">
            Your Recent Circles
          </div>
          <div className="space-y-2">
            {PRESET_CIRCLES.map((circle) => {
              const isActive = circle === currentCircleId;
              return (
                <div
                  key={circle}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    isActive
                      ? 'bg-[#F8FAF9] border-[#1B4332]/40'
                      : 'bg-white border-[#E2E8F0] hover:border-[#CBD5E1]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isActive ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#4ADE80] shrink-0" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#E2E8F0] shrink-0" />
                    )}
                    <span className="font-mono font-bold text-sm text-[#0D2119]">{circle}</span>
                  </div>

                  {isActive ? (
                    <span className="label-sm font-semibold text-[#1B4332] px-2.5 py-1 rounded-full bg-[#1B4332]/10">
                      Active
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectPreset(circle)}
                      className="label-sm font-bold text-[#1B4332] hover:underline cursor-pointer py-1 px-2"
                    >
                      Switch
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
