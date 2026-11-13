# Immersive Worlds Implementation Plan

> Execute inline with superpowers:executing-plans; retain a final independent code review.

**Goal:** Turn MusicVisualizer1 into an immediately enjoyable offline audiovisual instrument.
**Architecture:** Original Korva inference, shared streaming audio features, WebGL worlds plus signal Canvas, native DOM controls.
**Tech Stack:** HTML, CSS, JavaScript, Web Audio, WebGL, Node built-in tests.
**Spec:** docs/superpowers/specs/2026-11-13-immersive-worlds-design.md

## Constraints
No runtime downloads or build; preserve engine and weights. Preserve original experience at classic/. Bounded GPU work. Honest predictor labels. User-authorized repo upgrade.

## Review focus
1. Source changes, permission cancellation and pending media requests do not leave tracks or sound running.
2. Silence remains quiet and pause does not manufacture musical events.
3. File URLs work without modules/fetch; bad settings cannot break startup.
4. Mobile controls fit and retain visible escape from cinema mode.
5. Recording releases tracks/URLs and includes audio without mic speaker feedback.

### Task 1: Audio and state core
- [x] Add failing tests for settings roundtrip, malicious input, onset/silence, delay coordinates, adaptive resolution bounds.
- [x] Implement core.js and audio.js, preserving 125-ms Korva ticks.
- [x] Run node --test tests/core.test.cjs and existing smoke test.

### Task 2: Worlds and interface
- [x] Implement renderer.js: bounded shaders, distinct modes, signal overlay, Canvas fallback.
- [x] Replace index.html/app.js; add styles.css, accessible controls, audio sources, presets, recording and share links.
- [x] Run syntax/inference tests; inspect actual browser images and interactions.

### Task 3: Release
- [x] Write accurate README with controls, provenance and limitations; update CI.
- [x] Independent whole-branch review; fix material findings and run complete suite.
- [x] Commit and publish to the authorized repository, verify branch and Pages state.

## Execution ledger
- Task 1 complete: pure core tests and original inference test pass. Streaming audio replaces offline preanalysis.
- Task 2 complete: six WebGL/Canvas worlds, audio sources, controls, capture and share are implemented; browser QA in progress.
- Independent review identified four material issues: restored speaker gain after live capture; reset Korva on skipped/backward ticks; allow cinema shortcuts on focused controls; serialize gentle response and orbits. Each has a regression test, observed failing before the fix.
- Ruling: reset inference on missed ticks rather than fabricate unobserved onsets; this loses earlier memory after background throttling, but preserves the meaning of adjacent ticks.
- Ruling: the cloud browser has WebGL disabled. Validate Canvas/UI in that browser and compile/render the actual shaders separately using EGL/Mesa; do not claim browser GPU performance.

- Task 3 verification complete: 13 unit/regression tests, inference smoke test, browser playback/seek/PNG/WebM checks, mobile-layout check and independent review. Publishing is the remaining release action.
