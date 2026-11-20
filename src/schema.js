import {
  ASSET_MANIFEST as assets,
  SFX_MANIFEST as sounds,
  SCENE_PRESETS as stages,
  CAMERAS,
  MOTIONS,
} from "./config.js";
const obj = (v) => v && typeof v === "object" && !Array.isArray(v),
  str = (v) => typeof v === "string" && v.trim(),
  num = Number.isFinite,
  vec = (v) => Array.isArray(v) && v.length === 3 && v.every(num),
  has = (o, k) => typeof k === "string" && Object.hasOwn(o, k);
export function validate(e) {
  let at = "episode";
  const check = (v, msg) => {
    if (!v) throw Error(`${at}: ${msg}`);
  };
  const keys = (o, list) => {
    check(obj(o), "expected an object");
    for (const k of Object.keys(o))
      check(list.split(" ").includes(k), "unknown field " + k);
  };
  keys(e, "version title series narration beat scenes");
  check(e.version === 1 && str(e.title), "version: 1 and a title required");
  check(e.series === undefined || str(e.series), "invalid series");
  check(
    e.beat === undefined || typeof e.beat === "boolean",
    "beat must be boolean",
  );
  check(
    e.narration === undefined ||
      (str(e.narration) &&
        /^[\w /.-]+\.(wav|ogg|mp3|m4a)$/i.test(e.narration) &&
        !e.narration.startsWith("/") &&
        !e.narration.includes("..")),
    "narration must be a relative audio file",
  );
  check(
    Array.isArray(e.scenes) && e.scenes.length > 0 && e.scenes.length <= 60,
    "expected 1–60 scenes",
  );
  for (const [i, s] of e.scenes.entries()) {
    at = `scene ${i + 1}`;
    keys(
      s,
      "title duration stage cameraPreset distance angle pan focus actors props captions sfx",
    );
    check(str(s.title), "missing title");
    check(
      num(s.duration) &&
        s.duration >= 2 &&
        s.duration <= 3 &&
        Math.abs(s.duration * 60 - Math.round(s.duration * 60)) < 1e-6,
      "duration must be 2–3s on a 60 Hz tick",
    );
    check(has(stages, s.stage), "unknown stage");
    check(CAMERAS.includes(s.cameraPreset), "unknown cameraPreset");
    check(has(sounds, s.sfx), "unknown cut sfx");
    check(
      s.distance === undefined ||
        (num(s.distance) && s.distance >= 0.3 && s.distance <= 40),
      "invalid distance",
    );
    for (const k of ["angle", "pan"])
      check(s[k] === undefined || num(s[k]), "invalid " + k);
    const ids = new Set();
    for (const k of ["actors", "props"]) {
      check(s[k] === undefined || Array.isArray(s[k]), k + " must be an array");
      for (const d of s[k] ?? []) {
        keys(d, "id asset height yaw position motion mesh clip text");
        check(str(d.id) && !ids.has(d.id), "missing or duplicate subject id");
        ids.add(d.id);
        check(has(assets, d.asset), "unknown asset " + d.asset);
        check(MOTIONS.includes(d.motion), "unknown motion");
        check(
          d.position === undefined || vec(d.position),
          "position must be [x,y,z]",
        );
        check(
          d.height === undefined || (num(d.height) && d.height > 0),
          "height must be positive",
        );
        check(d.yaw === undefined || num(d.yaw), "invalid yaw");
        check(d.mesh === undefined || str(d.mesh), "invalid mesh");
        check(
          d.text === undefined ||
            (d.asset === "label" && str(d.text) && d.text.length <= 24),
          "text is for labels only (1–24 characters)",
        );
        if (d.clip !== undefined) {
          keys(d.clip, "asset name");
          check(
            assets[d.clip.asset ?? d.asset]?.clips.includes(d.clip.name),
            "unknown source clip",
          );
        }
      }
    }
    check(ids.size, "add an actor or prop");
    check(
      s.focus === undefined || vec(s.focus) || ids.has(s.focus),
      "invalid focus",
    );
    check(
      Array.isArray(s.captions) && s.captions.length,
      "at least one caption required",
    );
    let last = -1;
    for (const c of s.captions) {
      keys(c, "at text highlight");
      check(
        num(c.at) &&
          c.at > last &&
          c.at >= 0 &&
          c.at < s.duration &&
          (last !== -1 || c.at === 0),
        "captions must start at 0 and increase within scene",
      );
      check(
        str(c.text) && c.text.trim().split(/\s+/).length <= 5,
        "use 1–5 words per caption",
      );
      check(
        c.highlight === undefined ||
          (str(c.highlight) && c.text.includes(c.highlight)),
        "highlight must be a substring",
      );
      last = c.at;
    }
  }
  return e;
}
