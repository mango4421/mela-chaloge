# Dussehra Mela Online

A continuous, first-person 3D North Indian fairground built with React, Three.js and Vite. Walk through the gate, explore the stalls, meet vendors and celebrate a symbolic Ravana Dahan.

## Run

`npm ci`, then `npm run dev`. `npm test` checks collisions, proximity, balloon scoring, ring flights and cleanup. `npm run build` creates `dist/` for Vercel.

## Controls

WASD/arrows to walk; drag the world to look; E to interact nearby; Shift or RUN to run. Mobile uses a left joystick and scene dragging. Escape exits conversations, games and rides. The minimap shows position without teleporting.

## Playable

68 animated crowd visitors; eight food stalls with steam; toy vendors and free virtual inventory; three-shot 3D raycast balloon shooting; five-ring drag/release toss with parabolic flights; ferris-wheel camera ride; carousel camera ride; projected YouTube screen on the Ram Leela stage; virtual fireworks; ten-headed Ravana with countdown, Ram's arrow, sparks and collapse; photo capture and personal downloadable mela card with session achievements; WhatsApp/native sharing and clipboard fallback.

Environment models are procedural low-poly geometry with instanced crowd and static geometry, limited dynamic lighting and capped display resolution. Sound is procedural scene-aware ambience and browser vendor speech, not recorded crowd/dialogue. YouTube playback depends on the publisher and browser. Device performance still varies; physical Android hardware has not been benchmarked.

## Optional support

`public/payment-config.js` accepts only a public Razorpay button ID or hosted payment link. The supplied public payment button is connected. A quiet, persistent Daan patra button opens the optional support page. `/support.html` explains voluntary creator support and that no physical goods or delivery are offered. All play and souvenirs remain free; no payment success is inferred from returning to the game.

## Media

The generated panorama in `public/assets/mela-panorama.png` is retained for social previews and the support page. Built-in image generation prompt: ultrawide painterly miniature nighttime Indian Dussehra fair, entrance, toy/balloon/chaat stalls, ferris wheel, Ram Leela and Ravana; marigold lighting and deep teal sky; no text or watermark.

Ram Leela uses the recorded cultural film embedded by Sangeet Natak Akademi: https://indiaich-sna.in/ramlila-the-traditional-performance-of-the-ramayana . No live-event claim is made.
