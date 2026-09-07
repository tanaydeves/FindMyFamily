import React, { useState } from 'react';
import { Users, Plus, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onComplete: (circleId: string) => void;
}

export const CircleSetupScreen: React.FC<Props> = ({ onComplete }) => {
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [inputCode, setInputCode] = useState('');

  const handleCreate = () => {
    // Generate a random 6-character code
    const newCode = `FMF-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    onComplete(newCode);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    onComplete(inputCode.trim().toUpperCase());
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#F8FAF9] text-[#0D2119]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm flex flex-col items-center text-center space-y-8"
      >
        <div className="w-20 h-20 bg-[#1B4332]/10 rounded-full flex items-center justify-center">
          <Users className="w-10 h-10 text-[#1B4332]" />
        </div>
        
        <div>
          <h1 className="headline-lg font-bold mb-2">Family Circle</h1>
          <p className="body-md text-[#5C7168]">
            To stay connected, you need to join a circle.
          </p>
        </div>

        {!showJoinInput ? (
          <div className="w-full flex flex-col gap-4">
            <button
              onClick={handleCreate}
              className="w-full flex items-center justify-center gap-3 px-6 h-14 rounded-xl bg-[#1B4332] text-white font-bold hover:bg-[#012D1D] transition-all shadow-md"
            >
              <Plus className="w-5 h-5" />
              <span>Create a Circle for your Family</span>
            </button>
            <button
              onClick={() => setShowJoinInput(true)}
              className="w-full flex items-center justify-center gap-3 px-6 h-14 rounded-xl bg-white border border-[#E2E8F0] text-[#0D2119] font-bold hover:bg-[#F8FAF9] hover:border-[#CBD5E1] transition-all"
            >
              <Users className="w-5 h-5 text-[#5C7168]" />
              <span>Join your Family's Circle</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="w-full flex flex-col gap-4">
            <label className="text-left font-semibold text-[#0D2119]">Enter Circle Code:</label>
            <input
              type="text"
              required
              autoFocus
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="e.g. FMF-A1B2"
              className="w-full px-4 py-4 rounded-xl bg-[#FFFFFF] border border-[#E2E8F0] focus:border-[#1B4332] text-[#0D2119] text-center text-lg font-mono uppercase tracking-wider outline-none"
            />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-6 h-14 rounded-xl bg-[#1B4332] text-white font-bold hover:bg-[#012D1D] transition-all shadow-md"
            >
              <span>Join Circle</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setShowJoinInput(false)}
              className="mt-2 text-[#5C7168] font-semibold hover:text-[#0D2119] underline text-sm"
            >
              Back to options
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};
