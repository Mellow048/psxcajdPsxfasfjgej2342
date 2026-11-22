import { storyKey, validateStoryEvent } from "./storyEvents.js";
import {
  MORPHS,
  UI_CUES,
  MORPH_CUES,
} from "./Evolutionary_Explainer/contracts.js";
import {
  ASSET_MANIFEST as assets,
  SFX_MANIFEST as sounds,
  SCENE_PRESETS as stages,
  CAMERAS,
  CAMERA_MOTIONS,
  ICONS,
  MUSIC_PRESETS,
  MOTIONS,
} from "./config.js";
const obj = (v) => v && typeof v === "object" && !Array.isArray(v),
  str = (v) => typeof v === "string" && v.trim(),
  num = Number.isFinite,
  vec = (v) => Array.isArray(v) && v.length === 3 && v.every(num),
  has = (o, k) => typeof k === "string" && Object.hasOwn(o, k);
const audioPath = (v) =>
  str(v) &&
  /^[\w /.-]+\.(wav|ogg|mp3|m4a)$/i.test(v) &&
  !v.startsWith("/") &&
  !v.includes("..");
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
  if (Array.isArray(e)) e = { version: 3, title: "Untitled Short", shots: e };
  keys(
    e,
    "version title series pacing narration voiceover speechRate narratorStyle beat music bgMusic shots",
  );
  check(e.version === 3 && str(e.title), "version: 3 and a title required");
  check(e.series === undefined || str(e.series), "invalid series");
  check(
    e.beat === undefined || typeof e.beat === "boolean",
    "beat must be boolean",
  );
  check(
    e.narration === undefined ||
      (str(e.narration) &&
        e.narration.length <= 6000 &&
        !/\.(wav|ogg|mp3|m4a)$/i.test(e.narration.trim())),
    "narration must be prose (1–6000 characters); use voiceover for a recording",
  );
  check(
    e.voiceover === undefined || audioPath(e.voiceover),
    "voiceover must be a relative audio file",
  );
  check(
    e.narratorStyle === undefined || e.narratorStyle === "urgent",
    "invalid narratorStyle",
  );
  if (e.bgMusic !== undefined)
    check(
      has(MUSIC_PRESETS, e.bgMusic) && !e.music,
      "unknown bgMusic or conflicting music settings",
    );
  if (e.music !== undefined) {
    keys(e.music, "track volume");
    check(
      audioPath(e.music.track),
      "music.track must be a relative audio file",
    );
    check(
      e.music.volume === undefined ||
        (num(e.music.volume) && e.music.volume >= 0 && e.music.volume <= 1),
      "music.volume must be 0–1",
    );
  }
  check(
    e.speechRate === undefined ||
      (num(e.speechRate) && e.speechRate >= 0.75 && e.speechRate <= 1.5),
    "speechRate must be 0.75–1.5",
  );
  check(
    Array.isArray(e.shots) && e.shots.length > 0 && e.shots.length <= 60,
    "expected 1–60 shots",
  );
  check(
    e.pacing === undefined ||
      ["narrative", "micro", "burst"].includes(e.pacing),
    "invalid pacing profile",
  );
  const maxShot =
    e.pacing === "narrative"
      ? 15
      : ["micro", "burst"].includes(e.pacing)
        ? 3.2
        : 3.5;
  let storyCount = 0,
    instanceCount = 0;
  for (const [i, s] of e.shots.entries()) {
    at = `shot ${i + 1}`;
    keys(
      s,
      "title duration stage pov cameraPreset cameraMotion events distance angle pan focus actors props captions captionPosition sfx matchHook radio mars fall",
    );
    if (s.matchHook !== undefined)
      check(
        s.matchHook === true &&
          i === e.shots.length - 1 &&
          i > 0 &&
          s.stage === e.shots[0].stage &&
          (s.focus === e.shots[0].focus ||
            (vec(s.focus) &&
              vec(e.shots[0].focus) &&
              s.focus.every((v, j) => v === e.shots[0].focus[j]))) &&
          s.cameraPreset === e.shots[0].cameraPreset,
        "matchHook needs final shot with opening stage, focus and rig",
      );
    check(
      s.captionPosition === undefined ||
        ["center", "lower"].includes(s.captionPosition),
      "invalid captionPosition",
    );
    const minShot =
      e.pacing === "burst" ? 0.8 : e.pacing === "micro" && i < 2 ? 1.7 : 2;
    check(str(s.title), "missing title");
    check(
      num(s.duration) &&
        s.duration >= minShot &&
        s.duration <= maxShot &&
        Math.abs(s.duration * 60 - Math.round(s.duration * 60)) < 1e-6,
      `duration must be ${minShot}–${maxShot}s on a 60 Hz tick`,
    );
    if (
      s.radio !== undefined ||
      ["radio_hall", "phase_scope"].includes(s.stage)
    ) {
      keys(s.radio, "bars paths");
      const v = s.radio.bars;
      check(
        ["radio_hall", "phase_scope"].includes(s.stage) &&
          [0, 1, 2].includes(s.radio.paths) &&
          Array.isArray(v) &&
          v.length === 4 &&
          v.every(num) &&
          v.slice(0, 2).every((x) => Number.isInteger(x) && x >= 1 && x <= 4) &&
          v[2] >= 0 &&
          v[3] > v[2] &&
          v[3] <= s.duration,
        "invalid radio meter",
      );
      if (s.stage === "radio_hall")
        check(
          s.actors?.length === 1 &&
            s.actors[0].asset === "male.character_01" &&
            vec(s.actors[0].position),
          "radio hall needs the phone carrier",
        );
    }
    if (
      s.mars !== undefined ||
      ["mars_plain", "mars_cabin"].includes(s.stage)
    ) {
      keys(s.mars, "kit base cue status");
      const m = s.mars;
      check(
        ["mars_plain", "mars_cabin"].includes(s.stage) &&
          Number.isInteger(m.kit) &&
          m.kit >= 0 &&
          m.kit <= 4 &&
          Number.isInteger(m.base) &&
          m.base >= 0 &&
          m.base <= 3 &&
          (s.stage !== "mars_cabin" || m.base > 0) &&
          str(m.status) &&
          m.status.length <= 28 &&
          [
            "hold",
            "readout",
            "gas",
            "fan_stop",
            "sunset",
            "second_print",
            "step",
            "prints",
            "fall",
            "lost",
            "rewind",
            "suit",
            "tank",
            "filter",
            "coolant",
            "hatch",
            "pressure",
            "unhelmet",
            "solar",
            "charge",
            "night",
            "shield",
          ].includes(m.cue),
        "invalid Mars loadout",
      );
      check(
        (s.actors ?? []).every((a) => a.asset === "male.character_01"),
        "expected mission actor",
      );
    }
    if (s.fall !== undefined || s.stage === "fall_sky") {
      keys(s.fall, "cue status alt");
      const m = s.fall;
      check(
        s.stage === "fall_sky" &&
          [
            "blast",
            "debris",
            "fall",
            "thin",
            "blackout",
            "wake",
            "tumble",
            "scan",
            "river",
            "trees",
            "rocks",
            "steer",
            "farm",
            "low",
            "brace",
            "land",
            "alive",
          ].includes(m.cue) &&
          Number.isInteger(m.alt) &&
          m.alt >= 0 &&
          m.alt <= 3 &&
          str(m.status) &&
          m.status.length <= 28,
        "invalid fall state",
      );
      check(
        (s.actors ?? []).every((a) => a.asset === "male.character_01"),
        "expected the falling actor",
      );
    }
    check(has(stages, s.stage), "unknown stage");
    check(CAMERAS.includes(s.cameraPreset), "unknown cameraPreset");
    check(
      CAMERA_MOTIONS.includes(s.cameraMotion),
      "cameraMotion is required: " + CAMERA_MOTIONS.join(", "),
    );
    check(has(sounds, s.sfx), "unknown cut sfx");
    check(
      s.distance === undefined ||
        (num(s.distance) && s.distance >= 0.3 && s.distance <= 40),
      "invalid distance",
    );
    if (s.pov !== undefined) {
      keys(s.pov, "eye whipFrom recoil dollyTo lookTo");
      check(
        s.pov.dollyTo === undefined || vec(s.pov.dollyTo),
        "invalid dolly endpoint",
      );
      check(
        s.pov.lookTo === undefined || vec(s.pov.lookTo),
        "invalid tracked focus endpoint",
      );
      check(vec(s.pov.eye) && vec(s.focus), "POV needs eye and focus vectors");
      check(
        s.pov.whipFrom === undefined || vec(s.pov.whipFrom),
        "invalid whip origin",
      );
      check(
        s.pov.recoil === undefined ||
          (num(s.pov.recoil) && s.pov.recoil >= 0 && s.pov.recoil <= 3),
        "invalid pullback",
      );
    }
    for (const k of ["angle", "pan"])
      check(s[k] === undefined || num(s[k]), "invalid " + k);
    const ids = new Set();
    for (const k of ["actors", "props"]) {
      check(s[k] === undefined || Array.isArray(s[k]), k + " must be an array");
      for (const d of s[k] ?? []) {
        keys(
          d,
          "id asset height yaw position motion motionSfx mesh clip text traits fadeOut fadeStyle stride reach",
        );
        check(
          d.motionSfx === undefined ||
            ["ui_pop", "click", "ding"].includes(d.motionSfx),
          "invalid motion cue",
        );
        if (d.traits !== undefined)
          check(
            k === "actors" &&
              d.asset === "evo_cat" &&
              Array.isArray(d.traits) &&
              d.traits.every((tr) => has(MORPHS, tr)),
            "invalid starting traits",
          );
        for (const [key, len] of [
          ["stride", 2],
          ["reach", 4],
        ])
          if (d[key] !== undefined) {
            const v = d[key];
            check(
              (s.stage === "radio_hall" ||
                (s.stage === "mars_plain" && key === "stride")) &&
                k === "actors" &&
                Array.isArray(v) &&
                v.length === len &&
                v.every(num) &&
                (key === "stride"
                  ? v[0] > 0 && v[0] <= 5 && v[1] > 0 && v[1] <= s.duration
                  : v[2] >= 0 &&
                    v[3] > v[2] &&
                    v[3] <= s.duration &&
                    v.slice(0, 2).every((x) => x >= 0 && x <= 0.65)),
              "invalid " + key,
            );
          }
        if (d.fadeStyle !== undefined)
          check(
            d.fadeStyle === "scan" && d.fadeOut !== undefined,
            "scan needs fadeOut",
          );
        if (d.fadeOut !== undefined)
          check(
            Array.isArray(d.fadeOut) &&
              d.fadeOut.length === 2 &&
              d.fadeOut.every(num) &&
              d.fadeOut[0] >= 0 &&
              d.fadeOut[1] > d.fadeOut[0] &&
              d.fadeOut[1] <= s.duration &&
              !stages[s.stage].reflection,
            "fadeOut needs [start,end] seconds inside a non-reflective shot",
          );
        check(str(d.id) && !ids.has(d.id), "missing or duplicate subject id");
        ids.add(d.id);
        check(has(assets, d.asset), "unknown asset " + d.asset);
        check(
          d.motion === undefined || MOTIONS.includes(d.motion),
          "unknown motion",
        );
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
    check(
      s.events === undefined ||
        (Array.isArray(s.events) && s.events.length <= 24),
      "events must be an array of at most 24 spawns",
    );
    const hasSubject =
      ids.size > 0 ||
      [
        "phase_scope",
        "casino_room",
        "mars_plain",
        "mars_cabin",
        "fall_sky",
      ].includes(s.stage);
    for (const ev of s.events ?? []) {
      check(obj(ev), "invalid event");
      if (ev.type === "sound") {
        keys(ev, "type time sfx");
        check(
          num(ev.time) &&
            ev.time >= 0 &&
            ev.time < s.duration &&
            ["buzzer", "ding", "click", "heavy_thud", "cash_register"].includes(
              ev.sfx,
            ),
          "invalid timed sound",
        );
        continue;
      }
      const story = storyKey(ev);
      if (story) {
        validateStoryEvent(ev, story, s, { check, keys, vec });
        storyCount++;
        instanceCount += ev.spawn_mass?.count ?? 0;
        check(
          storyCount <= 96 && instanceCount <= 32768,
          "episode exceeds visual resource budget",
        );
        continue;
      }
      if ("apply_morph" in ev || "texture_swap" in ev || "spawn_ui" in ev) {
        const ui = "spawn_ui" in ev,
          swap = "texture_swap" in ev,
          key = ui ? "spawn_ui" : swap ? "texture_swap" : "apply_morph",
          name = ev[key];
        keys(
          ev,
          `${key} time sfx ` + (ui ? "position size" : "target duration"),
        );
        check(
          num(ev.time) && ev.time >= 0 && ev.time < s.duration,
          "event time outside shot",
        );
        if (ui) {
          check(
            has(UI_CUES, name) && ev.sfx === UI_CUES[name] && vec(ev.position),
            "invalid UI panel, position or cue",
          );
          check(
            ev.size === undefined ||
              (num(ev.size) && ev.size > 0 && ev.size <= 4),
            "invalid UI size",
          );
        } else {
          check(
            has(MORPHS, name) &&
              swap === (MORPHS[name] === "texture_swap") &&
              ev.sfx === MORPH_CUES[name],
            "invalid morph or cue",
          );
          check(
            s.actors?.some((d) => d.id === ev.target && d.asset === "evo_cat"),
            "missing compatible morph target",
          );
          check(
            num(ev.duration) &&
              ev.duration >= 0.5 &&
              ev.duration <= 1 &&
              ev.time + ev.duration <= s.duration,
            "morph needs 0.5–1s within shot",
          );
        }
        continue;
      }
      check(ev.type === "spawn_prop", "expected spawn_prop event");
      const kind = ev.spawn_prop ?? ev.asset,
        bet = kind === "bet_stack",
        stream = kind === "particle_stream_yellow",
        bulb = kind === "3D_Lightbulb",
        arrow = kind === "3D_Arrow";
      check(!(ev.spawn_prop && ev.asset), "choose spawn_prop or asset");
      keys(
        ev,
        "id type time asset spawn_prop size sfx " +
          (bet
            ? "count position placedBy slideFrom"
            : stream
              ? "from via to travel"
              : arrow
                ? "from to travel"
                : bulb
                  ? "position animation animationSfx"
                  : "icon position"),
      );
      check(str(ev.id) && !ids.has(ev.id), "missing or duplicate event id");
      ids.add(ev.id);
      check(
        num(ev.time) && ev.time >= 0 && ev.time < s.duration,
        "spawn time outside shot",
      );
      check(
        (bet
          ? ["cash_register", "click"]
          : ["pop", "whoosh", "ui_pop", "ding", "click"]
        ).includes(ev.sfx),
        "invalid spawn sfx",
      );
      check(
        ev.size === undefined || (num(ev.size) && ev.size > 0 && ev.size <= 4),
        "invalid prop size",
      );
      if (bet) {
        if (ev.placedBy !== undefined || ev.slideFrom !== undefined)
          check(
            s.actors?.some(
              (a) =>
                a.id === ev.placedBy &&
                a.asset === "male.character_01" &&
                a.motion === "place_bet",
            ) &&
              vec(ev.slideFrom) &&
              vec(ev.position) &&
              ev.slideFrom[1] === ev.position[1],
            "chip push needs a supported actor and level slideFrom/position",
          );
        check(
          vec(ev.position) &&
            Number.isInteger(ev.count) &&
            ev.count >= 1 &&
            ev.count <= 100,
          "bet_stack needs a position and 1–100 chips",
        );
      } else if (bulb) {
        check(
          vec(ev.position) &&
            ev.animation === "pulse" &&
            ev.animationSfx === "click",
          "bulb requires position and a click-cued pulse",
        );
      } else if (arrow || stream) {
        check(ev.via === undefined || vec(ev.via), "invalid stream bend");
        check(
          vec(ev.from) && vec(ev.to) && ev.from.some((v, i) => v !== ev.to[i]),
          "arrow needs distinct from and to vectors",
        );
        check(
          num(ev.travel) &&
            ev.travel > 0 &&
            ev.time + ev.travel <= s.duration + 1e-8,
          "arrow travel must finish within shot",
        );
      } else
        check(
          kind === "Floating_Icon" &&
            ICONS.includes(ev.icon) &&
            vec(ev.position),
          "expected a Floating_Icon with icon and position",
        );
    }
    check(
      hasSubject || s.events?.some((ev) => ev.time === 0),
      "add a subject or spawn at zero",
    );
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
      keys(c, "time text highlight");
      check(
        num(c.time) && c.time > last && c.time >= 0 && c.time < s.duration,
        "caption times must increase within shot",
      );
      check(
        str(c.text) && c.text.trim().split(/\s+/).length <= 3,
        "use 1–3 words per caption",
      );
      check(
        c.highlight === undefined ||
          (str(c.highlight) && c.text.includes(c.highlight)),
        "highlight must be a substring",
      );
      last = c.time;
    }
  }
  return e;
}
