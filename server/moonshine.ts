// Dictation in the back office runs Moonshine (MIT, by Moonshine AI) in the browser: speech never
// leaves the computer. The browser needs three things from us:
//
// - ONNX Runtime Web (MIT) to run the model, served from the installed package;
// - llama-tokenizer-js (MIT) to turn the model's tokens into words, likewise;
// - Moonshine Tiny's two model files (about 28 MB). They ship in Moonshine's own npm package,
//   which we fetch once from the npm registry, unpack and keep in DATA_DIR/moonshine, rather than
//   carry 28 MB in the repository.

import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import path from "node:path";

const PACKAGE = "https://registry.npmjs.org/@moonshine-ai/moonshine-js/-/moonshine-js-0.1.29.tgz";
const MODEL_FILES = { "encoder_model.onnx": "package/dist/model/tiny/quantized/encoder_model.onnx", "decoder_model_merged.onnx": "package/dist/model/tiny/quantized/decoder_model_merged.onnx" };
const ORT_FILES = ["ort.wasm.min.js", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"];

const TYPES = { ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".wasm": "application/wasm", ".onnx": "application/octet-stream" };

// The files in a .tar (ustar): name (with its prefix) → contents, for the names asked for.
function untar(buf, wanted) {
  const out = {};
  for (let at = 0; at + 512 <= buf.length; ) {
    const head = buf.subarray(at, at + 512);
    if (head.every((b) => b === 0)) break;
    const field = (from, len) => head.subarray(from, from + len).toString("utf8").replace(/\0.*$/s, "");
    const name = [field(345, 155), field(0, 100)].filter(Boolean).join("/");
    const size = parseInt(field(124, 12).trim() || "0", 8);
    if (wanted.includes(name)) out[name] = buf.subarray(at + 512, at + 512 + size);
    at += 512 + Math.ceil(size / 512) * 512;
  }
  return out;
}

export function createMoonshine({ root, dataDir }) {
  const dir = path.join(dataDir, "moonshine", "tiny");
  let fetching = null;

  // The model files, fetched and unpacked the first time anyone dictates.
  async function ensureModel() {
    const have = await Promise.all(Object.keys(MODEL_FILES).map((f) => stat(path.join(dir, f)).then(() => true, () => false)));
    if (have.every(Boolean)) return;
    fetching ||= (async () => {
      const res = await fetch(PACKAGE, { signal: AbortSignal.timeout(120_000) });
      if (!res.ok) throw new Error(`moonshine package: HTTP ${res.status}`);
      const files = untar(gunzipSync(Buffer.from(await res.arrayBuffer())), Object.values(MODEL_FILES));
      await mkdir(dir, { recursive: true });
      for (const [file, inTar] of Object.entries(MODEL_FILES)) {
        if (!files[inTar]) throw new Error(`moonshine package: ${inTar} missing`);
        await writeFile(path.join(dir, file), files[inTar]);
      }
    })().finally(() => (fetching = null));
    await fetching;
  }

  // /vendor/ort/…, /vendor/llama-tokenizer.js and /vendor/moonshine/tiny/… → { body, type }, or null.
  async function file(pathname) {
    let at = null;
    const ort = pathname.match(/^\/vendor\/ort\/([\w.-]+)$/);
    if (ort && ORT_FILES.includes(ort[1])) at = path.join(root, "node_modules/onnxruntime-web/dist", ort[1]);
    if (pathname === "/vendor/llama-tokenizer.js") at = path.join(root, "node_modules/llama-tokenizer-js/llama-tokenizer.js");
    const model = pathname.match(/^\/vendor\/moonshine\/tiny\/([\w.-]+)$/);
    if (model && MODEL_FILES[model[1]]) {
      await ensureModel();
      at = path.join(dir, model[1]);
    }
    if (!at) return null;
    return { body: await readFile(at), type: TYPES[path.extname(at)] || "application/octet-stream" };
  }

  return { file };
}
