import { SFX_MANIFEST } from "./config.js";
export class SfxEngine {
  constructor() {
    this.nodes = new Set();
    this.muted = false;
    this.buffers = new Map();
  }
  async ready() {
    if (!this.ctx) {
      const c = (this.ctx = new AudioContext());
      this.bus = c.createGain();
      this.bus.gain.value = 0.65;
      this.out = c.createGain();
      this.out.gain.value = this.muted ? 0 : 1;
      this.dest = c.createMediaStreamDestination();
      this.bus.connect(this.dest);
      this.bus.connect(this.out);
      this.out.connect(c.destination);
    }
    await this.ctx.resume();
  }
  async buffer(url) {
    if (!this.buffers.has(url)) {
      const r = await fetch(url);
      if (!r.ok) throw Error("Audio not found: " + url);
      this.buffers.set(
        url,
        await this.ctx.decodeAudioData(await r.arrayBuffer()),
      );
    }
    return this.buffers.get(url);
  }
  async prepare(e) {
    await this.ready();
    for (const url of new Set(
      [e.narration, ...e.shots.map((s) => SFX_MANIFEST[s.sfx])].filter(
        (v) => v && v !== "synth",
      ),
    ))
      await this.buffer(url);
  }
  track(node, gain) {
    node.connect(gain);
    gain.connect(this.bus);
    this.nodes.add(node);
    node.onended = () => {
      node.disconnect();
      gain.disconnect();
      this.nodes.delete(node);
    };
  }
  sample(url, when, offset = 0) {
    const b = this.buffers.get(url);
    if (!b || offset >= b.duration) return;
    const n = this.ctx.createBufferSource();
    n.buffer = b;
    this.track(n, this.ctx.createGain());
    n.start(when, offset);
  }
  tone(key, when) {
    const c = this.ctx,
      n = c.createOscillator(),
      g = c.createGain();
    const [a, b, len, vol, type] = {
      click: [1650, 210, 0.085, 0.23, "triangle"],
      whoosh: [1600, 110, 0.19, 0.19, "triangle"],
      riser: [260, 1250, 0.23, 0.105, "sawtooth"],
      beat: [96, 41, 0.15, 0.13, "sine"],
    }[key];
    n.type = type;
    n.frequency.setValueAtTime(a, when);
    n.frequency.exponentialRampToValueAtTime(b, when + len);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + len);
    this.track(n, g);
    n.start(when);
    n.stop(when + len + 0.01);
  }
  start(e, offset) {
    this.stop();
    const now = this.ctx.currentTime;
    this.origin = now - offset;
    if (e.narration) this.sample(e.narration, now, offset);
    let t = 0;
    for (const s of e.shots) {
      if (t >= offset - 1e-6) {
        const when = now + Math.max(0, t - offset);
        SFX_MANIFEST[s.sfx] === "synth"
          ? this.tone(s.sfx, when)
          : this.sample(SFX_MANIFEST[s.sfx], when);
      }
      t += s.duration;
    }
    if (e.beat)
      for (let i = Math.ceil(offset / 0.5) * 0.5; i < t; i += 0.5)
        this.tone("beat", now + i - offset);
  }
  time() {
    return this.ctx.currentTime - this.origin;
  }
  mute() {
    this.muted = !this.muted;
    if (this.out) this.out.gain.value = this.muted ? 0 : 1;
    return this.muted;
  }
  stop() {
    for (const n of this.nodes)
      try {
        n.stop();
      } catch {}
    this.nodes.clear();
  }
  dispose() {
    this.stop();
    this.buffers.clear();
    this.dest?.stream.getTracks().forEach((t) => t.stop());
    this.ctx?.close();
  }
}
