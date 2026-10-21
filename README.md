# Birthday Movie (Three.js + chess.js)
**Run:** `npm i -g serve` then `serve .` (or `python3 -m http.server`) and open the URL. Needs a local server (ES modules). **Deploy:** upload this whole folder to Netlify/Vercel/GitHub Pages (no build step).
**Edit everything in `config.js`:** dialogue, hidden chess messages (`chess.messages`), memories (photos → `assets/images/`, videos → `assets/videos/`, set `src`/`date`/`caption`/`hidden`), your voice (`letter.voice` → `assets/audio/…mp3`), music (`audio.music`, `audio.dance`; use only audio you have rights to, e.g. Love Story / Alors on danse).
**Characters:** procedural rigs in `makeChar()` (main.js). To use GLB models, replace it with a GLTFLoader that returns the same `{root, head, armL, armR, legL, legR, mouth, p, t}` interface.
**Puzzle:** Scholar's mate (1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6 4.Qxf7#), verified with chess.js.
**Voices:** the girl uses a female browser voice if the device has one (varies by device). To use your own recordings, put files in `assets/audio/voice/` and map each exact line to its file in `voiceFiles` in `config.js`; for the 4 song lines use `audio.song`. Missing files fall back to the demo voice.
**Dance music:** set `audio.dance` (e.g. a licensed "Alors on danse" file). Tracks crossfade automatically.
**Testing shortcuts:** `?start=ending` jumps to the ending; `?stop=opening` ends after the opening.
**Voices:** the girl uses a female browser voice if the device has one (varies by device). For your own recordings, put files in `assets/audio/voice/` and map each exact line to its file in `voiceFiles` in `config.js`; the 4 song lines use `audio.song`. Missing files fall back to the demo voice.
**Dance music:** set `audio.dance` (e.g. a licensed "Alors on danse" file). Tracks crossfade automatically.
**Testing shortcuts:** `?start=ending` jumps to the ending; `?stop=opening` ends after the opening.
