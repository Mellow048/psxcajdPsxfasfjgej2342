// Angles are clockwise degrees as seen by the camera. Never animate a negative
// velocity: the apparent -6° step is a consequence of the fourfold symmetry.
export const FAN_VIEWS = [
  "bench",
  "record",
  "freeze",
  "mark",
  "frames",
  "advance",
  "neighbor",
  "compare",
  "replay",
];
export const fps = 30,
  rps = 7,
  step = (360 * rps) / fps;
export function fanSample(view, t, globalTime) {
  const captured = Math.floor(globalTime * fps + 1e-7) * step;
  let angle = captured,
    dot = false,
    frame = "",
    guide = false;
  if (view === "bench") angle = t * 104; // explicitly labelled slow-motion observation
  if (["freeze", "mark", "frames"].includes(view)) {
    angle = 0;
    frame = "01";
    dot = view !== "freeze";
  } else if (view === "advance") {
    const u = Math.min(1, Math.max(0, (t - 0.32) / 1.64));
    angle = step * u;
    dot = true;
    frame = u === 1 ? "02" : u === 0 ? "01" : "";
    guide = true;
  } else if (view === "neighbor") {
    angle = step;
    dot = true;
    frame = "02";
    guide = true;
  } else if (view === "compare") {
    frame = Math.floor(t / 0.58) % 2 ? "02" : "01";
    angle = frame === "02" ? step : 0;
    guide = true;
  }
  return { angle, dot, frame, guide };
}
