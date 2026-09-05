import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Users,
  QrCode,
  Camera,
  Check,
  RefreshCw,
  Copy,
  Scan,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FamilyMember, LocationData } from '../types';
import { generateQrSvg } from '../services/qrGenerator';
import { audioHaptics } from '../services/audioHaptics';
import { relayClient } from '../services/relayClient';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  circleId: string;
  myDeviceId: string;
  myDeviceName: string;
  myLocation: { latitude: number; longitude: number };
  onPairMember: (member: FamilyMember) => void;
}

const SWATCH_COLORS = ['#4ADE80', '#38BDF8', '#F472B6', '#FB923C', '#A78BFA', '#FACC15'];

export const AddMemberSheet: React.FC<Props> = ({
  isOpen,
  onClose,
  circleId,
  myDeviceId,
  myDeviceName,
  myLocation,
  onPairMember,
}) => {
  const [activeSegment, setActiveSegment] = useState<'create' | 'in_circle' | 'my_qr' | 'scan'>('create');
  
  // Create Tab State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [color, setColor] = useState('#38BDF8');

  // In Circle State
  const [detectedDevices, setDetectedDevices] = useState<LocationData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Scan Tab State
  const [manualCode, setManualCode] = useState('');

  // QR Copy State
  const [copiedQrCode, setCopiedQrCode] = useState(false);

  const fetchCircleDevices = async () => {
    setIsRefreshing(true);
    try {
      const list = await relayClient.fetchCircleDevices(circleId);
      setDetectedDevices(list.filter((d) => d.deviceId !== myDeviceId));
    } catch {
      // offline
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeSegment === 'in_circle') {
        fetchCircleDevices();
      }
    }
  }, [isOpen, activeSegment, circleId]);

  if (!isOpen) return null;

  // Handle Manual Form Submission
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    audioHaptics.playPairSuccess();
    const newMember: FamilyMember = {
      id: `dev_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Math.floor(10 + Math.random() * 89)}`,
      name: name.trim(),
      phone: phone.trim(),
      lastLat: myLocation.latitude + (Math.random() - 0.5) * 0.002,
      lastLng: myLocation.longitude + (Math.random() - 0.5) * 0.002,
      accuracy: 3.5,
      lastUpdated: Date.now(),
      source: 'relay',
      color: color,
      battery: 95,
      isOnline: true,
    };

    onPairMember(newMember);
    onClose();
    setName('');
    setPhone('');
  };

  // Handle Live Device Pairing
  const handlePairDetected = (dev: LocationData) => {
    audioHaptics.playPairSuccess();
    const newMember: FamilyMember = {
      id: dev.deviceId,
      name: dev.name || 'Family Phone',
      phone: '',
      lastLat: dev.latitude || myLocation.latitude,
      lastLng: dev.longitude || myLocation.longitude,
      accuracy: dev.accuracy || 3.0,
      lastUpdated: dev.timestamp || Date.now(),
      source: 'relay',
      color: dev.color || '#38BDF8',
      battery: dev.battery ?? 90,
      heading: dev.heading,
      isOnline: true,
    };

    onPairMember(newMember);
    onClose();
  };

  // Handle Link by QR/Code
  const handleLinkCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    let targetId = manualCode.trim();
    let targetName = 'Family Member';

    if (targetId.startsWith('FMF_PAIR:')) {
      const raw = targetId.replace('FMF_PAIR:', '');
      const parts = raw.split('|');
      targetId = parts[0];
      if (parts[1]) targetName = parts[1];
    }

    audioHaptics.playPairSuccess();
    const newMember: FamilyMember = {
      id: targetId,
      name: targetName,
      phone: '',
      lastLat: myLocation.latitude + (Math.random() - 0.5) * 0.002,
      lastLng: myLocation.longitude + (Math.random() - 0.5) * 0.002,
      accuracy: 3.5,
      lastUpdated: Date.now(),
      source: 'relay',
      color: '#4ADE80',
      battery: 95,
      isOnline: true,
    };

    onPairMember(newMember);
    onClose();
    setManualCode('');
  };

  const handleCopyMyCode = () => {
    navigator.clipboard.writeText(`FMF_PAIR:${myDeviceId}|${myDeviceName}`);
    setCopiedQrCode(true);
    setTimeout(() => setCopiedQrCode(false), 2000);
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
        {/* Drag Handle for Sheets */}
        <div className="w-12 h-1.5 bg-[#E2E8F0] rounded-full mx-auto mb-4 -mt-2 sm:hidden" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="headline-md text-[#0D2119]">Add Family Member</h2>
            <p className="body-md text-sm text-[#5C7168]">Add someone to Circle {circleId}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 -mr-2 -mt-1 rounded-xl flex items-center justify-center text-[#5C7168] hover:text-[#0D2119] hover:bg-[#F8FAF9] cursor-pointer transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Control with 4 equal segments in pill container */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] mb-5">
          {[
            { id: 'create', label: 'Create' },
            { id: 'in_circle', label: 'In Circle' },
            { id: 'my_qr', label: 'My QR' },
            { id: 'scan', label: 'Scan' },
          ].map((seg) => {
            const isActive = activeSegment === seg.id;
            return (
              <button
                key={seg.id}
                onClick={() => setActiveSegment(seg.id as any)}
                className={`py-2 rounded-lg label-sm text-xs font-semibold transition-all cursor-pointer text-center ${
                  isActive
                    ? 'bg-[#1B4332] text-white shadow-xs'
                    : 'text-[#5C7168] hover:text-[#0D2119]'
                }`}
              >
                {seg.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: CREATE */}
        {activeSegment === 'create' && (
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="label-sm font-semibold text-[#0D2119] block mb-1.5">
                Family Member Name
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
                Phone Number (optional, for SMS fallback)
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
                Marker Color
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

            <div className="pt-3">
              <button
                type="submit"
                className="w-full h-14 rounded-lg bg-[#1B4332] hover:bg-[#012D1D] text-white label-lg text-base font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer flex items-center justify-center"
              >
                + Add to My Family
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: IN CIRCLE */}
        {activeSegment === 'in_circle' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="label-sm font-semibold uppercase tracking-wider text-[#5C7168]">
                Devices in Circle ({circleId})
              </span>
              <button
                onClick={fetchCircleDevices}
                className="label-sm font-bold text-[#1B4332] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {detectedDevices.length === 0 ? (
              <div className="p-8 text-center bg-[#F8FAF9] rounded-xl border border-[#E2E8F0]">
                <div className="w-12 h-12 rounded-full bg-white border border-[#E2E8F0] flex items-center justify-center text-[#5C7168] mx-auto mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="body-lg font-bold text-[#0D2119] mb-1">No other phones detected yet</h3>
                <p className="body-md text-sm text-[#5C7168] max-w-xs mx-auto">
                  When your family opens the app in this circle, they'll appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {detectedDevices.map((dev) => (
                  <div
                    key={dev.deviceId}
                    className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-[#0D2119]"
                        style={{ backgroundColor: dev.color || '#38BDF8' }}
                      >
                        {(dev.name || 'F').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#0D2119]">{dev.name || 'Family Phone'}</div>
                        <div className="text-[11px] font-mono text-[#5C7168]">{dev.deviceId}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePairDetected(dev)}
                      className="px-4 py-2 rounded-lg bg-[#1B4332] text-white label-sm font-bold shadow-xs hover:bg-[#012D1D] cursor-pointer"
                    >
                      Pair →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MY QR */}
        {activeSegment === 'my_qr' && (
          <div className="flex flex-col items-center text-center space-y-4 py-2">
            <div className="p-4 bg-white rounded-2xl border border-[#E2E8F0] shadow-xs w-48 h-48 flex items-center justify-center">
              <div
                className="w-full h-full"
                dangerouslySetInnerHTML={{
                  __html: generateQrSvg(`FMF_PAIR:${myDeviceId}|${myDeviceName}`, 160),
                }}
              />
            </div>

            <div>
              <h3 className="headline-md text-xl text-[#0D2119]">Show this QR to your Family</h3>
              <p className="body-md text-sm text-[#5C7168] mt-1 max-w-xs">
                Have your family scan this QR code using the Scan tab on their phone to link.
              </p>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0]">
              <span className="font-mono text-xs text-[#0D2119] px-2 font-semibold">
                {myDeviceName} • {myDeviceId}
              </span>
              <button
                onClick={handleCopyMyCode}
                className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E8F0] text-xs font-semibold text-[#1B4332] hover:bg-[#F8FAF9] flex items-center gap-1 cursor-pointer"
              >
                {copiedQrCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedQrCode ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: SCAN */}
        {activeSegment === 'scan' && (
          <form onSubmit={handleLinkCodeSubmit} className="space-y-4">
            {/* Viewfinder Mockup */}
            <div className="w-full h-44 bg-[#F8FAF9] border border-[#E2E8F0] rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
              <div className="w-32 h-32 border-2 border-dashed border-[#4ADE80] rounded-xl flex items-center justify-center relative">
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#1B4332]" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#1B4332]" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#1B4332]" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#1B4332]" />
                <Camera className="w-8 h-8 text-[#5C7168]" />
              </div>
              <span className="text-xs text-[#5C7168] mt-2 font-medium">Position QR Code within frame</span>
            </div>

            <div>
              <label className="label-sm font-semibold text-[#0D2119] block mb-1.5">
                Manual Code Entry
              </label>
              <input
                type="text"
                required
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="e.g. FMF_PAIR:dev_123|Papa or dev_123"
                className="w-full px-4 py-3 rounded-lg bg-[#FFFFFF] border border-[#E2E8F0] focus:border-[#1B4332] text-[#0D2119] text-sm outline-none font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full h-14 rounded-lg bg-[#1B4332] hover:bg-[#012D1D] text-white label-lg text-base font-bold transition-all shadow-sm active:scale-[0.98] cursor-pointer flex items-center justify-center"
            >
              Link Device
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
