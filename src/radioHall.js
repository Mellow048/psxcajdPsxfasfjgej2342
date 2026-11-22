import * as T from "three";
const mat = (color, lit = false) =>
  lit
    ? new T.MeshLambertMaterial({ color, flatShading: true })
    : new T.MeshBasicMaterial({ color });
function box(g, w, h, d, m, x, y, z) {
  const o = new T.Mesh(new T.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z);
  g.add(o);
  return o;
}
function sign(g, w, h, x, y, z, title, sub, bg = "#17303c", fg = "#ffd78e") {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 144;
  const q = c.getContext("2d");
  q.fillStyle = bg;
  q.fillRect(0, 0, 512, 144);
  q.fillStyle = fg;
  q.fillRect(0, 0, 12, 144);
  q.font = "bold 60px sans-serif";
  q.fillText(title, 25, 73, 463);
  q.font = "bold 26px monospace";
  q.fillStyle = "#faf1d4";
  q.fillText(sub, 27, 123, 460);
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  const o = new T.Mesh(
    new T.PlaneGeometry(w, h),
    new T.MeshBasicMaterial({ map }),
  );
  o.position.set(x, y, z);
  g.add(o);
  return o;
}
export const emitter = [1.35, 1.25, -0.48];
function trace(g, color) {
  const n = 85,
    geo = new T.BufferGeometry(),
    a = new Float32Array(n * 3);
  geo.setAttribute("position", new T.BufferAttribute(a, 3));
  const line = new T.Line(geo, new T.LineBasicMaterial({ color }));
  line.frustumCulled = false;
  g.add(line);
  const beads = new T.InstancedMesh(
    new T.OctahedronGeometry(0.032),
    mat(color),
    9,
  );
  beads.frustumCulled = false;
  g.add(beads);
  const mx = new T.Matrix4(),
    p = new T.Vector3();
  return (on, point, t) => {
    line.visible = beads.visible = on;
    if (!on) return;
    for (let i = 0; i < n; i++) {
      point(i / (n - 1), p);
      geo.attributes.position.setXYZ(i, p.x, p.y, p.z);
    }
    geo.attributes.position.needsUpdate = true;
    for (let i = 0; i < 9; i++) {
      point((t * 0.57 + i / 9) % 1, p);
      beads.setMatrixAt(i, mx.makeTranslation(p.x, p.y, p.z));
    }
    beads.instanceMatrix.needsUpdate = true;
  };
}
export function radioHall(scene) {
  const navy = mat(0x253d49),
    ivory = mat(0xd8c29d, true),
    teal = mat(0x27646a, true),
    brass = mat(0xffb54c),
    metal = mat(0x8a9ea2, true),
    black = mat(0x182733),
    mint = mat(0x93ffe1);
  box(scene, 13, 0.14, 5, mat(0x626d72, true), 0, -0.072, 0);
  box(scene, 13, 3.6, 0.15, ivory, 0, 1.8, -1.92);
  box(scene, 13, 0.87, 0.03, teal, 0, 0.44, -1.82);
  box(scene, 13, 0.08, 0.05, brass, 0, 0.88, -1.79);
  for (let x = -5; x <= 5; x++) {
    box(scene, 0.016, 0.006, 4, navy, x, 0.004, 0.08);
    if (x % 2 === 0) {
      box(scene, 0.1, 3.5, 0.16, metal, x, 1.75, -1.76);
      box(scene, 1.09, 0.055, 0.1, mat(0xffe8bb), x, 2.88, -1.65);
    }
  }
  for (let i = 0; i < 9; i++) {
    box(
      scene,
      0.28,
      0.012,
      0.045,
      i < 7 ? brass : mint,
      -3 + i * 0.42,
      0.012,
      0.48,
    );
  }
  // Raceway, inspection ports and floor tape give the walking shot fixed landmarks.
  for (const h of [2.28, 2.36])
    box(scene, 12, 0.025, 0.038, metal, 0, h, -1.79);
  for (const x of [-2.98, 0.3, 2.3]) {
    box(scene, 0.24, 0.28, 0.075, navy, x, 2.32, -1.74);
    box(scene, 0.15, 0.025, 0.025, brass, x, 2.34, -1.69);
  }
  for (const x of [-0.63, -0.1])
    for (const z of [-0.2, 0.29]) {
      box(scene, 0.13, 0.012, 0.035, brass, x, 0.012, z);
      box(
        scene,
        0.032,
        0.012,
        0.09,
        brass,
        x,
        0.012,
        z + (z < 0 ? 0.04 : -0.04),
      );
    }
  const floorTag = sign(
    scene,
    0.54,
    0.15,
    -0.39,
    0.018,
    0.44,
    "B / NULL",
    "TEST POINT",
    "#252f38",
    "#ffbe62",
  );
  floorTag.rotation.x = -Math.PI / 2;
  // The cabinet is behind the path, separated from the router shelf in both depth and color.
  box(scene, 1.04, 2.05, 0.47, metal, 0.88, 1.035, -1.4);
  box(scene, 0.022, 1.93, 0.026, navy, 0.88, 1.04, -1.15);
  for (const x of [0.66, 1.1]) {
    box(scene, 0.037, 0.18, 0.06, black, x, 1.04, -1.13);
    for (let j = 0; j < 5; j++)
      box(scene, 0.32, 0.021, 0.025, navy, x, 1.66 + j * 0.052, -1.15);
  }
  sign(scene, 0.75, 0.21, 0.88, 1.55, -1.144, "STEEL", "STORAGE  /  02");
  sign(
    scene,
    1.55,
    0.45,
    -2.42,
    1.86,
    -1.8,
    "SIGNAL LAB",
    "NETWORK   /   EAST WING",
  );
  box(scene, 0.79, 0.99, 0.56, teal, 1.35, 0.495, -0.54);
  box(scene, 0.94, 0.065, 0.66, ivory, 1.35, 1.02, -0.54);
  box(scene, 0.54, 0.15, 0.35, black, 1.35, 1.13, -0.54);
  for (const x of [1.13, 1.57])
    box(scene, 0.038, 0.34, 0.038, navy, x, 1.34, -0.63);
  for (let j = 0; j < 4; j++)
    box(scene, 0.026, 0.018, 0.009, mint, 1.2 + j * 0.056, 1.14, -0.36);
  sign(scene, 0.68, 0.21, 1.35, 0.79, -0.249, "WI-FI", "2.4 GHz   /   AP 01");
  for (const x of [-3.9, 3.2]) {
    box(scene, 1.13, 2.56, 0.12, navy, x, 1.28, -1.74);
    box(scene, 0.99, 2.45, 0.08, teal, x, 1.24, -1.62);
    box(scene, 0.55, 0.57, 0.025, mat(0xedc891), x, 1.85, -1.56);
    box(scene, 0.18, 0.042, 0.06, brass, x + 0.32, 1.1, -1.54);
  }
  const phone = new T.Group();
  scene.add(phone);
  box(phone, 0.112, 0.213, 0.019, black, 0, 0, 0);
  box(phone, 0.102, 0.189, 0.006, navy, 0, 0, 0.012);
  sign(phone, 0.094, 0.036, 0, 0.048, 0.016, "Wi-Fi", "FIELD METER");
  const bars = [];
  for (let j = 0; j < 4; j++) {
    const h = 0.021 + j * 0.013;
    bars.push(
      box(
        phone,
        0.015,
        h,
        0.006,
        mat(0x72ffc4),
        -0.033 + j * 0.022,
        -0.043 + h / 2,
        0.017,
      ),
    );
  }
  phone.rotation.set(-0.12, -1.14, 0.07, "YXZ");
  const src = new T.Vector3(...emitter),
    hit = new T.Vector3(),
    a = trace(scene, 0x43ffd2),
    b = trace(scene, 0xff9166);
  return (t, clock, frame, shot) => {
    const actor = frame.observer;
    const rf = shot.radio;
    if (!rf || !actor) return;
    actor.finger ??= actor.node.getObjectByName("mixamorigRightHandIndex1");
    actor.finger.getWorldPosition(phone.position);
    phone.position.y += 0.067;
    phone.position.z += 0.006;
    const v = rf.bars,
      level = Math.round(
        v[0] + (v[1] - v[0]) * T.MathUtils.smoothstep(t, v[2], v[3]),
      );
    bars.forEach((m, i) =>
      m.material.color.setHex(
        i < level ? (level < 2 ? 0xff885e : 0x72ffc4) : 0x4c5864,
      ),
    );
    const direct = rf.paths > 0,
      reflected = rf.paths > 1,
      phase = clock * 6.5;
    const dst = phone.position;
    // Intersect the segment to the mirror-image receiver with the cabinet face.
    const faceZ = -1.165,
      fraction = (src.z - faceZ) / (src.z + dst.z - 2 * faceZ);
    hit.lerpVectors(src, dst, fraction).z = faceZ + 0.006;
    const d1 = src.distanceTo(hit),
      d2 = hit.distanceTo(dst),
      turn = d1 / (d1 + d2);
    a(
      direct,
      (u, p) => {
        p.lerpVectors(src, dst, u);
        p.y +=
          0.078 * Math.sin(6 * Math.PI * u - phase) * Math.sin(Math.PI * u);
      },
      clock,
    );
    b(
      reflected,
      (u, p) => {
        if (u < turn) p.lerpVectors(src, hit, u / turn);
        else p.lerpVectors(hit, dst, (u - turn) / (1 - turn));
        p.y +=
          0.078 *
          Math.sin(11 * Math.PI * u - phase) *
          Math.sin(Math.PI * u) *
          Math.min(1, Math.abs(u - turn) * 10);
      },
      clock,
    );
  };
}
// Slow-motion field amplitudes at one receiver; height stands for field, not a spatial ray.
export function phaseScope(scene) {
  const g = new T.Group();
  scene.add(g);
  box(g, 2.32, 1.95, 0.15, mat(0x324c56), 0, 1.42, -0.05);
  box(g, 2.19, 1.81, 0.035, mat(0x122a37), 0, 1.42, 0.05);
  sign(
    g,
    2.02,
    0.34,
    0,
    2.12,
    0.078,
    "FIELD PROBE",
    "AT THE PHONE   /   SLOW MOTION",
  );
  const rows = [1.72, 1.34, 0.88],
    colors = [0x43ffd2, 0xff9166, 0xffe994],
    waves = colors.map((c) => trace(g, c));
  for (const y of rows) box(g, 1.96, 0.008, 0.006, mat(0x516975), 0, y, 0.08);
  for (let i = -4; i < 5; i++)
    box(g, 0.008, 1.33, 0.006, mat(0x293d47), i * 0.24, 1.3, 0.08);
  for (const [i, word] of ["DIRECT", "ECHO", "SUM"].entries())
    sign(
      g,
      0.36,
      0.105,
      -0.72,
      rows[i] + 0.12,
      0.094,
      word,
      "",
      "#122a37",
      ["#43ffd2", "#ff9166", "#ffe994"][i],
    );
  return (t, clock, frame, shot) => {
    const q = shot.radio.bars;
    const power =
        (q[0] + (q[1] - q[0]) * T.MathUtils.smoothstep(t, q[2], q[3]) - 1) / 3,
      phi = Math.PI * (1 - power);
    waves.forEach((w, i) =>
      w(
        true,
        (u, p) => {
          const x = u * 2 * Math.PI * 1.6 - clock * 4.4,
            a = Math.sin(x),
            b = 0.82 * Math.sin(x + phi);
          p.set(
            (u - 0.5) * 1.94,
            rows[i] + 0.125 * (i === 0 ? a : i === 1 ? b : a + b),
            0.1,
          );
        },
        clock,
      ),
    );
  };
}
