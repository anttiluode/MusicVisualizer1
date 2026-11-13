# Korva · Dream Garden (MusicVisualizer1)

**A browser music visualizer that displays memory, prediction, and surprise—not just volume.**

Built from [Korva](https://github.com/anttiluode/Korva)'s **actual** 52-ring organ and pretrained two-layer transformer, with a new procedural Fourier-inspired flower, a 52-ring orrery, and a GhostWorld-like prediction/reality instrument. This repository starts an audiovisual branch of the earlier [FourierFlower](https://github.com/anttiluode/FourierFlower), [GhostWorld](https://github.com/anttiluode/GhostWorld), and [GeometricNeuronV27](https://github.com/anttiluode/GeometricNeuronV27) explorations.

## Run

**Open [index.html](index.html) directly in Chrome, Edge, or Firefox.** No npm, build step, backend, Python, GPU, or internet connection is needed. All the model weights are included in weights.js, so running from a local file URL works.

For GitHub Pages, **Settings → Pages → Build and deployment → Deploy from a branch → main / (root) → Save**. Once GitHub Pages is enabled, the intended URL is:

https://anttiluode.github.io/MusicVisualizer1/

(The link will only work after GitHub Pages is actually enabled and deployed.)

**Controls:** Play/Pause or Space, Load music or drop an audio file, 1 Flower, 2 52 Rings, 3 Ghosts, Fullscreen, save a PNG, Sensitivity, and Predictions toggle.

The original generative demo has a simple synthesized rhythm so the scene has music to listen to even without a file. Audio files are decoded and analyzed locally in the browser; no audio is uploaded.

## What each picture means

| Signal | Source | Visual |
| --- | --- | --- |
| Rhythmic comparison | All 52 Korva rings, periods 13–64 ticks | Faint orrery rings |
| Three selected periods | The lowest-surprise rings (Organ.step) | Three bright rotating orbits |
| Ring phase | t mod L, where L is each selected lap | Moving dot on each orbit |
| Surprise | The ring's slow XOR mismatch Z_L | Numeric stability reading |
| Next-tick expectation | **Trained** transformer's eight output probabilities | Eight translucent ghost halos |
| Prediction error | Difference between previous prediction and observed onsets | Unexpected percentage and light burst |
| Attention to organ | Mean of the two layer-specific organ attention shares | Organ-attention meter |
| Spectral energy | Parallel continuous 8-band FFT frontend | Smooth flower shape and frequency bars |
| Previously heard ticks | Fading visual trace | A slowly drifting garden of light |

### Three visual modes

**Flower.** A procedural 2.5D Fourier flower with thirteen luminous curves. Each band changes harmonic geometry, while the selected Korva rings surround the flower. The continuous energies make smooth motion between the organ's discrete ticks.

**52 Rings.** Exposes the whole comb (13–64 ticks). Three selected rings are colored and orbit their real mathematical phases. A 32-tick demo phrase typically lets Korva select 32 and its harmonic laps after a few repetitions.

**Ghosts.** The model's probabilities are displayed as *predictions for the next 125 ms tick*, while the actual last tick is drawn separately. Ghost halos are deliberately not claimed to be a confidence-calibrated physical future.

## Architecture

- korva-engine.js: exact copy of Korva's web/engine.js browser Organ + Tiny inference core, unmodified.
- weights.js: exact original trained web/weights.json model values, wrapped as window.KORVA_WEIGHTS for offline local-file use.
- app.js: original drawing, browser audio, FFT band analysis, demo synthesizer, clock, and UI.
- index.html: interface and responsive styles.
- tests/smoke.cjs: no-dependency syntax, browser element, and actual Korva inference smoke test.

The organ still uses **52 periods**, a slow surprise state with TAU=32, gated memory writes with threshold THETA=12, and passes the **three lowest-surprise rings** as tokens to a 2-layer, 2-head, 48-wide trained transformer. This is inherited behavior, not a new model.

When an audio file is selected, the app computes eight frequency-band log energies using windowed 2048-point FFTs, then uses positive spectral flux and per-band thresholds to make Korva-compatible binary onset ticks every **125 ms**. It also keeps normalized continuous energy for smooth visuals. The scene renders with Canvas 2D at the screen's frame rate; the model runs at eight ticks per second. The audio element's clock drives both. The exact song itself never reaches GitHub.

## Limitations and honesty

- **Real music is out of distribution.** Korva was trained on synthetic rhythms; its trained next-tick predictions can be weak or inaccurate for a real recording. The ghosts visualize what this small model predicts, not reliable beat tracking.
- **Not a tempo estimator.** The rings measure agreement at 125-ms integer periods; they can select multiples/submultiples or drift relative to a song's tempo.
- **No semantic song memory.** The fading flower traces are visual history, not learned recognition of choruses. A long-term song-section model would be a later experiment.
- **Not the FourierFlower renderer.** These curves use an independent, simplified Fourier-inspired algorithm. No renderer source was copied from that repository.
- **Seek rehydrates approximately.** On a seek, the organ and transformer rebuild at most 320 prior ticks (40 seconds), so the state might differ from uninterrupted playback.
- **Frontend is intentionally simple.** FFT runs during loading in the main thread (yielding periodically). Very long audio can take time to analyze; PNG is an image capture, not video export.
- **No live mic or desktop system-audio capture in v1.** File input and synthesized demo only.
- The included GitHub Action checks JavaScript syntax, DOM IDs, and Korva inference with 160 synthetic steps. This is **not** a full browser/audio visual regression test.

## Local smoke test

Run: node tests/smoke.cjs

## Origin and credit

Korva's neural organ and weights were created in [anttiluode/Korva](https://github.com/anttiluode/Korva), built with Opus 5.5 and licensed MIT. The rhythm rings originate in the Geometric Neuron / GoldOpus research lineage. The flower/orbit visual concepts build on our FourierFlower and GhostWorld experiments; all drawing and frontend code here is new. The demo soundtrack is generated locally as simple original oscillator percussion.

**12 November 2026** — First browser version. MIT, matching the parent repository.
