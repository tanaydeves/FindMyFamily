import React, { useState } from 'react';
import { MessageSquare, X, Copy, Check, Sparkles, Send } from 'lucide-react';
import { motion } from 'motion/react';
import { FamilyMember, LanguageCode } from '../types';
import { SmsService, ParsedSms } from '../services/smsService';

interface Props {
  lang?: LanguageCode;
  myDeviceId: string;
  myDeviceName: string;
  myLocation: { latitude: number; longitude: number };
  isOpen: boolean;
  onClose: () => void;
  onApplyParsedSms: (sms: ParsedSms) => void;
}

export const SmsHubModal: React.FC<Props> = ({
  myDeviceId,
  myDeviceName,
  myLocation,
  isOpen,
  onClose,
  onApplyParsedSms,
}) => {
  const [copied, setCopied] = useState(false);
  const [incomingRawText, setIncomingRawText] = useState('');
  const [parseResult, setParseResult] = useState<ParsedSms | null>(null);

  if (!isOpen) return null;

  const sampleLocationSms = SmsService.encodeLocationMessage(
    myDeviceId,
    myLocation.latitude,
    myLocation.longitude,
    myDeviceName
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleParse = (text: string) => {
    setIncomingRawText(text);
    const parsed = SmsService.parseSmsPayload(text.trim());
    setParseResult(parsed);
  };

  const handleApplySms = () => {
    if (parseResult) {
      onApplyParsedSms(parseResult);
      onClose();
    }
  };

  const loadPreset = (type: 'member_loc' | 'member_distress') => {
    if (type === 'member_loc') {
      const msg = SmsService.encodeLocationMessage(
        `dev_family_${Math.floor(10 + Math.random() * 89)}`,
        myLocation.latitude + 0.0008,
        myLocation.longitude + 0.0006,
        'Papa (SMS)'
      );
      handleParse(msg);
    } else {
      const msg = SmsService.encodeDistressMessage(
        `dev_family_${Math.floor(10 + Math.random() * 89)}`,
        myLocation.latitude - 0.0011,
        myLocation.longitude + 0.0009,
        'Maa (SOS)'
      );
      handleParse(msg);
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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="headline-md text-xl text-[#0D2119]">SMS Fallback Hub</h2>
              <p className="label-sm text-[#5C7168]">Offline Encoded Coordinate Transmission</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 -mr-2 rounded-xl flex items-center justify-center text-[#5C7168] hover:text-[#0D2119] hover:bg-[#F8FAF9] cursor-pointer transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Outgoing Location SMS Payload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label-sm font-semibold uppercase tracking-wider text-[#5C7168]">
                My Current Outgoing SMS Packet
              </label>
              <button
                onClick={() => copyToClipboard(sampleLocationSms)}
                className="label-sm font-bold text-[#1B4332] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy SMS'}</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] font-mono text-xs text-[#0D2119] break-all select-all">
              {sampleLocationSms}
            </div>
          </div>

          {/* Quick Simulation Presets */}
          <div>
            <span className="label-sm font-semibold uppercase tracking-wider text-[#5C7168] block mb-2 font-['Inter']">
              Simulate Incoming SMS
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => loadPreset('member_loc')}
                className="p-3 rounded-xl bg-[#F8FAF9] hover:bg-[#ECEEED] border border-[#E2E8F0] text-left transition-colors cursor-pointer"
              >
                <div className="label-sm font-bold text-[#0D2119]">Location SMS</div>
                <div className="text-[11px] text-[#5C7168]">Normal update</div>
              </button>

              <button
                type="button"
                onClick={() => loadPreset('member_distress')}
                className="p-3 rounded-xl bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FCA5A5] text-left transition-colors cursor-pointer"
              >
                <div className="label-sm font-bold text-[#DC2626]">Distress SOS SMS</div>
                <div className="text-[11px] text-[#DC2626]/80">Emergency alert</div>
              </button>
            </div>
          </div>

          {/* Raw SMS Payload Decoder */}
          <div className="pt-2 border-t border-[#E2E8F0]">
            <label className="label-sm font-semibold uppercase tracking-wider text-[#5C7168] block mb-1.5 font-['Inter']">
              Paste Incoming SMS String
            </label>
            <textarea
              rows={2}
              value={incomingRawText}
              onChange={(e) => handleParse(e.target.value)}
              placeholder="e.g. FMF_LOC:dev_123|25.4366|81.8469|1720000000000|Papa"
              className="w-full p-3.5 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] focus:border-[#1B4332] text-xs font-mono text-[#0D2119] outline-none resize-none"
            />

            {parseResult && (
              <div
                className={`mt-2.5 p-3.5 rounded-xl border ${
                  parseResult.isDistress
                    ? 'bg-[#FEF2F2] border-[#FCA5A5] text-[#DC2626]'
                    : 'bg-[#F0FDF4] border-[#86EFAC] text-[#1B4332]'
                }`}
              >
                <div className="flex items-center justify-between label-sm font-bold">
                  <span>{parseResult.isDistress ? '⚠️ EMERGENCY SOS DETECTED' : '✅ VALID LOCATION PAYLOAD'}</span>
                  <span className="font-mono text-xs">{parseResult.deviceId}</span>
                </div>
                <div className="text-xs font-mono mt-1 space-y-0.5 opacity-90">
                  <div>Sender: {parseResult.name}</div>
                  <div>Coords: {parseResult.latitude.toFixed(6)}, {parseResult.longitude.toFixed(6)}</div>
                  <div>Time: {new Date(parseResult.timestamp).toLocaleTimeString()}</div>
                </div>

                <button
                  onClick={handleApplySms}
                  className="mt-3 w-full py-2.5 rounded-lg bg-[#1B4332] hover:bg-[#012D1D] text-white label-sm font-bold transition-all shadow-xs cursor-pointer"
                >
                  Apply to Live App State →
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
