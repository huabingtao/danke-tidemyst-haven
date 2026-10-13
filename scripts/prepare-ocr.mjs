import { mkdir, copyFile, readdir } from "node:fs/promises";
import { join } from "node:path";
const out = "public/ocr";
await mkdir(`${out}/core`, { recursive: true });
await mkdir(`${out}/lang`, { recursive: true });
await copyFile(
  "node_modules/tesseract.js/dist/worker.min.js",
  `${out}/worker.min.js`,
);
for (const name of await readdir("node_modules/tesseract.js-core")) {
  if (/\.wasm(\.js)?$/.test(name))
    await copyFile(
      join("node_modules/tesseract.js-core", name),
      `${out}/core/${name}`,
    );
}
async function findModel(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.name === "eng.traineddata.gz") return path;
    if (entry.isDirectory()) {
      const found = await findModel(path);
      if (found) return found;
    }
  }
}
const model = await findModel("node_modules/@tesseract.js-data/eng");
if (!model) throw new Error("缺少英语数字 OCR 模型");
await copyFile(model, `${out}/lang/eng.traineddata.gz`);
console.log("OCR worker、WASM 与模型已复制到同源 public/ocr");
