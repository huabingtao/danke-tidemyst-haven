import { Gem, Coins, Target, Flag } from "lucide-react";
import { rate, type BattleStats } from "../../features/battle/stats";
export function BattleMetrics({ stats }: { stats: BattleStats }) {
  return (
    <dl className="battle-metrics">
      <div>
        <dt>
          <Coins size={17} />
          花费棋子
        </dt>
        <dd data-testid="battle-spent">
          {stats.spent}
          <small> 枚</small>
        </dd>
      </div>
      <div>
        <dt>
          <Gem size={17} />
          找到宝石
        </dt>
        <dd data-testid="battle-found">
          {stats.found}
          <small> / {stats.totalGems}</small>
        </dd>
      </div>
      <div>
        <dt>
          <Target size={17} />
          命中率
        </dt>
        <dd data-testid="battle-hit">{rate(stats.found, stats.spent)}</dd>
      </div>
      <div>
        <dt>
          <Flag size={17} />
          收集完成率
        </dt>
        <dd data-testid="battle-completion">
          {rate(stats.found, stats.totalGems)}
        </dd>
      </div>
    </dl>
  );
}
