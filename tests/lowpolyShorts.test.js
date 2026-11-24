import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { validate } from "../src/schema.js";
import { auditViralEpisode } from "../scripts/verify-viral.mjs";
import { CAMERAS, SCENE_PRESETS, ASSET_MANIFEST } from "../src/config.js";

test("Low Poly Shorts config includes new cameras, stage, and builtin/custom props", () => {
  assert.ok(CAMERAS.includes("snap_zoom_in"));
  assert.ok(CAMERAS.includes("high_angle_follow"));
  assert.ok("street_day" in SCENE_PRESETS);
  for (const key of ["wooden_puppet", "xray_detector", "xray_monitor", "custom"]) {
    assert.ok(key in ASSET_MANIFEST, `missing builtin asset: ${key}`);
  }
});

test("schema accepts viral_shorts pacing, visionMode xray_out/xray_in/blackout, expanding portalMask, laser_beam, custom parts, and actor FX", () => {
  const ep = validate({
    version: 3,
    title: "Unit Test Viral Short",
    style: "lowpoly_shorts",
    pacing: "viral_shorts",
    narration: "Short test narration.",
    shots: [
      {
        title: "Micro Hook",
        duration: 0.75,
        stage: "street_day",
        cameraPreset: "snap_zoom_in",
        cameraMotion: "slow_push",
        sfx: "whoosh_fast",
        focus: "a1",
        actors: [
          {
            id: "a1",
            asset: "male.character_01",
            position: [0, 0, 0],
            moveTo: [1, 0, 0],
            moveWindow: [0, 0.75],
            fallAt: 0.5,
            eyeGlow: "#38bdf8",
            radiationTint: [0.1, 0.6],
          },
        ],
        props: [
          {
            id: "p1",
            asset: "custom",
            position: [0, 0, 0],
            parts: [
              { shape: "box", size: [1, 0.1, 1], pos: [0, 0.5, 0], color: "#8b5a2b" },
            ],
          },
        ],
        events: [
          {
            id: "beam1",
            type: "spawn_prop",
            spawn_prop: "laser_beam",
            time: 0.1,
            from: [-1, 1, 0],
            via: [0, 1, 0],
            to: [1, 1, 0],
            travel: 0.4,
            color: "#facc15",
            radius: 0.03,
            dual: true,
            sfx: "whoosh",
          },
        ],
        captions: [{ time: 0, text: "if you had x-ray vision" }],
      },
      {
        title: "Blackout Twist",
        duration: 1.0,
        stage: "signal_dark",
        visionMode: "blackout",
        cameraPreset: "macro_closeup",
        cameraMotion: "slow_push",
        sfx: "click",
        focus: [0, 1, 0],
        captions: [{ time: 0, text: "you'd just see black" }],
      },
      {
        title: "X-Ray Fade Out + Expanding Portal + 3-Line Title Card",
        duration: 1.5,
        stage: "optics_lab",
        visionMode: "xray_out",
        cameraPreset: "high_angle_follow",
        cameraMotion: "orbit_drift",
        sfx: "ding",
        focus: "pup",
        titleCard: { text: "Low\nPoly\nShorts", time: 0, duration: 1.0, color: "#facc15" },
        portalMask: { x: 270, y: 420, r: 145, rEnd: 245, brick: true, wallColor: "#c9a66b" },
        props: [{ id: "pup", asset: "wooden_puppet", position: [0, 0, 0] }],
        captions: [{ time: 0, text: "x-ray mode" }],
      },
    ],
  });
  assert.equal(ep.shots.length, 3);
});

test("1:1 reference blueprint why-you-dont-want-xray-vision.json matches 48.0s and passes schema + viral gate", () => {
  const file = path.resolve("episodes/why-you-dont-want-xray-vision.json");
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  const ep = validate(raw);
  assert.equal(ep.style, "lowpoly_shorts");
  assert.equal(ep.pacing, "viral_shorts");
  const audit = auditViralEpisode(raw);
  assert.equal(audit.ok, true, `Viral audit failed: ${audit.errors.join("; ")}`);
  assert.equal(audit.stats.totalDuration, 48, `Expected 48.0s exact duration, got ${audit.stats.totalDuration}s`);
  assert.ok(audit.score >= 95, `Expected score >= 95, got ${audit.score}`);
});

test("schema rejects custom asset without parts array", () => {
  assert.throws(
    () =>
      validate({
        version: 3,
        title: "Missing Parts",
        style: "lowpoly_shorts",
        pacing: "viral_shorts",
        narration: "Short test.",
        shots: [
          {
            title: "Bad Custom",
            duration: 1.0,
            stage: "street_day",
            cameraPreset: "wide_orbit",
            cameraMotion: "slow_push",
            sfx: "click",
            focus: "bad",
            props: [{ id: "bad", asset: "custom", position: [0, 0, 0] }],
            captions: [{ time: 0, text: "bad custom" }],
          },
        ],
      }),
    /custom assets require 1–24 parts/,
  );
});
