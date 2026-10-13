import { detectGrid } from "../features/image-recognition/pixels";
import {
  recognizeCells,
  type RecognitionRequest,
} from "../features/image-recognition/pipeline";
import type { Pixels } from "../features/image-recognition/pixels";
self.onmessage = async (
  event: MessageEvent<
    | { kind: "detect"; image: Pixels }
    | { kind: "recognize"; request: RecognitionRequest }
  >,
) => {
  try {
    if (event.data.kind === "detect")
      self.postMessage({
        kind: "detected",
        detection: detectGrid(event.data.image),
      });
    else
      self.postMessage({
        kind: "complete",
        cells: await recognizeCells(event.data.request, (p) =>
          self.postMessage({ kind: "progress", ...p }),
        ),
      });
  } catch (e) {
    self.postMessage({
      kind: "error",
      message: e instanceof Error ? e.message : "图片识别失败",
    });
  }
};
