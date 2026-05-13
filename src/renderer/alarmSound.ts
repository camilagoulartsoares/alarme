let audioCtx: AudioContext | null = null;
let oscillators: OscillatorNode[] = [];
let gain: GainNode | null = null;
let masterGain: GainNode | null = null;
let intervalId: number | null = null;

export function startLoudAlarm() {
  stopLoudAlarm();

  audioCtx = new AudioContext();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 6;

  gain = audioCtx.createGain();
  gain.gain.value = 5;

  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -12;
  compressor.knee.value = 30;
  compressor.ratio.value = 20;
  compressor.attack.value = 0;
  compressor.release.value = 0.08;

  gain.connect(compressor);
  compressor.connect(masterGain);
  masterGain.connect(audioCtx.destination);

  const frequencies = [
    2000,
    2600,
    3200,
    3800,
    4500,
    5200,
  ];

  oscillators = [];

  frequencies.forEach((freq, index) => {
    const osc1 = audioCtx!.createOscillator();
    osc1.type = index % 2 === 0 ? "square" : "sawtooth";
    osc1.frequency.value = freq;
    osc1.connect(gain!);
    osc1.start();
    oscillators.push(osc1);

    const osc2 = audioCtx!.createOscillator();
    osc2.type = "square";
    osc2.frequency.value = freq * 1.025;
    osc2.connect(gain!);
    osc2.start();
    oscillators.push(osc2);
  });

  let high = false;

  intervalId = window.setInterval(() => {
    if (!audioCtx || !gain || !masterGain) return;

    high = !high;

    oscillators.forEach((osc, index) => {
      const base = frequencies[index % frequencies.length];

      osc.frequency.setValueAtTime(
        high ? base * 1.45 : base * 0.92,
        audioCtx.currentTime
      );
    });

    gain.gain.setValueAtTime(high ? 6 : 2.8, audioCtx.currentTime);
    masterGain.gain.setValueAtTime(high ? 7 : 3.5, audioCtx.currentTime);
  }, 38);
}

export function stopLoudAlarm() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }

  oscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {}
  });

  oscillators = [];

  if (gain) {
    try {
      gain.disconnect();
    } catch {}
    gain = null;
  }

  if (masterGain) {
    try {
      masterGain.disconnect();
    } catch {}
    masterGain = null;
  }

  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}