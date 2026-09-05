import React, { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { LanguageCode } from '../types';

interface Props {
  currentLang: LanguageCode;
  onSelectLang: (lang: LanguageCode) => void;
  onBack?: () => void;
}

const LANGUAGES: { code: LanguageCode; label: string; native: string; desc: string }[] = [
  { code: 'en', label: 'English', native: 'English', desc: 'Primary navigation and alerts' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी', desc: 'कुंभ मेला एवं भीड़ में सुगम उपयोग' },
  { code: 'mr', label: 'Marathi', native: 'मराठी', desc: 'गर्दीमध्ये सुलभ दिशानिर्देश' },
];

export const LanguageSelectScreen: React.FC<Props> = ({
  currentLang,
  onSelectLang,
  onBack,
}) => {
  const [selected, setSelected] = useState<LanguageCode>(currentLang);

  const handleSave = () => {
    onSelectLang(selected);
  };

  return (
    <div
      id="language-select-screen"
      className="flex flex-col justify-between min-h-[580px] h-full w-full bg-[#F8FAF9] text-[#0D2119] select-none font-sans"
    >
      {/* Setup Top Bar */}
      <header className="h-16 px-6 border-b border-[#E2E8F0] flex items-center gap-3 shrink-0 bg-[#F8FAF9]">
        {onBack && (
          <button
            onClick={onBack}
            className="w-10 h-10 -ml-2 rounded-xl flex items-center justify-center text-[#0D2119] hover:bg-[#E2E8F0]/60 active:scale-95 transition-all cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <span className="font-semibold text-lg text-[#0D2119]">Setup</span>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
        <h1 className="headline-lg text-[#0D2119] mb-2">Choose Language</h1>
        <p className="body-md text-[#5C7168] mb-6">
          Select the language for directional compass hints, audio alerts, and emergency notifications.
        </p>

        <div className="space-y-3.5">
          {LANGUAGES.map((lang, idx) => {
            const isSelected = selected === lang.code;

            return (
              <motion.div
                key={lang.code}
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => setSelected(lang.code)}
                className={`p-4 rounded-xl flex items-center justify-between gap-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#FFFFFF] border-[1.5px] border-[#1B4332] shadow-xs'
                    : 'bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#CBD5E1]'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="body-lg font-bold text-[#0D2119]">{lang.native}</span>
                    <span className="label-sm text-[#5C7168]">({lang.label})</span>
                  </div>
                  <div className="body-md text-sm text-[#5C7168] mt-0.5">{lang.desc}</div>
                </div>

                {/* Radio Indicator */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                    isSelected ? 'border-[2px] border-[#1B4332]' : 'border border-[#CBD5E1]'
                  }`}
                >
                  {isSelected && <div className="w-3 h-3 rounded-full bg-[#1B4332]" />}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Fixed Bottom Primary Button */}
      <div className="p-6 bg-[#F8FAF9] border-t border-[#E2E8F0] shrink-0">
        <button
          id="btn-save-language"
          onClick={handleSave}
          className="w-full h-14 rounded-lg bg-[#1B4332] hover:bg-[#012D1D] active:scale-[0.98] text-white label-lg text-base font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center"
        >
          Save Preferences ✓
        </button>
      </div>
    </div>
  );
};
