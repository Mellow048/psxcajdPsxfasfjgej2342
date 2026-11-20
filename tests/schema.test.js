import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validate } from "../src/schema.js";
import { MODELS, TEXTURES } from "../src/catalog.js";
import { CAMERAS } from "../src/config.js";
const demo = JSON.parse(
  fs.readFileSync(
    new URL("../episodes/ghost-in-the-glass.json", import.meta.url),
  ),
);
test("shipped episode covers all seven camera modes and exactly 1,350 ticks", () => {
  validate(demo);
  assert.equal(
    demo.scenes.reduce((n, s) => n + 60 * s.duration, 0),
    1350,
  );
  assert.deepEqual(
    new Set(demo.scenes.map((s) => s.cameraPreset)),
    new Set(CAMERAS),
  );
  assert.ok(fs.existsSync(demo.narration));
});
for (const [name, mutate] of Object.entries({
  duration: (s) => (s.duration = 1.9),
  fractionalTick: (s) => (s.duration = 2.111),
  wrongKey: (s) => (s.camera = "zoom"),
  focus: (s) => (s.focus = "missing"),
  captionOrder: (s) => s.captions.reverse(),
  unsafeAsset: (s) => (s.actors[0].asset = "__proto__"),
  clip: (s) => (s.actors[0].clip = { name: "Imaginary" }),
  badLabel: (s) => (s.actors[0].text = "Oops"),
  longCaption: (s) => (s.captions[0].text = "one two three four five six"),
  dupe: (s) => s.props.push(s.actors[0]),
  nonVector: (s) => (s.focus = [1, 2]),
  sfx: (s) => (s.sfx = "missing"),
  badMotion: (s) => (s.actors[0].motion = "walk"),
})) {
  test("rejects " + name, () => {
    const d = structuredClone(demo);
    mutate(d.scenes[0]);
    assert.throws(() => validate(d), /scene 1/);
  });
}
test("all indexed paths and texture filenames exist on disk", () => {
  for (const p of [...TEXTURES, ...Object.values(MODELS).map((m) => m.path)])
    assert.ok(fs.existsSync(p), p);
});
test("rig inventory records actual parents, imported clips and empty FBX exclusion", () => {
  const { models } = JSON.parse(fs.readFileSync("docs/asset-inventory.json"));
  assert.equal(
    models[MODELS["male.character_01"].path].bones["mixamorig:Spine"],
    "mixamorig:Hips",
  );
  assert.equal(
    models[MODELS["halloween.character_ghost"].path].bones.Head,
    "Neck",
  );
  assert.deepEqual(MODELS["male.character_01"].clips, ["mixamo.com"]);
  assert.ok(!MODELS["quequis_house.quequis_house_props.fbx"]);
});
