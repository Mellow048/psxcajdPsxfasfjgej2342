import * as T from "three";
import { CONFIG, SCENE_PRESETS } from "./config.js";
import { validate } from "./schema.js";
import { Pipeline, patchTree } from "./psxShader.js";
import { AssetLoader } from "./assetLoader.js";
import { bindPerformance, pose } from "./animationLibrary.js";
import { createSpawn, sampleSpawn } from "./comedyProps.js";
import { stage } from "./stages.js";
import { CameraDirector } from "./cameraDirector.js";
import { composite } from "./captionEngine.js";
import { SfxEngine } from "./sfxEngine.js";
export class EpisodeRunner {
  constructor(canvas) {
    canvas.width = CONFIG.width;
    canvas.height = CONFIG.height;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.pipeline = new Pipeline();
    this.director = new CameraDirector();
    this.audio = new SfxEngine();
    this.frames = [];
    this.tick = 0;
    this.playing = false;
    this.focus = new T.Vector3();
    this.raf = 0;
  }
  async load(json) {
    const e = validate(json);
    this.pause();
    const loader = new AssetLoader(),
      frames = [];
    let end = 0;
    try {
      for (const s of e.shots) {
        const f = { ...stage(s.stage), items: [], spawns: [], start: end };
        frames.push(f);
        end += Math.round(s.duration * CONFIG.hz);
        for (const d of SCENE_PRESETS[s.stage].layout ?? []) {
          const fixture = await loader.instance(d);
          fixture.position.fromArray(d.position);
          fixture.rotation.y = d.yaw ?? 0;
          f.scene.add(fixture);
        }
        for (const def of [...(s.actors ?? []), ...(s.props ?? [])]) {
          const node = await loader.instance(def);
          f.scene.add(node);
          const item = { def, node };
          const { clip, take } = await loader.performanceSource(def, node);
          item.mixer = bindPerformance(node, clip, def.motion, take);
          if (!f.observer && s.actors?.includes(def)) f.observer = item;
          f.items.push(item);
          const opacity = SCENE_PRESETS[s.stage].reflection;
          if (opacity && s.actors?.includes(def)) {
            const mirror = new T.Group();
            mirror.scale.z = -1;
            f.scene.add(mirror);
            const image = await loader.reflectedInstance(def, opacity);
            mirror.add(image);
            f.items.push({
              node: image,
              def,
              mixer: bindPerformance(image, clip, def.motion, take),
            });
          }
        }
        for (const ev of s.events ?? []) {
          const spawn = createSpawn(ev);
          f.spawns.push(spawn);
          f.scene.add(spawn.node);
        }
        patchTree(f.scene);
      }
    } catch (err) {
      this.free(loader, frames);
      throw err;
    }
    this.free(this.loader, this.frames);
    this.audio.buffers.clear();
    this.episode = e;
    this.frames = frames;
    this.loader = loader;
    this.end = end;
    this.seek(0);
  }
  free(loader, frames) {
    for (const f of frames)
      for (const i of f.items) {
        i.mixer?.stopAllAction();
        i.mixer?.uncacheRoot(i.node);
      }
    loader?.dispose(frames.map((f) => f.scene));
  }
  get seconds() {
    return this.tick / CONFIG.hz;
  }
  get duration() {
    return this.end / CONFIG.hz;
  }
  seek(sec) {
    this.tick = Math.min(this.end, Math.max(0, Math.round(sec * CONFIG.hz)));
    if (this.playing) this.audio.start(this.episode, this.seconds);
    this.render();
  }
  sample() {
    this.index = this.frames.findLastIndex((f) => f.start <= this.tick);
    const f = this.frames[this.index],
      s = this.episode.shots[this.index],
      t = (this.tick - f.start) / CONFIG.hz;
    for (const i of f.items) pose(i, t);
    for (const spawn of f.spawns) sampleSpawn(spawn, t);
    f.dust.rotation.y = t * 0.08;
    f.dust.position.y = 0.08 * Math.sin(t);
    if (typeof s.focus === "string") {
      const o = f.items.find((i) => i.def.id === s.focus);
      if (!o)
        this.focus.copy(
          f.spawns.find((p) => p.ev.id === s.focus).node.position,
        );
      else {
        this.focus.copy(o.node.position);
        this.focus.y +=
          (o.def.height ?? 1.6) *
          (s.cameraPreset === "macro_closeup" && s.actors?.includes(o.def)
            ? 0.87
            : 0.51);
      }
    } else this.focus.fromArray(s.focus ?? [0, 1, 0]);
    this.director.pose(s, t, this.focus, this.index, f.observer);
  }
  draw() {
    const f = this.frames[this.index];
    composite(
      this.ctx,
      this.pipeline.render(f.scene, this.director.camera),
      this.episode,
      this.episode.shots[this.index],
      this.index,
      (this.tick - f.start) / CONFIG.hz,
    );
    this.onframe?.();
  }
  render() {
    this.sample();
    this.draw();
  }
  async play() {
    if (this.playing) return;
    await this.audio.prepare(this.episode);
    if (this.tick === this.end) this.seek(0);
    this.audio.start(this.episode, this.seconds);
    this.playing = true;
    this.onframe?.();
    const advance = () => {
      if (!this.playing) return;
      const next = Math.min(
        this.end,
        Math.floor(this.audio.time() * CONFIG.hz),
      );
      if (next > this.tick) {
        // Catch up on exact 1/60 s steps. Draw only the last state.
        while (this.tick < next) {
          this.tick++;
          this.sample();
        }
        this.draw();
      }
      if (this.tick >= this.end) {
        this.pause();
        this.onend?.();
      } else this.raf = requestAnimationFrame(advance);
    };
    this.raf = requestAnimationFrame(advance);
  }
  pause() {
    cancelAnimationFrame(this.raf);
    this.playing = false;
    this.audio.stop();
    if (this.episode) this.onframe?.();
  }
  dispose() {
    this.pause();
    this.free(this.loader, this.frames);
    this.frames = [];
    this.episode = null;
    this.onframe = null;
    this.audio.dispose();
    this.pipeline.dispose();
  }
}
