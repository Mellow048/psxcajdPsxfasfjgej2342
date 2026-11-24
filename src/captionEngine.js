import { drawGraph } from "./dataViz.js";

// Composite the print graphics, title slams, portal masks, and subtitles into the recorded canvas.
export function composite(ctx, image, episode, s, index, t) {
  const w = ctx.canvas.width,
    h = ctx.canvas.height;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, 0, 0, w, h);
  ctx.save();
  ctx.scale(w / 540, h / 960);

  const isLowPoly = episode?.style === "lowpoly_shorts";

  // Optional circular X-ray portal wall cutout (supports animated r -> rEnd expansion).
  if (s.portalMask) {
    const pm = s.portalMask;
    const u = Math.min(1, Math.max(0, t / Math.max(0.01, s.duration)));
    const ease = u * u * (3 - 2 * u);
    const r0 = pm.r ?? 155;
    const r1 = pm.rEnd ?? r0;
    const rad = r0 + (r1 - r0) * ease;
    const cx = pm.x ?? 270;
    const cy = pm.y ?? 420;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 540, 960);
    ctx.arc(cx, cy, rad, 0, Math.PI * 2, true);
    ctx.fillStyle = pm.wallColor ?? "#b8965a";
    ctx.fill("evenodd");
    if (pm.brick !== false) {
      ctx.clip("evenodd");
      ctx.strokeStyle = "rgba(58,42,20,0.45)";
      ctx.lineWidth = 3;
      for (let y = 0; y < 960; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(540, y);
        ctx.stroke();
        const shift = (Math.floor(y / 36) % 2) * 34;
        for (let x = shift; x < 540; x += 68) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + 36);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  // Only draw FIELD STUDY HUD chrome when NOT in clean `lowpoly_shorts` mode.
  if (!isLowPoly) {
    const grad = ctx.createLinearGradient(0, 530, 0, 960);
    grad.addColorStop(0, "#13142000");
    grad.addColorStop(1, "#131420c9");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 530, 540, 430);
    ctx.font = "bold 15px monospace";
    ctx.fillStyle = "#222236b3";
    ctx.fillRect(28, 35, 170, 33);
    ctx.fillStyle = "#e5efc5";
    ctx.fillRect(40, 47, 8, 8);
    ctx.fillText("FIELD STUDY / " + String(index + 1).padStart(2, "0"), 57, 57);
    ctx.strokeStyle = "#fffa";
    ctx.lineWidth = 2;
    for (const [x, y, a, b] of [
      [20, 20, 1, 1],
      [520, 20, -1, 1],
      [20, 940, 1, -1],
      [520, 940, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(x + a * 16, y);
      ctx.lineTo(x, y);
      ctx.lineTo(x, y + b * 16);
      ctx.stroke();
    }
  }

  for (const ev of s.events ?? []) if (ev.show_graph) drawGraph(ctx, ev, t);

  // Optional punchy center Title Card Slam (e.g. "Low Poly\nShorts" at 0:07).
  if (s.titleCard) {
    const tc = s.titleCard;
    const t0 = tc.time ?? 0;
    const tEnd = t0 + (tc.duration ?? s.duration);
    if (t >= t0 && t <= tEnd) {
      const dt = t - t0;
      const pop = 1 - 0.35 * Math.exp(-18 * dt) * Math.cos(22 * dt);
      const tLines = String(tc.text || "").split("\n");
      ctx.save();
      ctx.translate(270, 400);
      ctx.scale(pop, pop);
      ctx.font = "900 72px 'Arial Black', Impact, Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = 14;
      for (let i = 0; i < tLines.length; i += 1) {
        const yy = (i - (tLines.length - 1) / 2) * 78;
        ctx.strokeStyle = "#0a0a0a";
        ctx.shadowColor = "rgba(0,0,0,0.85)";
        ctx.shadowOffsetY = 7;
        ctx.shadowBlur = 0;
        ctx.strokeText(tLines[i], 0, yy, 480);
        ctx.shadowColor = "transparent";
        ctx.fillStyle = tc.color ?? "#facc15";
        ctx.fillText(tLines[i], 0, yy, 480);
      }
      ctx.restore();
    }
  }

  const c = (s.captions ?? []).findLast((c) => c.time <= t);
  if (!c) {
    ctx.restore();
    return;
  }

  // Authentic Low Poly Shorts lower-third yellow captions (clean, readable, zero clutter).
  if (isLowPoly) {
    const text = c.text.trim();
    ctx.font = "800 30px Arial, Helvetica, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    const yBase = s.captionPosition === "center" ? 500 : 695;
    ctx.strokeStyle = "#000000";
    ctx.shadowColor = "rgba(0,0,0,0.9)";
    ctx.shadowOffsetY = 2;
    ctx.shadowBlur = 2;
    ctx.strokeText(text, 270, yBase, 460);
    ctx.shadowColor = "transparent";
    ctx.fillStyle = c.highlight ? "#fef08a" : "#facc15";
    ctx.fillText(text, 270, yBase, 460);
    ctx.restore();
    return;
  }

  // Default FIELD STUDY big bold captions
  const words = c.text.trim().split(/\s+/);
  ctx.font = "900 54px Arial, sans-serif";
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = (line + " " + word).trim();
    if (line && ctx.measureText(test).width > 445) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  lines.push(line);
  ctx.translate(
    270,
    (s.captionPosition === "lower" ? 750 : 480) - ((lines.length - 1) * 59) / 2,
  );
  const k =
    1 - 0.24 * Math.exp(-16 * (t - c.time)) * Math.cos(26 * (t - c.time));
  ctx.scale(k, k);
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.lineWidth = 11;
  let offset = 0;
  for (const [i, l] of lines.entries()) {
    const size = ctx.measureText(l).width,
      scale = Math.min(1, 455 / size);
    ctx.save();
    ctx.scale(scale, 1);
    let x = -size / 2;
    const y = i * 59;
    ctx.strokeStyle = "#09090d";
    ctx.shadowColor = "#000";
    ctx.shadowOffsetY = 5;
    ctx.shadowBlur = 3;
    ctx.strokeText(l, x, y);
    ctx.shadowColor = "transparent";
    for (const ch of l.split(" ")) {
      let hit = false;
      if (c.highlight) {
        const start = c.text.indexOf(c.highlight);
        hit = offset < start + c.highlight.length && offset + ch.length > start;
      }
      ctx.fillStyle = hit ? "#d9faa9" : "#fffcf2";
      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch + " ").width;
      offset += ch.length + 1;
    }
    ctx.restore();
  }
  ctx.restore();
}
