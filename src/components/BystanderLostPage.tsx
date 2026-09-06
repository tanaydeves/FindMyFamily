import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  MapPin,
  Phone,
  CheckCircle2,
  Navigation,
  Globe,
  Clock,
  ShieldCheck,
  Building,
  ExternalLink,
  ChevronDown,
  Info,
} from 'lucide-react';
import { LanguageCode, VolunteerCenter } from '../types';
import { t } from '../i18n/translations';
import { lostChildService, TagStatusResponse } from '../services/lostChildService';

interface Props {
  qrId: string;
  onNavigateHome?: () => void;
}

export const BystanderLostPage: React.FC<Props> = ({ qrId, onNavigateHome }) => {
  const [lang, setLang] = useState<LanguageCode>('en');
  const [isLoading, setIsLoading] = useState(true);
  const [tagData, setTagData] = useState<TagStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mark as Lost Action States
  const [isReporting, setIsReporting] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsDenied, setGpsDenied] = useState(false);
  const [selectedLandmark, setSelectedLandmark] = useState<string>('');
  const [customNote, setCustomNote] = useState<string>('');
  const [finderContact, setFinderContact] = useState<string>('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load tag status on mount
  useEffect(() => {
    async function loadStatus() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const data = await lostChildService.getTagStatus(qrId);
        setTagData(data);
        if (data.volunteerCenters && data.volunteerCenters.length > 0) {
          setSelectedLandmark(data.volunteerCenters[0].name);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Unable to fetch tag status.');
      } finally {
        setIsLoading(false);
      }
    }
    loadStatus();
  }, [qrId]);

  // Request browser GPS coordinates when bystander taps "Mark as Lost"
  const handleInitiateMarkLost = () => {
    setShowLocationDialog(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setGpsDenied(false);
        },
        (error) => {
          console.warn('[BYSTANDER GPS] Location permission denied or unavailable:', error.message);
          setGpsDenied(true);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setGpsDenied(true);
    }
  };

  const handleSubmitLostReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    const submission = {
      qr_id: qrId,
      finder_lat: gpsLocation ? gpsLocation.lat : null,
      finder_lng: gpsLocation ? gpsLocation.lng : null,
      finder_landmark_note: selectedLandmark
        ? `${selectedLandmark}${customNote.trim() ? ` - ${customNote.trim()}` : ''}`
        : customNote.trim() || 'Near Volunteer Center',
      finder_contact_optional: finderContact.trim() || undefined,
    };

    const res = await lostChildService.submitLostAlert(submission);
    setIsSubmitting(false);

    if (res.success) {
      setReportSuccess(true);
      // Reload tag status
      const updated = await lostChildService.getTagStatus(qrId).catch(() => null);
      if (updated) setTagData(updated);
    } else {
      setErrorMessage(res.error || 'Failed to submit report. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#0D2119] flex flex-col items-center justify-between p-4 sm:p-6 font-sans select-none">
      {/* Top Bar with Branding & Standalone Language Toggle */}
      <header className="w-full max-w-md flex items-center justify-between py-3 border-b border-[#E2E8F0] shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#1B4332] text-white flex items-center justify-center font-bold text-sm shadow-xs">
            🧭
          </div>
          <div>
            <h1 className="font-bold text-sm text-[#0D2119]">Find My Family</h1>
            <p className="text-[10px] text-[#5C7168]">Public Child Safety Portal</p>
          </div>
        </div>

        {/* Standalone Language Toggle (EN / HI / MR) */}
        <div className="flex items-center gap-1 bg-white border border-[#E2E8F0] rounded-xl p-1 shadow-xs">
          {(['en', 'hi', 'mr'] as LanguageCode[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                lang === l
                  ? 'bg-[#1B4332] text-white'
                  : 'text-[#5C7168] hover:text-[#0D2119]'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-md flex-1 flex flex-col justify-center py-6 space-y-4">
        {isLoading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-10 h-10 border-3 border-[#1B4332]/20 border-t-[#1B4332] rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold text-[#5C7168]">Connecting to recovery network...</p>
          </div>
        ) : errorMessage && !tagData ? (
          <div className="p-6 bg-white rounded-2xl border border-[#FECACA] shadow-sm text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FEE2E2] text-[#DC2626] mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#991B1B]">Tag Lookup Error</h3>
            <p className="text-xs text-[#5C7168] leading-relaxed">{errorMessage}</p>
          </div>
        ) : reportSuccess ? (
          /* Report Success Confirmation Screen */
          <div className="bg-white rounded-2xl border border-[#BBF7D0] p-6 shadow-md text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-[#DCFCE7] text-[#166534] mx-auto flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#166534]">
                {t('reportSuccessTitle', lang)}
              </h2>
              <p className="text-xs text-[#5C7168] mt-2 leading-relaxed">
                {t('reportSuccessDesc', lang)}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] text-left text-xs space-y-2">
              <div className="flex items-center gap-2 text-[#166534] font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Actions Taken:</span>
              </div>
              <p className="text-[#5C7168]">
                ✓ High-priority SMS sent to child's parents with location link.
              </p>
              <p className="text-[#5C7168]">
                ✓ Rescue alert broadcasted to Volunteer & Police on-ground dashboard.
              </p>
            </div>

            <p className="text-xs font-semibold text-[#D97706] bg-[#FEF3C7] p-3 rounded-xl border border-[#FDE68A]">
              🤝 Please stay with the child until an authorized volunteer or police officer arrives.
            </p>
          </div>
        ) : tagData?.status === 'unassigned' ? (
          /* BRANCH 1: UNASSIGNED TAG */
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#FEF3C7] text-[#D97706] mx-auto flex items-center justify-center">
              <Building className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0D2119]">
                {t('unassignedTagTitle', lang)}
              </h2>
              <p className="text-xs text-[#5C7168] mt-1 leading-relaxed">
                {t('unassignedTagDesc', lang)}
              </p>
            </div>

            {/* Nearest Volunteer Centers List */}
            <div className="text-left space-y-2 pt-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5C7168] block">
                {t('nearestVolunteerCenter', lang)}:
              </span>
              <div className="space-y-2">
                {tagData.volunteerCenters?.map((center) => (
                  <div
                    key={center.center_id}
                    className="p-3.5 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] flex items-center justify-between shadow-2xs"
                  >
                    <div>
                      <h4 className="font-bold text-xs text-[#0D2119]">{center.name}</h4>
                      <p className="text-[11px] font-mono text-[#5C7168] mt-0.5">
                        {center.location_lat.toFixed(4)}, {center.location_lng.toFixed(4)}
                      </p>
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${center.location_lat},${center.location_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-[#1B4332] text-white text-xs font-bold flex items-center gap-1.5 hover:bg-[#012D1D] transition-colors"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Directions</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : tagData?.status === 'lost_flagged' ? (
          /* BRANCH 2: ALREADY REPORTED (LOST_FLAGGED) */
          <div className="bg-white rounded-2xl border-2 border-[#F59E0B] p-6 shadow-sm text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#FEF3C7] text-[#D97706] mx-auto flex items-center justify-center animate-pulse">
              <Clock className="w-7 h-7" />
            </div>

            <div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] inline-block mb-1">
                Active Open Alert
              </span>
              <h2 className="text-lg font-bold text-[#0D2119]">
                {t('alreadyReportedTitle', lang)}
              </h2>
              <p className="text-xs text-[#5C7168] mt-1 leading-relaxed">
                {t('alreadyReportedDesc', lang)}
              </p>
            </div>

            {/* Child Card if photo available */}
            {tagData.child && (
              <div className="flex items-center gap-3 p-3 bg-[#F8FAF9] rounded-xl border border-[#E2E8F0] text-left">
                <img
                  src={tagData.child.photo_url}
                  alt="Child"
                  className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs"
                />
                <div>
                  <h4 className="font-bold text-xs text-[#0D2119]">
                    {tagData.child.child_name || 'Protected Child'}
                  </h4>
                  <p className="text-[11px] text-[#16A34A] font-semibold">Rescue in progress</p>
                </div>
              </div>
            )}

            {/* Secondary Re-confirmation Option */}
            <div className="pt-2 border-t border-[#E2E8F0]">
              <p className="text-[11px] text-[#5C7168] mb-2">
                If the child has moved or needs updated location reporting:
              </p>
              <button
                onClick={handleInitiateMarkLost}
                className="w-full py-2.5 rounded-xl bg-white border border-[#CBD5E1] text-[#0D2119] text-xs font-bold hover:bg-[#F1F5F9] transition-all cursor-pointer"
              >
                {t('reconfirmAlert', lang)}
              </button>
            </div>
          </div>
        ) : tagData?.status === 'resolved' || tagData?.status === 'retired' ? (
          /* BRANCH 3: RESOLVED / RETIRED */
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#DCFCE7] text-[#166534] mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#166534]">
                Case Successfully Resolved
              </h2>
              <p className="text-xs text-[#5C7168] mt-1 leading-relaxed">
                This child was safely reunited with their family and the recovery case is closed.
              </p>
            </div>
          </div>
        ) : (
          /* BRANCH 4: ASSIGNED (NORMAL "IS THERE A LOST CHILD NEAR YOU?") */
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-md text-center space-y-5">
            {/* Child Photo & Name if available (NO phone numbers shown to protect family privacy) */}
            {tagData?.child && (
              <div className="flex flex-col items-center">
                <div className="relative w-24 h-24 mb-2">
                  <img
                    src={tagData.child.photo_url}
                    alt={tagData.child.child_name}
                    className="w-full h-full rounded-full object-cover border-3 border-[#1B4332]/20 shadow-md"
                  />
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#1B4332] text-white flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>
                <h3 className="font-bold text-base text-[#0D2119]">
                  {tagData.child.child_name || 'Protected Child'}
                </h3>
                <span className="text-[11px] text-[#5C7168] font-mono">
                  Tag ID: {qrId}
                </span>
              </div>
            )}

            {/* Core Question Prompt */}
            <div className="py-2">
              <h2 className="headline-md text-xl font-extrabold text-[#0D2119]">
                {t('bystanderPrompt', lang)}
              </h2>
              <p className="text-xs text-[#5C7168] mt-1 max-w-xs mx-auto">
                Tapping "Mark as Lost" will instantly alert parents via SMS and dispatch event rescue volunteers to this location.
              </p>
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                onClick={handleInitiateMarkLost}
                className="w-full h-14 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.98] text-white font-bold text-base shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                <span>{t('markAsLost', lang)}</span>
              </button>

              <button
                onClick={() => {
                  if (onNavigateHome) onNavigateHome();
                  else window.location.href = '/';
                }}
                className="w-full h-11 rounded-xl bg-[#F8FAF9] hover:bg-[#E2E8F0] text-[#5C7168] text-sm font-semibold cursor-pointer transition-colors"
              >
                {t('cancel', lang)}
              </button>
            </div>
          </div>
        )}

        {/* Location & Optional Contact Dialog Modal */}
        {showLocationDialog && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-[#E2E8F0] space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-2 text-[#DC2626]">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-bold text-base text-[#0D2119]">Confirm Lost Child Location</h3>
                </div>
                <button
                  onClick={() => setShowLocationDialog(false)}
                  className="w-8 h-8 rounded-lg text-[#94A3B8] hover:text-[#0D2119] flex items-center justify-center cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmitLostReport} className="space-y-3.5">
                {/* Geolocation Status Indicator */}
                {gpsLocation ? (
                  <div className="p-3 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] text-xs font-semibold flex items-center gap-2">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="flex-1">
                      GPS coordinates captured ({gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)})
                    </span>
                  </div>
                ) : gpsDenied ? (
                  <div className="p-3 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-xs space-y-1">
                    <p className="font-bold">{t('gpsDeniedFallback', lang)}</p>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0] text-[#5C7168] text-xs flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-[#1B4332]/20 border-t-[#1B4332] rounded-full animate-spin shrink-0" />
                    <span>Requesting GPS location permission...</span>
                  </div>
                )}

                {/* Landmark Selector (Data-driven from volunteer_centers) */}
                <div>
                  <label className="text-xs font-bold text-[#0D2119] block mb-1">
                    {t('selectLandmark', lang)}
                  </label>
                  <select
                    value={selectedLandmark}
                    onChange={(e) => setSelectedLandmark(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#CBD5E1] rounded-xl px-3 py-2 text-xs text-[#0D2119] font-medium outline-none cursor-pointer"
                  >
                    {tagData?.volunteerCenters?.map((center) => (
                      <option key={center.center_id} value={center.name}>
                        {center.name}
                      </option>
                    ))}
                    <option value="Sangam Ghat Sector 1">Sangam Ghat Sector 1</option>
                    <option value="Dashashwamedh Ghat Entry">Dashashwamedh Ghat Entry</option>
                    <option value="Sector 4 Central Bridge">Sector 4 Central Bridge</option>
                    <option value="VIP Ghat / Police Chowki">VIP Ghat / Police Chowki</option>
                    <option value="Railway Station Pilgrim Camp">Railway Station Pilgrim Camp</option>
                  </select>
                </div>

                {/* Additional landmark note */}
                <div>
                  <input
                    type="text"
                    placeholder="Specific spot description (e.g. Near Pillar #42, Tea Stall)"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs text-[#0D2119] outline-none"
                  />
                </div>

                {/* Optional Bystander Phone Number */}
                <div className="pt-1">
                  <label className="text-xs font-bold text-[#0D2119] block mb-1">
                    {t('finderContactPrompt', lang)}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      placeholder={t('finderContactPlaceholder', lang)}
                      value={finderContact}
                      onChange={(e) => setFinderContact(e.target.value)}
                      className="w-full bg-[#F8FAF9] border border-[#E2E8F0] rounded-xl pl-9 pr-3 py-2 text-xs text-[#0D2119] outline-none font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-[#5C7168] block mt-0.5">
                    Never shared publicly. Used only by volunteer rescue staff.
                  </span>
                </div>

                {/* Dialog Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] active:scale-[0.98] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        <span>Send Emergency Alert to Parents & Police</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer Disclaimer */}
      <footer className="w-full max-w-md text-center py-2 text-[11px] text-[#5C7168]">
        <p>Find My Family © 2026 • Emergency Crowd Safety & Family Reunification</p>
      </footer>
    </div>
  );
};
