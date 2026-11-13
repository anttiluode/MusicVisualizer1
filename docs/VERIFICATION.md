# Verification — 13 November 2026

## Automated checks

- `node --test tests/*.test.cjs`: 13 tests passed.
- `node tests/smoke.cjs`: scripts parse, DOM references exist, 160 real model steps produce finite probabilities; known repeating input selects laps 32 and 64.
- `git diff --check`: clean.
- `korva-engine.js` and `weights.js`: byte-identical to the previous `main` version. `classic/app.js` is the original application unchanged; the archived HTML only changes engine/weight script paths.

Independent source review found four material issues, each fixed with a failing-then-passing regression test: muted demo after live capture, skipped audio clocks compressing ring history, Cinema keyboard shortcuts blocked by button focus, and missing ring/gentle settings in shared links. A browser check additionally found that clipboard permission could remain pending; Share now always presents the selectable URL immediately.

## Browser interaction checks

Chrome in the supplied cloud environment, 1363 × 936 viewport:

- Demo starts only after clicking; transport and eight-band meter update.
- All six Canvas fallback worlds render and have distinct appearances.
- The instrument panel reports changing selected laps, prediction error and attention from the actual Korva model.
- Loaded a generated local WAV fixture, observed the local-listening state, then sought to 20 s in a 40-s file and paused; transport displayed 0:20 / 0:40 at 50%.
- Cinema hides the interface; H on the focused exit button restores it.
- Presets update scene/palette; shared-link dialog includes `orbits=1` for Neural night.
- PNG downloaded successfully; decoded as a nonblank 1363 × 936 RGB image.
- Recorded and downloaded an approximately 8.6-second WebM clip. `ffprobe` identified 1363 × 936 VP9 video and Opus audio. `ffmpeg` measured mean audio -25.0 dB and peak -0.2 dB, confirming the recording was not a silent audio track.
- 390 × 844 iframe viewport: layout fit, horizontal scene selection remained available, demo started, and the crystal fallback rendered without covering the transport. This checks CSS sizing, not a physical phone browser.

The screenshot in this directory is an actual browser capture of the **Canvas fallback**, not an image-generation mockup.

## Shader validation

This cloud browser reports WebGL unavailable. Therefore browser UI/audio checks above exercised the fallback, not the WebGL compositor.

The actual vertex and fragment sources from `renderer.js` were separately compiled and rendered using offscreen EGL 1.5 / OpenGL ES 3.2 / Mesa llvmpipe. Crystal Cathedral, Fourier Bloom, Tidal Silk and Event Horizon produced distinct, nonblank images which were visually inspected. `tests/shaders.py` retains that optional check. This validates the shader source and sampled images; it does not certify all WebGL implementations or real-GPU performance.

## Remaining device-dependent checks

- Real microphone hardware, loopback devices and interactive browser-tab sharing were not exercised. Permission denial, late results, missing shared audio, track cleanup and returning to audible demo playback have isolated lifecycle regression tests.
- No performance claim is made for an RTX 3060 or a physical mobile device; adaptive rendering still needs those device observations.
- Chrome cloud testing does not replace Firefox, Safari or Edge testing. Direct-file operation is supported by classic scripts and local assets, but the browser run here used localhost.
- Browser recording codec support and system audio capture vary. PNG remains available without MediaRecorder.
