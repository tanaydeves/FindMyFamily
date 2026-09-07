import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { Camera, RefreshCw, X, Check, QrCode, AlertCircle, Sparkles } from 'lucide-react';
import { LanguageCode } from '../types';
import { t } from '../i18n/translations';

interface Props {
  onScan: (qr_id: string) => void;
  onClose: () => void;
  lang: LanguageCode;
  availableSampleTags?: string[];
}

export function normalizeScannedQrTag(raw: string): string {
  if (!raw) return '';
  const cleaned = raw.trim();
  try {
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
      const url = new URL(cleaned);
      // Check for /lost/:qrId or /lost-status/:qrId in our own app URL patterns
      const match = url.pathname.match(/\/(?:lost|lost-status|tag|child)\/([^/?#]+)/i);
      if (match && match[1]) {
        return decodeURIComponent(match[1]).trim().toUpperCase();
      }
      // If external short URL like https://qrstud.io/qrmnky, extract the last path slug
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        return segments[segments.length - 1].trim().toUpperCase();
      }
      // Fallback to domain name without punctuation
      return url.hostname.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
    }
  } catch {}
  // Clean whitespace/newlines
  return cleaned.replace(/[\s\r\n]+/g, '').toUpperCase();
}

export const QrCameraScanner: React.FC<Props> = ({
  onScan,
  onClose,
  lang,
  availableSampleTags = ['QR-KUMBH-001', 'QR-KUMBH-002', 'QR-KUMBH-003', 'QR-KUMBH-004'],
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualTagInput, setManualTagInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;
    let isActive = true;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setHasCamera(false);
          return;
        }
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play().catch(() => {});
          setCameraActive(true);
          requestAnimationFrame(tick);
        }
      } catch (err: any) {
        console.warn('[QR SCANNER] Camera init error:', err);
        setHasCamera(false);
        setCameraError(err.message || 'Camera permission denied or camera not accessible.');
      }
    }

    function tick() {
      if (!isActive) return;
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
        }
        const canvas = canvasRef.current;
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });
          if (code && code.data) {
            console.log('[QR SCANNER] Found code:', code.data);
            isActive = false;
            handleSelectTag(code.data);
            return;
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    }

    startCamera();

    return () => {
      isActive = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []); // eslint-disable-next-line react-hooks/exhaustive-deps

  const handleSelectTag = (tag: string) => {
    const normalized = normalizeScannedQrTag(tag);
    setIsProcessing(true);
    setTimeout(() => {
      onScan(normalized);
    }, 200);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTagInput.trim()) return;
    handleSelectTag(manualTagInput.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between text-white p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between z-10 pt-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#1B4332] text-white flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base leading-tight">
              {t('scanKidQrTitle', lang)}
            </h3>
            <p className="text-xs text-white/70">
              {t('scanKidQrInstruction', lang)}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center cursor-pointer transition-colors"
          aria-label="Close Scanner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center Camera Viewport with Reticle Overlay */}
      <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden rounded-3xl border border-white/20 bg-black">
        {hasCamera ? (
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-center p-6 space-y-3">
            <div className="w-14 h-14 rounded-full bg-white/10 mx-auto flex items-center justify-center text-amber-400">
              <Camera className="w-7 h-7" />
            </div>
            <p className="text-sm font-medium text-white/80 max-w-xs mx-auto">
              {cameraError || 'Camera unavailable in this preview browser. Use quick-select or manual entry below.'}
            </p>
          </div>
        )}

        {/* Viewfinder Target Reticle Frame */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-[#4ADE80]/70 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
            {/* Corner Bracket Accents */}
            <div className="absolute top-2 left-2 w-6 h-6 border-t-4 border-l-4 border-[#4ADE80] rounded-tl" />
            <div className="absolute top-2 right-2 w-6 h-6 border-t-4 border-r-4 border-[#4ADE80] rounded-tr" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-4 border-l-4 border-[#4ADE80] rounded-bl" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-4 border-r-4 border-[#4ADE80] rounded-br" />

            {/* Scanning Laser Line */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#4ADE80] to-transparent animate-pulse" style={{
              top: '50%',
              transform: 'translateY(-50%)',
              boxShadow: '0 0 12px #4ADE80',
            }} />

            {/* Center Hint */}
            <span className="text-[11px] font-mono tracking-widest uppercase text-white/80 bg-black/60 px-3 py-1 rounded-full backdrop-blur-xs">
              Align Wristband QR
            </span>
          </div>

          {/* On-Screen Instruction Pill */}
          <div className="mt-4 px-4 py-2 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-center text-xs font-semibold text-white/90 shadow-lg max-w-xs">
            {t('scanKidQrTitle', lang)}
          </div>
        </div>
      </div>

      {/* Bottom Controls: Quick Test QR Selector + Manual Entry Fallback */}
      <div className="z-10 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white/80 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#4ADE80]" />
              <span>Select Pre-Printed Event Sticker:</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableSampleTags.map((tag) => (
              <button
                key={tag}
                disabled={isProcessing}
                onClick={() => handleSelectTag(tag)}
                className="px-3 py-1.5 rounded-xl bg-[#1B4332] hover:bg-[#2D6A4F] active:scale-95 text-[#4ADE80] border border-[#4ADE80]/40 font-mono text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Manual ID Input */}
        <form onSubmit={handleManualSubmit} className="flex items-center gap-2 pt-1 border-t border-white/10">
          <input
            type="text"
            placeholder="Or type Sticker ID (e.g. QR-KUMBH-001)"
            value={manualTagInput}
            onChange={(e) => setManualTagInput(e.target.value)}
            className="flex-1 bg-white/15 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#4ADE80]"
          />
          <button
            type="submit"
            disabled={!manualTagInput.trim() || isProcessing}
            className="px-4 py-2 rounded-xl bg-[#4ADE80] text-[#0D2119] font-bold text-xs hover:bg-[#86EFAC] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            Confirm
          </button>
        </form>
      </div>
    </div>
  );
};
