#!/usr/bin/env bash
# Optional: keep the depth model on your own machine so the photo simulator works without
# internet at the venue. Downloads Depth Anything V2 Small (ONNX) into web/public/models/.
# (The ONNX runtime itself is still loaded from cdn.jsdelivr.net on first use, then cached.)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/web/public/models/onnx-community/depth-anything-v2-small"
BASE="https://huggingface.co/onnx-community/depth-anything-v2-small/resolve/main"
mkdir -p "$DEST/onnx"
for f in config.json preprocessor_config.json onnx/model_quantized.onnx onnx/model_fp16.onnx; do
  echo "Downloading $f"
  curl -fL --retry 3 -o "$DEST/$f" "$BASE/$f"
done
echo "Done: $DEST"
