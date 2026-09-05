import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  myDeviceName: string;
  myPhone: string;
  myColor: string;
  myDeviceId: string;
  onUpdateProfile: (name: string, phone: string, color: string) => void;
}

const SWATCH_COLORS = ['#4ADE80', '#38BDF8', '#F472B6', '#FB923C', '#A78BFA', '#FACC15'];

export const ProfileScreen: React.FC<Props> = ({
  isOpen,
  onClose,
  myDeviceName,
  myPhone,
  myColor,
  myDeviceId,
  onUpdateProfile,
}) => {
  const [name, setName] = useState(myDeviceName);
  const [phone, setPhone] = useState(myPhone);
  const [color, setColor] = useState(myColor);

  useEffect(() => {
    if (isOpen) {
      setName(myDeviceName);
      setPhone(myPhone);
      setColor(myColor);
    }
  }, [isOpen, myDeviceName, myPhone, myColor]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onUpdateProfile(name.trim(), phone.trim(), color);
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
        className="relative w-full max-w-lg bg-[#FFFFFF] rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl z-10 max-h-[90vh] overflow-y-auto border border-[#E2E8F0] flex flex-col justify-between"
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#E2E8F0]">
            <h2 className="headline-md text-[#0D2119]">My Profile</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 -mr-2 rounded-xl flex items-center justify-center text-[#5C7168] hover:text-[#0D2119] hover:bg-[#F8FAF9] cursor-pointer transition-all"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form id="profile-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-sm font-semibold text-[#0D2119] block mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Papa, Maa, Rohan"
                className="w-full px-4 py-3 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] focus:border-[#1B4332] text-[#0D2119] text-base outline-none transition-colors"
              />
            </div>

            <div>
              <label className="label-sm font-semibold text-[#0D2119] block mb-1.5">
                Phone Number (for SMS fallback)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] focus:border-[#1B4332] text-[#0D2119] text-base outline-none transition-colors font-mono"
              />
            </div>

            <div>
              <label className="label-sm font-semibold text-[#0D2119] block mb-2">
                Avatar Color
              </label>
              <div className="flex items-center gap-3">
                {SWATCH_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-10 h-10 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                      color === c ? 'scale-110 ring-2 ring-[#1B4332] ring-offset-2' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check className="w-5 h-5 text-[#0D2119] stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0]">
              <div className="label-sm text-[#5C7168]">Device Hardware ID</div>
              <div className="font-mono text-xs text-[#0D2119] font-bold mt-0.5">{myDeviceId}</div>
            </div>
          </form>
        </div>

        {/* Fixed Bottom Save Button */}
        <div className="pt-4 mt-4 border-t border-[#E2E8F0]">
          <button
            type="submit"
            form="profile-form"
            className="w-full h-14 rounded-lg bg-[#1B4332] hover:bg-[#012D1D] text-white label-lg text-base font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer flex items-center justify-center"
          >
            Save Profile
          </button>
        </div>
      </motion.div>
    </div>
  );
};
