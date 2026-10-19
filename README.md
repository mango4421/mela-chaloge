# Dussehra Mela Online

A continuous, first-person 3D North Indian fairground built with React, Three.js and Vite. Walk through the gate, explore the stalls, meet vendors and celebrate a symbolic Ravana Dahan.

## Run

`npm ci`, then `npm run dev`. `npm test` checks collisions, proximity, balloon scoring, ring flights and cleanup. `npm run build` creates `dist/` for Vercel.

## Controls

WASD/arrows to walk; drag the world to look; E to interact nearby; Shift or RUN to run. Mobile uses a left joystick and scene dragging. Escape exits conversations, games and rides. The minimap shows position without teleporting.

## Playable

68 animated crowd visitors; eight food stalls with steam; toy vendors and free virtual inventory; three-shot 3D raycast balloon shooting; five-ring drag/release toss with parabolic flights; ferris-wheel camera ride; carousel camera ride; projected YouTube screen on the Ram Leela stage; virtual fireworks; ten-headed Ravana with countdown, Ram's arrow, sparks and collapse; photo capture and personal downloadable mela card with session achievements; WhatsApp/native sharing and clipboard fallback.

Environment models are procedural low-poly geometry with instanced crowd and static geometry, limited dynamic lighting and capped display resolution. Sound is procedural scene-aware ambience and pre-rendered Hindi vendor speech, not recorded crowd/dialogue. YouTube playback depends on the publisher and browser. Device performance still varies; physical Android hardware has not been benchmarked.

## Optional support

The persistent Daan patra control opens `/support.html`, showing the supplied UPI QR. Its original QR pixels are untouched; a precise display crop excludes the lower name section. No payment button or checkout script is loaded. All gameplay remains free.

## Media

The generated panorama in `public/assets/mela-panorama.png` is retained for social previews and the support page. Built-in image generation prompt: ultrawide painterly miniature nighttime Indian Dussehra fair, entrance, toy/balloon/chaat stalls, ferris wheel, Ram Leela and Ravana; marigold lighting and deep teal sky; no text or watermark.

Ram Leela uses the video supplied by the creator: https://youtu.be/--VFGn2WhLg . No live-event claim is made.

Festival upgrade: generated textured stall facades in `public/assets/mela-stall-atlas.webp` (original PNG retained), bright entrance festoons, continuous pooled fireworks/anaar, eight stall-specific food menus, aim-assisted balloons and forgiving ring toss. Stage uses creator video `--VFGn2WhLg`. Visible Mela Radio uses official Maithili Thakur and Govind Krsna Das YouTube embeds, with mute/close controls; browser autoplay restrictions may require tapping Play.
