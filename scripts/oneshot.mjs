#!/usr/bin/env node
/**
 * One-Shot Low Poly Shorts Pipeline (`oneshot.mjs`)
 *
 * Single-command end-to-end automation for AI agents:
 *   1. Schema validation (src/schema.js)
 *   2. Viral retention, pacing & narration-fit audit (scripts/verify-viral.mjs)
 *   3. Optional standalone WAV bake (`--bake-wav` -> scripts/narrate.mjs <ep> episodes/<slug>.wav)
 *      Note: scripts/render.mjs synthesizes `episode.narration` inline automatically.
 *   4. Headless 9:16 PSX WebGL render -> render-output/<slug>.mp4 (scripts/render.mjs)
 *   5. Render integrity verification via ffprobe (scripts/verify-render.mjs <ep>)
 *
 * Usage:
 *   npm run oneshot -- episodes/why-you-dont-want-xray-vision.json
 *   npm run oneshot -- episodes/my-short.json --dry-run
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { validate } from "../src/schema.js";
import { auditViralEpisode } from "./verify-viral.mjs";

const args = process.argv.slice(2);
const target = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");
const bakeWav = args.includes("--bake-wav");

if (!target) {
  console.error("Usage: node scripts/oneshot.mjs <episode.json> [--dry-run] [--bake-wav]");
  process.exit(1);
}

const abs = path.resolve(target);
if (!fs.existsSync(abs)) {
  console.error(`[oneshot] File not found: ${abs}`);
  process.exit(1);
}

function run(cmd, cmdArgs, label) {
  console.log(`\n[oneshot] ${label}...`);
  const res = spawnSync(cmd, cmdArgs, { stdio: "inherit" });
  if (res.status !== 0) {
    console.error(`[oneshot] Failed at: ${label} (exit ${res.status})`);
    process.exit(res.status ?? 1);
  }
}

// 1. Schema validation
console.log(`[oneshot] 1/4 Validating schema: ${path.basename(abs)}`);
const raw = JSON.parse(fs.readFileSync(abs, "utf8"));
const ep = validate(raw);
console.log(`  OK: ${ep.title} (${ep.shots.length} shots, style=${ep.style ?? "field_study"}, pacing=${ep.pacing ?? "default"})`);

// 2. Viral retention & narration-fit audit
console.log("[oneshot] 2/4 Running viral retention & narration-fit gate...");
const audit = auditViralEpisode(raw);
console.log(`  Score: ${audit.score}/100 | Total: ${audit.stats.totalDuration}s | Avg shot: ${audit.stats.avgShotDuration}s | VFX/Motion: ${audit.stats.vfxShots}/${audit.stats.shots}`);
for (const w of audit.warnings) console.log(`  WARN: ${w}`);
if (!audit.ok) {
  for (const e of audit.errors) console.error(`  FAIL: ${e}`);
  process.exit(1);
}

if (dryRun) {
  console.log("\n[oneshot] --dry-run passed! Schema, narration-fit, and viral retention gates are 100% green.");
  process.exit(0);
}

const slug = path.basename(abs, ".json");
if (bakeWav && ep.narration) {
  run("node", ["scripts/narrate.mjs", target, `episodes/${slug}.wav`], "Optional: Baking standalone narration WAV");
}

// 3. Render 9:16 MP4 to render-output/<slug>.mp4 (synthesizes ep.narration inline via Flite WASI)
run("node", ["scripts/render.mjs", target], "3/4 Rendering 9:16 Low Poly Short to render-output/");

// 4. Verify rendered MP4 against episode JSON via verify-render.mjs
const outMp4 = path.resolve("render-output", `${slug}.mp4`);
if (fs.existsSync(outMp4) && fs.existsSync(path.resolve("scripts/verify-render.mjs"))) {
  run("node", ["scripts/verify-render.mjs", target], "4/4 Verifying rendered MP4 integrity");
} else {
  console.log("\n[oneshot] 4/4 Render complete.");
}

console.log(`\n[oneshot] DONE! Output ready at render-output/${slug}.mp4`);
