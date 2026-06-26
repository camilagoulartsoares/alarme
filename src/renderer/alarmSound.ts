let audioCtx: AudioContext | null = null;
let oscillators: OscillatorNode[] = [];
let gain: GainNode | null = null;
let intervalId: number | null = null;

export function startLoudAlarm() {
  stopLoudAlarm();

  try {
    audioCtx = new window.AudioContext();

    gain = audioCtx.createGain();
    gain.gain.value = 0.95;
    gain.connect(audioCtx.destination);

    const frequencies = [900, 1400, 2100, 2900, 3700, 4500];

    oscillators = frequencies.map((freq, index) => {
      const osc = audioCtx!.createOscillator();

      osc.type = index % 2 === 0 ? "square" : "sawtooth";
      osc.frequency.value = freq;

      osc.connect(gain!);
      osc.start();

      return osc;
    });

    let step = 0;

    intervalId = window.setInterval(() => {
      if (!audioCtx || !gain) return;

      step++;

      const now = audioCtx.currentTime;
      const pattern = step % 6;

      const multiplier =
        pattern === 0
          ? 1
          : pattern === 1
          ? 1.8
          : pattern === 2
          ? 0.7
          : pattern === 3
          ? 2.4
          : pattern === 4
          ? 1.2
          : 3;

      oscillators.forEach((osc, index) => {
        const base = frequencies[index];
        osc.frequency.setValueAtTime(base * multiplier, now);
      });

      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(1, now + 0.02);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.09);
    }, 110);
  } catch (error) {
    console.error("Erro ao iniciar o alarme:", error);
  }
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
    try {
      audioCtx.close();
    } catch {}

    audioCtx = null;
  }
}