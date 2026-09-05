import React, { useState, useEffect } from 'react';
import {
  Users,
  Smartphone,
  QrCode,
  Share2,
  Copy,
  Check,
  X,
  Sparkles,
  Radio,
  RefreshCw,
  Plus,
  Compass,
  BatteryCharging,
  Signal,
  MapPin,
  ExternalLink,
  Wifi,
  Server,
  Download,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FamilyMember, LanguageCode } from '../types';
import { generateQrSvg } from '../services/qrGenerator';
import { calculateDistance } from '../services/navigationMath';
import { relayClient, DEFAULT_SERVER_URL } from '../services/relayClient';

interface Props {
  isOpen: boolean;
  lang: LanguageCode;
  myDeviceId: string;
  myDeviceName: string;
  myPhone: string;
  myColor: string;
  circleId: string;
  pairedMembers: FamilyMember[];
  myLocation: { latitude: number; longitude: number };
  onClose: () => void;
  onUpdateProfile: (name: string, phone: string, color: string) => void;
  onChangeCircle: (newCircleId: string) => void;
  onSelectMemberToTrack: (member: FamilyMember) => void;
}

const COLOR_OPTIONS = [
  '#4ADE80', // Emerald Green
  '#38BDF8', // Sky Blue
  '#F472B6', // Pink
  '#FB923C', // Orange
  '#A78BFA', // Purple
  '#FACC15', // Amber Yellow
];

