import * as T from "three";
const canonical = (n) =>
  n
    .toLowerCase()
    .replace(/^.*mixamorig[:_]?/, "")
    .replace(/[^a-z0-9]/g, "");
// Retarget rotation only between homologous rigs. Correct the initial hip heading, not its pitch/roll.
export function bindClip(source, root) {
  const bones = new Map();
  root.traverse((o) => {
    if (o.isBone) bones.set(canonical(o.name), o);
  });
  const tracks = [];
  for (const tr of source.tracks) {
    const dot = tr.name.lastIndexOf("."),
      name = canonical(tr.name.slice(0, dot)),
      bone = bones.get(name);
    if (!bone || tr.name.slice(dot) !== ".quaternion") continue;
    const copy = tr.clone();
    copy.name = bone.name + ".quaternion";
    if (name === "hips") {
      const q = new T.Quaternion().fromArray(copy.values),
        yaw = (v) => new T.Euler().setFromQuaternion(v, "YXZ").y;
      const fix = new T.Quaternion().setFromAxisAngle(
        new T.Vector3(0, 1, 0),
        yaw(bone.quaternion) - yaw(q),
      );
      for (let i = 0; i < copy.values.length; i += 4)
        q.fromArray(copy.values, i)
          .premultiply(fix)
          .normalize()
          .toArray(copy.values, i);
    }
    tracks.push(copy);
  }
  if (!tracks.length) throw Error("Clip has no compatible bone rotations");
  const mixer = new T.AnimationMixer(root);
  mixer
    .clipAction(new T.AnimationClip(source.name, source.duration, tracks))
    .play();
  return mixer;
}
export function pose(item, t) {
  const { node, def, mixer } = item;
  let y = 0.035 * Math.sin(t * 3),
    a = 0.035 * Math.sin(t * 2),
    z = 0,
    k = 1;
  switch (def.motion) {
    case "float_spin":
      y += 0.12 * Math.sin(t * 2.5);
      a += 0.42 * t;
      break;
    case "point":
      z = 0.12 + 0.07 * Math.sin(t * 4);
      break;
    case "talk_gesture":
      z = 0.06 * Math.sin(7 * t);
      break;
    case "shock":
      k += 0.12 * Math.exp(-2 * t) * Math.sin(12 * t);
      y += 0.2 * Math.abs(Math.sin(t * 4));
      break;
    case "pop_in":
      k = Math.max(0.025, 1 - Math.exp(-7 * t) * Math.cos(t * 10));
      break;
  }
  node.position.fromArray(def.position ?? [0, 0, 0]);
  node.position.y += y;
  node.rotation.set(0, (def.yaw ?? 0) + a, z);
  node.scale.set(k, k * (1 + 0.012 * Math.sin(3 * t)), k);
  mixer?.setTime(t);
  if (item.arm && !mixer) {
    item.arm.bone.quaternion.copy(item.arm.rest);
    if (["point", "talk_gesture"].includes(def.motion))
      item.arm.bone.rotateZ(0.55 + 0.23 * Math.sin(t * 5));
  }
}
