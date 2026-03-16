import os
import sys
import subprocess

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(CURRENT_DIR, 'backend')
wav2lip_dir = os.path.join(backend_dir, 'Wav2Lip')

# Mock some paths
abs_checkpoint = os.path.abspath(os.path.join(wav2lip_dir, "checkpoints", "wav2lip_gan.pth"))
abs_face = os.path.abspath(os.path.join(CURRENT_DIR, "static", "agent.mp4"))
abs_audio = os.path.abspath(os.path.join(CURRENT_DIR, "static", "audio", "speech_4522f192567143648b6df811c8d14ad3.wav"))
abs_output = os.path.abspath(os.path.join(CURRENT_DIR, "static", "videos", "debug_test.mp4"))
script_path = os.path.abspath(os.path.join(wav2lip_dir, "inference.py"))

command = [
    sys.executable,
    script_path,
    "--checkpoint_path", abs_checkpoint,
    "--face", abs_face,
    "--audio", abs_audio,
    "--outfile", abs_output,
    "--pads", "0", "20", "0", "0",
    "--wav2lip_batch_size", "64",
    "--resize_factor", "1",
    "--fps", "25"
]

print(f"Working Directory: {wav2lip_dir}")
print(f"Command: {' '.join(command)}")

try:
    process = subprocess.run(
        command,
        cwd=wav2lip_dir,
        capture_output=True,
        text=True,
        check=False
    )
    print(f"Return Code: {process.returncode}")
    print("STDOUT:")
    print(process.stdout)
    print("STDERR:")
    print(process.stderr)
except Exception as e:
    print(f"ERROR: {e}")