export const MultiDeviceModal: React.FC<Props> = ({
  isOpen,
  lang,
  myDeviceId,
  myDeviceName,
  myPhone,
  myColor,
  circleId,
  pairedMembers,
  myLocation,
  onClose,
  onUpdateProfile,
  onChangeCircle,
  onSelectMemberToTrack,
}) => {
  const [tab, setTab] = useState<'invite' | 'profile' | 'circle' | 'devices' | 'server'>('invite');
  const [nameInput, setNameInput] = useState(myDeviceName);
  const [phoneInput, setPhoneInput] = useState(myPhone);
  const [selectedColor, setSelectedColor] = useState(myColor);
  const [circleInput, setCircleInput] = useState(circleId);
  const [serverUrlInput, setServerUrlInput] = useState(relayClient.getServerUrl());
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedApk, setCopiedApk] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [serverPingStatus, setServerPingStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [serverLatency, setServerLatency] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNameInput(myDeviceName);
      setPhoneInput(myPhone);
      setSelectedColor(myColor);
      setCircleInput(circleId);
      setServerUrlInput(relayClient.getServerUrl());
    }
  }, [isOpen, myDeviceName, myPhone, myColor, circleId]);

  if (!isOpen) return null;

  const serverBase = relayClient.getServerUrl();
  const currentUrl = `${serverBase}/?circle=${encodeURIComponent(circleId)}`;
  const apkDownloadUrl = `${serverBase}/download`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyApkLink = () => {
    navigator.clipboard.writeText(apkDownloadUrl);
    setCopiedApk(true);
    setTimeout(() => setCopiedApk(false), 2000);
  };

  const handleShareNative = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join Find My Family Circle',
        text: `Join our family directional finder circle "${circleId}" to stay connected!`,
        url: currentUrl,
      });
    } else {
      handleCopyLink();
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    onUpdateProfile(nameInput.trim(), phoneInput.trim(), selectedColor);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleJoinCircle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!circleInput.trim()) return;
    onChangeCircle(circleInput.trim().toUpperCase());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleSaveServerUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverUrlInput.trim()) return;
    relayClient.setServerUrl(serverUrlInput.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
    testServerConnection(serverUrlInput.trim());
  };

  const testServerConnection = async (urlToTest = serverUrlInput) => {
    setServerPingStatus('testing');
    const start = performance.now();
    try {
      const cleanUrl = urlToTest.trim().replace(/\/+$/, '');
      const res = await fetch(`${cleanUrl}/api/health`, { method: 'GET', signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const latency = Math.round(performance.now() - start);
        setServerLatency(latency);
        setServerPingStatus('success');
      } else {
        setServerPingStatus('error');
      }
    } catch {
      setServerPingStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 select-none">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-lg bg-[#132A22] border-2 border-[#2D6A4F] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-white"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#081C15] border-b border-[#2D6A4F] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1B4332] border border-[#2D6A4F] text-[#4ADE80] flex items-center justify-center shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-white flex items-center gap-2">
                <span>Multi-Device Family Circle</span>
                <span className="px-2 py-0.5 rounded-md bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/30 text-[10px] font-mono font-bold">
                  {circleId}
                </span>
              </h2>
              <p className="text-xs text-[#74C69D]">Connect unlimited physical phones & browsers live</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] border border-[#2D6A4F] text-[#B7E4C7] flex items-center justify-center cursor-pointer transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="grid grid-cols-5 gap-1 p-2 bg-[#0B1F18] border-b border-[#2D6A4F] shrink-0 text-xs font-bold">
          <button
            onClick={() => setTab('invite')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              tab === 'invite'
                ? 'bg-[#4ADE80] text-[#081C15] shadow-[0_0_12px_rgba(74,222,128,0.3)]'
                : 'text-[#95D5B2] hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Invite</span>
          </button>

          <button
            onClick={() => setTab('devices')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              tab === 'devices'
                ? 'bg-[#4ADE80] text-[#081C15] shadow-[0_0_12px_rgba(74,222,128,0.3)]'
                : 'text-[#95D5B2] hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Phones ({pairedMembers.length + 1})</span>
          </button>

          <button
            onClick={() => setTab('profile')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              tab === 'profile'
                ? 'bg-[#4ADE80] text-[#081C15] shadow-[0_0_12px_rgba(74,222,128,0.3)]'
                : 'text-[#95D5B2] hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Profile</span>
          </button>

          <button
            onClick={() => setTab('circle')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              tab === 'circle'
                ? 'bg-[#4ADE80] text-[#081C15] shadow-[0_0_12px_rgba(74,222,128,0.3)]'
                : 'text-[#95D5B2] hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Rooms</span>
          </button>

          <button
            onClick={() => setTab('server')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
              tab === 'server'
                ? 'bg-[#4ADE80] text-[#081C15] shadow-[0_0_12px_rgba(74,222,128,0.3)]'
                : 'text-[#95D5B2] hover:text-white'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Wi-Fi IP</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: Invite & QR Code */}
          {tab === 'invite' && (
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-white rounded-3xl shadow-[0_0_30px_rgba(74,222,128,0.25)] w-48 h-48 flex items-center justify-center">
                <div
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{
                    __html: generateQrSvg(currentUrl, 168),
                  }}
                />
              </div>

              <div>
                <h3 className="font-extrabold text-white text-base">Scan to Link Parents' Phones</h3>
                <p className="text-xs text-[#74C69D] mt-1 max-w-xs leading-relaxed">
                  Open your camera or QR scanner on any phone connected to the same Wi-Fi to immediately join circle{' '}
                  <strong className="text-white font-mono">{circleId}</strong>.
                </p>
              </div>

              {/* Direct Link Action Bar */}
              <div className="w-full space-y-2 pt-1">
                <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#081C15] border border-[#2D6A4F]">
                  <input
                    type="text"
                    readOnly
                    value={currentUrl}
                    className="flex-1 bg-transparent text-xs font-mono text-[#95D5B2] outline-none px-2 truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-[#4ADE80] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all border border-[#2D6A4F]"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied' : 'Copy Web Link'}</span>
                  </button>
                </div>

                {/* Direct APK Download on Phone */}
                <div className="flex items-center gap-2 p-2 rounded-2xl bg-[#081C15] border border-[#2D6A4F]">
                  <div className="flex items-center gap-2 flex-1 px-2 min-w-0">
                    <Download className="w-4 h-4 text-[#4ADE80] shrink-0" />
                    <span className="text-xs font-mono text-[#95D5B2] truncate">Direct APK: {apkDownloadUrl}</span>
                  </div>
                  <button
                    onClick={handleCopyApkLink}
                    className="px-3 py-2 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] text-[#4ADE80] font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all border border-[#2D6A4F]"
                  >
                    {copiedApk ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedApk ? 'Copied' : 'Copy APK Link'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleShareNative}
                    className="py-3 rounded-xl bg-[#4ADE80] hover:bg-[#52B788] text-[#081C15] font-black uppercase text-xs flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(74,222,128,0.3)] transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share Link</span>
                  </button>

                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                      `Join our Find My Family circle "${circleId}": ${currentUrl} (or install APK from ${apkDownloadUrl})`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-3 rounded-xl bg-[#1B4332] hover:bg-[#22553F] border border-[#2D6A4F] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <ExternalLink className="w-4 h-4 text-[#4ADE80]" />
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Connected Devices in Circle */}
          {tab === 'devices' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#74C69D]">
                  All Devices in Circle ({circleId})
                </span>
                <span className="text-[10px] text-[#4ADE80] font-mono">Live Mesh Sync</span>
              </div>

              {/* My Own Device Card */}
              <div className="p-3.5 rounded-2xl bg-[#081C15] border-2 border-[#4ADE80] flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-[#081C15] shadow"
                    style={{ backgroundColor: myColor }}
                  >
                    {myDeviceName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{myDeviceName}</span>
                      <span className="px-1.5 py-0.5 rounded bg-[#4ADE80]/20 text-[#4ADE80] text-[9px] font-bold">
                        THIS PHONE
                      </span>
                    </div>
                    <div className="text-[11px] text-[#74C69D] font-mono mt-0.5">
                      ID: {myDeviceId}
                    </div>
                  </div>
                </div>
                <div className="w-2.5 h-2.5 rounded-full bg-[#4ADE80] animate-pulse" />
              </div>

              {/* Paired Members */}
              {pairedMembers.length === 0 ? (
                <div className="p-6 text-center bg-[#081C15] border border-[#2D6A4F] rounded-2xl">
                  <p className="text-xs text-[#95D5B2]">
                    No other family devices in circle <strong className="text-white">{circleId}</strong> yet.
                  </p>
                  <p className="text-[11px] text-[#74C69D] mt-1">
                    Share the QR code or link in the Invite tab to connect more phones!
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pairedMembers.map((m) => {
                    const dist = calculateDistance(
                      myLocation.latitude,
                      myLocation.longitude,
                      m.lastLat,
                      m.lastLng
                    );
                    return (
                      <div
                        key={m.id}
                        className="p-3.5 rounded-2xl bg-[#1B4332] hover:bg-[#22553F] border border-[#2D6A4F] flex items-center justify-between transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-[#081C15] shadow shrink-0"
                            style={{ backgroundColor: m.color || '#38BDF8' }}
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-sm text-white truncate">{m.name}</div>
                            <div className="flex items-center gap-2 text-[11px] text-[#B7E4C7] mt-0.5">
                              <span className="font-mono text-[#4ADE80] font-bold">
                                {dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${dist} m`}
                              </span>
                              <span>•</span>
                              <span>{Math.round((Date.now() - m.lastUpdated) / 1000)}s ago</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onSelectMemberToTrack(m);
                            onClose();
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#4ADE80] text-[#081C15] font-black uppercase text-xs shadow hover:bg-[#52B788] cursor-pointer transition-all shrink-0"
                        >
                          Track →
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: My Device Profile */}
          {tab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#B7E4C7] uppercase tracking-wider block mb-1.5">
                  My Display Name
                </label>
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Rahul (Mobile), Papa, Maa"
                  className="w-full px-4 py-3 rounded-xl bg-[#081C15] border border-[#2D6A4F] focus:border-[#4ADE80] text-white text-sm outline-none shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#B7E4C7] uppercase tracking-wider block mb-1.5">
                  Phone Number (For SMS Fallback)
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-3 rounded-xl bg-[#081C15] border border-[#2D6A4F] focus:border-[#4ADE80] text-white text-sm outline-none font-mono shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#B7E4C7] uppercase tracking-wider block mb-1.5">
                  Avatar Color
                </label>
                <div className="flex items-center gap-3">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`w-10 h-10 rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-md ${
                        selectedColor === c ? 'scale-110 ring-2 ring-white' : 'opacity-80 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {selectedColor === c && <Check className="w-5 h-5 text-[#081C15] stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#4ADE80] hover:bg-[#52B788] text-[#081C15] font-black uppercase tracking-wider text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(74,222,128,0.3)]"
                >
                  {savedSuccess ? 'Profile Updated!' : 'Save Phone Profile'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: Switch or Create Family Circle Room */}
          {tab === 'circle' && (
            <form onSubmit={handleJoinCircle} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#B7E4C7] uppercase tracking-wider block mb-1.5">
                  Family Circle Room ID / Code
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={circleInput}
                    onChange={(e) => setCircleInput(e.target.value.toUpperCase())}
                    placeholder="e.g. KUMBH-2026, SHARMA-FAM, 582910"
                    className="flex-1 px-4 py-3 rounded-xl bg-[#081C15] border border-[#2D6A4F] focus:border-[#4ADE80] text-white text-sm font-mono uppercase tracking-wider outline-none shadow-inner"
                  />
                  <button
                    type="submit"
                    className="px-5 py-3 rounded-xl bg-[#4ADE80] hover:bg-[#52B788] text-[#081C15] font-black uppercase text-xs cursor-pointer shadow transition-all"
                  >
                    Join
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-[#74C69D] uppercase tracking-wider block mb-2">
                  Quick Preset Family Circles
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {['KUMBH-2026', 'SHARMA-FAMILY', 'SANGAM-CAMP-4', 'VIP-GROUP-108'].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setCircleInput(preset);
                        onChangeCircle(preset);
                        setSavedSuccess(true);
                      }}
                      className="p-3 rounded-xl bg-[#1B4332] hover:bg-[#22553F] border border-[#2D6A4F] text-left transition-all cursor-pointer font-mono text-xs text-white"
                    >
                      <div className="font-bold">{preset}</div>
                      <div className="text-[10px] text-[#74C69D]">Switch Room →</div>
                    </button>
                  ))}
                </div>
              </div>

              {savedSuccess && (
                <div className="p-3 rounded-xl bg-[#4ADE80]/20 border border-[#4ADE80]/40 text-[#4ADE80] text-xs font-bold text-center">
                  Switched to Circle Room: {circleId}!
                </div>
              )}
            </form>
          )}

          {/* TAB 5: Wi-Fi Server IP Settings */}
          {tab === 'server' && (
            <form onSubmit={handleSaveServerUrl} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#B7E4C7] uppercase tracking-wider block mb-1.5 flex items-center justify-between">
                  <span>Backend Server Address (Wi-Fi Hub)</span>
                  <span className="text-[10px] font-mono text-[#4ADE80]">Port: 3000</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={serverUrlInput}
                    onChange={(e) => setServerUrlInput(e.target.value)}
                    placeholder="http://192.168.31.97:3000"
                    className="flex-1 px-4 py-3 rounded-xl bg-[#081C15] border border-[#2D6A4F] focus:border-[#4ADE80] text-white text-sm font-mono outline-none shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => testServerConnection()}
                    className="px-4 py-3 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] border border-[#2D6A4F] text-[#4ADE80] font-bold text-xs cursor-pointer shadow transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${serverPingStatus === 'testing' ? 'animate-spin' : ''}`} />
                    <span>Ping</span>
                  </button>
                </div>
                <p className="text-[11px] text-[#74C69D] mt-1.5 leading-relaxed">
                  Enter your laptop's Wi-Fi IP address so the APK and parents' phones can connect to the shared server.
                </p>
              </div>

              {/* Status Box */}
              <div className="p-3.5 rounded-2xl bg-[#081C15] border border-[#2D6A4F] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#95D5B2] font-semibold">Connection Status:</span>
                  <div className="flex items-center gap-1.5">
                    {serverPingStatus === 'success' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
                        <span className="text-xs font-bold text-[#4ADE80]">Online ({serverLatency}ms)</span>
                      </>
                    ) : serverPingStatus === 'error' ? (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span className="text-xs font-bold text-red-400">Cannot Reach Server</span>
                      </>
                    ) : serverPingStatus === 'testing' ? (
                      <span className="text-xs text-yellow-400 font-bold">Testing connection...</span>
                    ) : (
                      <span className="text-xs text-[#74C69D]">Ready to test</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#74C69D] pt-1 border-t border-[#1B4332]">
                  <span>Default Host IP:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setServerUrlInput(DEFAULT_SERVER_URL);
                      relayClient.setServerUrl(DEFAULT_SERVER_URL);
                      setSavedSuccess(true);
                      setTimeout(() => setSavedSuccess(false), 2000);
                      testServerConnection(DEFAULT_SERVER_URL);
                    }}
                    className="text-[#4ADE80] font-mono hover:underline cursor-pointer"
                  >
                    {DEFAULT_SERVER_URL} (Reset)
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#4ADE80] hover:bg-[#52B788] text-[#081C15] font-black uppercase tracking-wider text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(74,222,128,0.3)]"
                >
                  {savedSuccess ? 'Server URL Saved & Connected!' : 'Save & Reconnect'}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
