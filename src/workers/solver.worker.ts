import { solveBoard } from "../core/solver";
import type { Board } from "../core/models";
self.onmessage = (event: MessageEvent<{ board: Board; id: string }>) => {
  try {
    self.postMessage({
      id: event.data.id,
      result: solveBoard(event.data.board),
    });
  } catch (e) {
    self.postMessage({
      id: event.data.id,
      error: e instanceof Error ? e.message : "求解失败",
    });
  }
};
