import React, { useState, useRef } from 'react';
import {
  X,
  Camera,
  Upload,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  User,
  Heart,
  Phone,
  Globe,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LanguageCode, ChildProfile } from '../types';
import { t } from '../i18n/translations';
import { lostChildService } from '../services/lostChildService';
import { QrCameraScanner } from './QrCameraScanner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  myDeviceId: string;
  defaultLang: LanguageCode;
  onChildLinked?: (child: ChildProfile) => void;
}

export const AddKidModal: React.FC<Props> = ({
  isOpen,
  onClose,
  myDeviceId,
  defaultLang,
  onChildLinked,
}) => {
  // Step state: 1 = Form, 2 = QR Scanner, 3 = Confirmation
  const [step, setStep] = useState<'form' | 'scanner' | 'confirmation'>('form');

  // Form Fields
  const [childName, setChildName] = useState('');
  const [motherName, setMotherName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [languagePref, setLanguagePref] = useState<LanguageCode>(defaultLang);
  const [photoUrl, setPhotoUrl] = useState<string>('');

  // Mode: Personal Phone vs Assisted Volunteer Kiosk Registration
  // TODO [DECISION 2 - ASSISTED REGISTRATION AUTH]: If existing auth scaffolding supports a distinct volunteer role,
  // implement this properly by tagging created_by_user_id with the volunteer's service account. Currently stubbed
  // with service_kiosk_volunteer while still using parent contact numbers for SMS delivery.
  const [isAssistedKiosk, setIsAssistedKiosk] = useState(false);

  // Scanned QR and Server Response
  const [scannedQrId, setScannedQrId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [linkedProfile, setLinkedProfile] = useState<ChildProfile | null>(null);
  const [isPendingSync, setIsPendingSync] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Handle Photo Picker / Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // Sample quick photo generators for ease of testing
  const setSamplePhoto = (type: 'boy' | 'girl') => {
    if (type === 'boy') {
      setPhotoUrl('https://images.unsplash.com/photo-1543332164-6e82f355badc?w=300&auto=format&fit=crop&q=80');
      if (!childName) setChildName('Aarav');
    } else {
      setPhotoUrl('https://images.unsplash.com/photo-1517456793572-1d8efd6dc135?w=300&auto=format&fit=crop&q=80');
      if (!childName) setChildName('Ananya');
    }
  };

  const handleFormNext = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!motherName.trim() || !fatherName.trim() || !primaryPhone.trim()) {
      setErrorMessage('Please fill in Mother, Father, and Primary Contact Phone.');
      return;
    }

    // Default placeholder photo if parent didn't capture one
    if (!photoUrl) {
      setPhotoUrl('https://images.unsplash.com/photo-1543332164-6e82f355badc?w=300&auto=format&fit=crop&q=80');
    }

    setStep('scanner');
  };

  const handleQrScanned = async (qr_id: string) => {
    setScannedQrId(qr_id);
    setIsSubmitting(true);
    setErrorMessage(null);

    const createdByUserId = isAssistedKiosk ? 'service_kiosk_volunteer' : myDeviceId;

    const result = await lostChildService.linkChild({
      qr_id,
      child_name: childName.trim() || `${motherName.trim()}'s child`,
      mother_name: motherName.trim(),
      father_name: fatherName.trim(),
      photo_url: photoUrl || 'https://images.unsplash.com/photo-1543332164-6e82f355badc?w=300&auto=format&fit=crop&q=80',
      contact_number_primary: primaryPhone.trim(),
      contact_number_secondary: secondaryPhone.trim() || undefined,
      language_pref: languagePref,
      created_by_user_id: createdByUserId,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setErrorMessage(result.error || t('qrAlreadyInUse', defaultLang));
      setStep('form');
      return;
    }

    if (result.profile) {
      setLinkedProfile(result.profile);
      setIsPendingSync(!!result.isOffline);
      if (onChildLinked) {
        onChildLinked(result.profile);
      }
      setStep('confirmation');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      {/* Scanner Screen Modal View */}
      {step === 'scanner' && (
        <QrCameraScanner
          lang={defaultLang}
          onScan={handleQrScanned}
          onClose={() => setStep('form')}
        />
      )}

      {/* Main Container Card (Calm Reliability light aesthetic) */}
      {step !== 'scanner' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E2E8F0] overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAF9] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#1B4332] text-white flex items-center justify-center shadow-xs">
                <Heart className="w-4 h-4 fill-white" />
              </div>
              <div>
                <h2 className="font-bold text-base text-[#0D2119]">
                  {t('addKid', defaultLang)}
                </h2>
                <p className="text-xs text-[#5C7168]">
                  {t('addKidDesc', defaultLang)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-[#94A3B8] hover:text-[#0D2119] hover:bg-[#E2E8F0]/60 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626] text-xs font-semibold flex items-start gap-2.5 shadow-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{errorMessage}</span>
              </div>
            )}

            {step === 'form' && (
              <form id="add-kid-form" onSubmit={handleFormNext} className="space-y-4">
                {/* Mode Selector (Personal Phone vs Assisted Registration Kiosk) */}
                <div className="p-3 rounded-xl bg-[#F8FAF9] border border-[#E2E8F0]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#0D2119] block">
                        Registration Mode
                      </span>
                      <span className="text-[11px] text-[#5C7168]">
                        {isAssistedKiosk ? 'Assisted (Volunteer Desk Tablet)' : 'Parent Personal Device'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAssistedKiosk(!isAssistedKiosk)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isAssistedKiosk
                          ? 'bg-[#1B4332] text-white'
                          : 'bg-white border border-[#CBD5E1] text-[#0D2119]'
                      }`}
                    >
                      {isAssistedKiosk ? 'Assisted Active' : 'Switch to Assisted'}
                    </button>
                  </div>
                  {isAssistedKiosk && (
                    <p className="text-[11px] text-[#D97706] mt-2 font-medium">
                      ⚠️ Note: Child profile will be tagged with volunteer service account while SMS alerts go to parent's phone.
                    </p>
                  )}
                </div>

                {/* Child Name & Photo Row */}
                <div className="flex items-center gap-4">
                  {/* Photo Preview / Upload Button */}
                  <div className="relative shrink-0">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-20 h-20 rounded-2xl bg-[#F1F5F9] border-2 border-dashed border-[#CBD5E1] hover:border-[#1B4332] flex flex-col items-center justify-center text-[#5C7168] cursor-pointer overflow-hidden transition-all shadow-xs group"
                    >
                      {photoUrl ? (
                        <img src={photoUrl} alt="Child" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera className="w-6 h-6 text-[#94A3B8] group-hover:text-[#1B4332] transition-colors" />
                          <span className="text-[10px] font-bold mt-1">Photo</span>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-bold text-[#0D2119] block">
                      {t('childName', defaultLang)}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Aarav / Meera"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      className="w-full bg-[#F8FAF9] border border-[#E2E8F0] focus:border-[#1B4332] focus:bg-white rounded-xl px-3 py-2 text-sm text-[#0D2119] outline-none transition-colors"
                    />
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setSamplePhoto('boy')}
                        className="text-[10px] text-[#1B4332] font-semibold hover:underline"
                      >
                        + Sample Boy Photo
                      </button>
                      <span className="text-[#CBD5E1]">•</span>
                      <button
                        type="button"
                        onClick={() => setSamplePhoto('girl')}
                        className="text-[10px] text-[#1B4332] font-semibold hover:underline"
                      >
                        + Sample Girl Photo
                      </button>
                    </div>
                  </div>
                </div>

                {/* Parents' Names Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#0D2119] block mb-1">
                      {t('motherName', defaultLang)} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Mother's Name"
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      className="w-full bg-[#F8FAF9] border border-[#E2E8F0] focus:border-[#1B4332] focus:bg-white rounded-xl px-3 py-2 text-sm text-[#0D2119] outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#0D2119] block mb-1">
                      {t('fatherName', defaultLang)} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Father's Name"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      className="w-full bg-[#F8FAF9] border border-[#E2E8F0] focus:border-[#1B4332] focus:bg-white rounded-xl px-3 py-2 text-sm text-[#0D2119] outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Contact Numbers */}
                <div>
                  <label className="text-xs font-bold text-[#0D2119] block mb-1">
                    {t('contactPrimary', defaultLang)} *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#E2E8F0] focus:border-[#1B4332] focus:bg-white rounded-xl px-3 py-2 text-sm text-[#0D2119] outline-none font-mono transition-colors"
                  />
                  <p className="text-[11px] text-[#5C7168] mt-1">
                    SMS alerts will be sent immediately to this number if the QR sticker is scanned by a finder.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#0D2119] block mb-1">
                    {t('contactSecondary', defaultLang)}
                  </label>
                  <input
                    type="tel"
                    placeholder="Optional backup phone (+91...)"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    className="w-full bg-[#F8FAF9] border border-[#E2E8F0] focus:border-[#1B4332] focus:bg-white rounded-xl px-3 py-2 text-sm text-[#0D2119] outline-none font-mono transition-colors"
                  />
                </div>

                {/* Preferred Language for SMS */}
                <div>
                  <label className="text-xs font-bold text-[#0D2119] block mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#1B4332]" />
                    <span>{t('preferredLang', defaultLang)}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { code: 'en' as LanguageCode, label: 'English' },
                      { code: 'hi' as LanguageCode, label: 'हिन्दी (Hindi)' },
                      { code: 'mr' as LanguageCode, label: 'मराठी (Marathi)' },
                    ].map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        onClick={() => setLanguagePref(l.code)}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          languagePref === l.code
                            ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-xs'
                            : 'bg-[#F8FAF9] text-[#5C7168] border-[#E2E8F0] hover:bg-white'
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              </form>
            )}

            {step === 'confirmation' && linkedProfile && (
              <div className="text-center py-4 space-y-4">
                {/* Success Avatar with Check Icon */}
                <div className="relative w-24 h-24 mx-auto">
                  <img
                    src={linkedProfile.photo_url}
                    alt={linkedProfile.child_name}
                    className="w-full h-full rounded-full object-cover border-4 border-[#DCFCE7] shadow-md"
                  />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-center gap-2">
                    <h3 className="headline-md text-lg text-[#0D2119] font-bold">
                      {linkedProfile.child_name || `${linkedProfile.mother_name}'s child`}
                    </h3>
                    {isPendingSync ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] flex items-center gap-1">
                        <Clock className="w-3 h-3 animate-spin" />
                        <span>{t('pendingSync', defaultLang)}</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Protected</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono font-bold text-[#1B4332] mt-1 bg-[#F1F5F3] px-3 py-1 rounded-full inline-block">
                    Tag ID: {linkedProfile.qr_id}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F1F5F3] border border-[#E2E8F0] text-left space-y-2">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 text-[#1B4332] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-[#0D2119]">
                        {t('linkedSuccess', defaultLang)}
                      </h4>
                      <p className="text-xs text-[#5C7168] mt-0.5 leading-relaxed">
                        {t('linkedExplainer', defaultLang)}
                      </p>
                    </div>
                  </div>

                  {isPendingSync && (
                    <div className="pt-2 border-t border-[#E2E8F0]/80 text-[11px] text-[#92400E] font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{t('offlineQueuedNotice', defaultLang)}</span>
                    </div>
                  )}
                </div>

                <div className="text-xs text-[#5C7168] space-y-1 text-left bg-white p-3 rounded-xl border border-[#E2E8F0]">
                  <p><strong>Parents:</strong> {linkedProfile.mother_name} & {linkedProfile.father_name}</p>
                  <p><strong>Primary SMS Contact:</strong> <span className="font-mono">{linkedProfile.contact_number_primary}</span></p>
                  {linkedProfile.contact_number_secondary && (
                    <p><strong>Backup Contact:</strong> <span className="font-mono">{linkedProfile.contact_number_secondary}</span></p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action Buttons */}
          <div className="p-4 bg-[#F8FAF9] border-t border-[#E2E8F0] flex items-center justify-end gap-3 shrink-0">
            {step === 'form' ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 h-11 rounded-xl text-sm font-semibold text-[#5C7168] hover:text-[#0D2119] cursor-pointer"
                >
                  {t('cancel', defaultLang)}
                </button>
                <button
                  type="submit"
                  form="add-kid-form"
                  className="px-6 h-11 rounded-xl bg-[#1B4332] hover:bg-[#012D1D] active:scale-95 text-white text-sm font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
                >
                  <span>Next: Scan QR Sticker</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full h-11 rounded-xl bg-[#1B4332] hover:bg-[#012D1D] active:scale-95 text-white text-sm font-bold shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Done</span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};
