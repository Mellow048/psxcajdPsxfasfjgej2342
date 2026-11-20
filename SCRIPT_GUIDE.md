# Write a Cutframe episode — instructions for scriptwriting agents

**Your deliverable is one valid JSON object, not JavaScript, a storyboard, or prose.** Use schema version 1. Start from [`episodes/ghost-in-the-glass.json`](episodes/ghost-in-the-glass.json), a working 22.5-second example. No engine edits are needed for a new episode. Use a real model key from the list below or a built-in prop; never invent a filename, clip, sound, shader, camera or stage.

## Write the reveal before the hook

Choose **one** surprising, verifiable fact you can demonstrate with the available objects. Write the takeaway in one sentence. Decide what the viewer ought to notice in the final frame. Then build the hook around the mistaken intuition that frame corrects. Check claims, quantities, causality and safety against reliable sources before recording; a counterintuitive title is not evidence.

- **0–2 seconds: pattern interrupt.** Ask the weird question or show the apparently impossible result immediately. Start the first *shot* at 0; the hook must land before second 2 even if that shot lasts 2.5 seconds. No greeting, logo intro, throat clearing or promise to explain later.
- **One clause, one visual job, one 2–3 second shot.** Translate “it reflects” into a pane and a beam, not another shot of someone talking. Cut between a wide demonstration, an offstage angle, a macro detail and the observer’s viewpoint. Each scene requires a moving camera, moving subject and a cut cue. Start the next clause on the cut.
- **Escalate, then resolve.** Hook → quick context → missing ingredient → weird detail → changed viewpoint → unexpected takeaway → loop. A second shot should answer one question and open a narrower one. A close-up is most useful when it reveals something the previous angle concealed.
- **Speak for the cut.** At normal narration speed aim for about 5–8 words in a 2.5-second shot. Split the sentence into two caption pops. Aim for 2–4 words per pop, **hard maximum five**. Prefer concrete nouns and verbs. Highlight one curiosity word or a short contiguous phrase, not everything. Leave room for a breath; shorten a line instead of squeezing it into a tenth of a second.
- **Loop with new understanding.** Return to the original framing and ask the viewer to locate the now-explained detail. Do not spend the last two seconds on a generic call to action.

### Demo pacing map (these are the shipped shots)

| Time | Visual change | What the cut teaches |
|---|---|---|
| 0–2.5 | Push toward a sheet ghost in a moonlit cemetery | Present the apparent impossibility first. |
| 2.5–5 | Whip backstage to the uploaded ghost performer | Reveal the hidden subject. |
| 5–7.5 | Orbit a framed pane | Isolate the optical element. |
| 7.5–10 | Push from the stage lights to the actor | Show which part must be illuminated. |
| 10–12.5 | Macro view of the ray diagram | Trace the reflected light. |
| 12.5–15 | Cut to an eye beside the pane | Explain that the background remains visible. |
| 15–17.5 | Tilt into the superimposed figures | Combine both paths in one view. |
| 17.5–20 | Orbit the apparition again | Name the illusion *after* the explanation. |
| 20–22.5 | Return to the opening subject | Ask where the real actor is; the first shot reads differently now. |

## Smallest useful script

This complete one-shot test is valid JSON. For a finished Short, expand it to 8–10 distinct shots and roughly 20–25 seconds.

```json
{
  "version": 1,
  "title": "Look through the ghost",
  "series": "Optics",
  "beat": true,
  "scenes": [
    {
      "title": "The false image",
      "duration": 2.5,
      "stage": "optics_lab",
      "cameraPreset": "orbit_drift",
      "distance": 4.3,
      "focus": "performer",
      "actors": [{"id":"performer","asset":"sheet","motion":"idle_breathe","height":1.6,"position":[0,0.2,-0.3]}],
      "props": [{"id":"pane","asset":"pane","motion":"pop_in","height":1.3,"position":[0.45,0,0.1],"yaw":-0.5}],
      "captions": [{"at":0,"text":"One ghost?","highlight":"ghost?"},{"at":1.1,"text":"Two light paths.","highlight":"Two"}],
      "sfx": "whoosh"
    }
  ]
}
```

