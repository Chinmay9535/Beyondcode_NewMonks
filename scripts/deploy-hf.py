"""Publish DrishtiSaathi as a Hugging Face Space (Docker): one public HTTPS demo link.

    pip install huggingface_hub
    python scripts/deploy-hf.py <hf-user>/drishtisaathi        # token: HF_TOKEN or `hf auth login`

Uploads only git-tracked files of backend/ and web/ (never .env, databases or node_modules),
plus deploy/hf-space/ (Dockerfile, start.sh, Space card) at the Space's root. The Space builds
the image itself. Add the AI key once in the Space's Settings -> Variables and secrets:
secret GEMINI_API_KEY (this script sets the variable LLM_PROVIDER=gemini).
"""
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from huggingface_hub import HfApi

ROOT = Path(__file__).resolve().parents[1]
repo = sys.argv[1] if len(sys.argv) > 1 else "drishtisaathi"
api = HfApi()
if "/" not in repo:
    repo = f"{api.whoami()['name']}/{repo}"

files = subprocess.run(["git", "ls-files", "backend", "web"], cwd=ROOT, check=True, capture_output=True, text=True).stdout.split()
with tempfile.TemporaryDirectory() as tmp:
    out = Path(tmp)
    for f in files:
        if (ROOT / f).is_file():
            (out / f).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / f, out / f)
    for f in (ROOT / "deploy/hf-space").iterdir():
        shutil.copy2(f, out / f.name)
    api.create_repo(repo, repo_type="space", space_sdk="docker", exist_ok=True)
    api.add_space_variable(repo, "LLM_PROVIDER", "gemini")
    commit = api.upload_folder(repo_id=repo, repo_type="space", folder_path=out, delete_patterns=["backend/**", "web/**"],
                               commit_message="Deploy from GitHub " + subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip())
print(f"Uploaded {len(files)} files: {commit.commit_url}")
print(f"Build logs: https://huggingface.co/spaces/{repo}?logs=build")
print(f"Demo link:  https://{repo.replace('/', '-').replace('_', '-').lower()}.hf.space")
