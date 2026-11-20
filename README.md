# Cutframe · PSX Informative Shorts Studio

Cutframe is a static Three.js r170 editor for making vertical educational videos from JSON. The included **The ghost in the glass** episode explains Pepper’s ghost in nine 2.5-second shots, with original sets, an uploaded Halloween actor, a synthesized narrator, and cut cues. [Watch the finished 30 fps WebM](episodes/ghost-in-the-glass.webm) or [open its JSON](episodes/ghost-in-the-glass.json).

## Render on GitHub — no local GPU required

1. Add a script under `episodes/` (see [the writing guide](SCRIPT_GUIDE.md)). If it needs speech, include a synced narration track and reference it in the JSON. Without one, the engine exports captions, beat and cut sounds only.
2. In **Actions → Render a Short → Run workflow**, choose `main` and enter the episode path. The default is [Why windows become mirrors at night](episodes/night-window.json): **35 seconds, 14 cuts, 1,050 frames** with a timed voiceover.
3. Open the completed run and download its **short-…** artifact. Unzip the **540×960, 30 fps H.264/AAC MP4**. GitHub retains these downloads for 30 days; save a copy for publishing. Rendering does not commit binaries back to the repo or publish to a social platform.

The Linux runner uses the vendored Three.js modules, Chrome software WebGL, an offline audio mix, and FFmpeg. It samples exact frame times rather than recording a live screen, so a slow runner takes longer without dropping video frames. `ffprobe` checks the streams, resolution, frame count and duration before upload. Framework/episode pull requests exercise the default Short too.

For the same batch path locally on Linux with Node 24, Chrome, FFmpeg and ffprobe installed:

```sh
npm ci
CHROME_BIN="$(command -v google-chrome)" npm run render -- episodes/night-window.json
node scripts/verify-render.mjs episodes/night-window.json
```

Find the result in `render-output/`. The studio itself still needs no npm packages. Open `/?episode=episodes/night-window.json` to inspect the same shots in the editor.

## Run

From the repository root:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://localhost:8000/> in a WebGL 2 browser. No build, installation, microphone, API key or backend. For an Arena preview bind to `0.0.0.0` instead. The native import map pins Three.js and addons to **0.170.0** on jsDelivr. Localhost and Arena use an MIT-licensed vendored copy of the same modules. `?modules=local` forces offline module resolution on another host; `?modules=cdn` tests CDN mode. Serve over HTTP(S), not `file://`.

## Make another episode

1. Give [SCRIPT_GUIDE.md](SCRIPT_GUIDE.md) to the writer. [Verified inventory](docs/asset-inventory.json) includes raw mesh names, FBX bone parents and embedded clip names.
2. Choose **Edit JSON**. Paste a script or **Open JSON**, then **Apply episode**. Structural errors identify the scene; an invalid replacement leaves the last working episode loaded. **Save JSON** downloads the editor contents; nothing is silently written to disk.
3. Or put your script under `episodes/` and open `/?episode=episodes/my-short.json`. Referenced narration and assets must also be served by this static server, not just present on the client’s disk.
4. Click a shot, scrub the timeline, or press Space to preview. Inspector changes are live, session-only look overrides; defaults live in `src/config.js`. Muting affects speakers only.
5. **Export WebM** renders the entire current episode from zero in real time, with captions burned in and the mixed narration/beat/cues in the audio track. Keep the tab visible. Export requires `captureStream`, Web Audio and a WebM-capable MediaRecorder (Chromium recommended). VP9/Opus is preferred; VP8/Opus is the fallback. Cancel discards that recording. Output is 540×960 at a requested 30 fps; actual capture cadence depends on device load. This is not an offline frame-accurate encoder.

## Modules and lifecycle

| Module | Responsibility |
|---|---|
| `config`, generated `catalog`, `schema` | Render defaults, dimensions, manifests, mini-set fixtures and strict v1 validation |
| `assetLoader`, `animationLibrary` | GLB/FBX loading, texture-path repair, floor-centered normalization, skeleton cloning, rootless quaternion clips and procedural motion |
| `stages`, `cameraDirector` | Seeded scenic geometry, subject props, preset motion and shot framing |
| `psxShader` | Post-skinning clip-space grid snap, affine diffuse UV interpolation, nearest sampling, low-res target, display-space Bayer dither and 5:5:5 quantization |
| `episodeRunner`, `sfxEngine` | 60 Hz integer tick simulation and deterministic seeking, audio-clock transport, mixer/recorder routing and scheduled cues |
| `captionEngine`, `studioUI` | Canvas compositing, thumbnails, transport, JSON editing, asset search, effects and recording |
| `boot`, `main` | Import map selection and demo/query bootstrap |

Scene templates and resources are owned by one episode. Only referenced models are loaded; all shots are prepared before playback to avoid network waits at cuts. Geometry/materials/textures are shared between clones. Disposal deduplicates shared GPU resources, releases skeletons and mixers, and clears audio buffers on successful replacement. Very large packs (notably Pizzeria) can take significant GPU memory: prefer named props and short episodes, or optimize large source packs before deploying on mobile. Selecting one GLB mesh still downloads the whole GLB.

## Inventory and checks

```sh
python3 scripts/catalog.py  # refresh catalog + raw inventory after importing assets
npm test                    # Node 18+; no dependencies
```

Inspect new rig families before reusing clips: name matching is **not** general IK or cross-species retargeting. See the guide for the exact keys supported by this checkout. Imported DAE, Blender and backup files are inventoried for authors, not runtime formats. `SoundEffects/` was absent; current cues are synthesized. Legacy missing external texture references fall back to a neutral checker; GLBs have embedded textures and are preferred. Asset licenses are not inferred from the folder names; verify publishing rights to supplied packs separately. Vendored Three.js retains its license. The demo’s short robotic voice track was synthesized with meSpeak/eSpeak, not copied from a reference video.

Visit `http://localhost:8000/tests/browser.html` for automated WebGL integration checks (deterministic seeking, real rigs/prop selection, failed reload rollback and stable GPU counts).

Additional browser acceptance: load the demo; test all shots and seek backward; change/reset the look; apply invalid then valid JSON; load a named GLB prop and a Mixamo character clip; export with the speakers muted and verify video, burned-in captions and audio. Renderer warnings about source FBX weights being reduced to four are expected; they are not missing files or shader errors.
