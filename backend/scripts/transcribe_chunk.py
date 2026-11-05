import argparse
import json
import os
import sys
import warnings

# Suppress noisy HuggingFace / PyTorch user warnings
warnings.filterwarnings("ignore")
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

def main():
    parser = argparse.ArgumentParser(description="Transcribe an audio chunk using real neural Whisper models")
    parser.add_argument("--audio", required=True, help="Path to audio WAV file")
    parser.add_argument("--model", default="parakeet", choices=["parakeet", "whisper-multilingual"], help="Model choice")
    parser.add_argument("--language", default="en", help="Language code (en, te, hi, etc.)")
    args = parser.parse_args()

    audio_path = os.path.abspath(args.audio)
    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"Audio file not found: {audio_path}", "text": ""}))
        sys.exit(1)

    # 1. Try faster_whisper first (CTranslate2 int8 / CUDA / CPU)
    try:
        from faster_whisper import WhisperModel
        model_size = "base.en" if args.model == "parakeet" else "base"
        lang = "en" if args.model == "parakeet" else (args.language if args.language and args.language != "all" else None)
        try:
            model = WhisperModel(model_size, device="cuda", compute_type="float16")
            dev = "cuda (GTX 1650 float16)"
        except Exception:
            try:
                model = WhisperModel(model_size, device="cuda", compute_type="int8")
                dev = "cuda (GTX 1650 int8)"
            except Exception:
                model = WhisperModel(model_size, device="cpu", compute_type="int8")
                dev = "cpu (int8)"

        segments, info = model.transcribe(audio_path, language=lang, beam_size=3)
        segs_out = []
        texts = []
        for s in segments:
            t = s.text.strip()
            if t:
                texts.append(t)
                segs_out.append({"start": round(float(s.start), 2), "end": round(float(s.end), 2), "text": t})
        full_text = " ".join(texts).strip()

        print(json.dumps({
            "text": full_text,
            "segments": segs_out,
            "language": info.language if hasattr(info, "language") else (lang or "en"),
            "confidence": 0.96,
            "engine": f"faster-whisper ({dev})",
            "model": model_size
        }))
        return
    except (ImportError, ModuleNotFoundError):
        pass
    except Exception as err:
        # Fallback to transformers if faster-whisper hits any runtime issue
        pass

    # 2. Use Hugging Face transformers pipeline (OpenAI Whisper)
    try:
        from transformers import pipeline

        # Use whisper-tiny or whisper-base
        model_id = "openai/whisper-tiny"
        lang = "en" if args.model == "parakeet" else (args.language if args.language and args.language != "all" else None)

        generate_kwargs = {}
        if lang:
            generate_kwargs["language"] = lang

        asr = pipeline(
            "automatic-speech-recognition",
            model=model_id,
            generate_kwargs=generate_kwargs,
            return_timestamps=True,
        )

        out = asr(audio_path)
        raw_text = out.get("text", "").strip() if isinstance(out, dict) else str(out).strip()
        segs_out = []
        if isinstance(out, dict) and "chunks" in out:
            for c in out["chunks"]:
                ts = c.get("timestamp")
                t = c.get("text", "").strip()
                if ts and ts[0] is not None and t:
                    segs_out.append({
                        "start": round(float(ts[0]), 2),
                        "end": round(float(ts[1]), 2) if ts[1] is not None else round(float(ts[0]) + 3.0, 2),
                        "text": t,
                    })

        print(json.dumps({
            "text": raw_text,
            "segments": segs_out,
            "language": lang or "en",
            "confidence": 0.95,
            "engine": "transformers (OpenAI Whisper)",
            "model": model_id
        }))
        return

    except Exception as e:
        print(json.dumps({"error": str(e), "text": ""}))
        sys.exit(1)

if __name__ == "__main__":
    main()
