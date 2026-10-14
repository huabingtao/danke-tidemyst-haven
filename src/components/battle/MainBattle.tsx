import { useEffect, useRef, useState } from "react";
import { Trophy, X } from "lucide-react";
import type { Board } from "../../core/models";
import { useBoards } from "../../stores/boards";
import { queueCompletion } from "../../adapters/communityStats";
import { boardStats, finalBattle, type BattleShare } from "../../features/battle/stats";
import { battleLink } from "../../features/battle/links";
import { BattleMetrics } from "./BattleMetrics";
import { BattlePoster } from "./BattlePoster";

export function MainBattle({ board, onMessage }: { board: Board; onMessage: (message: string) => void }) {
  const store = useBoards();
  const stats = boardStats(board);
  const [shared, setShared] = useState<{ share: BattleShare; url: string } | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (shared && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [shared]);
  const finish = () => {
    try {
      const record = store.settle(board.id);
      queueCompletion(record.roundId);
      const share = finalBattle(record);
      setShared({ share, url: battleLink(share, import.meta.env.VITE_PUBLIC_APP_URL || window.location.href) });
      onMessage(useBoards.getState().notice || "本局已结算，正在生成战绩图片");
    } catch (error) {
      onMessage(error instanceof Error ? error.message : "结算失败，请重试");
    }
  };
  return <section className="main-battle" aria-label="本局战绩">
    <h2><Trophy size={20} />本局战绩</h2>
    <BattleMetrics stats={stats} />
    <button className="primary-button" disabled={stats.spent === 0} onClick={finish}>结束本局并晒战绩</button>
    <p>{stats.spent === 0 ? "先录入宝石或数字，也可以读取截图。" : "结算后可继续修正；重复结算同一局不增加局数。"}</p>
    {shared && <dialog ref={dialog} className="battle-save-dialog main-battle-dialog" aria-label="晒本局战绩" onCancel={() => setShared(null)}>
      <div className="dialog-header"><h2>本局最终战绩</h2><button className="icon-button" aria-label="关闭战绩分享" onClick={() => setShared(null)}><X size={20} /></button></div>
      <BattlePoster share={shared.share} url={shared.url} />
    </dialog>}
  </section>;
}
