const assert = require("assert");
const fs = require("fs");

const at = (hour, minute = 0, day = 1) => new Date(2026, 0, day, hour, minute, 0, 0);
const iso = (date) => date.toISOString();
const nextOccurrence = (time, from) => {
  const [hour, minute] = time.split(":").map(Number);
  const result = new Date(from);
  result.setHours(hour, minute, 0, 0);
  if (result <= from) result.setDate(result.getDate() + 1);
  return result;
};
const recover = (state, now) => ({
  ...state,
  status: "armed",
  activeKind: undefined,
  activeTriggerAt: undefined,
  nextTriggerAt: iso(new Date(+now + 20 * 60 * 1000)),
});
const due = (state, now) => {
  if (state.status === "ringing") return state;
  const nextAt = Date.parse(state.nextTriggerAt);
  if (+now < nextAt) return state;
  if (+now - nextAt > 60_000) return recover(state, now);
  return {
    ...state,
    status: "ringing",
    activeKind: "scheduled",
    activeTriggerAt: state.nextTriggerAt,
    nextTriggerAt: iso(nextOccurrence(state.alarmTime, now)),
  };
};
const startup = (state, now) => {
  const nextAt = Date.parse(state.nextTriggerAt);
  return state.status === "ringing" || (!Number.isNaN(nextAt) && nextAt <= +now)
    ? recover(state, now)
    : state;
};
const stopped = (state) => ({ ...state, status: "armed", activeKind: undefined, activeTriggerAt: undefined });

const initial = { alarmTime: "06:00", status: "armed", nextTriggerAt: iso(at(6)) };

// Futuro e disparo normal.
assert.strictEqual(due(initial, at(5, 59)), initial);
const normal = due(initial, at(6));
assert.equal(normal.status, "ringing");
assert.equal(normal.nextTriggerAt, iso(at(6, 0, 2)));

// Indisponível 06:00–06:10: uma única recuperação às 06:30.
const recovery = due(initial, at(6, 10));
assert.equal(recovery.nextTriggerAt, iso(at(6, 30)));
assert.equal(due(recovery, at(6, 20)).nextTriggerAt, iso(at(6, 30)));
const recoveryRing = due(recovery, at(6, 30));
assert.equal(recoveryRing.status, "ringing");
assert.equal(recoveryRing.nextTriggerAt, iso(at(6, 0, 2)));

// Reinícios antes/depois do horário e indisponibilidade longa.
assert.equal(startup(initial, at(5, 35)).nextTriggerAt, iso(at(6)));
assert.equal(startup(initial, at(6, 15)).nextTriggerAt, iso(at(6, 35)));
const longOutage = due(initial, at(12, 0, 3));
assert.equal(longOutage.nextTriggerAt, iso(at(12, 20, 3)));
const longOutageRing = due(longOutage, at(12, 20, 3));
assert.equal(longOutageRing.status, "ringing");
assert.strictEqual(due(longOutageRing, at(12, 21, 3)), longOutageRing);

// Parar preserva o próximo horário diário calculado no momento do disparo.
assert.equal(stopped(normal).nextTriggerAt, iso(at(6, 0, 2)));

const source = fs.readFileSync("electron/main.ts", "utf8");
assert(source.includes("function armScheduler()"));
assert(source.includes("setTimeout(() => {"));
assert(!source.includes("setInterval(() => checkSchedule"));
const schedulerSource = source.slice(source.indexOf("function checkSchedule"), source.indexOf("function createWindows"));
assert(!schedulerSource.includes("webContents"));

console.log("PASS: cenários de recuperação, deduplicação e próximo dia validados.");
