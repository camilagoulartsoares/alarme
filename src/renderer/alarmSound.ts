let audioCtx: AudioContext | null = null;
let oscillators: OscillatorNode[] = [];
let gain: GainNode | null = null;
let intervalId: number | null = null;

export function startLoudAlarm() {
  stopLoudAlarm();

  audioCtx = new AudioContext();

  gain = audioCtx.createGain();
  gain.gain.value = 3.5;
  gain.connect(audioCtx.destination);

  const frequencies = [1200, 1800, 2400, 3200, 4200];

  oscillators = frequencies.map((freq, index) => {
    const osc = audioCtx!.createOscillator();

    osc.type = index % 2 === 0 ? "square" : "sawtooth";
    osc.frequency.value = freq;

    osc.connect(gain!);
    osc.start();

    return osc;
  });

  let high = false;

  intervalId = window.setInterval(() => {
    if (!audioCtx || !gain) return;

    high = !high;

    oscillators.forEach((osc, index) => {
      osc.frequency.setValueAtTime(
        high ? frequencies[index] * 1.65 : frequencies[index],
        audioCtx!.currentTime
      );
    });

    gain.gain.setValueAtTime(high ? 3.5 : 1.4, audioCtx.currentTime);
  }, 80);
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

  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
  }
}