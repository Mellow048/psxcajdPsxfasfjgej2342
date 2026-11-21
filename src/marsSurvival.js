import * as T from "three";
const paint = (c, lit = true) =>
  lit
    ? new T.MeshLambertMaterial({ color: c, flatShading: true })
    : new T.MeshBasicMaterial({ color: c });
function mesh(p, g, m, x = 0, y = 0, z = 0) {
  const o = new T.Mesh(g, m);
  o.position.set(x, y, z);
  p.add(o);
  return o;
}
const box = (p, w, h, d, m, x, y, z) =>
  mesh(p, new T.BoxGeometry(w, h, d), m, x, y, z);
function oval(p, x, y, z, w, h, d, m) {
  const o = mesh(p, new T.SphereGeometry(1, 12, 8), m, x, y, z);
  o.scale.set(w, h, d);
  return o;
}
const cyl = (p, a, b, h, m, x, y, z, n = 12) =>
  mesh(p, new T.CylinderGeometry(a, b, h, n), m, x, y, z);
function tag(p, w, h, x, y, z, top, small) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const q = c.getContext("2d");
  q.fillStyle = "#182c38";
  q.fillRect(0, 0, 512, 160);
  q.fillStyle = "#ffd384";
  q.fillRect(0, 0, 12, 160);
  q.font = "bold 67px sans-serif";
  q.fillText(top, 24, 83, 467);
  q.fillStyle = "#a2f5eb";
  q.font = "bold 30px monospace";
  q.fillText(small, 27, 140, 464);
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  return mesh(
    p,
    new T.PlaneGeometry(w, h),
    new T.MeshBasicMaterial({ map }),
    x,
    y,
    z,
  );
}
function tube(p, pts, r, m) {
  const path = new T.CatmullRomCurve3(pts.map((q) => new T.Vector3(...q)));
  mesh(p, new T.TubeGeometry(path, 24, r, 6, false), m);
  return path;
}
const ease = (t, a, b) => T.MathUtils.smoothstep(t, a, b);
function seed(n) {
  return () => (n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const palette = () => ({
  ivory: paint(0xe6dfc7),
  orange: paint(0xdb692e),
  slate: paint(0x293a46),
  steel: paint(0x73838a),
  ink: paint(0x172731),
  gold: paint(0xeeb04e),
  blue: paint(0x58d6e2),
  mint: paint(0x93ffce, false),
  red: paint(0xff774d, false),
});
function landscape(s, night, sunset) {
  const rand = seed(505),
    m = new T.Matrix4(),
    q = new T.Quaternion(),
    v = new T.Vector3(),
    sc = new T.Vector3();
  s.fog.density = 0.025;
  s.fog.color.set(night ? 0x41425c : 0xd99a72);
  s.background.copy(s.fog.color);
  const sky = mesh(
    s,
    new T.SphereGeometry(64, 30, 20),
    new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      uniforms: {
        lo: { value: new T.Color(night ? 0x8b665d : 0xf4ba83) },
        hi: { value: new T.Color(night ? 0x172339 : 0x825d69) },
      },
      vertexShader:
        "varying float h; void main(){h=position.y/64.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying float h; uniform vec3 hi;uniform vec3 lo;void main(){gl_FragColor=vec4(mix(lo,hi,smoothstep(-.03,.65,h)),1.);}",
    }),
  );
  sky.renderOrder = -5;
  if (night) {
    s.children.forEach((x) => {
      if (x.isLight) x.intensity *= 0.24;
    });
  }
  const sun = oval(
    s,
    6,
    4.5,
    -24,
    1.05,
    1.05,
    1.05,
    paint(night ? 0xf4cba5 : 0xffe3ac, false),
  );
  const g = new T.PlaneGeometry(65, 65, 44, 44);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position,
    col = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i),
      d = Math.hypot(x, z);
    pos.setY(
      i,
      -0.025 + (rand() - 0.4) * Math.min(0.48, Math.max(0, d - 5) * 0.039),
    );
    const c = new T.Color().setHSL(
      0.048 + rand() * 0.009,
      0.47,
      0.4 + rand() * 0.084,
    );
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  mesh(
    s,
    g,
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  );
  // Irregular, stratified mesa skyline all the way round, not a flat backdrop.
  // Each mesa has its own uneven rim; shared vertices keep the strata contiguous.
  for (let i = 0; i < 21; i++) {
    const angle = i * 0.305,
      dist = 13 + rand() * 7,
      x = dist * Math.sin(angle),
      z = dist * Math.cos(angle),
      h = 0.9 + rand() * 3.25,
      r = 1.5 + rand() * 2.6,
      n = 8,
      pts = [],
      colors = [],
      idx = [];
    const rim = Array.from({ length: n }, () => 0.68 + rand() * 0.56),
      crest = rim.map(() => 0.85 + 0.23 * rand()),
      shade = [
        0xa45b43, 0xb7694c, 0xcf8761, 0x9d503c, 0xc47a56, 0xb97658, 0xa86649,
      ];
    for (const [j, [y, rad]] of [
      [0, 1.42],
      [0.27, 0.93],
      [0.51, 0.79],
      [0.55, 0.81],
      [0.61, 0.72],
      [0.93, 0.57],
      [1, 0.51],
    ].entries())
      for (let k = 0; k < n; k++) {
        const a = (k * Math.PI * 2) / n;
        pts.push(
          x + Math.sin(a) * r * rad * rim[k] + y * r * 0.16,
          h * y * crest[k] - 0.17,
          z + Math.cos(a) * r * rad * rim[k],
        );
        colors.push(...new T.Color(shade[j]).toArray());
        if (j) {
          const aa = (j - 1) * n + k,
            bb = (j - 1) * n + ((k + 1) % n);
          idx.push(aa, bb, aa + n, bb, bb + n, aa + n);
        }
      }
    for (let k = 1; k < n - 1; k++) idx.push(n * 6, n * 6 + k, n * 6 + k + 1);
    const rock = new T.BufferGeometry();
    rock.setAttribute("position", new T.Float32BufferAttribute(pts, 3));
    rock.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    rock.setIndex(idx);
    rock.computeVertexNormals();
    mesh(
      s,
      rock,
      new T.MeshLambertMaterial({
        vertexColors: true,
        side: T.DoubleSide,
        flatShading: true,
      }),
    );
  }
  const rocks = new T.InstancedMesh(
    new T.IcosahedronGeometry(1, 0),
    paint(0xffffff),
    350,
  );
  for (let i = 0; i < 350; i++) {
    let x = (rand() - 0.5) * 26,
      z = (rand() - 0.5) * 25,
      k = 0.035 + 0.27 * rand() ** 2;
    if (Math.abs(x) < 1.25 && Math.abs(z) < 0.8) k *= 0.14;
    v.set(x, k * 0.22 - 0.009, z);
    q.setFromEuler(new T.Euler(rand(), rand() * 6, rand()));
    sc.set(k * 1.55, k * 0.7, k);
    rocks.setMatrixAt(i, m.compose(v, q, sc));
    rocks.setColorAt(
      i,
      new T.Color().setHSL(0.047, 0.39, 0.23 + 0.28 * rand()),
    );
  }
  s.add(rocks);
  // Boot impressions: heel, sole and raised chevron ribs in regolith.
  const p = new T.Group();
  s.add(p);
  const stamps = [];
  for (let i = 0; i < 5; i++) {
    const o = new T.Group();
    p.add(o);
    o.position.set(-0.53 + i * 0.25, 0.003, (i % 2 ? -0.12 : 0.12) + 0.06);
    o.rotation.y = 1.24;
    oval(o, 0, 0, 0, 0.075, 0.012, 0.145, paint(0x753e32));
    for (let j = 0; j < 5; j++) {
      const b = box(
        o,
        0.095,
        0.008,
        0.016,
        paint(0xb27353),
        0,
        0.01,
        (j - 2) * 0.043,
      );
      b.rotation.y = (j % 2 ? 1 : -1) * 0.14;
    }
    stamps.push(o);
  }
  return {
    stamps,
    sampleSky: (t) => {
      if (sunset) sun.position.y = 3.6 - 2.4 * ease(t, 0, 2.0);
      sun.visible = !night;
    },
  };
}
function hab(s, c, m) {
  const base = new T.Group();
  s.add(base);
  base.position.set(-2.2, 0, -2.3);
  const shell = mesh(
    base,
    new T.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
    c.ivory,
    0,
    0.44,
    0,
  );
  shell.scale.set(1.85, 1.67, 1.52);
  const edges = new T.LineSegments(
    new T.EdgesGeometry(shell.geometry, 1),
    new T.LineBasicMaterial({ color: 0x6b6963 }),
  );
  shell.add(edges);
  cyl(base, 1.65, 1.82, 0.45, c.slate, 0, 0.22, 0);
  box(base, 1.2, 1.51, 0.56, c.orange, 0, 0.76, 1.34);
  box(base, 0.97, 1.36, 0.59, c.ink, 0, 0.69, 1.39);
  const hatch = box(base, 0.9, 1.29, 0.07, c.steel, 0, 0.68, 1.71);
  tag(hatch, 0.69, 0.22, 0, 0.04, 0.041, "AIRLOCK", "HAB 01");
  tag(base, 0.84, 0.18, 0, 1.44, 1.64, "HAB 01", "PRESSURIZED");
  box(base, 1.2, 0.09, 0.51, c.steel, 0, 0.045, 1.82);
  const solar = new T.Group();
  s.add(solar);
  solar.position.set(1.22, 0, -1.72);
  for (const dx of [-0.69, 0.69]) {
    cyl(solar, 0.055, 0.065, 0.82, c.steel, dx, 0.42, 0);
    const panel = new T.Group();
    solar.add(panel);
    panel.position.set(dx, 0.87, 0);
    panel.rotation.x = -0.74;
    box(panel, 1.28, 0.83, 0.053, c.ivory, 0, 0, 0);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 3; j++)
        box(
          panel,
          0.284,
          0.235,
          0.018,
          paint((i + j) % 2 ? 0x27476c : 0x32547a),
          -0.46 + i * 0.305,
          -0.26 + j * 0.26,
          0.04,
        );
  }
  const batt = box(solar, 0.74, 0.46, 0.42, c.slate, 0, 0.23, 0.53);
  tag(batt, 0.62, 0.17, 0, 0.03, 0.219, "BATTERY", "NIGHT RESERVE");
  const lights = [];
  for (let i = 0; i < 5; i++)
    lights.push(
      box(batt, 0.071, 0.038, 0.02, c.mint, -0.2 + i * 0.097, -0.11, 0.22),
    );
  solar.visible = m.base >= 2;
  const bank = new T.Group();
  base.add(bank);
  for (let j = 0; j < 3; j++)
    for (let i = 0; i < 7; i++) {
      const a = i * 0.83 + 0.6;
      oval(
        bank,
        Math.cos(a) * (1.73 - j * 0.53),
        0.6 + j * 0.54,
        Math.sin(a) * (1.35 - j * 0.4) - 0.12,
        0.87,
        0.46,
        0.74,
        paint(j % 2 ? 0xb56947 : 0xb87450),
      );
    }
  bank.visible = m.base >= 3;
  return (t) => {
    if (m.cue === "hatch") hatch.position.x = -0.88 * (1 - ease(t, 0.14, 1.25));
    if (m.cue === "solar")
      solar.scale.setScalar(0.03 + 0.97 * ease(t, 0.18, 1.04));
    if (m.cue === "shield") bank.position.y = 1.7 * (1 - ease(t, 0.18, 1.1));
    lights.forEach(
      (o, i) =>
        (o.visible =
          i < 1 + Math.floor(4 * ease(t, 0, 1.7)) || m.cue !== "charge"),
    );
  };
}
function cabin(s, c, m) {
  box(s, 7, 0.1, 6, c.steel, 0, -0.055, 0);
  box(s, 7, 3.3, 0.14, c.ivory, 0, 1.6, -1.4);
  for (const x of [-2.4, -0.8, 0.8, 2.4]) {
    box(s, 0.14, 3.3, 0.21, c.steel, x, 1.6, -1.28);
    box(s, 1.28, 0.045, 0.06, c.mint, x + 0.7, 2.47, -1.25);
  }
  box(s, 1.44, 2.15, 0.22, c.orange, -1.57, 1.08, -1.12);
  box(s, 1.25, 1.97, 0.24, c.slate, -1.57, 1.0, -1.09);
  tag(s, 0.93, 0.26, -1.57, 1.48, -0.96, "SEAL 01", "OUTER HATCH");
  const bars = [];
  for (let i = 0; i < 6; i++)
    bars.push(
      box(s, 0.112, 0.16, 0.035, c.mint, -1.96 + i * 0.16, 1.08, -0.946),
    );
  box(s, 1.87, 0.08, 0.63, c.steel, 0.99, 0.92, -0.94);
  for (const x of [0.15, 1.82])
    box(s, 0.075, 0.92, 0.5, c.slate, x, 0.45, -0.93);
  for (let i = 0; i < 3; i++) {
    cyl(s, 0.089, 0.1, 0.35, c.blue, 0.42 + i * 0.2, 1.13, -0.78);
    cyl(s, 0.055, 0.055, 0.05, c.ivory, 0.42 + i * 0.2, 1.33, -0.78);
  }
  for (let i = 0; i < 3; i++) {
    box(s, 0.28, 0.22, 0.13, c.gold, 1.1 + i * 0.22, 1.08, -0.81);
    box(s, 0.2, 0.045, 0.015, c.ivory, 1.1 + i * 0.22, 1.08, -0.735);
  }
  tag(s, 0.9, 0.18, 0.98, 0.82, -0.6, "SUPPLIES", "H2O   /   RATIONS");
  box(s, 0.86, 0.81, 0.18, c.slate, 1.16, 1.93, -1.15);
  const fan = new T.Group();
  s.add(fan);
  fan.position.set(1.17, 1.97, -1.02);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.256,
      b = box(
        fan,
        0.105,
        0.24,
        0.04,
        c.steel,
        Math.sin(a) * 0.145,
        Math.cos(a) * 0.145,
        0,
      );
    b.rotation.z = -a + 0.25;
  }
  const stop = m.cue === "fan_stop";
  tag(
    s,
    0.69,
    0.12,
    1.17,
    1.62,
    -1.03,
    "AIR CIRC.",
    stop ? "POWER LOSS" : "ONLINE",
  );
  box(s, 0.17, 0.15, 0.06, c.ink, 1.72, 1.7, -1.1);
  const plug = box(s, 0.09, 0.09, 0.09, c.orange, 1.72, 1.7, -1.03);
  tube(
    s,
    [
      [1.72, 1.65, -0.98],
      [1.69, 1.46, -0.97],
      [1.48, 1.51, -0.97],
      [1.43, 1.6, -1.0],
    ],
    0.019,
    c.slate,
  );
  return (t) => {
    const power = stop ? 1 - ease(t, 0.12, 0.85) : 1;
    fan.rotation.z = stop
      ? 6 * Math.min(t, 0.12) + 3 * (1 - Math.exp(-5 * Math.max(0, t - 0.12)))
      : t * 4.5;
    plug.position.z = -1.03 + 0.19 * (1 - power);
    bars.forEach(
      (b, i) =>
        (b.visible =
          m.cue !== "pressure" || i < 1 + Math.floor(6 * ease(t, 0.1, 1.8))),
    );
  };
}
export function marsSet(s, m, inside) {
  const c = palette();
  if (inside) return cabin(s, c, m);
  if (m.cue === "readout") {
    const g = new T.Group();
    s.add(g);
    g.position.set(0.73, 0, 0.46);
    cyl(g, 0.08, 0.19, 0.76, c.steel, 0, 0.38, 0);
    box(g, 0.97, 0.64, 0.17, c.ivory, 0, 0.88, 0);
    box(g, 0.89, 0.55, 0.035, c.ink, 0, 0.88, 0.1);
    tag(g, 0.75, 0.17, 0, 1.04, 0.123, "PRESSURE", "MEAN SURFACE");
    box(g, 0.47, 0.052, 0.016, c.mint, 0.1, 0.89, 0.124);
    box(g, 0.007, 0.052, 0.016, c.red, -0.131, 0.77, 0.124);
    tag(g, 0.24, 0.081, -0.27, 0.89, 0.126, "EARTH", "SEA LEVEL");
    tag(g, 0.24, 0.081, -0.27, 0.77, 0.126, "MARS", "< 1%");
  }
  const { stamps: prints, sampleSky } = landscape(
      s,
      m.cue === "night",
      m.cue === "sunset",
    ),
    sample = m.base ? hab(s, c, m) : null;
  // A low, ballistic spray marks the actual contact, not a looping magic cloud.
  const landing = m.cue === "step" || m.cue === "second_print";
  const grit = landing
    ? new T.InstancedMesh(
        new T.IcosahedronGeometry(0.012, 0),
        paint(0xb47750),
        28,
      )
    : null;
  if (grit) {
    grit.frustumCulled = false;
    s.add(grit);
  }
  const matrix = new T.Matrix4();
  return (t) => {
    sampleSky(t);
    if (grit) {
      const last = m.cue === "second_print",
        age = t - (last ? 0.54 : 0.22);
      grit.visible = age >= 0 && age < 0.66;
      if (grit.visible) {
        for (let i = 0; i < grit.count; i++) {
          const ang = i * 2.4,
            speed = 0.19 + 0.033 * (i % 7),
            rise = (0.45 + 0.07 * (i % 6)) * age - 1.9 * age * age;
          matrix
            .makeScale(1.35, 0.66, 1)
            .setPosition(
              (last ? -0.28 : -0.53) + Math.cos(ang) * age * speed,
              0.009 + Math.max(0, rise),
              (last ? -0.06 : 0.18) + Math.sin(ang) * age * speed,
            );
          grit.setMatrixAt(i, matrix);
        }
        grit.instanceMatrix.needsUpdate = true;
      }
    }

    prints.forEach(
      (p, i) =>
        (p.visible =
          m.cue === "second_print"
            ? i === 0 || (i === 1 && t > 0.54)
            : m.cue === "step"
              ? i === 0 && t > 0.22
              : i === 0),
    );
    sample?.(t);
  };
}

