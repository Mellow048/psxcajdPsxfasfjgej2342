import * as T from "three";
const canonical = (n) =>
  n
    .toLowerCase()
    .replace(/^.*mixamorig[:_]?/, "")
    .replace(/[^a-z0-9]/g, "");
function rotationTracks(source, bones) {
  const tracks = [];
  for (const tr of source?.tracks ?? []) {
    const dot = tr.name.lastIndexOf("."),
      name = canonical(tr.name.slice(0, dot)),
      bone = bones.get(name);
    // Drop every translation (including Hips/root motion), scale and non-bone track.
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
  if (source && !tracks.length)
    throw Error(`No compatible bone rotations in ${source.name}`);
  return tracks;
}
// Aim in studio space during baking, then store local joint quaternions. This
// does not assume that +X on a Mixamo arm means the same as +X on a ghost arm.
function aim(bone, child, dir) {
  if (!bone || !child) return;
  const here = bone.getWorldPosition(new T.Vector3()),
    from = child.getWorldPosition(new T.Vector3()).sub(here);
  if (from.lengthSq() < 1e-10) return;
  const world = bone.getWorldQuaternion(new T.Quaternion()),
    parent = bone.parent.getWorldQuaternion(new T.Quaternion());
  world.premultiply(
    new T.Quaternion().setFromUnitVectors(
      from.normalize(),
      new T.Vector3(...dir).normalize(),
    ),
  );
  bone.quaternion.copy(parent.invert().multiply(world));
}
function gestureTracks(bones, action, period) {
  const head = bones.get("head"),
    spine = bones.get("spine");
  const arms = ["right", "left"].map((side) => {
    const short = side[0];
    return [
      bones.get(side + "arm") ?? bones.get(short + "shoulder"),
      bones.get(side + "forearm") ?? bones.get(short + "forearm"),
      bones.get(side + "hand") ?? bones.get(short + "hand"),
    ];
  });
  const joints = [spine, head, ...arms.flatMap((a) => a.slice(0, 2))].filter(
    Boolean,
  );
  const rest = joints.map((b) => b.quaternion.clone()),
    values = joints.map(() => []),
    times = [];
  for (let i = 0; i <= 24; i++) {
    joints.forEach((b, j) => b.quaternion.copy(rest[j]));
    const w = Math.sin((2 * Math.PI * i) / 24),
      beat = Math.cos((4 * Math.PI * i) / 24);
    times.push((period * i) / 24);
    spine?.rotateX(0.055 * w + (action === "shocked" ? -0.14 : 0));
    head?.rotateY((action === "thinking" ? 0.22 : 0.09) * w);
    head?.rotateZ(action === "thinking" ? -0.19 : 0.035 * beat);
    arms.forEach(([arm, elbow, hand], j) => {
      const side = j === 0 ? -1 : 1;
      let upper = [side * 0.28, -0.93, 0.18 + 0.05 * w],
        lower = [side * 0.1, -0.85, 0.35 + 0.09 * w];
      if (action === "talking") {
        upper = [side * 0.53, -0.57, 0.61];
        lower = [side * 0.2, 0.46 + 0.35 * (j ? -w : w), 0.84];
      }
      if (action === "pointing" && !j) {
        upper = [-0.62, 0.06 + 0.12 * w, 0.86];
        lower = [-0.56, 0.14, 0.9];
      }
      if (action === "thinking" && !j) {
        upper = [-0.22, -0.7, 0.72];
        lower = [0.42, 0.89, 0.08 + 0.07 * w];
      }
      if (action === "shocked") {
        upper = [side * 0.88, 0.34 + 0.18 * w, 0.2];
        lower = [side * 0.28, 0.84, 0.35];
      }
      aim(arm, elbow, upper);
      aim(elbow, hand, lower);
    });
    joints.forEach((b, j) => values[j].push(...b.quaternion.toArray()));
  }
  joints.forEach((b, j) => b.quaternion.copy(rest[j]));
  return joints.map(
    (b, j) =>
      new T.QuaternionKeyframeTrack(b.name + ".quaternion", times, values[j]),
  );
}
export function bindPerformance(
  root,
  source,
  motion = "idle_breathe",
  explicit = false,
) {
  const bones = new Map();
  root.traverse((o) => {
    if (o.isBone) bones.set(canonical(o.name), o);
  });
  if (!bones.size) {
    if (explicit) throw Error("Cannot bind an FBX clip to an unrigged subject");
    return null;
  }
  const base = rotationTracks(source, bones),
    period = source?.duration > 0.2 ? source.duration : 1.8;
  // Imported named takes can be used as-is. The shipped anonymous takes need
  // directed acting; replace only our gesture joints, retaining other FBX tracks.
  const gestures =
    explicit &&
    base.some(
      (tr) =>
        tr.times.length > 1 &&
        tr.values.some(
          (v, i) => i >= 4 && Math.abs(v - tr.values[i % 4]) > 0.01,
        ),
    )
      ? []
      : gestureTracks(bones, motion, period);
  const controlled = new Set(gestures.map((t) => t.name));
  const tracks = [...base.filter((t) => !controlled.has(t.name)), ...gestures];
  if (!tracks.length)
    throw Error("Rig has no supported joints or animation tracks");
  const mixer = new T.AnimationMixer(root);
  mixer
    .clipAction(new T.AnimationClip(motion, period, tracks))
    .reset()
    .setLoop(T.LoopRepeat, Infinity)
    .play();
  return mixer;
}
export function pose({ node, def, mixer }, t) {
  let y = 0.035 * Math.sin(t * 3),
    a = 0.045 * Math.sin(t * 2),
    z = 0,
    k = 1;
  switch (def.motion) {
    case "float_spin":
      y += 0.12 * Math.sin(t * 2.5);
      a += 0.7 * t;
      break;
    case "pointing":
      z = 0.08 + 0.04 * Math.sin(t * 4);
      break;
    case "thinking":
      z = -0.07 + 0.025 * Math.sin(t * 2);
      break;
    case "talking":
      z = 0.06 * Math.sin(7 * t);
      break;
    case "shocked":
      k += 0.14 * Math.exp(-2 * t) * Math.sin(12 * t);
      y += 0.17 * Math.abs(Math.sin(t * 4));
      break;
    case "pop_in":
      k = Math.max(0.025, 1 - Math.exp(-7 * t) * Math.cos(t * 10));
      break;
  }
  node.position.fromArray(def.position ?? [0, 0, 0]);
  node.position.y += y;
  node.rotation.set(0, (def.yaw ?? 0) + a, z);
  node.scale.set(k, k * (1 + 0.015 * Math.sin(3 * t)), k);
  mixer?.setTime(t);
}
