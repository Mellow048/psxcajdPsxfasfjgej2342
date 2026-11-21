import * as T from "three";
import { fanSample } from "./fanSampling.js";
const ink = 0x142f37,
  petrol = 0x176065,
  mint = 0x92c6af,
  cream = 0xffe3a8,
  brass = 0xcb965c,
  red = 0xdb653d;
function put(p, g, c, x, y, z) {
  const o = new T.Mesh(
    g,
    new T.MeshBasicMaterial({ color: c, side: T.DoubleSide }),
  );
  o.position.set(x, y, z);
  p.add(o);
  return o;
}
const box = (p, w, h, d, c, x, y, z) =>
  put(p, new T.BoxGeometry(w, h, d), c, x, y, z);
const disc = (p, r, c, x, y, z) =>
  put(p, new T.CircleGeometry(r, 64), c, x, y, z);
const ring = (p, r, w, c, x, y, z) =>
  put(p, new T.RingGeometry(r - w, r, 64), c, x, y, z);
function plaque(p, txt, x, y, z, w, h, bg, fg) {
  const cv = document.createElement("canvas");
  cv.width = 512;
  cv.height = 80;
  const c = cv.getContext("2d");
  c.fillStyle = bg;
  c.fillRect(0, 0, 512, 80);
  c.fillStyle = fg;
  c.font = "bold 52px monospace";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(txt, 256, 42, 478);
  const o = box(p, w, h, 0.012, 0xffffff, x, y, z);
  const map = new T.CanvasTexture(cv);
  map.colorSpace = T.SRGBColorSpace;
  o.material.map = map;
  return o;
}
function rotor(p) {
  const o = new T.Group();
  p.add(o);
  // Each blade has the same silhouette and highlights, including the one subsequently marked.
  const shape = new T.Shape();
  shape.moveTo(-0.12, 0.08);
  shape.bezierCurveTo(-0.26, 0.25, -0.24, 0.55, -0.17, 0.72);
  shape.quadraticCurveTo(-0.05, 0.81, 0.17, 0.72);
  shape.bezierCurveTo(0.25, 0.58, 0.04, 0.29, 0.07, 0.1);
  shape.closePath();
  const geo = new T.ShapeGeometry(shape, 8);
  for (let k = 0; k < 4; k++) {
    const b = new T.Group();
    b.rotation.z = (k * Math.PI) / 2;
    o.add(b);
    put(b, geo, 0xc18b52, 0.014, -0.019, 0.025);
    put(b, geo, cream, 0, 0, 0.035);
    box(b, 0.032, 0.16, 0.008, 0xe8b977, -0.097, 0.54, 0.05).rotation.z = -0.09;
  }
  const dot = new T.Group();
  o.add(dot);
  disc(dot, 0.098, ink, 0, 0.63, 0.065);
  disc(dot, 0.071, 0xffdc21, 0, 0.63, 0.07);
  disc(p, 0.171, ink, 0, 0, 0.1);
  disc(p, 0.132, brass, 0, 0, 0.108);
  disc(p, 0.091, petrol, 0, 0, 0.112);
  return { o, dot };
}
function housing(p) {
  disc(p, 0.92, ink, 0, 0, -0.06);
  disc(p, 0.887, mint, 0, 0, -0.05);
  disc(p, 0.849, petrol, 0, 0, -0.04);
  ring(p, 0.806, 0.018, 0x377971, 0, 0, -0.018);
  return rotor(p);
}
export function fanBench(s, view) {
  const group = (parent, x, y, z) => {
    const g = new T.Group();
    parent.add(g);
    g.position.set(x, y, z);
    return g;
  };
  // A warm repair shop, window mullions, slats and hand-lettered serial plates.
  box(s, 18, 8, 0.12, 0xb48161, 0, 2, -2.4);
  box(s, 4.8, 3.1, 0.09, 0x553d36, -1.85, 2.85, -2.23);
  box(s, 4.65, 2.95, 0.07, 0xf7bb80, -1.85, 2.85, -2.14);
  for (let i = 0; i < 7; i++)
    box(s, 4.65, 0.075, 0.07, 0xda9769, -1.85, 1.52 + i * 0.41, -2.04);
  for (const x of [-3, -1.2, 0.42])
    box(s, 0.065, 3, 0.12, 0x67493e, x, 2.85, -1.98);
  box(s, 5.2, 0.13, 0.4, 0x895642, -1.85, 1.28, -2.1);
  plaque(s, "SERVICE", 1.49, 3.17, -2.14, 1.54, 0.36, "#244e51", "#ffdda1");
  box(s, 12, 0.1, 8, 0x694f48, 0, -0.045, -1);
  box(s, 0.61, 0.1, 0.41, ink, 0, 0.91, -0.06);
  box(s, 0.53, 0.12, 0.35, petrol, 0, 0.99, -0.06);
  box(s, 0.17, 0.78, 0.21, petrol, 0, 1.39, -0.09);
  box(s, 0.032, 0.68, 0.03, brass, -0.044, 1.39, 0.028);
  const fan = group(s, 0, 1.95, 0),
    live = housing(fan);
  const phone = group(s, 0, 1.89, 0.87);
  box(phone, 1.46, 2.31, 0.12, ink, 0, 0, 0);
  box(phone, 1.37, 2.19, 0.02, 0x223f42, 0, 0, 0.075);
  box(phone, 0.28, 0.034, 0.01, 0x7d9894, 0, 0.997, 0.094);
  box(phone, 0.36, 0.028, 0.01, 0xd7e1d3, 0, -1.026, 0.096);
  const insert = group(phone, 0, 0.075, 0.16);
  insert.scale.setScalar(0.702);
  const sampled = housing(insert);
  const atTop = group(insert, 0, 0, 0.18);
  box(atTop, 0.015, 0.17, 0.01, 0xffb994, 0, 0.76, 0);
  box(atTop, 0.07, 0.022, 0.012, 0xffb994, 0, 0.84, 0);
  const labels = {};
  for (const [k, txt] of Object.entries({
    "01": "FRAME  01",
    "02": "FRAME  02",
    "": "BETWEEN FRAMES",
    live: "REC  /  30 FPS",
  }))
    labels[k] = plaque(
      phone,
      txt,
      0,
      0.85,
      0.093,
      1.18,
      0.19,
      "#183438",
      "#ffdc9b",
    );
  // A permanent twelve-o'clock notch and a growing trail distinguish the
  // path of ONE blade from the six-degree displacement of its neighbor.
  const trail = group(insert, 0, 0, 0.2),
    dots = [];
  for (let i = 0; i <= 14; i++) {
    const a = (i * 6 * Math.PI) / 180;
    dots.push(
      disc(trail, 0.014, 0xf4ba53, 0.63 * Math.sin(a), 0.63 * Math.cos(a), 0),
    );
  }
  const index = group(insert, 0, 0, 0.21);
  box(index, 0.023, 0.13, 0.01, 0xfd7855, 0, 0.785, 0);
  const recordLight = disc(phone, 0.031, red, -0.57, 0.852, 0.128);
  for (const side of [-1, 1]) {
    box(phone, 0.035, 0.29, 0.05, 0x456365, side * 0.737, 0.52, -0.01);
    for (const y of [-0.62, 0.74]) {
      box(phone, 0.12, 0.014, 0.007, 0x809d94, side * 0.564, y, 0.103);
      box(
        phone,
        0.014,
        0.1,
        0.007,
        0x809d94,
        side * 0.618,
        y + (y > 0 ? -0.04 : 0.04),
        0.103,
      );
    }
  }
  const benchTag = plaque(
    fan,
    "SLOW MOTION",
    0,
    1.08,
    0.08,
    1.14,
    0.18,
    "#193e41",
    "#ffdfa6",
  );
  return (t, globalTime) => {
    const v = fanSample(view, t, globalTime),
      r = (-v.angle * Math.PI) / 180;
    phone.visible = view !== "bench";
    benchTag.visible = !phone.visible;
    phone.position.y =
      1.89 -
      (view === "record" ? 2.65 * (1 - T.MathUtils.smoothstep(t, 0, 0.55)) : 0);
    live.o.rotation.z = view === "bench" ? r : -globalTime * 14 * Math.PI;
    live.dot.visible = false;
    sampled.o.rotation.z = r;
    sampled.dot.visible = v.dot;
    atTop.visible = v.guide;
    trail.visible = view === "advance";
    dots.forEach((o, i) => (o.visible = i * 6 < v.angle - 3));
    index.visible =
      (view === "neighbor" || view === "compare") && v.frame === "02";
    index.rotation.z = Math.PI / 30;
    recordLight.visible = ["record", "replay"].includes(view);
    const key = recordLight.visible ? "live" : v.frame;
    for (const [k, l] of Object.entries(labels)) l.visible = k === key;
  };
}
