import { createWorker, PSM, type Worker as OcrWorker } from "tesseract.js";
import {
  classifyCell,
  cropPixels,
  cellRect,
  features,
  type Pixels,
  type Rect,
  type GlyphTemplate,
  type RecognitionCell,
} from "./pixels";
import { gameFeatures } from "./gameBoard";
import { imageDimensions } from "./dimensions";
export interface RecognitionProgress {
  progress: number;
  message: string;
}
export interface RecognitionRequest {
  image: Pixels;
  rect: Rect;
  size: number;
  templates: GlyphTemplate[];
  ocr: boolean;
  assetBase: string;
  profile?: "tidemyst";
}
export async function recognizeCells(
  request: RecognitionRequest,
  onProgress: (p: RecognitionProgress) => void,
  signal?: AbortSignal,
): Promise<RecognitionCell[]> {
  const { image, rect, size, templates, assetBase } = request;
  let ocr: OcrWorker | undefined;
  const cancel = () => {
    void ocr?.terminate();
  };
  signal?.addEventListener("abort", cancel);
  const ensureActive = () => {
    if (signal?.aborted) throw new DOMException("已取消", "AbortError");
  };
  let ocrFailed = false;
  const results: RecognitionCell[] = [];
  try {
    for (let i = 0; i < size * size; i++) {
      ensureActive();
      const crop = cropPixels(image, cellRect(rect, size, i));
      let recognized = classifyCell(crop, templates, request.profile);
      const f =
        request.profile === "tidemyst" ? gameFeatures(crop) : features(crop);
      if (
        request.ocr &&
        recognized.needsReview &&
        (recognized.cell.observed === "unknown" ||
          request.profile === "tidemyst") &&
        f.foreground >= 0.012 &&
        f.foreground < 0.55 &&
        !ocrFailed
      ) {
        try {
          if (!ocr) {
            onProgress({
              progress: i / (size * size),
              message: "加载本地数字 OCR 模型…",
            });
            ocr = await createWorker("eng", 1, {
              workerPath: `${assetBase}/worker.min.js`,
              corePath: `${assetBase}/core`,
              langPath: `${assetBase}/lang`,
              gzip: true,
              workerBlobURL: true,
              logger: () => {},
              errorHandler: () => {},
            });
            ensureActive();
            await ocr.setParameters({
              tessedit_char_whitelist: "012345678",
              tessedit_pageseg_mode: PSM.SINGLE_CHAR,
            });
          }
          const width = 64,
            height = 80,
            data = new Uint8ClampedArray(width * height * 4);
          for (let y = 0; y < height; y++)
            for (let x = 0; x < width; x++) {
              const inside = x >= 12 && x < 52 && y >= 12 && y < 68;
              const bit = inside
                ? f.mask[
                    Math.floor(((y - 12) / 56) * 28) * 20 +
                      Math.floor(((x - 12) / 40) * 20)
                  ]
                : 0;
              const p = (y * width + x) * 4;
              data[p] = data[p + 1] = data[p + 2] = bit ? 0 : 255;
              data[p + 3] = 255;
            }
          const canvas =
            typeof OffscreenCanvas !== "undefined"
              ? new OffscreenCanvas(width, height)
              : Object.assign(document.createElement("canvas"), {
                  width,
                  height,
                });
          canvas
            .getContext("2d")!
            .putImageData(new ImageData(data, width, height), 0, 0);
          const blob =
            typeof OffscreenCanvas !== "undefined" &&
            canvas instanceof OffscreenCanvas
              ? await canvas.convertToBlob()
              : await new Promise<Blob>((resolve, reject) =>
                  (canvas as HTMLCanvasElement).toBlob((b) =>
                    b ? resolve(b) : reject(new Error("图片转换失败")),
                  ),
                );
          const output = await ocr.recognize(blob);
          ensureActive();
          const digit = output.data.text.trim(),
            confidence = output.data.confidence / 100;
          if (/^[0-8]$/.test(digit) && confidence >= 0.8) {
            const agreement =
              request.profile === "tidemyst" &&
              typeof recognized.cell.observed === "number" &&
              recognized.cell.observed === Number(digit) &&
              recognized.confidence >= 0.84;
            recognized = {
              cell: { observed: Number(digit), flagged: false },
              confidence: agreement ? Math.max(0.91, confidence) : confidence,
              reason: agreement
                ? "游戏字形模板与 OCR 数字一致"
                : "OCR 数字候选，请核对原图",
              needsReview: !agreement,
            };
          }
        } catch (e) {
          ensureActive();
          ocrFailed = true;
          onProgress({
            progress: i / (size * size),
            message: "OCR 不可用，继续模板识别；不确定格子可手动校正",
          });
          if (ocr) {
            await ocr.terminate().catch(() => {});
            ocr = undefined;
          }
        }
      }
      results.push(recognized);
      onProgress({
        progress: (i + 1) / (size * size),
        message: `识别格子 ${i + 1} / ${size * size}${ocrFailed ? " · OCR 不可用" : ""}`,
      });
      // Yield to events on fallback path; worker path also receives cancellation via termination.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    return results;
  } finally {
    signal?.removeEventListener("abort", cancel);
    await ocr?.terminate().catch(() => {});
  }
}
export async function decodeImage(file: File): Promise<Pixels> {
  if (file.size > 30 * 1024 * 1024)
    throw new Error("图片超过 30MB，请压缩后重试");
  const dimensions = imageDimensions(
    new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer()),
  );
  if (
    dimensions &&
    (!dimensions.width ||
      !dimensions.height ||
      dimensions.width * dimensions.height > 20000000)
  )
    throw new Error("图片超过 2000 万像素，请缩小后再导入");
  let source: ImageBitmap | HTMLImageElement;
  let url: string | undefined;
  try {
    try {
      source = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
    } catch {
      url = URL.createObjectURL(file);
      source = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () =>
          reject(new Error("无法解码图片，请使用 PNG、JPEG 或 WebP"));
        img.src = url!;
      });
    }
    const rawWidth =
        source instanceof HTMLImageElement ? source.naturalWidth : source.width,
      rawHeight =
        source instanceof HTMLImageElement
          ? source.naturalHeight
          : source.height;
    if (rawWidth * rawHeight > 20000000)
      throw new Error("图片超过 2000 万像素，请缩小后再导入");
    const scale = Math.min(1, 1600 / Math.max(rawWidth, rawHeight)),
      width = Math.max(1, Math.round(rawWidth * scale)),
      height = Math.max(1, Math.round(rawHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(source, 0, 0, width, height);
    if (source instanceof ImageBitmap) source.close();
    return { width, height, data: ctx.getImageData(0, 0, width, height).data };
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}
