import { useEffect, useRef, useState } from "react";
import type { Board, SolveResult } from "../core/models";
export function useSolver(board: Board | undefined) {
  const [result, setResult] = useState<SolveResult | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const worker = useRef<Worker | null>(null);
  useEffect(() => {
    setResult(null);
    setError("");
    if (!board) {
      setBusy(false);
      return;
    }
    setBusy(true);
    let timeout: ReturnType<typeof setTimeout>;
    try {
      const w = new Worker(
        new URL("../workers/solver.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current = w;
      timeout = setTimeout(() => {
        w.terminate();
        setBusy(false);
        setError("求解超过 12 秒，已停止。请补充线索后重算。");
      }, 12000);
      w.onmessage = (
        e: MessageEvent<{ result?: SolveResult; error?: string }>,
      ) => {
        clearTimeout(timeout);
        setResult(e.data.result ?? null);
        setError(e.data.error ?? "");
        setBusy(false);
        w.terminate();
      };
      w.onerror = () => {
        clearTimeout(timeout);
        setBusy(false);
        setError("计算线程启动失败。请更新浏览器或退出受限模式后重试。");
        w.terminate();
      };
      w.postMessage({ board, id: board.id });
    } catch {
      setError("当前环境不支持后台计算，请使用新版浏览器。");
      setBusy(false);
    }
    return () => {
      clearTimeout(timeout);
      worker.current?.terminate();
      worker.current = null;
    };
  }, [board, revision]);
  return {
    result,
    busy,
    error,
    retry: () => setRevision((r) => r + 1),
    cancel: () => {
      worker.current?.terminate();
      setBusy(false);
      setError("计算已取消，可点击重算。");
    },
  };
}
