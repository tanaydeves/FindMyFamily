import { LanguageCode } from '../types';

class AudioHapticsService {
  private ctx: AudioContext | null = null;
  private sirenInterval: any = null;
  private isSirenPlaying = false;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Play pairing success sound (two pleasant rising tones)
  playPairSuccess() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.45);

      this.triggerHaptic([50, 50, 100]);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Play radar ping (sonar blip)
  playRadarPing(distanceMeters = 50) {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Higher pitch if closer
      const freq = Math.max(400, Math.min(1800, 2000 - distanceMeters * 2));
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // Audio safety
    }
  }

  // Start SOS emergency siren
  startDistressSiren() {
    if (this.isSirenPlaying) return;
    this.isSirenPlaying = true;

    const playTone = (isHigh: boolean) => {
      try {
        const ctx = this.getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(isHigh ? 960 : 640, now);
        osc.frequency.linearRampToValueAtTime(isHigh ? 1080 : 540, now + 0.35);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.38);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.4);
      } catch {
        // ignore
      }
    };

    let step = 0;
    playTone(true);
    this.triggerHaptic([200, 100, 200, 100, 400]);

    this.sirenInterval = setInterval(() => {
      step++;
      playTone(step % 2 === 0);
      this.triggerHaptic([150, 80, 150]);
    }, 450);
  }

  // Stop SOS siren
  stopDistressSiren() {
    this.isSirenPlaying = false;
    if (this.sirenInterval) {
      clearInterval(this.sirenInterval);
      this.sirenInterval = null;
    }
  }

  // Vibration feedback
  triggerHaptic(pattern: number | number[] = 50) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // Safe catch
      }
    }
  }

  // Multilingual Speech Guidance (English, Hindi, Marathi)
  speakGuidance(memberName: string, distanceMeters: number, adviceText: string, lang: LanguageCode) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      window.speechSynthesis.cancel(); // Stop any pending speech

      let phrase = '';
      let langCode = 'en-US';

      if (lang === 'hi') {
        langCode = 'hi-IN';
        phrase = `${memberName} ${distanceMeters} मीटर की दूरी पर हैं। ${adviceText}`;
      } else if (lang === 'mr') {
        langCode = 'mr-IN';
        phrase = `${memberName} ${distanceMeters} मीटर अंतरावर आहेत. ${adviceText}`;
      } else {
        langCode = 'en-US';
        phrase = `${memberName} is ${distanceMeters} meters away. ${adviceText}`;
      }

      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = langCode;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Select voice if available
      const voices = window.speechSynthesis.getVoices();
      const matchedVoice = voices.find((v) => v.lang.startsWith(langCode.slice(0, 2)));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis fallback
    }
  }
}

export const audioHaptics = new AudioHapticsService();
