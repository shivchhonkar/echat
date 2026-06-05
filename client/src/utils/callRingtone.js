let audioCtx = null;
let masterGain = null;
let ringTimer = null;
let activeOscillators = [];

function stopOscillators() {
  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
    } catch {
      // already stopped
    }
  });
  activeOscillators = [];
}

function playTonePair() {
  if (!audioCtx || !masterGain) return;

  const now = audioCtx.currentTime;
  const toneDuration = 0.22;
  const gap = 0.28;

  [440, 480].forEach((frequency, index) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now + index * gap);
    gain.gain.exponentialRampToValueAtTime(0.9, now + index * gap + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * gap + toneDuration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(now + index * gap);
    osc.stop(now + index * gap + toneDuration + 0.02);
    activeOscillators.push(osc);
  });
}

export async function startIncomingCallRingtone() {
  stopIncomingCallRingtone();

  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    await audioCtx.resume().catch(() => null);
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.12;
    masterGain.connect(audioCtx.destination);

    playTonePair();
    ringTimer = window.setInterval(playTonePair, 2200);
  } catch {
    // audio may be blocked until user gesture
  }
}

export function stopIncomingCallRingtone() {
  if (ringTimer) {
    window.clearInterval(ringTimer);
    ringTimer = null;
  }
  stopOscillators();
  if (audioCtx) {
    audioCtx.close().catch(() => null);
    audioCtx = null;
  }
  masterGain = null;
}
