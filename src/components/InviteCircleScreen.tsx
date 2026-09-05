import React, { useState } from 'react';
import { X, Copy, Check, Share2, ExternalLink, Download, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateQrSvg } from '../services/qrGenerator';
import { relayClient } from '../services/relayClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  circleId: string;
}

export const InviteCircleScreen: React.FC<Props> = ({
  isOpen,
  onClose,
  circleId,
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const serverBase = relayClient.getServerUrl();
  const webLink = `${serverBase}/?circle=${encodeURIComponent(circleId)}`;
  const apkLink = `${serverBase}/download`;

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleCopyWeb = () => {
    navigator.clipboard.writeText(webLink);
    triggerToast('Web Link copied to clipboard!');
  };

  const handleCopyApk = () => {
    navigator.clipboard.writeText(apkLink);
    triggerToast('APK Download Link copied!');
  };

  const handleShareSystem = () => {
    if (navigator.share) {
      navigator.share({
        title: `Join Find My Family Circle: ${circleId}`,
        text: `Join our family group on Find My Family using code ${circleId}`,
        url: webLink,
      }).catch(() => {});
    } else {
      handleCopyWeb();
    }
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

      {/* Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 z-60 px-4 py-2 rounded-xl bg-[#1B4332] text-white text-sm font-semibold shadow-lg flex items-center gap-2"
          >
            <Check className="w-4 h-4 text-[#4ADE80]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
            <h2 className="headline-md text-[#0D2119]">Invite to {circleId}</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 -mr-2 rounded-xl flex items-center justify-center text-[#5C7168] hover:text-[#0D2119] hover:bg-[#F8FAF9] cursor-pointer transition-all"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Large Centered QR Card */}
          <div className="flex flex-col items-center text-center my-4">
            <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm w-52 h-52 flex items-center justify-center mb-3">
              <div
                className="w-full h-full"
                dangerouslySetInnerHTML={{
                  __html: generateQrSvg(webLink, 175),
                }}
              />
            </div>
            <p className="body-md text-sm text-[#5C7168]">
              Scan to link a family member's phone
            </p>
          </div>

          {/* Copy Option Rows */}
          <div className="space-y-2.5 my-4">
            <button
              onClick={handleCopyWeb}
              className="w-full min-h-[48px] p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#1B4332] bg-[#FFFFFF] flex items-center justify-between transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-[#5C7168] group-hover:text-[#1B4332]" />
                <span className="font-semibold text-sm text-[#0D2119]">Copy Web Link</span>
              </div>
              <Copy className="w-4 h-4 text-[#5C7168] group-hover:text-[#1B4332]" />
            </button>

            <button
              onClick={handleCopyApk}
              className="w-full min-h-[48px] p-3.5 rounded-xl border border-[#E2E8F0] hover:border-[#1B4332] bg-[#FFFFFF] flex items-center justify-between transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <Download className="w-5 h-5 text-[#5C7168] group-hover:text-[#1B4332]" />
                <span className="font-semibold text-sm text-[#0D2119]">Copy APK Download Link</span>
              </div>
              <Copy className="w-4 h-4 text-[#5C7168] group-hover:text-[#1B4332]" />
            </button>
          </div>
        </div>

        {/* Fixed Bottom Share Buttons */}
        <div className="space-y-2 pt-4 border-t border-[#E2E8F0]">
          <button
            onClick={handleShareSystem}
            className="w-full h-14 rounded-lg bg-[#1B4332] hover:bg-[#012D1D] text-white label-lg text-base font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <Share2 className="w-5 h-5" />
            <span>Share Link</span>
          </button>

          <a
            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
              `Join our Find My Family circle "${circleId}": ${webLink}`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="w-full h-14 rounded-lg bg-transparent hover:bg-[#F8FAF9] border-[1.5px] border-[#E2E8F0] hover:border-[#1B4332] text-[#0D2119] label-lg text-base font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-5 h-5 text-[#1B4332]" />
            <span>Share via WhatsApp</span>
          </a>
        </div>
      </motion.div>
    </div>
  );
};
