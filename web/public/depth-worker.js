// Monocular depth estimation in the browser (Depth Anything V2 Small via transformers.js).
// Runs in a Web Worker so the page stays responsive; the photo never leaves the device.
// Models are looked up in /models/ first (for offline demos, see scripts/fetch-depth-model.sh),
// then downloaded from the Hugging Face hub and cached by the browser.
import { pipeline, env, RawImage } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1/+esm";

const MODEL = "onnx-community/depth-anything-v2-small";
env.allowLocalModels = true;
env.localModelPath = "/models/";

let ready = null;
let device = "wasm";

async function hasWebGPU() {
  try {
    return !!(self.navigator && self.navigator.gpu && (await self.navigator.gpu.requestAdapter()));
  } catch {
    return false;
  }
}

function load(onProgress) {
  if (!ready) {
    ready = (async () => {
      device = (await hasWebGPU()) ? "webgpu" : "wasm";
      try {
        return await pipeline("depth-estimation", MODEL, { device, dtype: device === "webgpu" ? "fp16" : "q8", progress_callback: onProgress });
      } catch (e) {
        if (device !== "webgpu") throw e;
        device = "wasm"; // some GPUs lack fp16 support
        return await pipeline("depth-estimation", MODEL, { device, dtype: "q8", progress_callback: onProgress });
      }
    })();
    ready.catch(() => { ready = null; });
  }
  return ready;
}

self.onmessage = async (e) => {
  const { id, blob } = e.data;
  try {
    const pipe = await load((p) => self.postMessage({ id, type: "progress", status: p.status, file: p.file, loaded: p.loaded, total: p.total, progress: p.progress }));
    const image = await RawImage.fromBlob(blob);
    const t0 = performance.now();
    const out = await pipe(image);
    const depth = out.depth; // RawImage, 1 channel, 0-255, larger = closer (relative inverse depth)
    const data = new Uint8Array(depth.data);
    self.postMessage({ id, type: "result", width: depth.width, height: depth.height, data, device, ms: Math.round(performance.now() - t0) }, [data.buffer]);
  } catch (err) {
    self.postMessage({ id, type: "error", message: String((err && err.message) || err) });
  }
};
