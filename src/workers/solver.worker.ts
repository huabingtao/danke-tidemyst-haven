import { solveBoard } from "../core/solver";
import type { Board } from "../core/models";
import { rankRecommendations } from "../core/recommendations";
self.onmessage = (event: MessageEvent<{ board: Board; id: string }>) => {
  try {
    const result = solveBoard(event.data.board);
    result.recommendation = rankRecommendations(event.data.board, result);
    self.postMessage({
      id: event.data.id,
      result,
    });
  } catch (e) {
    self.postMessage({
      id: event.data.id,
      error: e instanceof Error ? e.message : "求解失败",
    });
  }
};
