# Korva / Worlds

Upgrade MusicVisualizer1 into a polished browser audiovisual instrument, keeping the exact trained Korva engine and weights. The user authorizes the upgrade and delegates the creative direction. Implementation choices below are the builder's decisions.

## Approach
Use native WebGL for full-screen procedural worlds and Canvas for actual signal trajectories; Web Audio for immediate streaming analysis. Preserve the original at classic/. Compared with expanding the existing Canvas curves, this offers depth and lighting; compared with importing a full game engine or CrystalMoon's voxel simulation, it keeps startup, distribution and GPU cost bounded. No build, CDN, server, account or audio upload.

## Experience
A full-screen living image with a restrained editorial interface. Six distinct scenes: Crystal Cathedral, Fourier Bloom, Tidal Silk, Phase Loom, Resonant Cortex, and Event Horizon. Five palettes; curated combinations; automatic slow scene changes; manual controls for energy, motion and detail; screenshot, recording and shareable visual settings. Instant original synthesized demo, local music playback and live audio inputs. Clearly label preview versus listening, and retain access to the scientific instrument and its limitations.

## Engineering
Keep korva-engine.js and weights.js byte-identical. Bounded live FFT analysis supplies eight continuous bands and 125-ms onset ticks. Actual sampled waveforms drive the phase view. No claims of beat/section recognition or trained ResonantCortex inference. Renderer bounds pixel count and shader iterations; adaptive resolution and Canvas fallback. Source changes and seeks reset the predictor rather than claiming exact restored state. Mic is never monitored through speakers. Playback errors are visible. All resources released on source change. Local settings are validated; storage failure is nonfatal.

## Validation
Existing inference tests; deterministic signal, settings and quality tests; browser QA at desktop and phone viewport, all six scenes, demo, local-file playback, pause/seek, persistence, exports and error paths where available. Hardware claims limited to actual measurements; no guaranteed 60 fps or virality.
