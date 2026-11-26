"""Local-only speech-to-text on a 16 kHz mono WAV. Missing dependencies/model or decode failures exit nonzero.

argv: audio.wav output.json model_dir [cpu_threads]
"""
import json
import sys

from faster_whisper import BatchedInferencePipeline, WhisperModel

audio, output_path, model_dir = sys.argv[1:4]
threads = int(sys.argv[4]) if len(sys.argv) > 4 else 4

model = WhisperModel(model_dir, device="cpu", compute_type="int8", cpu_threads=threads, local_files_only=True)
# Speed: silence is cut out (VAD), the speech chunks are decoded in batches, and greedy search (beam 1) replaces beam 5.
# Timestamps stay on so the transcript keeps sentence-level segments for captions and chapters.
segments, _ = BatchedInferencePipeline(model).transcribe(audio, batch_size=8, beam_size=1, vad_filter=True, without_timestamps=False)
result = []
for s in segments:
    result.append({"start": s.start, "end": s.end, "text": s.text.strip()})
    print(f"progress {s.end:.1f}", flush=True)  # read by the worker for the progress bar
with open(output_path, "w", encoding="utf-8") as output:
    json.dump(result, output, ensure_ascii=False)
