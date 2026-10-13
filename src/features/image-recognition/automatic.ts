import { createBoard, type Board, type Cell } from "../../core/models";
import {
  detectGrid,
  type GridDetection,
  type Pixels,
  type RecognitionCell,
} from "./pixels";
import {
  decodeImage,
  recognizeCells,
  type RecognitionProgress,
  type RecognitionRequest,
} from "./pipeline";
import { makeTemplates } from "./templates";
function workerJob<T>(
  message: object,
  signal: AbortSignal,
  onProgress: (p: RecognitionProgress) => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../../workers/image.worker.ts", import.meta.url),
      { type: "module" },
    );
    const finish = () => {
      worker.terminate();
      signal.removeEventListener("abort", cancel);
    };
    const cancel = () => {
      finish();
      reject(new DOMException("识别已取消", "AbortError"));
    };
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) {
      cancel();
      return;
    }
    worker.onmessage = (event) => {
      const data = event.data;
      if (data.kind === "progress") {
        onProgress({ progress: data.progress, message: data.message });
        return;
      }
      finish();
      if (data.kind === "error") reject(new Error(data.message));
      else
        resolve((data.kind === "detected" ? data.detection : data.cells) as T);
    };
    worker.onerror = () => {
      finish();
      reject(new Error("图片处理线程异常，请重新上传清晰截图"));
    };
    worker.postMessage(message);
  });
}
export function automaticCells(cells: RecognitionCell[]): Cell[] {
  return cells.map((candidate) => {
    const accepted =
      candidate.confidence >= 0.9 && candidate.cell.observed !== "unknown";
    if (accepted) return { ...candidate.cell };
    const cell: Cell = { observed: "unknown", flagged: candidate.cell.flagged };
    if (
      candidate.needsReview &&
      (candidate.cell.observed !== "unknown" || candidate.confidence < 0.6)
    )
      cell.recognition = {
        suggested: candidate.cell.observed,
        confidence: candidate.confidence,
        reason: candidate.reason,
      };
    return cell;
  });
}
export async function recognizeScreenshot(
  file: File,
  room: string,
  signal: AbortSignal,
  onProgress: (p: RecognitionProgress) => void,
): Promise<Board> {
  const active = () => {
    if (signal.aborted) throw new DOMException("识别已取消", "AbortError");
  };
  onProgress({ progress: 0, message: "正在读取截图…" });
  const image: Pixels = await decodeImage(file);
  active();
  onProgress({ progress: 0.07, message: "自动定位棋盘与识别尺寸…" });
  const detection =
    typeof Worker !== "undefined"
      ? await workerJob<GridDetection>(
          { kind: "detect", image },
          signal,
          () => {},
        )
      : detectGrid(image);
  active();
  if (detection.confidence < 0.72)
    throw new Error(
      "未检测到完整的 8×8、10×10 或 12×12 棋盘。请上传包含整个棋盘的清晰截图；图例、裁切图和倾斜照片无法自动填入。",
    );
  const request: RecognitionRequest = {
    image,
    rect: detection.rect,
    size: detection.size,
    templates: makeTemplates(),
    ocr: true,
    profile: detection.profile,
    assetBase: new URL(
      `${import.meta.env.BASE_URL}ocr`,
      window.location.href,
    ).href.replace(/\/$/, ""),
  };
  const report = (p: RecognitionProgress) =>
    onProgress({ progress: 0.12 + p.progress * 0.88, message: p.message });
  const cells =
    typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined"
      ? await workerJob<RecognitionCell[]>(
          { kind: "recognize", request },
          signal,
          report,
        )
      : await recognizeCells(request, report, signal);
  active();
  return { ...createBoard(detection.size, room), cells: automaticCells(cells) };
}
