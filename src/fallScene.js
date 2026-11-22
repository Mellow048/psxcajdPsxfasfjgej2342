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
const ease = (t, a, b) => T.MathUtils.smoothstep(t, a, b);
function seed(n) {
  return () => (n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const ALT = [34, 16, 7, 0]; // how far below the origin the ground sits per step
const riverX = (z) => -8 + Math.sin(z * 0.16) * 5;
function groundColor(x, z, rand) {
  const c = new T.Color();
  if (Math.abs(x - riverX(z)) < 2.4) c.setHex(0x3d7ec2);
  else if ((x - 14) ** 2 + (z + 8) ** 2 < 10 * 10) c.setHex(0x2e5d33);
  else if ((x + 9) ** 2 + (z - 13) ** 2 < 8 * 8) c.setHex(0x8d8578);
  else if (x > 2 && x < 18 && z > 7 && z < 24) c.setHex(0xc2a054);
  else c.setHSL(0.26 + rand() * 0.04, 0.42, 0.3 + rand() * 0.1);
  return c;
}
export function fallSet(s, m) {
  const rand = seed(4242),
    alt = ALT[m.alt] ?? 16;
  // Sky dome: deep blue overhead, pale haze at the horizon. Dims when blacked out.
  const sky = mesh(
    s,
    new T.SphereGeometry(90, 30, 20),
    new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      uniforms: {
        lo: { value: new T.Color(0xcfe4f5) },
        hi: { value: new T.Color(0x1d4f8f) },
        dim: { value: 1 },
      },
      vertexShader:
        "varying float h; void main(){h=position.y/90.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
      fragmentShader:
        "varying float h; uniform vec3 hi; uniform vec3 lo; uniform float dim; void main(){vec3 c=mix(lo,hi,smoothstep(-.05,.6,h));gl_FragColor=vec4(mix(vec3(.02,.03,.06),c,dim),1.);}",
    }),
  );
  sky.renderOrder = -5;
  s.background = new T.Color(0xcfe4f5);
  s.fog.color.set(0xcfe4f5);
  s.fog.density = [0.02, 0.024, 0.02, 0.02][m.alt];
  const sun = oval(s, -18, 26, -60, 4.4, 4.4, 4.4, paint(0xfff3c4, false));
  // Cloud deck: chunky low-poly blobs drifting past, denser when high.
  const clouds = new T.Group();
  s.add(clouds);
  const cloudMat = paint(0xf4f8fb);
  const cloudPos = [];
  for (let i = 0; i < 44; i++) {
    const x = (rand() - 0.5) * 90,
      y = [2, 8, 16, 26][m.alt] + rand() * (m.alt === 0 ? 26 : 10),
      z = (rand() - 0.5) * 90,
      w = 2.5 + rand() * 5;
    cloudPos.push([x, y, z, w]);
    for (let j = 0; j < 3; j++)
      oval(
        clouds,
        x + (rand() - 0.5) * w,
        y + (rand() - 0.3) * 0.5,
        z + (rand() - 0.5) * w,
        w * (0.35 + rand() * 0.25),
        0.34 + rand() * 0.2,
        w * (0.3 + rand() * 0.2),
        cloudMat,
      );
  }
  // Ground: patchwork terrain far below, rising toward the camera as alt drops.
  const ground = new T.Group();
  s.add(ground);
  const g = new T.PlaneGeometry(96, 96, 40, 40);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position,
    col = [];
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i);
    const c = groundColor(x, z, rand);
    col.push(c.r, c.g, c.b);
  }
  g.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  mesh(
    ground,
    g,
    new T.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    0,
    0,
    0,
  );
  // River ribbon riding just above the terrain.
  const rg = new T.PlaneGeometry(96, 5.4, 48, 1);
  rg.rotateX(-Math.PI / 2);
  const rp = rg.attributes.position;
  for (let i = 0; i < rp.count; i++)
    rp.setX(i, rp.getX(i) + riverX(rp.getZ(i)));
  mesh(
    ground,
    rg,
    new T.MeshLambertMaterial({ color: 0x4f9ade, flatShading: true }),
    0,
    0.06,
    0,
  );
  // Trees: cones on trunks in the forest block, a few strays.
  const trunk = new T.InstancedMesh(
    new T.CylinderGeometry(0.09, 0.13, 0.7, 5),
    paint(0x5a4632),
    150,
  );
  const crown = new T.InstancedMesh(
    new T.ConeGeometry(0.85, 2.1, 6),
    paint(0x2f6336),
    150,
  );
  trunk.frustumCulled = crown.frustumCulled = false;
  ground.add(trunk, crown);
  const tm = new T.Matrix4();
  for (let i = 0; i < 150; i++) {
    const shade = rand() < 0.5 ? 1 : 1.18;
    const inForest = rand() < 0.8,
      x = inForest ? 14 + (rand() - 0.5) * 17 : (rand() - 0.5) * 80,
      z = inForest ? -8 + (rand() - 0.5) * 17 : (rand() - 0.5) * 80,
      sc = (0.62 + rand() * 1.15) * shade;
    tm.makeScale(sc, sc, sc).setPosition(x, 0.32 * sc, z);
    trunk.setMatrixAt(i, tm);
    tm.makeScale(sc, sc, sc).setPosition(x, (0.7 + 1.05) * sc, z);
    crown.setMatrixAt(i, tm);
  }
  // Rocks scattered over the rocky field.
  const rocks = new T.InstancedMesh(
    new T.DodecahedronGeometry(0.5, 0),
    paint(0x8d8578),
    34,
  );
  rocks.frustumCulled = false;
  ground.add(rocks);
  for (let i = 0; i < 34; i++) {
    const x = -9 + (rand() - 0.5) * 15,
      z = 13 + (rand() - 0.5) * 15,
      sc = 0.5 + rand() * 1.1;
    tm.makeRotationY(rand() * 6.28)
      .scale(new T.Vector3(sc, sc * 0.7, sc))
      .setPosition(x, 0.18 * sc, z);
    rocks.setMatrixAt(i, tm);
  }
  // Plowed rows across the farm field.
  const rows = new T.InstancedMesh(
    new T.BoxGeometry(0.5, 0.09, 13),
    paint(0xa8843e),
    26,
  );
  rows.frustumCulled = false;
  ground.add(rows);
  for (let i = 0; i < 26; i++) {
    tm.makeRotationY(0.12).setPosition(3.4 + i * 0.55, 0.05, 15.5);
    rows.setMatrixAt(i, tm);
  }
  // Horizon silhouettes: ridges and distant rooftops give the drop a sense of scale.
  const ridgeMat = paint(0x6f8291);
  const roofMat = paint(0x556270);
  const mountainData = [
    [-42, 4.8, -18, 18, 10.5], [-26, 3.2, -38, 14, 8.5], [-4, 5.6, -46, 22, 13],
    [18, 4.1, -39, 16, 9], [40, 5.2, -18, 19, 11], [46, 3.4, 8, 15, 8],
    [39, 4.5, 35, 17, 10], [12, 3.5, 46, 15, 7.5], [-17, 4.7, 44, 19, 10.5],
    [-42, 3.8, 19, 12, 8], [-46, 2.8, -5, 10, 7],
  ];
  for (const [x, y, z, w, h] of mountainData)
    mesh(ground, new T.ConeGeometry(w, h, 5), ridgeMat, x, h * 0.36, z).scale.y = 1.15;
  const skyline = new T.Group();
  ground.add(skyline);
  for (let i = 0; i < 22; i++) {
    const side = i % 2 ? 1 : -1,
      z = -34 + i * 3.1 + (rand() - 0.5) * 1.2,
      h = 0.8 + rand() * 2.3;
    box(skyline, 1.1 + rand() * 1.5, h, 1.1 + rand() * 1.2, roofMat, side * (34 + rand() * 8), h * 0.5, z);
  }
  // Two roads cut through the patchwork, converging toward the horizon.
  const roadMat = paint(0x514d46);
  const roadA = mesh(ground, new T.PlaneGeometry(2.8, 96), roadMat, 26, 0.035, 4);
  roadA.rotation.x = -Math.PI / 2;
  roadA.rotation.z = -0.24;
  const roadB = mesh(ground, new T.PlaneGeometry(1.8, 96), roadMat, -2, 0.04, 0);
  roadB.rotation.x = -Math.PI / 2;
  roadB.rotation.z = 0.58;
  // River: pale sandy banks hide under the blue ribbon; glints sell moving water.
  const bank = mesh(
    ground,
    new T.PlaneGeometry(96, 8.2, 48, 1),
    new T.MeshLambertMaterial({ color: 0xb8a36c, flatShading: true }),
    0,
    0.025,
    0,
  );
  bank.rotation.x = -Math.PI / 2;
  const bankPos = bank.geometry.attributes.position;
  for (let i = 0; i < bankPos.count; i++)
    bankPos.setX(i, bankPos.getX(i) + riverX(bankPos.getZ(i)));
  const glintMat = new T.MeshBasicMaterial({ color: 0xe8fbff });
  for (let i = 0; i < 54; i++) {
    const z = (rand() - 0.5) * 88,
      glint = mesh(ground, new T.PlaneGeometry(0.55 + rand() * 1.1, 0.08 + rand() * 0.08), glintMat, riverX(z) + (rand() - 0.5) * 3.8, 0.1, z);
    glint.rotation.x = -Math.PI / 2;
    glint.rotation.z = rand() * Math.PI;
  }
  // Village: a lived-in landing bad idea on the western ridge.
  const village = new T.Group();
  ground.add(village);
  village.position.set(-19, 0, -16);
  const wallMats = [0xe5dcc8, 0xd4c7a8, 0xc8d0d2, 0xb9a98e].map((c) => paint(c));
  const roofMats = [0x7d3f32, 0x59606a, 0x8b5a38].map((c) => paint(c));
  const houseOffsets = [
    [-4.8, -3.8], [-2.2, -4.6], [0.7, -4.1], [3.8, -2.8], [-5.2, -0.6], [-2.5, -1.2],
    [0.4, -0.4], [3.3, 0.8], [-4.1, 2.8], [-1.1, 2.1], [1.9, 3.6], [5.0, 3.2],
  ];
  for (let i = 0; i < houseOffsets.length; i++) {
    const [x, z] = houseOffsets[i],
      w = 0.9 + rand() * 0.45,
      h = 0.65 + rand() * 0.35,
      d = 0.75 + rand() * 0.4;
    box(village, w, h, d, wallMats[i % wallMats.length], x, h * 0.5, z);
    const roof = mesh(village, new T.ConeGeometry(Math.max(w, d) * 0.72, 0.55 + rand() * 0.25, 4), roofMats[i % roofMats.length], x, h + 0.28, z);
    roof.rotation.y = Math.PI / 4;
  }
  box(village, 0.65, 3.2, 0.65, paint(0xd8d3c0), 0.2, 1.6, 0.8);
  const spire = mesh(village, new T.ConeGeometry(0.72, 1.4, 4), paint(0x59606a), 0.2, 3.85, 0.8);
  spire.rotation.y = Math.PI / 4;
  // Farm: barn, farmhouse, silo, fence and dense wheat for the survivable option.
  const farm = new T.Group();
  ground.add(farm);
  farm.position.set(10, 0, 15.5);
  box(farm, 2.2, 1.15, 1.5, paint(0xb44a32), 5.2, 0.58, 1.2);
  const barnRoof = mesh(farm, new T.ConeGeometry(1.75, 0.9, 4), paint(0x6f3128), 5.2, 1.6, 1.2);
  barnRoof.rotation.y = Math.PI / 4;
  box(farm, 1.65, 1.05, 1.25, paint(0xe4d9b8), -5.4, 0.52, 1.6);
  const houseRoof = mesh(farm, new T.ConeGeometry(1.38, 0.72, 4), paint(0x59606a), -5.4, 1.4, 1.6);
  houseRoof.rotation.y = Math.PI / 4;
  cyl(farm, 0.48, 0.48, 1.8, paint(0xbfc7c9), 6.2, 0.9, -1.1, 10);
  const windmill = new T.Group();
  windmill.position.set(6.8, 0, 3.8);
  farm.add(windmill);
  cyl(windmill, 0.08, 0.13, 2.8, paint(0x6d6a62), 0, 1.4, 0, 6);
  for (let i = 0; i < 6; i++) {
    const blade = box(windmill, 0.07, 1.15, 0.06, paint(0xd9d7cb), 0, 2.8, 0);
    blade.rotation.z = (i * Math.PI) / 3;
    blade.position.x = Math.cos(blade.rotation.z) * 0.5;
    blade.position.y = 2.8 + Math.sin(blade.rotation.z) * 0.5;
  }
  const wheat = new T.InstancedMesh(
    new T.ConeGeometry(0.055, 0.72, 4),
    paint(0xd6b95a),
    240,
  );
  wheat.frustumCulled = false;
  farm.add(wheat);
  for (let i = 0; i < wheat.count; i++) {
    const x = (rand() - 0.5) * 11.2,
      z = (rand() - 0.5) * 7.2,
      sc = 0.75 + rand() * 0.65;
    tm.makeScale(sc, sc, sc).setPosition(x, 0.34 * sc, z);
    wheat.setMatrixAt(i, tm);
  }
  const fenceMat = paint(0x6e5638);
  for (let i = 0; i < 9; i++) {
    box(farm, 0.08, 0.68, 0.08, fenceMat, -5.4 + i * 1.35, 0.34, -3.8);
    box(farm, 1.28, 0.07, 0.07, fenceMat, -4.72 + i * 1.35, 0.56, -3.8);
  }
  // Scorched craters make the rocky option read as dangerous from altitude.
  const craterMat = paint(0x4c4741);
  for (const [x, z, r] of [[-12, 10, 1.1], [-5, 17, 0.8], [-11, 16.5, 1.4]]) {
    const crater = cyl(ground, r * 0.75, r, 0.035, craterMat, x, 0.02, z, 12);
    crater.scale.y = 0.25;
  }
  // The wreck: fuselage, wing and tail tumbling away with fire and smoke.
  const wreck = new T.Group();
  s.add(wreck);
  const hull = paint(0xd8dde2),
    accent = paint(0xd4552f);
  const body = cyl(wreck, 0.55, 0.55, 4.6, hull, 0, 0, 0, 10);
  body.rotation.z = Math.PI / 2;
  box(wreck, 0.12, 0.1, 5.4, accent, -0.7, 0, 0);
  box(wreck, 4.6, 0.14, 1.1, hull, 0, 0.28, 0);
  box(wreck, 1.5, 0.12, 0.8, accent, 2.6, 0.1, 0);
  box(wreck, 0.14, 1.6, 0.9, accent, 2.55, 0.75, 0);
  const fire = new T.InstancedMesh(
    new T.IcosahedronGeometry(0.16, 0),
    paint(0xffa63e, false),
    16,
  );
  const smoke = new T.InstancedMesh(
    new T.IcosahedronGeometry(0.3, 0),
    new T.MeshLambertMaterial({
      color: 0x3a3f45,
      flatShading: true,
      transparent: true,
      opacity: 0.8,
    }),
    12,
  );
  fire.frustumCulled = smoke.frustumCulled = false;
  wreck.add(fire, smoke);
  // Wind streaks: fast white lines that sell the speed when tumbling.
  const streaks = new T.InstancedMesh(
    new T.BoxGeometry(0.02, 1.6, 0.02),
    new T.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
    }),
    26,
  );
  streaks.frustumCulled = false;
  s.add(streaks);
  const sm = new T.Matrix4(),
    q = new T.Quaternion();
  const streakSeed = [];
  for (let i = 0; i < 26; i++)
    streakSeed.push([(rand() - 0.5) * 7, rand() * 7, (rand() - 0.5) * 7]);
  // A soft white burst where the plane came apart.
  const flash = oval(s, 0, 0, 0, 1, 1, 1, paint(0xfff6d8, false));
  return (t, gt) => {
    const blacked = m.cue === "blackout",
      dimTarget = blacked ? 0.06 : 1;
    sky.material.uniforms.dim.value +=
      (dimTarget - sky.material.uniforms.dim.value) * 0.08;
    s.fog.density = [0.02, 0.024, 0.02, 0.02][m.alt] + (blacked ? 0.05 : 0);
    for (const [i, [x, y, z, w]] of cloudPos.entries())
      clouds.children[i * 3].position.x =
        x + ((gt * (0.25 + (i % 5) * 0.09)) % 100) - 50;
    // Ground rises as altitude burns off; on the landing shots it arrives.
    const rise =
      m.cue === "land" || m.cue === "alive" || m.alt === 3
        ? ease(t, 0.0, 0.55) * 0
        : 0;
    ground.position.y = -alt + rise + (m.alt === 3 ? 0 : 0);
    if (m.alt === 3) ground.position.y = 0;
    else ground.position.y = -alt + Math.sin(gt * 0.7) * 0.05;
    // Wreck only hangs around in the high-altitude opening.
    const wreckOn = m.alt === 0 && (m.cue === "blast" || m.cue === "debris");
    wreck.visible = wreckOn;
    flash.visible = m.cue === "blast" && t < 0.9;
    if (wreckOn) {
      wreck.position.set(2.6 - t * 0.9, 3.2 - t * 0.55, -7);
      wreck.rotation.x = t * 0.7;
      wreck.rotation.z = t * 0.45;
      const fm = new T.Matrix4();
      for (let i = 0; i < fire.count; i++) {
        const a = i * 2.4 + t * 6,
          r = 0.5 + (i % 4) * 0.16;
        fm.makeScale(1, 0.6 + 0.4 * Math.sin(t * 9 + i), 1).setPosition(
          2.4 + Math.cos(a) * r,
          -0.2 + Math.sin(a * 1.3) * r * 0.4 + (i % 3) * 0.22,
          -0.4 + Math.sin(a) * r,
        );
        fire.setMatrixAt(i, fm);
      }
      fire.instanceMatrix.needsUpdate = true;
      for (let i = 0; i < smoke.count; i++) {
        const age = (t * 0.5 + i / 12) % 1;
        fm.makeScale(1 + age * 3, 1 + age * 2.4, 1 + age * 3).setPosition(
          2.4 + age * 1.6,
          0.2 + age * 3.4,
          -0.4 - age * 1.2,
        );
        smoke.setMatrixAt(i, fm);
      }
      smoke.instanceMatrix.needsUpdate = true;
    }
    if (flash.visible) {
      const k = 1 + t * 9;
      flash.scale.set(k, k, k);
      flash.position.set(2.6 - t * 0.9, 3.2 - t * 0.55, -7);
    }
    // Wind streaks only during the fast tumble.
    const streakOn = ["fall", "tumble", "wake", "scan", "low"].includes(m.cue);
    streaks.visible = streakOn;
    if (streakOn)
      for (let i = 0; i < streaks.count; i++) {
        const [x, , z] = streakSeed[i],
          y = ((((streakSeed[i][1] - gt * (5 + (i % 5))) % 7) + 7) % 7) - 2.5;
        q.setFromEuler(new T.Euler(0.25, 0, 0.12));
        sm.compose(new T.Vector3(x, y, z), q, new T.Vector3(1, 1, 1));
        streaks.setMatrixAt(i, sm);
      }
    streaks.instanceMatrix.needsUpdate = true;
  };
}
const bone = (actor, n) => actor.getObjectByName("mixamorig" + n);
export function bindFaller(item, scene, m) {
  const actor = item.node;
  const L = bone(actor, "LeftArm"),
    R = bone(actor, "RightArm"),
    LL = bone(actor, "LeftUpLeg"),
    RL = bone(actor, "RightUpLeg"),
    H = bone(actor, "Head");
  const base = item.def.position ?? [0, 0, 0];
  return (t) => {
    const p = m.cue;
    actor.position.x = base[0];
    actor.position.z = base[2];
    // Belly-down freefall: pitch the body flat and roll about the long axis,
    // never upright circling.
    let y = base[1],
      pitch = -Math.PI / 2,
      roll = t * 1.6,
      arm = 1.45,
      leg = 0.18,
      head = 0;
    if (p === "blast" || p === "debris") {
      roll = t * 2.4;
      pitch = -1.34 + 0.18 * Math.sin(t * 3);
      arm = 1.0 + 0.5 * Math.sin(t * 6);
    } else if (p === "thin") {
      roll = t * 0.45;
      pitch = -1.28;
      arm = 0.5;
      head = 0.55 * ease(t, 0.2, 2.4);
    } else if (p === "blackout") {
      roll = t * 0.18;
      pitch = -1.16;
      arm = 0.3;
      head = 0.95;
    } else if (p === "wake") {
      roll = (1 - ease(t, 0.2, 1.6)) * 2.0;
      pitch = -1.5;
      arm = 0.62 + 1.05 * ease(t, 0.3, 1.8);
      head = 0.95 - 0.95 * ease(t, 0.3, 1.4);
    } else if (p === "fall" || p === "tumble") {
      roll = t * 1.7;
      pitch = -1.5 + 0.16 * Math.sin(t * 4);
      arm = 1.25 + 0.2 * Math.sin(t * 5);
      leg = 0.22;
    } else if (["scan", "steer", "farm", "low"].includes(p)) {
      roll = 0.28 * Math.sin(t * 1.4);
      pitch = -1.12;
      arm = 1.55;
      leg = 0.25;
    } else if (p === "brace") {
      roll = 0;
      pitch = -1.55;
      arm = 0.15;
      leg = 0.02;
    } else if (p === "land") {
      const hit = ease(t, 0.42, 0.62);
      y = base[1] * (1 - hit) + 0.06 * hit;
      pitch = -Math.PI / 2 + hit * (Math.PI / 2 + Math.PI * 0.85);
      roll = hit * 3.5;
      arm = 1.3;
      leg = 0.1;
    } else if (p === "alive") {
      const stand = ease(t, 0.1, 0.7);
      y = 0.02 + 0.05 * Math.sin(t * 6);
      pitch = -Math.PI / 2 + stand * (Math.PI / 2);
      roll = 0;
      arm = 0.3 + stand * 0.2;
      actor.position.x = base[0] + stand * t * 0.55;
    }
    actor.position.y = y;
    actor.rotation.set(pitch, 0, roll);
    if (L && R) {
      L.rotation.z = arm;
      R.rotation.z = -arm;
    }
    if (LL && RL) {
      LL.rotation.x = leg;
      RL.rotation.x = leg;
    }
    if (H) H.rotation.x = head;
  };
}