// Fit equipment to sampled world-space joints, not the FBX's import units.
export function bindMarsExplorer(item, scene, m) {
  const actor = item.node,
    smooth = ease;
  if (!m.kit)
    return (t) => {
      if (m.cue === "fall" || m.cue === "rewind" || m.cue === "lost") {
        const q =
          m.cue === "lost"
            ? 1
            : m.cue === "fall"
              ? smooth(t, 0.18, 1.62)
              : 1 - smooth(t, 0.15, 1.64);
        actor.rotation.z = -q * 1.55;
        actor.position.y += 0.16 * q;
      }
    };
  const c = palette(),
    gear = new T.Group();
  scene.add(gear);
  const bone = (n) => actor.getObjectByName("mixamorig" + n);
  const skinned = [];
  actor.traverse((o) => {
    if (o.isSkinnedMesh) skinned.push(o);
  });
  const chest = new T.Group(),
    helmet = new T.Group();
  gear.add(chest, helmet);
  oval(chest, 0, -0.04, 0, 0.267, 0.3, 0.18, c.ivory);
  box(chest, 0.33, 0.15, 0.09, c.slate, 0, -0.02, 0.154);
  box(chest, 0.28, 0.049, 0.013, c.orange, 0, 0.012, 0.207);
  box(chest, 0.065, 0.033, 0.014, c.mint, -0.08, -0.057, 0.207);
  cyl(chest, 0.208, 0.21, 0.08, c.slate, 0, -0.275, 0);
  oval(chest, 0, -0.33, 0, 0.21, 0.14, 0.145, c.ivory);
  oval(helmet, 0, 0.095, 0, 0.196, 0.204, 0.183, c.ivory);
  oval(helmet, 0, 0.106, 0.099, 0.176, 0.147, 0.12, paint(0x273745));
  oval(helmet, 0, 0.106, 0.124, 0.162, 0.131, 0.111, paint(0xa66f36));
  const sheen = box(
    helmet,
    0.116,
    0.024,
    0.009,
    paint(0xffda98, false),
    -0.047,
    0.164,
    0.215,
  );
  sheen.rotation.z = 0.18;
  cyl(helmet, 0.166, 0.179, 0.056, c.slate, 0, -0.075, 0);
  for (const x of [-0.189, 0.189])
    box(helmet, 0.041, 0.111, 0.085, c.orange, x, 0.1, 0.005);
  const links = [];
  for (const side of ["Right", "Left"])
    for (const [n1, n2, r1, r2] of [
      ["Arm", "ForeArm", 0.096, 0.089],
      ["ForeArm", "Hand", 0.087, 0.073],
      ["UpLeg", "Leg", 0.139, 0.11],
      ["Leg", "Foot", 0.116, 0.093],
    ]) {
      const group = new T.Group();
      gear.add(group);
      cyl(group, r2, r1, 1, c.ivory, 0, 0, 0);
      cyl(group, r1 * 1.04, r1 * 1.06, 0.16, c.slate, 0, -0.37, 0);
      cyl(group, r2 * 1.08, r2 * 1.1, 0.072, c.orange, 0, 0.31, 0);
      links.push([group, bone(side + n1), bone(side + n2)]);
    }
  const ends = [];
  for (const side of ["Right", "Left"]) {
    ends.push(
      [
        oval(gear, 0, 0, 0, 0.075, 0.092, 0.075, c.slate),
        bone(side + "Hand"),
        false,
      ],
      [
        box(gear, 0.17, 0.145, 0.31, c.slate, 0, 0, 0),
        bone(side + "Foot"),
        true,
      ],
    );
  }
  const tank = new T.Group(),
    filter = new T.Group(),
    cool = new T.Group();
  chest.add(tank, filter, cool);
  tank.visible = m.kit >= 2;
  filter.visible = m.kit >= 3;
  cool.visible = m.kit >= 4;
  box(tank, 0.38, 0.51, 0.18, c.steel, 0, -0.015, -0.18);
  for (const x of [-0.113, 0.113]) {
    cyl(tank, 0.105, 0.105, 0.34, c.blue, x, -0.065, -0.31);
    oval(tank, x, 0.101, -0.31, 0.104, 0.067, 0.104, c.blue);
    oval(tank, x, -0.23, -0.31, 0.104, 0.06, 0.104, c.blue);
    cyl(tank, 0.108, 0.108, 0.045, c.slate, x, -0.12, -0.31);
    cyl(tank, 0.044, 0.044, 0.061, c.gold, x, 0.18, -0.31);
  }
  const o2 = tag(tank, 0.147, 0.075, 0.1, -0.03, -0.416, "O2", "SUPPLY");
  o2.rotation.y = Math.PI;
  tube(
    tank,
    [
      [0.11, 0.2, -0.31],
      [0.24, 0.23, -0.08],
      [0.17, 0.18, 0.12],
      [0.12, 0.32, 0.11],
    ],
    0.027,
    c.steel,
  );
  box(filter, 0.19, 0.27, 0.16, c.gold, -0.22, -0.055, -0.25);
  for (let j = 0; j < 5; j++)
    box(filter, 0.16, 0.014, 0.018, c.slate, -0.22, -0.14 + j * 0.037, -0.338);
  const filtered = tag(
    filter,
    0.16,
    0.055,
    -0.22,
    0.04,
    -0.337,
    "CO2",
    "SCRUB",
  );
  filtered.rotation.y = Math.PI;
  const path = tube(
    filter,
    [
      [-0.2, 0.06, -0.26],
      [-0.29, 0.19, -0.13],
      [-0.24, 0.21, 0.1],
      [-0.14, 0.3, 0.11],
    ],
    0.026,
    c.slate,
  );
  const bead = oval(filter, 0, 0, 0, 0.03, 0.03, 0.03, c.mint);
  // Inset cutaway: show exhaled gas accumulating; the amber tracer stops at the cartridge.
  const waste = [];
  if (m.cue === "gas" || m.cue === "filter")
    for (let i = 0; i < 8; i++)
      waste.push(oval(chest, 0, 0, 0, 0.023, 0.023, 0.023, c.red));
  const loops = [];
  for (let j = 0; j < 4; j++)
    loops.push(
      tube(
        cool,
        [
          [-0.19, -0.17 + j * 0.075, 0.13],
          [-0.105, -0.19 + j * 0.075, 0.188],
          [0.115, -0.19 + j * 0.075, 0.19],
          [0.21, -0.14 + j * 0.075, 0.1],
        ],
        0.016,
        c.blue,
      ),
    );
  const coolant = oval(cool, 0, 0, 0, 0.026, 0.024, 0.026, c.mint);
  box(cool, 0.36, 0.36, 0.071, c.slate, 0.02, -0.055, -0.426);
  for (let j = 0; j < 8; j++)
    box(cool, 0.31, 0.013, 0.048, c.steel, 0.02, -0.2 + j * 0.042, -0.48);
  const up = new T.Vector3(0, 1, 0),
    a = new T.Vector3(),
    b = new T.Vector3(),
    delta = new T.Vector3();
  return (t) => {
    const suitOn = m.cue === "suit" ? smooth(t, 0.18, 1.16) : 1;
    const opening = m.cue === "unhelmet" ? smooth(t, 0.34, 1.26) : 0;
    skinned.forEach((o) => (o.visible = suitOn < 0.92 || opening > 0));
    gear.visible = suitOn > 0.01;
    const yaw = actor.rotation.y;
    bone("Spine2").getWorldPosition(chest.position);
    chest.rotation.y = yaw;
    chest.scale.setScalar(Math.max(0.01, suitOn));
    bone("Head").getWorldPosition(helmet.position);
    helmet.rotation.y = yaw;
    helmet.position.y += (1 - suitOn) * 0.48 + opening * 0.51;
    helmet.position.x += opening * 0.4;
    helmet.rotation.z = -opening * 0.45;
    helmet.visible = opening < 0.99;
    for (const [group, start, end] of links) {
      start.getWorldPosition(a);
      end.getWorldPosition(b);
      delta.subVectors(b, a);
      group.position.copy(a).lerp(b, 0.5);
      group.scale.set(suitOn, delta.length(), suitOn);
      group.quaternion.setFromUnitVectors(up, delta.normalize());
    }
    for (const [g, j, boot] of ends) {
      j.getWorldPosition(g.position);
      if (boot) g.scale.setScalar(suitOn);
      else g.scale.set(0.075 * suitOn, 0.092 * suitOn, 0.075 * suitOn);
      g.rotation.y = yaw;
      if (boot) {
        g.position.z += 0.048 * Math.cos(yaw);
        g.position.x += 0.048 * Math.sin(yaw);
      }
    }
    for (const [g, key] of [
      [tank, "tank"],
      [filter, "filter"],
      [cool, "coolant"],
    ]) {
      const lock = m.cue === key ? smooth(t, 0.16, 0.98) : 1;
      g.position.z = -(1 - lock) * 0.46;
      g.scale.setScalar(0.03 + 0.97 * lock);
    }
    for (let i = 0; i < waste.length; i++) {
      const u = (t * 0.68 + i / 8) % 1;
      const o = waste[i];
      o.visible = m.kit < 3 ? i < 2 + Math.floor(t * 4) : u < 0.86;
      o.position.set(
        -0.12 - 0.13 * Math.sin(u * Math.PI),
        0.34 - 0.3 * u,
        0.16 - 0.42 * u,
      );
    }
    path.getPoint((t * 0.78) % 1, bead.position);
    loops[1].getPoint((t * 0.88) % 1, coolant.position);
  };
}
