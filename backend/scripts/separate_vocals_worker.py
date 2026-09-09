#!/usr/bin/env python3
"""
Persistent Demucs source-separation worker.

Loads the HTDemucs model ONCE at startup, then serves jobs from stdin
as JSON lines:  {"input": "<audio>", "output": "<vocals.wav>"}

One result line is written to stdout per job:
    {"ok": true}   or   {"ok": false, "error": "..."}

Progress markers go to stderr (the Node supervisor parses those) and the
process exits when stdin closes. Concurrency is 1 by design (the model is
single-slot); the Node side already gates this with a semaphore.

Exit codes:
    0 - Clean shutdown (stdin closed)
    1 - Startup failure (model could not be loaded)
"""

import json
import os
import sys
import warnings

warnings.filterwarnings("ignore")


def log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def load_separator():
    from demucs.api import Separator

    log("Using htdemucs model on cpu")
    separator = Separator(
        model="htdemucs",
        device="cpu",
        shifts=1,
        split=True,
    )
    return separator


def separate(separator, input_path: str, output_path: str) -> None:
    from demucs.api import save_audio

    if not os.path.isfile(input_path):
        raise RuntimeError(f"Input file not found: {input_path}")

    output_dir = os.path.dirname(output_path) or "."
    os.makedirs(output_dir, exist_ok=True)

    log("Separating music from voice")
    _, stems = separator.separate_audio_file(input_path)

    log("Saving vocals output")
    save_audio(
        stems["vocals"],
        str(output_path),
        samplerate=separator.samplerate,
        clip="rescale",
    )

    if not os.path.isfile(output_path) or os.path.getsize(output_path) == 0:
        raise RuntimeError(f"Vocals output missing or empty: {output_path}")

    log("Separation complete")


def main():
    try:
        separator = load_separator()
    except Exception as e:
        log(f"Error loading model: {e}")
        sys.exit(1)

    log("Worker ready")
    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            input_path = req["input"]
            output_path = req["output"]
        except Exception as e:
            log(f"Error parsing job: {e}")
            print(json.dumps({"ok": False, "error": "invalid request"}), flush=True)
            continue
        try:
            separate(separator, input_path, output_path)
            print(json.dumps({"ok": True}), flush=True)
        except Exception as e:
            log(f"Error during separation: {e}")
            print(
                json.dumps({"ok": False, "error": str(e)[-2000:]}),
                flush=True,
            )


if __name__ == "__main__":
    main()