#!/usr/bin/env node
/**
 * Viral Retention & Low Poly Shorts Quality Gate (`verify-viral.mjs`)
 *
 * Audits an episode JSON against the high-retention pacing, visual variety,
 * hook speed, caption readability, and ending payoff patterns of viral
 * Low Poly Shorts (modeled 1:1 on "Why You Don't Want X-Ray Vision").
 *
 * Usage:
 *   node scripts/verify-viral.mjs episodes/my-short.json
 *   npm run verify:viral -- episodes/my-short.json
 */
import fs from "node:fs";
import path from "node:path";
import { validate } from "../src/schema.js";

export function auditViralEpisode(raw) {
  const ep = validate(raw);
  const errors = [];
  const warnings = [];
  const shots = ep.shots;
  const totalDuration = shots.reduce((a, s) => a + s.duration, 0);
  const avgDuration = totalDuration / shots.length;

  // 1. Style & Pacing check
  if (ep.style !== "lowpoly_shorts") {
    warnings.push('Recommend setting "style": "lowpoly_shorts" for clean yellow captions without HUD chrome.');
  }
  if (ep.pacing !== "viral_shorts") {
    warnings.push('Recommend setting "pacing": "viral_shorts" to unlock rapid 0.75s–4.5s micro-cuts.');
  }

  // 2. Hook speed (first shot <= 2.5s, first caption starts immediately <= 0.25s)
  if (shots[0].duration > 2.5) {
    errors.push(`Hook shot 1 is too long (${shots[0].duration}s > 2.5s). Cut faster in the opening 3 seconds.`);
  }
  if (shots[0].captions[0].time > 0.25) {
    errors.push(`Hook caption starts too late (${shots[0].captions[0].time}s > 0.25s). Start speaking immediately at t=0.`);
  }

  // 3. Pacing & Cut Density (average shot <= 2.8s, total duration 20–65s)
  if (avgDuration > 2.8) {
    errors.push(`Average shot duration is ${avgDuration.toFixed(2)}s (> 2.8s). Increase cut frequency for Shorts retention.`);
  }
  if (totalDuration < 20 || totalDuration > 65) {
    warnings.push(`Total duration is ${totalDuration.toFixed(1)}s (ideal Shorts sweet spot is 30–55s).`);
  }

  // 4. Anti-monotony: never repeat the exact same cameraPreset + stage 3 shots in a row
  for (let i = 2; i < shots.length; i++) {
    const a = shots[i - 2], b = shots[i - 1], c = shots[i];
    if (a.stage === b.stage && b.stage === c.stage && a.cameraPreset === b.cameraPreset && b.cameraPreset === c.cameraPreset) {
      errors.push(`Shots ${i - 1}–${i + 1} repeat the same stage (${c.stage}) and cameraPreset (${c.cameraPreset}) 3x in a row. Vary angle or cut away.`);
    }
  }

  // 5. Visual variety across the episode
  const uniqueCameras = new Set(shots.map((s) => s.cameraPreset));
  const uniqueStages = new Set(shots.map((s) => s.stage));
  if (uniqueCameras.size < 4) {
    errors.push(`Only ${uniqueCameras.size} camera presets used (need >= 4 for dynamic Low Poly Shorts framing).`);
  }
  if (uniqueStages.size < 2) {
    warnings.push(`Only ${uniqueStages.size} stage used. Consider cutting between at least 2 environments for visual contrast.`);
  }

  // 6. Visual storytelling / VFX presence (not just static talking heads)
  const vfxShots = shots.filter(
    (s) =>
      (s.visionMode && s.visionMode !== "normal") ||
      s.titleCard ||
      s.portalMask ||
      (s.events && s.events.length > 0) ||
      (s.actors ?? []).some((a) => a.moveTo || a.fallAt !== undefined || a.eyeGlow || a.radiationTint),
  ).length;
  if (vfxShots < Math.max(3, Math.floor(shots.length * 0.25))) {
    errors.push(`Only ${vfxShots}/${shots.length} shots have visual storytelling/VFX/motion beats. Show what is happening instead of static talking heads.`);
  }

  // 7. Continuous narration & duration-fit check (prevents sfxEngine.js cutoff crash)
  if (!ep.narration && !ep.voiceover) {
    errors.push("Episode is missing narration prose or voiceover audio.");
  } else if (ep.narration && !ep.voiceover) {
    const words = ep.narration.trim().split(/\s+/).length;
    const rate = ep.speechRate ?? (ep.narratorStyle === "urgent" ? 1.4 : 1.08);
    const estSec = (words / (155 * rate)) * 60;
    if (estSec > totalDuration - 0.5) {
      errors.push(
        `Estimated narration (${estSec.toFixed(1)}s for ${words} words at rate ${rate}) exceeds total video duration (${totalDuration.toFixed(1)}s) and will crash render.mjs. Raise speechRate (up to 1.5), shorten prose, or lengthen shots.`,
      );
    }
  }

  // 8. Ending payoff check (final shot <= 3.5s, punchy caption)
  const lastShot = shots[shots.length - 1];
  if (lastShot.duration > 3.5) {
    warnings.push(`Final payoff shot is ${lastShot.duration}s (> 3.5s). Snappy endings boost replay rate.`);
  }

  const score = Math.max(
    0,
    Math.min(
      100,
      100 - errors.length * 18 - warnings.length * 5,
    ),
  );

  return {
    ok: errors.length === 0,
    score,
    stats: {
      shots: shots.length,
      totalDuration: Number(totalDuration.toFixed(2)),
      avgShotDuration: Number(avgDuration.toFixed(2)),
      uniqueCameras: uniqueCameras.size,
      uniqueStages: uniqueStages.size,
      vfxShots,
    },
    errors,
    warnings,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node scripts/verify-viral.mjs <episode.json>");
    process.exit(1);
  }
  const abs = path.resolve(target);
  const raw = JSON.parse(fs.readFileSync(abs, "utf8"));
  const res = auditViralEpisode(raw);
  console.log(`\n[verify-viral] ${path.basename(abs)} — Score: ${res.score}/100`);
  console.log(`  Shots: ${res.stats.shots} | Total: ${res.stats.totalDuration}s | Avg/shot: ${res.stats.avgShotDuration}s | Cameras: ${res.stats.uniqueCameras} | Stages: ${res.stats.uniqueStages} | VFX/Motion shots: ${res.stats.vfxShots}`);
  for (const w of res.warnings) console.log(`  WARN: ${w}`);
  for (const e of res.errors) console.error(`  FAIL: ${e}`);
  if (!res.ok) process.exit(1);
  console.log("  PASS: Ready for 1:1 viral Low Poly Shorts render!\n");
}
