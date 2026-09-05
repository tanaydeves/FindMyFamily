import React, { useEffect } from 'react';
import { Compass } from 'lucide-react';
import { motion } from 'motion/react';
import { LanguageCode } from '../types';

interface Props {
  lang?: LanguageCode;
  onFinish: () => void;
}

export const SplashScreen: React.FC<Props> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      id="splash-screen"
      className="flex flex-col items-center justify-between min-h-[580px] h-full w-full bg-[#1B4332] text-white p-8 select-none text-center relative overflow-hidden"
    >
      {/* Centered Brand Content */}
      <div className="my-auto flex flex-col items-center z-10">
        {/* 100px Centered White Circle */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-[100px] h-[100px] rounded-full bg-white flex items-center justify-center shadow-lg mb-6 shrink-0"
        >
          <Compass className="w-14 h-14 text-[#4ADE80] stroke-[2.4]" />
        </motion.div>

        {/* Screen Title in headline-lg */}
        <motion.h1
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="headline-lg text-white mb-2"
        >
          Find My Family
        </motion.h1>

        {/* Subtitle in muted white / 60% */}
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="body-md text-white/70 max-w-xs font-normal"
        >
          Connecting you to what matters.
        </motion.p>
      </div>

      {/* Bottom Loading Arc & Caps Label */}
      <div className="w-full flex flex-col items-center justify-center space-y-3 pb-4 z-10">
        <svg
          className="animate-spin h-7 w-7 text-[#4ADE80]"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path
            className="opacity-90"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            fill="currentColor"
          />
        </svg>
        <span className="label-sm text-[#A5D0B9] tracking-[0.2em] uppercase font-['Inter'] font-semibold">
          INITIALIZING SECURE LINK...
        </span>
      </div>
    </div>
  );
};