## Exact schema, units and defaults

JSON only: double quotes, no trailing commas or comments. Unknown fields are rejected. All times are **seconds**, not milliseconds or frame numbers. Arrays have parentheses-free JSON syntax. IDs live only within their shot: repeat subject definitions across cuts. The engine never assumes scene 2 inherits scene 1’s actors.

| Episode field | Contract |
|---|---|
| `version`, `title`, `scenes` | Required: integer `1`, nonempty string, array of 1–60 shots. Duration is the sum; there is no separate runtime field. |
| `series` | Optional display string. |
| `beat` | Optional boolean, default false. Subtle synthesized pulse every half second. |
| `narration` | Optional relative same-origin `.wav`, `.ogg`, `.mp3` or `.m4a` file (no `..`, leading `/` or URL scheme). One full-episode track, starting at episode second 0, e.g. `episodes/ghost-narration.wav`. Browser must support decoding that format. |

| Scene field | Contract |
|---|---|
| `title`, `stage`, `cameraPreset`, `sfx` | Required: nonempty shot name and exact keys below. The SFX fires at the shot start. |
| `duration` | Required number from 2.0 through 3.0 inclusive on a 1/60 s boundary. Prefer 2, 2.25, 2.5, 2.75 or 3. |
| `actors`, `props` | Optional arrays of the **same subject schema**. At least one subject total. The distinction is editorial; either list accepts model or procedural keys. |
| `focus` | Optional subject `id` (track its approximate mid-height) or fixed `[x,y,z]` target, default `[0,1,0]`. For separated subjects use a point between them. |
| `distance` | Optional camera radius 0.3–40 studio units, default 4.8. Start at 4–5 for a 1.6-unit subject. A macro preset tightens this further. |
| `angle`, `pan` | Optional finite numbers. `angle` is base camera azimuth in radians (0 looks from +Z). `pan` is the horizontal sweep half-width for `whip_pan` in world units, default 0.85. |
| `captions` | Required nonempty array of `{ "at": 0, "text": "Look here.", "highlight": "here." }`. First `at` **must be 0**. All later markers strictly increase and are less than this shot’s duration. Text stays until the next marker/cut. Highlight optional, exact case-sensitive substring; include punctuation if useful. |

| Subject field | Contract |
|---|---|
| `id`, `asset`, `motion` | Required nonempty ID unique across both lists in this shot, a registered asset key, and one procedural motion key. |
| `height` | Positive normalized height in studio units, default 1.6. Imported bounding box is floor-centered before motion. A whole map should be much larger than an actor. |
| `position`, `yaw` | Optional `[x,y,z]` (right, up, toward starting camera), default `[0,0,0]`; yaw in radians around Y, default 0. Position is the normalized **base**, not model center. |
| `mesh` | Optional exact source node name for one static object inside a model pack. Example: `"asset":"metro_psx.metro","mesh":"subway_car"`. See `models[path].meshes` in the inventory. Omit on skinned characters; extracting just their mesh can detach their rig. |
| `clip` | Optional `{ "name":"mixamo.com" }` for an embedded clip, or `{ "asset":"male.character_01", "name":"mixamo.com" }` to borrow it from that source. Case-sensitive. A clip is independent of `motion`: root micro-motion continues. |
| `text` | Optional **only** with `asset:"label"`, 1–24 characters, default `NOTE`. For callouts try height 0.22 and motion `pop_in`. This is a 3D sign, not a burned-in subtitle. |

**Audio authoring:** derive TTS timing from `sum(previous durations) + caption.at`. Record/generate narration separately and add its relative file path. Captions are timing markers, not a browser speech-synthesis request; without narration the cut sounds and optional beat still play. No generated filename can create a missing audio file. Trim a voiceover to the episode length. Preview after backward seeks and listen to the last word before every cut.

