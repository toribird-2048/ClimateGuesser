let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  durationSec: number,
  startOffsetSec = 0,
  type: OscillatorType = 'sine',
  peakGain = 0.09
) {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime + startOffsetSec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(peakGain, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + durationSec + 0.02);
}

export function playClickSound(muted: boolean) {
  if (muted) return;
  playTone(540, 0.05, 0, 'triangle', 0.045);
}

export function playHintSound(muted: boolean) {
  if (muted) return;
  playTone(620, 0.09, 0, 'sine', 0.06);
  playTone(830, 0.12, 0.07, 'sine', 0.055);
}

export function playExactMatchSound(muted: boolean) {
  if (muted) return;
  playTone(523.25, 0.14, 0, 'sine', 0.08);
  playTone(659.25, 0.14, 0.08, 'sine', 0.08);
  playTone(783.99, 0.28, 0.16, 'sine', 0.09);
}

export function playGroupMatchSound(muted: boolean) {
  if (muted) return;
  playTone(440, 0.14, 0, 'triangle', 0.07);
  playTone(554.37, 0.22, 0.1, 'triangle', 0.07);
}

export function playMissSound(muted: boolean) {
  if (muted) return;
  playTone(260, 0.16, 0, 'sawtooth', 0.045);
  playTone(196, 0.26, 0.11, 'sawtooth', 0.04);
}
