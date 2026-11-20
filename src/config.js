import { MODELS, SOUNDS } from "./catalog.js";
export const CONFIG = {
  width: 540,
  height: 960,
  fps: 30,
  hz: 60,
  psx: { grid: 180, affine: 0.85, dither: 0.65, scale: 0.5 },
};
export const SCENE_PRESETS = {
  graveyard: { color: 0x716691, fog: 0x706088 },
  backstage: { color: 0x342842, fog: 0x40304c },
  optics_lab: { color: 0x203646, fog: 0x284453 },
  void: { color: 0x262433, fog: 0x2c2939 },
  house_corner: {
    color: 0x554759,
    fog: 0x685662,
    layout: [
      {
        asset: "quequis_house.quequis_house_props",
        mesh: "Armchair",
        height: 1.2,
        position: [-1, 0, -1.45],
        yaw: 0.28,
      },
      {
        asset: "quequis_house.quequis_house_props",
        mesh: "Table",
        height: 0.85,
        position: [1.12, 0, -1.65],
      },
      {
        asset: "quequis_house.quequis_house_props",
        mesh: "Painting",
        height: 0.78,
        position: [0, 1.45, -2.36],
      },
    ],
  },
};
export const BUILTINS = [
  "sheet",
  "pane",
  "lamp",
  "eye",
  "arrow",
  "rays",
  "label",
];
export const ASSET_MANIFEST = {
  ...MODELS,
  ...Object.fromEntries(BUILTINS.map((k) => [k, { builtin: true, clips: [] }])),
};
export const SFX_MANIFEST = {
  pop: "synth",
  whoosh: "synth",
  riser: "synth",
  tick: "synth",
  ...Object.fromEntries(SOUNDS.map((p) => [p, p])),
};
export const CAMERAS = [
  "slow_push",
  "fast_push",
  "orbit_drift",
  "handheld_bob",
  "whip_pan",
  "dutch_tilt_zoom",
  "cutaway_macro",
];
export const MOTIONS = [
  "idle_breathe",
  "talk_gesture",
  "point",
  "shock",
  "float_spin",
  "pop_in",
];