## Capability dictionary

### Stages

| Key | Picture |
|---|---|
| `graveyard` | Seeded moonlit cemetery with fence, trees, headstones and atmospheric particles. |
| `backstage` | Curtain-lined theater floor and low riser. |
| `optics_lab` | Cool diagram stage with calibration grid. |
| `void` | Dark, sparsely dressed demo floor. Add models/diagrams. |
| `house_corner` | Interior mini-set furnished with the actual Quequis house pack’s Armchair, Table and Painting. |

For other maps create a `void` shot and place the map or a named submesh in `props`. Set `height`, `position`, `focus` and `distance` explicitly. There is no automatic navmesh or guarantee a camera is inside the intended room. Use the monitor to scout the shot before writing a close-up.

### Moving camera presets

`slow_push` gentle dolly; `fast_push` more aggressive approach; `orbit_drift` lateral arc; `handheld_bob` swaying handheld; `whip_pan` rapid left-to-right sweep **within** the shot (place subjects on either side of `focus`); `dutch_tilt_zoom` rolling push; `cutaway_macro` tighter rotating inspection. There is no `static` preset. Scene boundaries are hard cuts, not dissolves.

### Animation and cues

- Subject `motion`: `idle_breathe`, `talk_gesture`, `point`, `shock`, `float_spin`, `pop_in`. All retain micro-motion. Talk/point also rotate a recognized arm when not driven by a clip. Root tilt is the fallback on a prop without bones. For repeated spins, each shot restarts the local clock.
- Built-in prop/actor keys: `sheet` (stylized ghost), `pane` (glass diagram), `lamp`, `eye`, `arrow`, `rays`, `label`. Example: `{"id":"direction","asset":"arrow","motion":"pop_in","height":0.35,"position":[0.5,1,0]}`.
- SFX: `whoosh`, `pop`, `riser`, `tick`. These are synthesized cues, not files. No `SoundEffects/` was supplied. `beat` is an episode boolean, **not** a cut cue. No music track names, camera shake commands, arbitrary shader scripts or narration prompts.
- 9:16, 540×960 output; 60 Hz motion; 30 fps capture request. Default scene buffer 270×480, snap grid 180×320. Inspector supports grid width (0 = off), affine warp 0–100%, Bayer intensity 0–100%, render scale 25–100%. Turning dither off leaves the 15-bit palette in place. Fog uses each stage’s palette. Display/UI graphics are composited after upscaling; monitors, thumbnails and recorder share the same scene renderer.

## Inspected assets and rig compatibility

The raw [asset inventory](docs/asset-inventory.json) lists **every supplied path**, including 1,577 PNG/JPEG textures, Blender/DAE authoring sources, all FBXs/GLBs, and the empty sound inventory. For each runtime model it gives raw mesh names, clip names and bone → parent relationships. `src/catalog.js` is the machine-readable key → path/clip lookup. **Asset library** in the editor searches the same manifest. Inspection found 123 FBXs and 9 GLBs. One FBX (`Quequis_House_Props.fbx`) contains no meshes or clips and is deliberately excluded; the GLB version works. No standalone animation pack was found.

