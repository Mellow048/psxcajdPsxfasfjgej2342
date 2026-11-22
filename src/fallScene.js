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
  for (let i = 0; i < 26; i++) {
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
    46,
  );
  const crown = new T.InstancedMesh(
    new T.ConeGeometry(0.85, 2.1, 6),
    paint(0x2c5c31),
    46,
  );
  trunk.frustumCulled = crown.frustumCulled = false;
  ground.add(trunk, crown);
  const tm = new T.Matrix4();
  for (let i = 0; i < 46; i++) {
    const inForest = rand() < 0.8,
      x = inForest ? 14 + (rand() - 0.5) * 17 : (rand() - 0.5) * 80,
      z = inForest ? -8 + (rand() - 0.5) * 17 : (rand() - 0.5) * 80,
      sc = 0.8 + rand() * 0.9;
    tm.makeScale(sc, sc, sc).setPosition(x, 0.35 * sc, z);
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
  // No floating labels: the patchwork terrain and VO carry the landing options;
  // pasted signboards read like UI and flattened the depth of the drop.
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
      roll = 0.35 * Math.sin(t * 1.4);
      pitch = -1.24;
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
