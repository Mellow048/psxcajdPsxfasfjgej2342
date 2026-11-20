import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validate } from "../src/schema.js";
import { SfxEngine } from "../src/sfxEngine.js";
const demo = JSON.parse(readFileSync("episodes/chip-math.json"));
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
