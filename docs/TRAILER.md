# Marketing Trailer — Potassium Climb

**Product name:** Potassium Climb  
**Subtitle:** Elegant ice. Maximum height.  
**Length:** ~48–60s (8×6s + optional 10s summit)  
**Aspect:** 9:16 primary (mobile/site) · crop 16:9 for YouTube  

> Video gen may require upload_url in some environments. Produce keyframes with Imagine, then `image_to_video` offline/UI.

---

## Shot list (8 shots × ~6s)

| # | Shot | First-frame brief | Camera / motion (one action) | Audio beat |
|---|------|-------------------|------------------------------|------------|
| 1 | **Title frost** | Midnight ice tower, gold BAN motes, no text | Slow push-in, camera locked on tower | Soft hub pad |
| 2 | **Slide** | MonKey on ice, side lean, banana hat | In-place run/slide energy, locked cam | Ice hiss |
| 3 | **Carry jump** | MonKey mid full-run jump, cyan trail | Rise stretch, locked cam | Jump + whoosh |
| 4 | **Perfect** | Land pose + gold ring VFX, wide pad | Ring expand only | Perfect tick |
| 5 | **Wall kick** | Cling profile on ice wall | Kick off wall outward | Wall snap |
| 6 | **Siege** | Snowballs + shield bubble on MonKey | Balls roll past, shield flash | Drum + break |
| 7 | **Summit** | Gold summit banner, confetti | Gentle cam rise | Summit sting |
| 8 | **Logo endcard** | Icon banana+ice on indigo (no wordmark in image) | Subtle sparkle / hold | Fanfare end |

Optional shot 9 (10s): multi-biome whip (Aurora → Zenith) if time.

---

## Imagine keyframe prompts (copy-ready)

### K1 Title frost — `9:16`
A premium mobile game vertical key art of a luminous ice tower at midnight with jungle frost vines, gold potassium coin sparks, deep indigo sky, stylized digital illustration, clean shapes, soft cyan rim light, no text, no UI, no logos.

### K2 Slide — `1:1` then crop (or from hero BASE edit)
Same MonKey climber banana hat, side-view ice slide lean, isolated on flat #00FF00, cel shading — then composite onto ice platform scene via edit if needed. Prefer scene: MonKey sliding on cyan ice platform mid-tower, motion lean, midnight background soft blur.

### K3 Carry jump
MonKey mid-air upward leap from ice, banana hat, stylized digital illustration, cyan speed lines subtle, midnight tower bokeh, no text.

### K4 Perfect land
MonKey landing crouch on ice, expanding thin gold ring and crystal sparks, stylized game VFX, readable silhouette, no text.

### K5 Wall kick
MonKey wall-cling profile then kick pose against icy wall vine, midnight purple, stylized illustration, no text.

### K6 Siege
MonKey with mint shield bubble on snowy ice tower, white-blue snowballs in air, stylized illustration, no text.

### K7 Summit
Vertical summit of ice tower, gold banner glow, potassium confetti rain, triumphant calm, stylized digital illustration, no text.

### K8 Endcard icon — `1:1`
Simple premium game icon: banana fused with cyan ice shard, gold spark, on dark indigo, no letters, no words.

---

## image_to_video prompts (1–2 sentences each)

| Shot | Source | Prompt |
|------|--------|--------|
| 1 | K1 | The camera slowly pushes in toward the glowing ice tower, snow motes drift upward, camera motion only, smooth and elegant. |
| 2 | K2 | The MonKey runs in place with a smooth slide-run cycle on the ice, legs alternating, body stays centered, camera locked. |
| 3 | K3 | The MonKey stretches upward through a single jump rise, slight squash then stretch, camera locked. |
| 4 | K4 | The gold ring expands once from the landing and sparkles fade, MonKey holds pose, camera locked. |
| 5 | K5 | The MonKey kicks off the wall in one outward leap, brief motion, camera locked. |
| 6 | K6 | Snowballs drift across the frame while the shield bubble pulses once, camera locked. |
| 7 | K7 | Camera gently rises past the summit banner as confetti falls softly, smooth vertical move. |
| 8 | K8 | Soft gold sparkle pulses on the icon, camera locked, minimal motion. |

Duration: **6s**, resolution **480p** (or 720p for final).

---

## ffmpeg concat

```bash
# Place shots as shot01.mp4 … shot08.mp4 (same res/fps)
# list.txt:
# file 'shot01.mp4'
# ...

ffmpeg -f concat -safe 0 -i list.txt -c copy trailer_raw.mp4

# Optional audio bed + loudnorm
ffmpeg -i trailer_raw.mp4 -i audio_bed.wav -shortest -c:v copy -c:a aac trailer_final.mp4
```

**Rules:** same resolution & frame rate for stream copy; never re-encode mid-concat unless needed.

---

## Export targets

| File | Use |
|------|-----|
| `trailer_9x16.mp4` | Site / Reels / TikTok |
| `trailer_16x9.mp4` | YouTube (letterbox or re-gen 16:9 K1) |
| `trailer_poster.jpg` | Frame from shot 1 or 7 |
