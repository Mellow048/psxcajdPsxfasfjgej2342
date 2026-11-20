import test from "node:test";
import assert from "node:assert/strict";
import { SfxEngine } from "../src/sfxEngine.js";
test("one cue at every hard cut, same scheduler for preview and offline audio", () => {
  const audio = new SfxEngine(),
    played = [];
  audio.ctx = { currentTime: 10 };
  audio.tone = (k, t) => played.push([k, t]);
  const episode = {
    shots: [
      { duration: 2, sfx: "click" },
      { duration: 3.5, sfx: "whoosh" },
      { duration: 2.5, sfx: "riser" },
    ],
  };
  audio.start(episode, 0);
  assert.deepEqual(played, [
    ["click", 10],
    ["whoosh", 12],
    ["riser", 15.5],
  ]);
  played.length = 0;
  audio.start(episode, 2);
  assert.deepEqual(played, [
    ["whoosh", 10],
    ["riser", 13.5],
  ]);
  played.length = 0;
  audio.start(episode, 2.5);
  assert.deepEqual(played, [["riser", 13]]);
});
