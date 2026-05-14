let audioCtx: AudioContext | null = null;
let oscillators: OscillatorNode[] = [];
let gain: GainNode | null = null;
let masterGain: GainNode | null = null;
let intervalId: number | null = null;

export function startLoudAlarm() {
  stopLoudAlarm();

  audioCtx = new AudioContext();

  masterGain = audioCtx.createGain();
  masterGain.gain.value = 10;

  gain = audioCtx.createGain();
  gain.gain.value = 8;

  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 10;
  compressor.ratio.value = 30;
  compressor.attack.value = 0;
  compressor.release.value = 0.03;

  gain.connect(compressor);
  compressor.connect(masterGain);
  masterGain.connect(audioCtx.destination);

  const frequencies = [
    880,
    1200,
    1800,
    2400,
    3100,
    3900,
    4700,
    5600,
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
    osc2.frequency.value = freq * 1.07;
    osc2.connect(gain!);
    osc2.start();
    oscillators.push(osc2);

    const osc3 = audioCtx!.createOscillator();
    osc3.type = "triangle";
    osc3.frequency.value = freq * 0.54;
    osc3.connect(gain!);
    osc3.start();
    oscillators.push(osc3);
  });

  let step = 0;

  intervalId = window.setInterval(() => {
    if (!audioCtx || !gain || !masterGain) return;

    step++;

    oscillators.forEach((osc, index) => {
      const base = frequencies[index % frequencies.length];

      const pattern = step % 4;

      const multiplier =
        pattern === 0
          ? 0.72
          : pattern === 1
          ? 1.45
          : pattern === 2
          ? 2.1
          : 0.95;

      osc.frequency.setValueAtTime(
        base * multiplier,
        audioCtx.currentTime
      );
    });

    const pulse = step % 2 === 0;

    gain.gain.setValueAtTime(pulse ? 9 : 4.5, audioCtx.currentTime);
    masterGain.gain.setValueAtTime(pulse ? 12 : 6, audioCtx.currentTime);
  }, 45);
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