import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Trophy, Check, Share2, Download } from "lucide-react";
import type { Board } from "../../core/models";
import { useBoards, exportData } from "../../stores/boards";
import { downloadJson } from "../../adapters/environment";
import { queueCompletion } from "../../adapters/communityStats";
import {
  boardStats,
  currentBattle,
  finalBattle,
  aggregateBattle,
  battleDate,
  battleLabel,
  type BattleShare,
} from "../../features/battle/stats";
import { battleLink } from "../../features/battle/links";
import { BattleMetrics } from "./BattleMetrics";
import { BattlePoster } from "./BattlePoster";
export function BattlePage({
  board,
  onBack,
  onMessage,
}: {
  board?: Board;
  onBack: () => void;
  onMessage: (s: string) => void;
}) {
  const resultRef = useRef<HTMLElement>(null);
  const store = useBoards(),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [shared, setShared] = useState<{ share: BattleShare; url: string } | null>(
      null,
    );
  const included = store.records.filter((r) => selected.has(r.id)),
    settled = board
      ? store.records.find((r) => r.roundId === (board.roundId ?? board.id))
      : undefined,
    liveStats = board ? boardStats(board) : undefined,
    changed = !!(
      settled &&
      liveStats &&
      (settled.spent !== liveStats.spent ||
        settled.found !== liveStats.found ||
        settled.totalGems !== liveStats.totalGems ||
        settled.room !== board?.room)
    ),
    status = !board
      ? "未选择房间"
      : !settled
        ? "进行中"
        : changed
          ? "有修改待重新结算"
          : "已结算";
  useEffect(() => {
    if (shared)
      resultRef.current?.scrollIntoView({
        block: "start",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      });
  }, [shared]);
  const share = (value: BattleShare) =>
    setShared({
      share: value,
      url: battleLink(
        value,
        import.meta.env.VITE_PUBLIC_APP_URL || window.location.href,
      ),
    });
  const safely = (action: () => void) => {
    try {
      action();
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "请检查战绩数据");
    }
  };
  return (
    <main className="battle-page">
      <button className="text-button back-board" onClick={onBack}>
        <ArrowLeft size={18} />
        回到棋盘
      </button>
      <header className="battle-heading">
        <div>
          <Trophy size={34} />
          <h1>我的战绩</h1>
        </div>
        <p>每一枚棋子，都有你的判断。</p>
      </header>
      <section className="current-battle">
        <div className="battle-section-heading">
          <h2>{board ? `房间 ${board.room}` : "当前房间"}</h2>
          <span className="battle-status">{status}</span>
        </div>
        {board ? (
          <>
            <BattleMetrics stats={boardStats(board)} />
            <p className="battle-basis">
              棋子消耗按已录入的宝石和数字格计算；推断、旗标与待核对结果不计入。
            </p>
            <div className="battle-actions">
              <button
                className="primary-button"
                onClick={() =>
                  safely(() => {
                    store.settle(board.id);
                    queueCompletion(board.roundId ?? board.id);
                    onMessage(
                      settled ? "本局最终战绩已更新" : "本局最终战绩已保存",
                    );
                  })
                }
              >
                <Check size={18} />
                {settled ? "重新结算本局" : "结束本局"}
              </button>
              <button
                className="secondary-button"
                onClick={() => safely(() => share(currentBattle(board)))}
              >
                <Share2 size={18} />
                分享当前战绩
              </button>
            </div>
            {settled && (
              <p className="battle-basis">
                已保存最终成绩。修正棋盘后可重新结算；整盘重置会开启新局。
              </p>
            )}
          </>
        ) : (
          <p>先创建或选择一个房间，也可以分享下方已保存的最终战绩。</p>
        )}
      </section>
      <section className="battle-history">
        <div className="battle-section-heading">
          <h2>
            已结算战绩 <small>{store.records.length} 局</small>
          </h2>
          <button
            className="text-button"
            disabled={!store.records.length}
            onClick={() => {
              downloadJson(
                exportData(store.boards, store.activeId, store.records),
              );
              onMessage("已生成包含最终战绩的 JSON 备份");
            }}
          >
            <Download size={16} />
            导出备份
          </button>
        </div>
        <p className="battle-basis">
          手选要累计的局数。同一局多份截图请只选择最终一份。
        </p>
        {!store.records.length ? (
          <div className="battle-empty">
            <Trophy size={30} />
            <p>还没有最终战绩</p>
            <span>在当前房间点击“结束本局”即可保存。</span>
          </div>
        ) : (
          <div className="battle-records">
            {[...store.records].reverse().map((r) => (
              <article className="battle-record" key={r.id}>
                <label>
                  <input
                    type="checkbox"
                    aria-label={`选择房间 ${r.room} 的战绩 ${r.id}`}
                    checked={selected.has(r.id)}
                    onChange={(e) =>
                      setSelected((old) => {
                        const next = new Set(old);
                        if (e.target.checked) next.add(r.id);
                        else next.delete(r.id);
                        return next;
                      })
                    }
                  />
                  <span>
                    <strong>
                      房间 {r.room} · {r.size}×{r.size}
                    </strong>
                    <small>{battleDate(r.endedAt)} · 最终战绩</small>
                  </span>
                </label>
                <BattleMetrics stats={r} />
                <button
                  className="text-button"
                  onClick={() => safely(() => share(finalBattle(r)))}
                >
                  <Share2 size={16} />
                  分享这局
                </button>
              </article>
            ))}
          </div>
        )}
        <div className="aggregate-actions">
          <span>已选 {included.length} 局</span>
          <button
            className="primary-button"
            disabled={!included.length}
            onClick={() => safely(() => share(aggregateBattle(included)))}
          >
            <Share2 size={18} />
            分享累计战绩
          </button>
        </div>
      </section>
      {shared && (
        <section
          ref={resultRef}
          className="battle-share-result"
          aria-label="战绩分享结果"
        >
          <div className="battle-section-heading">
            <h2>{battleLabel(shared.share)}</h2>
            <button className="text-button" onClick={() => setShared(null)}>
              收起分享
            </button>
          </div>
          <BattlePoster share={shared.share} url={shared.url} />
        </section>
      )}
    </main>
  );
}
