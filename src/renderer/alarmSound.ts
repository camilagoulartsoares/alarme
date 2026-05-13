let audioCtx: AudioContext | null = null;
let oscillators: OscillatorNode[] = [];
let gain: GainNode | null = null;
let masterGain: GainNode | null = null;
let intervalId: number | null = null;

export function startLoudAlarm() {
  stopLoudAlarm();

  audioCtx = new AudioContext();

  // ganho principal absurdo
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 5;

  // ganho secundário
  gain = audioCtx.createGain();
  gain.gain.value = 4;

  // compressor deixa mais "socando"
  const compressor = audioCtx.createDynamicsCompressor();

  compressor.threshold.value = -10;
  compressor.knee.value = 40;
  compressor.ratio.value = 20;
  compressor.attack.value = 0;
  compressor.release.value = 0.1;

  gain.connect(compressor);
  compressor.connect(masterGain);
  masterGain.connect(audioCtx.destination);

  // frequências extremamente irritantes
  const frequencies = [
    900,
    1400,
    1900,
    2400,
    3200,
    4100,
    5200,
  ];

  oscillators = [];

  frequencies.forEach((freq, index) => {
    // primeira onda
    const osc1 = audioCtx!.createOscillator();

    osc1.type =
      index % 3 === 0
        ? "square"
        : index % 2 === 0
        ? "sawtooth"
        : "triangle";

    osc1.frequency.value = freq;

    osc1.connect(gain!);

    osc1.start();

    oscillators.push(osc1);

    // segunda onda desafinada
    const osc2 = audioCtx!.createOscillator();

    osc2.type = "square";

    osc2.frequency.value = freq * 1.015;

    osc2.connect(gain!);

    osc2.start();

    oscillators.push(osc2);
  });

  let high = false;

  intervalId = window.setInterval(() => {
    if (!audioCtx || !gain || !masterGain) return;

    high = !high;

    oscillators.forEach((osc, index) => {
      const base =
        frequencies[index % frequencies.length];

      osc.frequency.setValueAtTime(
        high ? base * 1.8 : base,
        audioCtx.currentTime
      );
    });

    // pulsação extremamente agressiva
    gain.gain.setValueAtTime(
      high ? 5 : 2.5,
      audioCtx.currentTime
    );

    masterGain.gain.setValueAtTime(
      high ? 6 : 3,
      audioCtx.currentTime
    );
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