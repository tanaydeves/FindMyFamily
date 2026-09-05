import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const DistressConfirmModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      {/* Dimmed Scrim */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-xs"
      />

      {/* Centered Modal Card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-sm bg-[#FFFFFF] rounded-2xl p-6 shadow-2xl z-10 text-center border border-[#E2E8F0]"
      >
        {/* Warning Icon Badge */}
        <div className="w-16 h-16 rounded-full bg-[#FFDAD6] flex items-center justify-center text-[#DC2626] mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
        </div>

        {/* Title & Description */}
        <h3 className="headline-md text-[#0D2119] mb-2">Send Distress Alert?</h3>
        <p className="body-md text-sm text-[#5C7168] mb-6 leading-relaxed">
          This will immediately notify everyone in your circle with your live location and sound emergency alarms.
        </p>

        {/* Stacked Action Buttons */}
        <div className="space-y-2.5">
          <button
            id="btn-confirm-send-distress"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full h-14 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.98] text-white label-lg text-base font-bold shadow-sm transition-all cursor-pointer flex items-center justify-center"
          >
            Yes, Send Alert
          </button>

          <button
            onClick={onClose}
            className="w-full h-12 rounded-lg bg-transparent hover:bg-[#F8FAF9] active:scale-[0.98] text-[#5C7168] hover:text-[#0D2119] label-lg text-sm font-semibold transition-all cursor-pointer flex items-center justify-center"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};
