import { EpisodeRunner } from "../src/episodeRunner.js";
const r = new EpisodeRunner(document.getElementById("testcanvas")),
  report = document.getElementById("result");
const assert = (test, what) => {
  if (!test) throw Error(what);
  report.textContent += "\nPASS " + what;
};
const e = await (await fetch("episodes/ghost-in-the-glass.json")).json();
try {
  await r.load(e);
  r.seek(3.1);
  const image = r.ctx.canvas.toDataURL();
  r.seek(7.5);
  assert(r.index === 3, "cut starts on the exact tick");
  r.seek(3.1);
  assert(
    r.ctx.canvas.toDataURL() === image,
    "revisiting a time reproduces identical pixels",
  );
  const shot = {
    ...e.shots[0],
    stage: "house_corner",
    actors: [
      {
        id: "actor",
        asset: "male.character_01",
        motion: "pointing",
        clip: { asset: "female.character_female_02", name: "mixamo.com" },
      },
    ],
    props: [
      {
        id: "cup",
        asset: "quequis_house.quequis_house_props",
        mesh: "plastic_cups.005",
        height: 0.25,
        position: [0.5, 0.9, 0],
        motion: "float_spin",
      },
      {
        id: "tag",
        asset: "label",
        height: 0.2,
        text: "TEST",
        motion: "pop_in",
      },
    ],
  };
  const sample = { ...e, shots: [shot] };
  await r.load(sample);
  r.seek(0.5);
  assert(
    r.frames[0].items[0].mixer.stats.actions.inUse === 1,
    "retargeted donor clip is playing on target skeleton",
  );
  const track = r.frames[0].items[0].mixer._actions[0].getClip().tracks;
  assert(
    track.length > 0 && track.every((t) => t.name.endsWith(".quaternion")),
    "no root translations from donor",
  );
  const memory = () => JSON.stringify(r.pipeline.renderer.info.memory);
  const before = memory();
  await r.load(sample);
  r.seek(0.5);
  assert(
    memory() === before,
    "GPU geometry and texture counts stable after reload",
  );
  const broken = structuredClone(sample);
  broken.shots[0].props[0].mesh = "not in this pack";
  let failed = false;
  try {
    await r.load(broken);
  } catch {
    failed = true;
  }
  assert(
    failed && r.episode === sample,
    "failed asset load keeps previous episode",
  );
  r.seek(1);
  assert(memory() === before, "failed reload releases staged resources");
  // Deliberately repeat the setup: verify a physical lens cut, not just the shot counter.
  const host = { id: "host", asset: "male.character_01" };
  const repeat = {
    ...e.shots[0],
    actors: [host],
    props: [],
    focus: "host",
    cameraPreset: "macro_closeup",
  };
  await r.load([
    repeat,
    { ...repeat, actors: [{ ...host, motion: "pointing" }] },
  ]);
  r.seek(0);
  const idle = r.frames[0].items[0],
    arm = idle.node.getObjectByName("mixamorigRightArm");
  const initial = arm.quaternion.clone();
  r.seek(0.45);
  assert(
    initial.angleTo(arm.quaternion) > 0.01,
    "omitting action animates the arm, not just the actor root",
  );
  r.seek(repeat.duration - 1 / 60);
  const fov = r.director.camera.fov;
  r.seek(repeat.duration);
  const active = r.frames[1].items[0];
  assert(
    r.index === 1 && r.director.camera.fov !== fov,
    "identical presets still hard-cut on the boundary",
  );
  assert(
    active.mixer !== idle.mixer &&
      active.mixer.time === 0 &&
      active.mixer._actions[0].getClip().name === "pointing",
    "new shot starts a fresh action at time zero",
  );
  assert(
    initial.angleTo(
      active.node.getObjectByName("mixamorigRightArm").quaternion,
    ) > 0.2,
    "pointing changes the joint pose on the very first frame",
  );
  assert(
    r.pipeline.target.width === 180 && r.pipeline.target.height === 320,
    "low-res PSX buffer in use",
  );
  report.textContent += "\nAll checks passed.";
  report.dataset.result = "pass";
} catch (e) {
  report.textContent += "\nFAIL " + e.message;
  report.dataset.result = "fail";
} finally {
  r.dispose();
}
