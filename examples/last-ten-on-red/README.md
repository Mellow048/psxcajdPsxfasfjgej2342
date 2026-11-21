# Reference short: Your last $10 on red

[Watch or download the finished MP4](casino_martingale.mp4) · [Edit the episode JSON](../../episodes/casino_martingale.json) · [Writing guide](../../SCRIPT_GUIDE.md)

The MP4 is the finished example, not an input. The JSON is its edit list: it names the actor, camera, poses, wagers, captions, sounds and the two audio files. The [framework](../../src/) interprets it for both the studio and the offline renderer.

| Time | What to borrow for another short |
|---|---|
| 0:00–0:05.5 | Start on the wheel, reveal the lost $10, then cut to the player's face. Show the stakes before explaining the rule. |
| 0:15–0:21 | Give each wager two seconds. Use `placedBy` and `slideFrom` to slide chips on the felt; land the cash-register sound on the spoken amount, not on the cut. |
| 0:21–0:38 | Alternate his reactions with the balance and graph. The score adds subdivisions as the losses mount, without changing the narrator's speed. |
| 0:38–0:42⅓ | Take the drums out. Finish the sentence on “why” as the camera returns to the opening wheel. |

## Rebuild it

From the repository root on Linux, with Node 24, Chrome, FFmpeg and ffprobe on your PATH:

```sh
npm ci
# Optional: the rendered music stem is already checked in.
python3 scripts/casino_score.py
CHROME_BIN="$(command -v google-chrome)" npm run render -- episodes/casino_martingale.json
node scripts/verify-render.mjs episodes/casino_martingale.json
```

The output is `render-output/casino_martingale.mp4`: 1,270 frames, 30 fps, 540×960, with AAC audio. On GitHub, select **Actions → Render a Short** and enter `episodes/casino_martingale.json` instead. For a new story, copy the JSON, record a [single continuous take](../../episodes/casino-martingale-voice.wav), then place the cuts and captions against that recording. The [score generator](../../scripts/casino_score.py) reads the running time and wager cues from the reference JSON; the mixer ducks its [music stem](../../episodes/casino-score.wav) under speech.
