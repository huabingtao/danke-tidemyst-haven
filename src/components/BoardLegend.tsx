import { Gem, X, Flag } from "lucide-react";
export function BoardLegend() {
  return (
    <section className="board-legend full-legend" aria-label="棋盘图例">
      <span>
        <i className="legend-symbol gem-symbol">
          <Gem size={15} />
        </i>
        已发现宝石
      </span>
      <span>
        <i className="legend-symbol number-symbol">3</i>已翻开，周围宝石数
      </span>
      <span>
        <i className="legend-symbol probability-symbol">57</i>宝石概率，%
      </span>
      <span>
        <i className="legend-symbol recommend-symbol">35</i>推荐下一步
      </span>
      <span>
        <i className="legend-symbol certain-symbol">100</i>确定有宝石
      </span>
      <span>
        <i className="legend-symbol safe-symbol">
          <X size={15} />
        </i>
        确定为空
      </span>
      <span>
        <i className="legend-symbol flag-symbol">
          <Flag size={13} />
        </i>
        用户推测旗标
      </span>
      <span>
        <i className="legend-symbol conflict-symbol">4</i>数字矛盾，请检查记录
      </span>
    </section>
  );
}
