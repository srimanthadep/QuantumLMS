"""Local-only model inference. Missing dependencies/model or decode failures exit nonzero."""
import json
import sys
from faster_whisper import WhisperModel

model = WhisperModel(sys.argv[3], device="cpu", compute_type="int8", cpu_threads=2, local_files_only=True)
segments, info = model.transcribe(sys.argv[1], beam_size=5, vad_filter=True)
with open(sys.argv[2], "w", encoding="utf-8") as output:
    json.dump([{"start": s.start, "end": s.end, "text": s.text.strip()} for s in segments], output, ensure_ascii=False)
