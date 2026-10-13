import { Trophy, ArrowRight } from "lucide-react";
import { toolLink } from "../../features/sharing/links";
import { battleLabel, type BattleShare } from "../../features/battle/stats";
import { battleLink } from "../../features/battle/links";
import { BattlePoster } from "./BattlePoster";
import { BattleMetrics } from "./BattleMetrics";
export function BattleReadOnly({
  share,
  error,
}: {
  share: BattleShare | null;
  error: string;
}) {
  const entry = toolLink(window.location.href);
  return (
    <main className="battle-readonly">
      <header className="battle-heading">
        <div>
          <Trophy size={34} />
          <h1>{share ? "我的潮汐秘境战绩" : "无法打开战绩"}</h1>
        </div>
        <p>{share ? battleLabel(share) : error}</p>
      </header>
      {share && (
        <>
          <p className="readonly-note">只读战绩 · 不会更改你的棋盘</p>
          <BattleMetrics stats={share} />
          <BattlePoster
            share={share}
            url={battleLink(share, window.location.href)}
          />
        </>
      )}
      <a className="primary-button start-own" href={entry}>
        打开工具，开始我的一局
        <ArrowRight size={18} />
      </a>
    </main>
  );
}
