import * as T from "three";
export class CameraDirector {
  constructor() {
    this.camera = new T.PerspectiveCamera(42, 9 / 16, 0.05, 100);
    this.focus = new T.Vector3();
  }
  pose(s, t, target) {
    const u = t / s.duration,
      c = this.camera;
    let d = s.distance ?? 4.8,
      a = s.angle ?? 0,
      h = 0.32,
      roll = 0,
      pan = 0;
    switch (s.cameraPreset) {
      case "slow_push":
        d *= 1 - 0.12 * u;
        break;
      case "fast_push":
        d *= 1.12 - 0.35 * u;
        break;
      case "orbit_drift":
        a += -0.24 + 0.58 * u;
        break;
      case "handheld_bob":
        a += 0.035 * Math.sin(4 * t);
        h += 0.06 * Math.sin(5 * t);
        break;
      case "whip_pan":
        pan = (s.pan ?? 0.85) * Math.tanh((u - 0.45) * 7);
        a += 0.18 * u;
        break;
      case "dutch_tilt_zoom":
        roll = -0.1 + 0.19 * u;
        d *= 1 - 0.22 * u;
        break;
      case "cutaway_macro":
        a += 0.7 * u;
        d *= 0.86 - 0.09 * u;
        break;
    }
    this.focus.copy(target);
    this.focus.x += pan;
    c.position
      .copy(this.focus)
      .add(
        new T.Vector3(
          Math.sin(a) * d,
          h + 0.055 * Math.sin(t * 2),
          Math.cos(a) * d,
        ),
      );
    c.lookAt(this.focus);
    c.rotateZ(roll);
    return c;
  }
}