- The Male/Female actors and the two Mixamo Halloween actors carry a clip named **`mixamo.com`** (95 files in total). Do not infer it is a walk, point or dance from that name. The standard skeleton begins `mixamorig:Hips → Spine → Spine1 → Spine2`; legs branch at Hips, shoulders at the upper spine. The loader sanitizes names, transfers **compatible bone rotation tracks only**, discards translations/scales and removes initial hips heading relative to target rest yaw. A donor’s mesh is not added to the shot. Use same-family rest poses for reliable results.
- `halloween.character_ghost` has **no clip**. Its rig has `Spine → Neck → Head`, `R_Shoulder → R_Forearm → R_Hand` and corresponding left limbs; not a Mixamo Hips rig. Use procedural gestures; do not borrow humanoid clips for this ghost. Static GLB maps/prop packs have no skins or clips.
- Prefer the unsuffixed GLB key where both formats exist. FBX texture references may be Windows authoring paths; the loader resolves the basename, preferring the model pack, then shared `Assets/Textures`. Missing originals get a neutral checker. `house.house_colliders` is collision geometry, not a furnished house. For publishable outputs check the licenses of the specific source packs.
- Whole-prop pack layouts are not single objects. Useful verified pairs: `quequis_house.quequis_house_props` + `Armchair`, `Coffee_jar`, `Phone`, `Table`, `Painting`; `metro_psx.metro` + `subway_car`, `Vending_machine`, `metro_map`; `pizzeria.pizzeria_props` + `Pizza_oven`. Extend from the inventory, not memory.

### Complete imported `asset` keys in this checkout

- **6twelve**: `6twelve.6twelve`
- **abandoned_house**: `abandoned_house.abandoned_house`, `abandoned_house.abandoned_house.fbx`
- **all**: `all.all`
- **burgerpiz**: `burgerpiz.burgerpiz`, `burgerpiz.burgerpiz.fbx`
- **bus_stop**: `bus_stop.props`, `bus_stop.stop`, `bus_stop.stop_01`
- **diner**: `diner.diner`, `diner.objects`
- **female**: `female.character_17_female_police`, `female.character_18_female_police`, `female.character_19_female_police`, `female.character_20_female_police`, `female.character_21_female_firefighter`, `female.character_22_female_firefighter`, `female.character_23_female_doctor`, `female.character_24_female_doctor`, `female.character_25_female_police`, `female.character_26_female_police`, `female.character_27_female_hm`, `female.character_28_female_hm`, `female.character_29_female`, `female.character_30_female`, `female.character_31_female`, `female.character_32_female`, `female.character_33_female`, `female.character_34_female`, `female.character_35_female`, `female.character_36_female`, `female.character_37_female`, `female.character_38_female`, `female.character_39_female`, `female.character_40_female`, `female.character_41_female`, `female.character_42_female`, `female.character_43_female`, `female.character_44_female`, `female.character_45_female`, `female.character_46_female`, `female.character_female_01`, `female.character_female_02`, `female.character_female_03`, `female.character_female_04`, `female.character_female_05`, `female.character_female_06`, `female.character_female_07`, `female.character_female_08`, `female.character_female_09`, `female.character_female_10`, `female.character_female_11`, `female.character_female_12`, `female.character_female_13`, `female.character_female_14`, `female.character_female_15`, `female.character_female_16`
- **gas_station**: `gas_station.gas_station`, `gas_station.gas_station_props`
- **halloween**: `halloween.character`, `halloween.character_ghost`, `halloween.character_witch`, `halloween.halloween`
- **house**: `house.house`, `house.house_colliders`
- **male**: `male.character_01`, `male.character_02`, `male.character_03`, `male.character_04`, `male.character_05`, `male.character_06`, `male.character_07`, `male.character_08`, `male.character_09`, `male.character_10`, `male.character_11`, `male.character_12`, `male.character_13`, `male.character_14`, `male.character_15`, `male.character_16`, `male.character_17_police`, `male.character_18_police`, `male.character_19_police`, `male.character_20_police`, `male.character_21_police`, `male.character_22_police`, `male.character_23_firefighter`, `male.character_24_firefighter`, `male.character_25_doctor`, `male.character_26_doctor`, `male.character_27_hm`, `male.character_28_hm`, `male.character_29`, `male.character_30`, `male.character_31`, `male.character_32`, `male.character_male_33`, `male.character_male_34`, `male.character_male_35`, `male.character_male_36`, `male.character_male_37`, `male.character_male_38`, `male.character_male_39`, `male.character_male_40`, `male.character_male_41`, `male.character_male_42`, `male.character_male_43`, `male.character_male_44`, `male.character_male_45`, `male.character_sheriff_n`, `male.character_sheriff_n_01`
- **metro_psx**: `metro_psx.metro`, `metro_psx.metro.fbx`
- **minas**: `minas.mines`, `minas.mines_modu`
- **models_pack_psx**: `models_pack_psx.models`
- **pizzeria**: `pizzeria.pizzeria`, `pizzeria.pizzeria_props`, `pizzeria.pizzeria_props.fbx`, `pizzeria.pizzeria_scene`, `pizzeria.pizzeria_scene.fbx`
- **quequis_house**: `quequis_house.quequis_house`, `quequis_house.quequis_house.fbx`, `quequis_house.quequis_house_props`, `quequis_house.waffle`
- **sewer**: `sewer.sewers`
- **tacos**: `tacos.tacos`, `tacos.tacos.fbx`, `tacos.tacos_props`, `tacos.tacos_props.fbx`

