import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validate } from "../src/schema.js";
import { SfxEngine } from "../src/sfxEngine.js";
const demo = JSON.parse(readFileSync("episodes/escalation-lab.json"));
test("story demo and TV variant validate; bounds and topology fail during authoring", () => {
  validate(demo);
  const tv = structuredClone(demo.shots[1]);
  tv.events[0].show_tv = tv.events[0].show_phone;
  delete tv.events[0].show_phone;
  validate([tv]);
  for (const [i, change] of [
    [0, (e) => (e.show_phone.balance = 3)],
    [1, (e) => delete e.sfx],
    [2, (e) => (e.spawn_mass.count = 4097)],
    [2, (e) => (e.spawn_mass.count = 1.5)],
    [3, (e) => e.show_whiteboard.edges.push(["up", "typo"])],
    [3, (e) => (e.show_whiteboard.nodes[0].x = -1)],
    [4, (e) => (e.show_graph.end = 0)],
    [4, (e) => (e.show_graph.drawTime = 10)],
    [1, (e) => (e.duration = 9)],
    [0, (e) => (e.spawn_mass = {})],
  ]) {
    const s = structuredClone(demo.shots[i]);
    change(s.events[0]);
    assert.throws(() => validate([s]), /shot 1/);
  }
});
test("story cues are scheduled at event onset, never replayed by a late seek", () => {
  const a = new SfxEngine(),
    heard = [];
  a.ctx = { currentTime: 7 };
  a.tone = (key, t) => heard.push([key, t]);
  a.start({ shots: [demo.shots[3]] }, 0);
  assert.deepEqual(heard, [
    ["click", 7],
    ["whoosh_fast", 7],
    ["whoosh_fast", 7.2],
  ]);
  heard.length = 0;
  a.start({ shots: [demo.shots[3]] }, 0.3);
  assert.deepEqual(heard, []);
});
test("casino POV: grounded tower and buzzer precisely on the last loss", () => {
  const e = validate(JSON.parse(readFileSync("episodes/chip-math.json")));
  assert.ok(
    e.shots.every(
      (s) => s.stage === "casino_room" && s.pov.eye && s.cameraMotion,
    ),
  );
  const tower = e.shots[2].events[0];
  assert.equal(tower.position[1], 0.9);
  assert.equal(tower.spawn_mass.count, 1000);
  const s = e.shots[3],
    ev = s.events[0],
    g = ev.show_graph;
  assert.equal(g.start - g.end, 10 * (2 ** g.lossStreak - 1));
  const a = new SfxEngine(),
    cues = [];
  a.ctx = { currentTime: 0 };
  a.tone = (key, when) => cues.push([key, when]);
  a.start({ shots: [s] }, 0.5);
  assert.deepEqual(cues, [["buzzer", ev.time + g.drawTime - 0.5]]);
});
test("roulette loss before the call; payoff has a voiced tail and a clean loop", () => {
  const e = validate(
    JSON.parse(readFileSync("episodes/casino_martingale.json")),
  );
  const [loss, call, escalation, tower, crash] = e.shots;
  assert.equal(e.shots.length, 5);
  assert.deepEqual(
    e.shots.map((s) => s.duration),
    [6, 11.2, 11.1, 8.7, 10.3],
  );
  assert.deepEqual(
    escalation.events.map((ev) => ev.spawn_mass.count),
    [20, 40, 80],
  );
  assert.throws(() => validate({ ...e, pacing: undefined }), /2–3.5s/);
  assert.deepEqual(
    loss.events.map((x) => x.type),
    ["sound"],
  );
  assert.equal(loss.events[0].sfx, "buzzer");
  assert.equal(call.events[0].show_phone.avatar, "guru");
  assert.equal(tower.events[0].spawn_mass.count, 1000);
  assert.equal(crash.events[0].show_graph.end, 0);
  assert.equal(crash.captions.at(-1).text, "exactly why…");
  const wav = readFileSync(e.voiceover);
  const data = wav.indexOf("data", 12, "ascii");
  const seconds = wav.readUInt32LE(data + 4) / wav.readUInt32LE(28);
  assert.ok(
    seconds <= e.shots.reduce((n, s) => n + s.duration, 0) && seconds > 47,
  );
  assert.ok(crash.duration - crash.captions.at(-1).time > 0.8);
});
