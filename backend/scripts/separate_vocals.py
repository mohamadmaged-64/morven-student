#!/usr/bin/env python3
"""
Audio source separation using Demucs HTDemucs model.

Separates an audio file into vocals and accompaniment.
Outputs only the vocals stem as a WAV file.

Usage:
    python separate_vocals.py <input_audio> <output_vocals_wav>

Exit codes:
    0 - Success
    1 - Error (message written to stderr)
"""

import sys
import os
import shutil
import subprocess
import tempfile
import warnings

warnings.filterwarnings("ignore")


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

    # Ensure output directory exists
    output_dir = os.path.dirname(output_path) or "."
    os.makedirs(output_dir, exist_ok=True)

    # Use a temporary directory for intermediate separation output
    with tempfile.TemporaryDirectory(prefix="demucs_") as tmp_dir:
        try:
            # Run Demucs separation using the CLI
            # --two-stems vocals: separates into vocals + no_vocals (faster, fewer artifacts)
            # --device cpu: force CPU for Docker/server deployment
            # --clip mode "rescale": avoid clipping artifacts
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "demucs",
                    "--two-stems",
                    "vocals",
                    "--device",
                    "cpu",
                    "--clip",
                    "rescale",
                    "--out",
                    tmp_dir,
                    "--name",
                    "morven_sep",
                    input_path,
                ],
                capture_output=True,
                text=True,
                timeout=1500,  # 25 minute timeout
            )

            if result.returncode != 0:
                # Fallback: try invoking demucs through its console entry point
                try:
                    result = subprocess.run(
                        [
                            sys.executable,
                            "-m",
                            "demucs.separate",
                            "--two-stems",
                            "vocals",
                            "--device",
                            "cpu",
                            "--clip",
                            "rescale",
                            "--out",
                            tmp_dir,
                            "--name",
                            "morven_sep",
                            input_path,
                        ],
                        capture_output=True,
                        text=True,
                        timeout=1500,
                    )
                except subprocess.TimeoutExpired:
                    print(
                        "Error: Demucs separation timed out (25 minute limit)",
                        file=sys.stderr,
                    )
                    sys.exit(1)

            if result.returncode != 0:
                stderr_msg = result.stderr.strip()[-2000:] if result.stderr else "Demucs failed"
                print(f"Error: Demucs separation failed: {stderr_msg}", file=sys.stderr)
                sys.exit(1)

            # Demucs output structure: <tmp_dir>/morven_sep/<filename>/vocals.wav
            input_basename = os.path.splitext(os.path.basename(input_path))[0]
            vocals_file = os.path.join(
                tmp_dir, "morven_sep", input_basename, "vocals.wav"
            )

            if not os.path.isfile(vocals_file):
                # Try to find vocals file with any extension
                sep_dir = os.path.join(tmp_dir, "morven_sep", input_basename)
                if os.path.isdir(sep_dir):
                    for f in os.listdir(sep_dir):
                        if f.startswith("vocals"):
                            vocals_file = os.path.join(sep_dir, f)
                            break

            if not os.path.isfile(vocals_file):
                print(
                    f"Error: Vocals file not found after separation. "
                    f"Expected at: {vocals_file}",
                    file=sys.stderr,
                )
                sys.exit(1)

            # Move the vocals file to the desired output path
            shutil.move(vocals_file, output_path)
            print(f"Vocals extracted successfully to {output_path}")

        except subprocess.TimeoutExpired:
            print("Error: Demucs separation timed out (30 minute limit)", file=sys.stderr)
            sys.exit(1)
        except FileNotFoundError:
            print(
                "Error: Python or Demucs not found. Install with: pip install demucs",
                file=sys.stderr,
            )
            sys.exit(1)
        except Exception as e:
            print(f"Error during separation: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
