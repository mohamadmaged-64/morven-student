#!/usr/bin/env python3
"""
Audio source separation using Demucs HTDemucs model.

Separates an audio file into vocals and accompaniment.
Outputs only the vocals stem as a WAV file.

Usage:
    python separate_vocals.py <input_audio> <output_vocals_wav>

Progress is reported on stderr (the Node supervisor parses those markers).

Exit codes:
    0 - Success
    1 - Error (message written to stderr)
"""

import os
import sys
import warnings

warnings.filterwarnings("ignore")


def log(message: str) -> None:
    print(message, file=sys.stderr, flush=True)


def main():
    if len(sys.argv) != 3:
        print(
            "Usage: python separate_vocals.py <input> <output_vocals>",
            file=sys.stderr,
        )
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]

    if not os.path.isfile(input_path):
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    output_dir = os.path.dirname(output_path) or "."
    os.makedirs(output_dir, exist_ok=True)

    try:
        from demucs.api import Separator, save_audio
    except ImportError:
        print(
            "Error: Demucs not installed. Install with: pip install demucs",
            file=sys.stderr,
        )
        sys.exit(1)

    try:
        log("Using htdemucs model on cpu")
        separator = Separator(
            model="htdemucs",
            device="cpu",
            shifts=1,
            split=True,
            progress=False,
            verbose=False,
        )

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
            print(
                f"Error: Vocals output missing or empty: {output_path}",
                file=sys.stderr,
            )
            sys.exit(1)

        log("Separation complete")
    except Exception as e:
        print(f"Error during separation: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()