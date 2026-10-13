import { useEffect, useState } from "react";
import { Users, Trophy } from "lucide-react";
import {
  refreshCommunity,
  type CommunityNumbers,
} from "../adapters/communityStats";
export function CommunityStats() {
  const [numbers, setNumbers] = useState<CommunityNumbers | null>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true,
      busy = false,
      queued = false;
    const update = async () => {
      if (document.visibilityState === "hidden") return;
      if (busy) {
        queued = true;
        return;
      }
      busy = true;
      try {
        const value = await refreshCommunity();
        if (live) {
          setNumbers(value);
          setFailed(false);
        }
      } catch {
        if (live) setFailed(true);
      } finally {
        busy = false;
        if (queued && live) {
          queued = false;
          void update();
        }
      }
    };
    void update();
    const timer = setInterval(() => void update(), 30000);
    document.addEventListener("visibilitychange", update);
    window.addEventListener("online", update);
    window.addEventListener("tidemyst-completed", update);
    return () => {
      live = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
      window.removeEventListener("online", update);
      window.removeEventListener("tidemyst-completed", update);
    };
  }, []);
  return (
    <div className="community-stats" aria-label="全站游戏统计">
      {numbers ? (
        <>
          <span title="最近 90 秒活跃的匿名浏览器，同浏览器多标签只算一次">
            <Users size={14} />
            在线人数 <b>{numbers.online.toLocaleString()}</b>
          </span>
          <span>
            <Trophy size={14} />
            累计完成 <b>{numbers.totalCompleted.toLocaleString()}</b> 局
          </span>
        </>
      ) : (
        <span>
          {failed
            ? "在线统计暂不可用，棋盘与战绩仍可使用"
            : "正在读取在线统计…"}
        </span>
      )}
      {failed && numbers && <span>暂无法刷新</span>}
    </div>
  );
}
