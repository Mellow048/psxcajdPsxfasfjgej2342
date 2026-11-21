import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validate } from "../src/schema.js";
import { fanSample, step } from "../src/fanSampling.js";
const episode = JSON.parse(readFileSync("episodes/fan-frames.json"));
test("frame inspection requires a known playback mode on the correct stage", () => {
  validate(episode);
  for (const patch of [{ fanView: "rewind" }, { stage: "backstage" }]) {
    const e = structuredClone(episode);
    Object.assign(e.shots[0], patch);
    assert.throws(() => validate(e), /fanView/);
  }
});
test("the phone holds each sample, advancing clockwise 84°, not backwards 6°", () => {
  for (let i = 0; i < 120; i++) {
    const angle = (n) => fanSample("record", 0, n / 30).angle;
    assert.equal(angle(i + 0.5), angle(i));
    assert.equal(angle(i + 1) - angle(i), 84);
  }
  assert.equal(step - 360 / 4, -6);
  assert.equal(
    fanSample("advance", 3, 0).angle,
    fanSample("neighbor", 0, 20).angle,
  );
  assert.equal(fanSample("compare", 0.7, 0).angle, step);
  assert.equal(fanSample("compare", 0.7, 0).dot, false);
});
