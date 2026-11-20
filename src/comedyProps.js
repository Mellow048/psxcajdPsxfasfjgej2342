import * as T from "three";

// Geometry, not billboards: the silhouette and shading change with camera angle.
const luminous = (color, emission = 0.45) =>
  new T.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: emission,
    flatShading: true,
    roughness: 0.5,
  });
function part(root, geometry, mat, x = 0, y = 0, z = 0) {
  const m = new T.Mesh(geometry, mat);
  m.position.set(x, y, z);
  root.add(m);
  return m;
}
function ring(root, r, y, mat) {
  const m = part(root, new T.TorusGeometry(r, 0.035, 5, 12), mat, 0, y);
  m.rotation.x = Math.PI / 2;
}
function icon(root, kind) {
  if (kind === "Sun") {
    const gold = luminous(0xffbc41);
    part(root, new T.IcosahedronGeometry(0.35, 1), gold);
    for (let i = 0; i < 9; i++) {
      const a = (i * 2 * Math.PI) / 9;
      part(
        root,
        new T.ConeGeometry(0.085, 0.25, 4),
        gold,
        -0.46 * Math.sin(a),
        0.46 * Math.cos(a),
      ).rotation.z = a;
    }
  } else if (kind === "Moon") {
    const s = new T.Shape();
    s.moveTo(0.24, 0.49);
    s.bezierCurveTo(-0.64, 0.57, -0.65, -0.59, 0.25, -0.49);
    s.bezierCurveTo(-0.18, -0.23, -0.18, 0.25, 0.24, 0.49);
    part(
      root,
      new T.ExtrudeGeometry(s, {
        depth: 0.14,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.035,
        bevelSegments: 1,
        curveSegments: 7,
      }),
      luminous(0xcbd4ff),
    );
  } else if (kind === "Lightbulb") {
    part(
      root,
      new T.IcosahedronGeometry(0.34, 1),
      luminous(0xffdf83, 0.8),
      0,
      0.16,
    );
    part(
      root,
      new T.CylinderGeometry(0.24, 0.14, 0.31, 8),
      luminous(0xffc458),
      0,
      -0.12,
    );
    const metal = luminous(0x788ba4, 0.1);
    part(root, new T.CylinderGeometry(0.15, 0.1, 0.24, 8), metal, 0, -0.36);
    for (const y of [-0.29, -0.36, -0.43]) ring(root, 0.145, y, metal);
  } else {
    part(
      root,
      new T.SphereGeometry(0.43, 12, 8),
      luminous(0xffeae0, 0.2),
    ).scale.set(1, 0.91, 0.87);
    part(
      root,
      new T.SphereGeometry(0.23, 10, 6),
      luminous(0x56d5cf),
      0,
      0,
      0.31,
    ).scale.z = 0.39;
    part(
      root,
      new T.SphereGeometry(0.113, 8, 6),
      luminous(0x172735, 0.07),
      0,
      0,
      0.392,
    ).scale.z = 0.3;
    part(
      root,
      new T.IcosahedronGeometry(0.04),
      luminous(0xffffee),
      -0.05,
      0.048,
      0.427,
    );
  }
}
export function createSpawn(ev) {
  const node = new T.Group(),
    arrow = ev.asset === "3D_Arrow";
  if (arrow) {
    const warm = luminous(0xffaa41, 0.65);
    part(node, new T.CylinderGeometry(0.105, 0.105, 0.55, 6), warm, 0, -0.14);
    part(
      node,
      new T.ConeGeometry(0.245, 0.45, 6),
      luminous(0xffdf82, 0.75),
      0,
      0.33,
    );
    part(
      node,
      new T.CylinderGeometry(0.14, 0.14, 0.065, 6),
      luminous(0xfff1b1),
      0,
      -0.34,
    );
  } else icon(node, ev.icon);
  const from = new T.Vector3().fromArray(arrow ? ev.from : ev.position),
    to = arrow ? new T.Vector3().fromArray(ev.to) : null;
  if (arrow)
    node.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      new T.Vector3().subVectors(to, from).normalize(),
    );
  // A low-poly additive shell gives a rim of light without a full-resolution bloom pass.
  const shell = node.children[0].clone();
  shell.material = new T.MeshBasicMaterial({
    color: arrow ? 0xffb43f : node.children[0].material.color,
    transparent: true,
    opacity: 0.2,
    blending: T.AdditiveBlending,
    depthWrite: false,
    side: T.BackSide,
  });
  shell.scale.multiplyScalar(1.18);
  node.add(shell);
  return { node, ev, from, to };
}
export function sampleSpawn({ node, ev, from, to }, shotTime) {
  const t = shotTime - ev.time;
  node.position.copy(from);
  node.visible = t >= 0;
  if (t < 0) {
    node.scale.setScalar(0);
    return;
  }
  const pop =
    t < 0.14
      ? 1.2 * (1 - (1 - t / 0.14) ** 2)
      : t < 0.32
        ? 1 + 0.2 * (1 - (t - 0.14) / 0.18) ** 2
        : 1;
  node.scale.setScalar((ev.size ?? 0.65) * pop);
  if (to) {
    const q = Math.min(1, t / ev.travel);
    node.position.lerp(to, q * q * (3 - 2 * q));
  } else {
    if (ev.icon === "Eyeball")
      node.rotation.set(
        0.16 * Math.sin(t * 3),
        0.62 * Math.sin(t * 2.3),
        t * 1.8,
      );
    else
      node.rotation.set(
        0.14 * Math.sin(t * 3),
        t * 2.3,
        0.09 * Math.sin(t * 3.3),
      );
    node.position.y += 0.09 * Math.sin(t * 4.3);
  }
}
