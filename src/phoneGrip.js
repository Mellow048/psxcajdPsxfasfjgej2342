import * as T from "three";
import { aim } from "./animationLibrary.js";
const V = (x = 0, y = 0, z = 0) => new T.Vector3(x, y, z);
const world = (b) => b.getWorldPosition(V());
// Orient the palm from two measured axes of this skeleton rather than assuming
// its FBX bone roll. Finger roots (not the wrist joint) meet the case edges.
function basis(forward, across) {
  const x = forward.clone().normalize(),
    z = x.clone().cross(across).normalize();
  return new T.Quaternion().setFromRotationMatrix(
    new T.Matrix4().makeBasis(x, z.clone().cross(x), z),
  );
}
export function bindPhoneGrip(actor, phone, view) {
  const bones = {};
  actor.traverse((o) => {
    if (o.isBone)
      bones[o.name.toLowerCase().replace(/^.*mixamorig[:_]?/, "")] = o;
  });
  const neck = bones.neck,
    neckRest = neck.quaternion.clone();
  const grips = ["right", "left"].map((side, i) => {
    const sign = i ? -1 : 1,
      arm = bones[side + "arm"],
      elbow = bones[side + "forearm"],
      hand = bones[side + "hand"];
    const finger = (n) => bones[side + "hand" + n],
      middle = finger("index1");
    // This compact FBX has a single articulated index chain on each hand.
    const local = (b) => hand.worldToLocal(world(b));
    const up = V(0, 1, 0).applyQuaternion(
      hand.getWorldQuaternion(new T.Quaternion()).invert(),
    );
    const palm = basis(local(middle), up).invert();
    const bind = [arm, elbow, hand].map((b) => b.quaternion.clone());
    const knuckle = world(middle).distanceTo(world(hand));
    const chain = Array.from({ length: 4 }, (_, k) =>
      finger("index" + (k + 1)),
    );
    const fingerRest = chain.map((b) => b.quaternion.clone());
    return (tap) => {
      [arm, elbow, hand].forEach((b, k) => b.quaternion.copy(bind[k]));
      chain.forEach((b, k) => b.quaternion.copy(fingerRest[k]));
      // Targets are metres in the oriented phone frame. Opposed palms cradle
      // the two rails; knuckles sit just behind the glass, thumbs on its face.
      const rot = phone.quaternion,
        dir = (v) => v.applyQuaternion(rot),
        pos = (v) => dir(v).add(phone.position);
      const forward = dir(V(-sign * 0.65, 0.52, -0.57)).normalize();
      const desired = basis(forward, dir(V(sign, 0.0, 0.5))).multiply(palm);
      const wrist = pos(
        V(sign * 0.065, -0.053 - (i ? 0.014 : 0), -0.033),
      ).addScaledVector(forward, -knuckle);
      const shoulder = world(arm),
        l1 = shoulder.distanceTo(world(elbow)),
        l2 = world(elbow).distanceTo(world(hand));
      const axis = wrist.clone().sub(shoulder),
        d = T.MathUtils.clamp(
          axis.length(),
          Math.abs(l1 - l2) + 0.001,
          l1 + l2 - 0.001,
        );
      axis.normalize();
      const pole = dir(V(sign * 0.65, -1, 0.45));
      pole.addScaledVector(axis, -pole.dot(axis)).normalize();
      const along = (l1 * l1 + d * d - l2 * l2) / (2 * d),
        bend = shoulder
          .clone()
          .addScaledVector(axis, along)
          .addScaledVector(
            pole,
            Math.sqrt(Math.max(0, l1 * l1 - along * along)),
          );
      aim(arm, elbow, bend.sub(shoulder).toArray());
      aim(elbow, hand, wrist.sub(world(elbow)).toArray());
      hand.quaternion.copy(
        hand.parent
          .getWorldQuaternion(new T.Quaternion())
          .invert()
          .multiply(desired),
      );
      // The index curls behind the bezel, then touches the lower control
      // during a playback change. Keep both hands below the marked blade.
      for (let k = 0; k < 3; k++) {
        const target = pos(
          V(
            sign * (0.061 - 0.013 * (k + 1)),
            -0.043 - i * 0.02,
            -0.016 + (i ? 0 : 0.034 * tap),
          ),
        );
        aim(chain[k], chain[k + 1], target.sub(world(chain[k])).toArray());
      }
    };
  });
  phone.scale.setScalar(0.094);
  phone.userData.held = true;
  return (t) => {
    const lift = view === "record" ? T.MathUtils.smoothstep(t, 0.04, 0.83) : 1;
    phone.position.set(0.1, 1.16 + 0.38 * lift, 1.35 - 0.1 * lift);
    phone.rotation.set(
      -0.26 - 0.16 * (1 - lift),
      0.38,
      0.022 * (1 - lift),
      "YXZ",
    );
    neck.quaternion.copy(neckRest);
    neck.rotateX(0.41 - 0.15 * lift + (view === "neighbor" ? 0.17 : 0));
    const tap = ["mark", "compare", "replay"].includes(view)
      ? Math.max(0, 1 - Math.abs(t - 0.3) / 0.22)
      : 0;
    grips.forEach((g) => g(tap));
  };
}
