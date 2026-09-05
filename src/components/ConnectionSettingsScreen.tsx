import React, { useState } from 'react';
import { X, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { relayClient, DEFAULT_SERVER_URL } from '../services/relayClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ConnectionSettingsScreen: React.FC<Props> = ({
  isOpen,
  onClose,
}) => {
  const [serverUrl, setServerUrl] = useState(relayClient.getServerUrl());
  const [pingStatus, setPingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [latency, setLatency] = useState<number | null>(null);

  if (!isOpen) return null;

  const testPing = async (target = serverUrl) => {
    setPingStatus('testing');
    const start = performance.now();
    try {
      const cleanUrl = target.trim().replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/api/health`, { method: 'GET', signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        setLatency(Math.round(performance.now() - start));
        setPingStatus('success');
      } else {
        setPingStatus('error');
      }
    } catch {
      setPingStatus('error');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUrl.trim()) return;
    relayClient.setServerUrl(serverUrl.trim());
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
            <div className="flex items-center gap-2.5">
              <h2 className="headline-md text-[#0D2119]">Connection Settings</h2>
              <span className="label-sm font-bold text-[#1B4332] px-2 py-0.5 rounded-md bg-[#1B4332]/10">
                Advanced
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 -mr-2 rounded-xl flex items-center justify-center text-[#5C7168] hover:text-[#0D2119] hover:bg-[#F8FAF9] cursor-pointer transition-all"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form id="conn-form" onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label-sm font-semibold text-[#0D2119] block mb-1.5">
                Server Address
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  required
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="http://192.168.1.100:3000"
                  className="flex-1 px-4 py-3 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] focus:border-[#1B4332] text-[#0D2119] text-sm font-mono outline-none"
                />
                <button
                  type="button"
                  onClick={() => testPing()}
                  className="px-4 h-12 rounded-lg border border-[#1B4332] text-[#1B4332] hover:bg-[#1B4332]/10 label-sm font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${pingStatus === 'testing' ? 'animate-spin' : ''}`} />
                  <span>Ping</span>
                </button>
              </div>
            </div>

            {/* Status Card */}
            <div className="p-4 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="label-sm text-[#5C7168]">Connection State</span>
                <div className="flex items-center gap-1.5">
                  {pingStatus === 'success' ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#006D36]" />
                      <span className="label-sm font-bold text-[#006D36] font-mono">
                        Online ({latency}ms)
                      </span>
                    </>
                  ) : pingStatus === 'error' ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                      <span className="label-sm font-bold text-[#DC2626] font-mono">Unreachable</span>
                    </>
                  ) : pingStatus === 'testing' ? (
                    <span className="label-sm font-mono text-[#F59E0B]">Testing...</span>
                  ) : (
                    <span className="label-sm font-mono text-[#5C7168]">Ready to ping</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                <span className="label-sm text-[#5C7168]">Default Host</span>
                <button
                  type="button"
                  onClick={() => {
                    setServerUrl(DEFAULT_SERVER_URL);
                    testPing(DEFAULT_SERVER_URL);
                  }}
                  className="label-sm font-mono text-[#1B4332] font-semibold hover:underline cursor-pointer"
                >
                  {DEFAULT_SERVER_URL}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Fixed Bottom Button */}
        <div className="pt-4 mt-4 border-t border-[#E2E8F0]">
          <button
            type="submit"
            form="conn-form"
            className="w-full h-14 rounded-lg bg-[#1B4332] hover:bg-[#012D1D] text-white label-lg text-base font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer flex items-center justify-center"
          >
            Save & Reconnect
          </button>
        </div>
      </motion.div>
    </div>
  );
};
