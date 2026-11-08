# Local voices on your GPU (free)

Runs **AI4Bharat Indic Parler-TTS** (Apache 2.0) on your laptop's NVIDIA GPU. The patient app's
read-aloud then uses natural Kannada, Hindi, Tamil and Indian-English voices at no cost, offline,
and the text never leaves your machine.

Voices: Anu (Kannada), Divya (Hindi), Jaya (Tamil), Mary (English), all from the model's
recommended speakers. Change them with `SPEAKER_KN`, `SPEAKER_HI`, `SPEAKER_TA`, `SPEAKER_EN`
(other speakers on the model card include Suresh/Chetan/Vidya, Rohit/Aman/Rani, Kavitha, Thoma).

Needs: an NVIDIA GPU with about 4 GB of free VRAM, Python 3.10–3.12, Git, ~5 GB of disk.

## 1. One-time Hugging Face access (free)

1. Create an account at https://huggingface.co and open https://huggingface.co/ai4bharat/indic-parler-tts
2. Click **Agree and access repository** (approved instantly).
3. Create a token at https://huggingface.co/settings/tokens (type **Read**) and copy it.

## 2. Install (Windows, from the repo folder)

Check your driver's CUDA version with `nvidia-smi` (top right). For CUDA 12.6 or newer:

```bat
cd tts-local
python -m venv .venv
.venv\Scripts\pip install torch --index-url https://download.pytorch.org/whl/cu126
.venv\Scripts\pip install -r requirements.txt
```

(If `nvidia-smi` shows an older CUDA, use `cu118` instead of `cu126`.)

## 3. Run

```bat
set HF_TOKEN=hf_your_token_here
.venv\Scripts\python server.py
```

The first start downloads the model (~3.8 GB) and prints `Loaded ... on cuda:0`.
Then add this line to `backend\.env` and restart the backend:

```
LOCAL_TTS_URL=http://127.0.0.1:8010
```

Check it: open http://127.0.0.1:8010/health. The patient app's speaker buttons now use these voices.
If this server is not running, the app falls back to Azure (if configured) or the browser's voice.

## Notes

- Speed depends on the GPU; long messages are spoken sentence by sentence, so the first words
  start quickly. Audio is cached by the backend, so replays are instant.
- Speakers are chosen by a plain-language description (`SPEAKER_STYLE`), e.g. "{name} speaks
  slowly in a calm, warm voice…". Write text in native script; romanised text sounds worse.
- `TTS_FAKE=1` runs the server without the model (a short beep) for testing the wiring.