## Reference transcripts: source status and pacing workshops

The brief provided the following **literal slots**, not transcripts, footage, timestamps or visual notes. They are retained here so a later editor can insert the sources. Do not attribute dialogue, facts or camera choices to the original videos on the basis of their titles. The beat suggestions below are **original exercises**, not reconstructions.

### Video 1 — “Mammoth Meat Is Real”

> [PASTE TRANSCRIPT / VISUAL NOTES HERE]

**Why the title can hook:** “mammoth” sets an expectation of extinction; putting it beside a present-tense claim creates a question that can be answered visually. **Original timing exercise:** 0–2.5s: push toward a labeled exhibit, no generic history intro. 2.5–5s: cut from an apparent specimen to a macro view of its *verified origin label*. 5–7.5s: contrast what the viewer inferred with what that label actually establishes. Then devote one new angle to each link in the explanation. End with the opening exhibit, now labeled precisely. Do not conflate preserved remains, cultivated products or recovered DNA; identify the specific documented case first. `label`, `arrow` and a house `Table` can stand in for a clearly labeled diagram; **there is no registered mammoth or meat-slab key**.

### Video 2 — “Why You Don’t Want X-Ray Vision”

> [PASTE TRANSCRIPT / VISUAL NOTES HERE]

**Why the title can hook:** it promises a cost to a supposedly useful power. Lead with the visible contradiction rather than a definition. **Original timing exercise:** 0–2.5s: close on an eye and pose the question. 2.5–5s: cut to an object between a source and detector. 5–7.5s: rotate to reveal their relative positions. 7.5–10s: replace the wide stage with a labeled diagram of what is measured. Let each next cut remove one misconception; return to the eye for the payoff. Verify the physics: an eye seeing transmitted X-rays is not itself an X-ray emitter. The `rays` prop in this engine illustrates *reflection*; do not reuse its bent path as a diagram of transmission. Use `arrow` and `label` instead. No skull, X-ray machine or medical diagnosis is implied by these props.

**When transcripts arrive:** preserve the supplied wording, log each observed cut with its actual timestamp, and distinguish spoken words from on-screen text. Analyze the first unanswered question, the visual evidence on each cut, the information withheld until the payoff and the final-to-first-frame loop. Never retrofit invented timestamps to an unseen video.

## Before handing a script to the studio

1. Read the hook aloud. Does the concrete question land before 2s? Can every later beat be drawn with a registered object?
2. Sum shot durations; keep every individual duration in range. Give every shot an explicit motion preset, cut cue, at least one subject and a caption at 0.
3. Check case-sensitive asset/mesh/clip keys and per-shot IDs. Use only supported fields. A keyword highlight must actually occur in the text.
4. Time narration against the cut marks, not just total length. Supply the audio file if referencing one. Audition in the target browser.
5. Paste into **Edit JSON → Apply episode**. Jump through each shot to inspect scale, framing, overlap, caption length and loop. Export from the foreground tab. If an asset dominates memory, pick a smaller pack or a procedural diagram; the JSON validator does not promise every combination fits every device.
