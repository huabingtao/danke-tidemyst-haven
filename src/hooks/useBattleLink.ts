import { useEffect, useState } from "react";
import { readBattleLink } from "../features/battle/links";
function read() {
  try {
    return {
      share: readBattleLink(window.location.href),
      error: "",
      active: window.location.hash.startsWith("#battle="),
    };
  } catch (e) {
    return {
      share: null,
      active: true,
      error: e instanceof Error ? e.message : "战绩链接无效",
    };
  }
}
export function useBattleLink() {
  const [value, setValue] = useState(read);
  useEffect(() => {
    const update = () => setValue(read());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return value;
}
