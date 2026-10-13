import { useEffect } from "react";
import { sharedBoard } from "../features/sharing/links";
import { useBoards } from "../stores/boards";
export function useSharedBoard(onMessage: (message: string) => void) {
  useEffect(() => {
    let previous: string | undefined;
    const restore = () => {
      if (previous === window.location.hash) return;
      previous = window.location.hash;
      try {
        const board = sharedBoard(window.location.href);
        if (!board) return;
        const state = useBoards.getState();
        if (state.boards.some((b) => b.id === board.id)) {
          state.select(board.id);
          return;
        }
        if (state.boards.length >= 100)
          throw new Error("房间已达 100 个，请先删除一个房间，再打开分享链接");
        state.addRecognized(board);
        onMessage(`已载入分享的房间 ${board.room}，可继续编辑`);
      } catch (e) {
        onMessage(e instanceof Error ? e.message : "无法打开分享进度");
      }
    };
    restore();
    window.addEventListener("hashchange", restore);
    return () => window.removeEventListener("hashchange", restore);
  }, [onMessage]);
}
